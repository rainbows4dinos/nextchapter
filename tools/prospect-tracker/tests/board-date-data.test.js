import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startFixture } from './fixtures/radar-server.js';
import { createClient } from '../vendor/supabase.js';
import { createRadarDataAccess } from '../data.js';
import { appliedHistoryMap, defaultDateFilter } from '../board-dates.js';
import { searchBoardGroups } from '../view-model.js';

test('date filtering reads real owner-scoped historical transitions without modifying records or history', async () => {
  const fixture = await startFixture();
  const client = createClient(fixture.origin,'sb_publishable_synthetic',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  try {
    const auth = await client.auth.signInWithPassword({email:'radar@example.invalid',password:'fixture-only-password'}); assert.equal(auth.error,null);
    const data = createRadarDataAccess(client);
    // Raw SDK writes model pre-#16 records; the real schema/history trigger still runs.
    const input = {company:'Synthetic',title:'Designer'};
    const raw = await client.from('prospects').insert({...input,id:crypto.randomUUID()}).select('*').single(); assert.equal(raw.error,null);
    let changed = await client.from('prospects').update({status:'applied'}).eq('id',raw.data.id).select('*').single(); assert.equal(changed.error,null);
    changed = await client.from('prospects').update({status:'rejected'}).eq('id',raw.data.id).select('*').single(); assert.equal(changed.error,null);
    const initial = await client.from('prospects').insert({...input,id:crypto.randomUUID(),status:'applied'}).select('*').single(); assert.equal(initial.error,null);
    const corrected = await data.createProspect({...input,id:crypto.randomUUID(),applied_on:'2025-01-01',status:'applied'});
    const stats = () => fetch(fixture.origin+'/__fixture').then(r=>r.json());
    const before = await stats();
    const cards = await data.listProspects();
    const history = appliedHistoryMap(await data.listAppliedTransitions());
    assert.equal(history.has(raw.data.id),true);
    assert.equal(history.has(initial.data.id),false);
    const recent = {...defaultDateFilter(),basis:'applied',preset:'7'};
    assert.deepEqual(searchBoardGroups(cards,'',recent,history).flatMap(g=>g.cards).map(c=>c.id),[raw.data.id]);
    assert.equal(searchBoardGroups(cards,'',{...recent,preset:'all'},history).flatMap(g=>g.cards).length,3);
    assert.equal((await data.getProspect(corrected.id)).applied_on,'2025-01-01');
    assert.equal((await data.getProspect(raw.data.id)).applied_on,null,'fallback never backfills a row');
    assert.deepEqual(await stats(),before,'filter reads do not modify prospects or ledger');
  } finally { await client.auth.signOut({scope:'local'}); await fixture.close(); }
});
