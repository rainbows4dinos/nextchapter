import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLocalDatabase } from '../scripts/local-database.js';
import { createClient } from '../vendor/supabase.js';
import { createRadarDataAccess, StaleProspectError } from '../data.js';
import { startFixture } from './fixtures/radar-server.js';
import { snapshot } from '../radar-feed-model.js';
import { feedResponse } from './fixtures/feed-response.js';

const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const ids = ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'];
const claims = (db, sub) => db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub })]);
const revision = async (db, id) => (await db.query('select updated_at::text as revision from public.prospects where id=$1', [id])).rows[0].revision;
const remove = (db, id, updated) => db.query('select public.delete_prospect($1,$2::timestamptz)', [id, updated]);

async function setup() {
  const db = await createLocalDatabase();
  await db.query('insert into auth.users(id) values ($1),($2)', [owner, other]);
  await db.exec('set role authenticated'); await claims(db, owner);
  for (const id of ids) await db.query("insert into public.prospects(id,company,title,job_url) values ($1,'Duplicate','Designer','https://example.org/job')", [id]);
  return db;
}

test('owner deletes exactly one duplicate and its history; other duplicate/history remain unchanged', async () => {
  const db = await setup();
  try {
    await db.query("update public.prospects set status='applied' where id=$1", [ids[0]]);
    const duplicate = (await db.query('select * from public.prospects where id=$1', [ids[1]])).rows;
    const history = (await db.query('select * from public.prospect_status_events where prospect_id=$1', [ids[1]])).rows;
    const updated = await revision(db, ids[0]);
    assert.equal((await remove(db, ids[0], updated)).rows[0].delete_prospect, ids[0]);
    assert.deepEqual((await db.query('select * from public.prospects')).rows, duplicate);
    assert.deepEqual((await db.query('select * from public.prospect_status_events')).rows, history);
    await assert.rejects(remove(db, ids[0], updated), e => e.code === '40001');
    await assert.rejects(db.exec('delete from public.prospects'), /permission denied/);
    await assert.rejects(db.exec('delete from public.prospect_status_events'), /permission denied/);
  } finally { await db.close(); }
});

test('RPC rejects other owners, anonymous callers, missing/stale revisions and preserves all rows', async () => {
  const db = await setup();
  try {
    const updated = await revision(db, ids[0]);
    await claims(db, other);
    await assert.rejects(remove(db, ids[0], updated), e => e.code === '40001');
    await claims(db, null);
    await assert.rejects(remove(db, ids[0], updated), e => e.code === '42501');
    await db.exec('set role anon');
    await assert.rejects(remove(db, ids[0], updated), /permission denied/);
    await db.exec('set role authenticated'); await claims(db, owner);
    await assert.rejects(remove(db, ids[0], null), e => e.code === '22023');
    await db.query("update public.prospects set notes='Concurrent edit' where id=$1", [ids[0]]);
    await assert.rejects(remove(db, ids[0], updated), e => e.code === '40001');
    assert.equal((await db.query('select count(*)::int as count from public.prospects')).rows[0].count, 2);
    assert.equal((await db.query('select count(*)::int as count from public.prospect_status_events')).rows[0].count, 2);
  } finally { await db.close(); }
});

test('linked Radar handoffs block deletion without altering opportunities, history or prospects', async () => {
  const db = await setup();
  try {
    await db.query('insert into public.radar_opportunities(id,identity_key,snapshot) values ($1,$2,$3)', [ids[0], 'fixture', JSON.stringify(snapshot(feedResponse().opportunities[0], 1, '2026-10-26T12:00:00Z'))]);
    await db.query("update public.radar_opportunities set decision='accepted',prospect_id=$1 where id=$2", [ids[0], ids[0]]);
    const before = (await db.query('select * from public.radar_opportunities')).rows;
    await assert.rejects(remove(db, ids[0], await revision(db, ids[0])), e => e.code === '23503');
    assert.deepEqual((await db.query('select * from public.radar_opportunities')).rows, before);
    assert.equal((await db.query('select count(*)::int as count from public.prospect_status_events')).rows[0].count, 2);
    assert.equal((await db.query('select count(*)::int as count from public.prospects')).rows[0].count, 2);
  } finally { await db.close(); }
});

test('history cleanup rolls back if the final prospect delete fails', async () => {
  const db = await setup();
  try {
    const updated = await revision(db, ids[0]);
    await db.exec(`reset role;
      create function public.fail_fixture_delete() returns trigger language plpgsql as $$ begin raise exception 'Synthetic delete failure'; end; $$;
      create trigger fail_fixture_delete before delete on public.prospects for each row execute function public.fail_fixture_delete();
      set role authenticated;`);
    await assert.rejects(remove(db, ids[0], updated), /Synthetic delete failure/);
    assert.equal((await db.query('select count(*)::int as count from public.prospect_status_events')).rows[0].count, 2);
    assert.equal((await db.query('select count(*)::int as count from public.prospects')).rows[0].count, 2);
  } finally { await db.close(); }
});

test('vendored SDK delete uses exact ID/revision, survives failure and remains absent on later reads', async () => {
  const fixture = await startFixture();
  const client = createClient(fixture.origin, 'sb_publishable_synthetic', { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    await client.auth.signInWithPassword({ email: 'radar@example.invalid', password: 'fixture-only-password' });
    const data = createRadarDataAccess(client);
    const a = await data.createProspect({ id: ids[0], company: 'Duplicate', title: 'Designer' });
    const b = await data.createProspect({ id: ids[1], company: 'Duplicate', title: 'Designer' });
    await fetch(fixture.origin + '/__fixture/fail-next-save', { method: 'POST' });
    await assert.rejects(data.deleteProspect(a.id, a.updated_at), e => e.code === 'TEST_FAILURE');
    assert.equal((await data.getProspect(a.id)).title, a.title);
    const saved = await data.updateProspect(a.id, { notes: 'Concurrent' }, a.updated_at);
    await assert.rejects(data.deleteProspect(a.id, a.updated_at), StaleProspectError);
    await data.deleteProspect(saved.id, saved.updated_at);
    assert.equal(await data.getProspect(a.id), null);
    assert.equal((await data.getProspect(b.id)).title, b.title);
    assert.equal((await data.listStatusEvents(a.id)).length, 0);
    assert.equal((await data.listStatusEvents(b.id)).length, 1);
    assert.deepEqual((await data.listProspects()).map(row => row.id), [b.id]);
  } finally { await client.auth.signOut(); await fixture.close(); }
});
