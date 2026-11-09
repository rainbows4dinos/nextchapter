import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createLocalDatabase } from '../scripts/local-database.js';
import { STATUSES, SELECTABLE_STATUSES, validateStatus } from '../model.js';
import { searchBoardGroups, resolveBoardDrop } from '../view-model.js';
import { isHiredTransition } from '../hired-celebration.js';

const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const owner = '11111111-1111-4111-8111-111111111111';
test('Hired is selectable, separately grouped, counted and filtered; existing values remain valid', () => {
  for (const status of STATUSES) assert.equal(validateStatus(status), status);
  assert.ok(SELECTABLE_STATUSES.includes('hired'));
  const cards = STATUSES.map((status, i) => ({ id: String(i), company: 'Synthetic', title: 'Designer', status, board_position: i }));
  const groups = searchBoardGroups(cards, 'synthetic', undefined, undefined, undefined, 'hired');
  assert.deepEqual(groups.find(g => g.id === 'hired').cards.map(c => c.status), ['hired']);
  assert.equal(groups.find(g => g.id === 'hired').total, 1);
  assert.equal(groups.flatMap(g => g.cards).length, 1);
  assert.deepEqual(resolveBoardDrop('offer', 'hired'), { kind: 'default', status: 'hired' });
  assert.deepEqual(resolveBoardDrop('hired', 'in-process'), { kind: 'default', status: 'recruiter' });
});

test('celebration recognizes only entering Hired, including a later explicit return', () => {
  for (const status of STATUSES) {
    assert.equal(isHiredTransition(status, { status: 'hired' }), status !== 'hired');
    if (status !== 'hired') assert.equal(isHiredTransition('hired', { status }), false);
  }
});

test('additive migration preserves existing rows/history; Hired persists and can be left with atomic history and ordering', async () => {
  const db = await createLocalDatabase({ boardOrder: false });
  try {
    await db.exec(await readFile(new URL('../../../supabase/migrations/20261016010000_prospect_board_order.sql', import.meta.url), 'utf8'));
    await db.query('insert into auth.users(id) values ($1)', [owner]);
    await db.query("insert into public.prospects(id,owner_id,company,title,status) values ($1,$2,'Synthetic','Designer','offer')", [id, owner]);
    const before = (await db.query('select * from public.prospects')).rows;
    const history = (await db.query('select * from public.prospect_status_events')).rows;
    await db.exec(await readFile(new URL('../../../supabase/migrations/20261109000000_prospect_hired.sql', import.meta.url), 'utf8'));
    assert.deepEqual((await db.query('select * from public.prospects')).rows, before);
    assert.deepEqual((await db.query('select * from public.prospect_status_events')).rows, history);
    await db.exec('set role authenticated');
    await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: owner })]);
    for (const status of ['hired', 'interviewing', 'hired']) {
      await db.query('update public.prospects set status=$1 where id=$2', [status, id]);
      assert.equal((await db.query('select status from public.prospects where id=$1', [id])).rows[0].status, status);
    }
    await db.query('select public.reorder_prospect_column($1,$2::uuid[],$3::uuid[])', ['hired', [id], [id]]);
    assert.deepEqual((await db.query('select from_status,to_status from public.prospect_status_events order by id')).rows,
      [{ from_status: null, to_status: 'offer' }, { from_status: 'offer', to_status: 'hired' }, { from_status: 'hired', to_status: 'interviewing' }, { from_status: 'interviewing', to_status: 'hired' }]);
    await assert.rejects(db.query('update public.prospects set status=$1 where id=$2', ['invalid', id]), /check constraint/);
  } finally { await db.close(); }
});
