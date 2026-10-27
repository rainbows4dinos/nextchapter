import { test } from 'node:test';
import assert from 'node:assert/strict';
// Exercise the exact browser artifact, not just the npm module used for types.
import { createClient } from '../vendor/supabase.js';
import { createRadarDataAccess, StaleProspectError } from '../data.js';
import { SCORE_FIELDS } from '../model.js';

const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const revision = '2026-10-06T12:00:00.123456+00:00';
const row = {
  id, owner_id: '11111111-1111-4111-8111-111111111111', company: 'Example', title: 'Designer',
  job_url: null, source: null, location: null, work_arrangement: null, employment_type: null,
  compensation_text: null, job_description: null, posted_on: null, discovered_on: null,
  applied_on: null, status: 'prospect', notes: null, connections: [],
  ...Object.fromEntries(SCORE_FIELDS.map(field => [field, null])),
  assessment_rationale: null, assessment_concerns: null,
  created_at: revision, updated_at: revision
};

function harness(responses) {
  const requests = [];
  const client = createClient('https://example.supabase.co', 'sb_publishable_synthetic', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async (input, init) => {
        const url = new URL(input instanceof Request ? input.url : String(input));
        requests.push({ url, method: init?.method || 'GET', body: init?.body ? JSON.parse(init.body) : null });
        if (!responses.length) throw new Error('Unexpected HTTP request');
        const response = responses.shift();
        return new Response(JSON.stringify(response.body), {
          status: response.status || 200, headers: { 'content-type': 'application/json' }
        });
      }
    }
  });
  return { data: createRadarDataAccess(client), requests };
}

test('create uses retained UUID, database ownership/defaults and returned row', async () => {
  const { data, requests } = harness([{ body: row }]);
  const result = await data.createProspect({ id, company: ' Example ', title: 'Designer', notes: ' ' });
  assert.equal(result.id, id);
  assert.equal(requests[0].method, 'POST');
  assert.deepEqual(requests[0].body, { id, company: 'Example', title: 'Designer', notes: null, status: 'prospect' });
  assert.equal(requests[0].url.searchParams.get('select'), '*');
});

test('failed create is surfaced and never retried; reads allow reconciliation', async () => {
  const failure = { code: '23505', message: 'duplicate UUID', details: null, hint: null };
  const { data, requests } = harness([{ status: 409, body: failure }, { body: [row] }]);
  await assert.rejects(data.createProspect({ id, company: 'Example', title: 'Designer' }), error => error.code === '23505');
  assert.equal(requests.length, 1);
  assert.equal((await data.getProspect(id)).id, id);
});

test('patches preserve exact microsecond revision and only touch supplied fields', async () => {
  const saved = { ...row, notes: 'Saved', updated_at: '2026-10-06T12:00:01.000001+00:00' };
  const { data, requests } = harness([{ body: [saved] }]);
  const result = await data.updateProspect(id, { notes: ' Saved ', source: undefined }, revision);
  assert.deepEqual(requests[0].body, { notes: 'Saved' });
  assert.equal(requests[0].method, 'PATCH');
  assert.equal(requests[0].url.searchParams.get('id'), `eq.${id}`);
  assert.equal(requests[0].url.searchParams.get('updated_at'), `eq.${revision}`);
  assert.equal(result.updated_at, saved.updated_at);
});

test('zero affected rows cause a conflict, not false save success', async () => {
  const { data } = harness([{ body: [] }]);
  await assert.rejects(data.updateProspect(id, { notes: 'Unsaved' }, revision), StaleProspectError);
});

test('database errors preserved, inaccessible/missing rows return null', async () => {
  const { data } = harness([
    { status: 403, body: { code: '42501', message: 'permission denied', details: null, hint: null } },
    { body: [] }
  ]);
  await assert.rejects(data.listProspects(), error => error.code === '42501');
  assert.equal(await data.getProspect(id), null);
});

test('assessment and connection updates share revision protection without status writes', async () => {
  const connection = { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', name: 'Alex' };
  const { data, requests } = harness([
    { body: [{ ...row, systems_fit: 2, personal_interest: 5 }] },
    { body: [{ ...row, connections: [connection] }] }
  ]);
  await data.updateAssessment(id, { systems_fit: 2, personal_interest: 5 }, revision);
  await data.setConnections(id, [connection], revision);
  assert.deepEqual(requests[0].body, { systems_fit: 2, personal_interest: 5 });
  assert.deepEqual(requests[1].body, { connections: [connection] });
  assert.equal(requests[1].url.searchParams.get('updated_at'), `eq.${revision}`);
});

test('status change writes current state only; history is queried separately', async () => {
  const event = { id: 2, prospect_id: id, from_status: 'prospect', to_status: 'offer', recorded_at: revision };
  const { data, requests } = harness([{ body: [{ ...row, status: 'offer' }] }, { body: [event] }]);
  await data.changeStatus(id, 'offer', revision);
  assert.equal(requests.length, 1, 'no browser event insert');
  assert.deepEqual(requests[0].body, { status: 'offer' });
  assert.deepEqual(await data.listStatusEvents(id), [event]);
  assert.equal(requests[1].url.pathname, '/rest/v1/prospect_status_events');
  assert.equal(requests[1].url.searchParams.get('prospect_id'), `eq.${id}`);
  assert.equal(requests[1].url.searchParams.get('order'), 'id.asc');
});

test('board queries narrow fields and paginate in stable order', async () => {
  const dated = { ...row, applied_on: '2026-09-01', discovered_on: '2026-08-31' };
  const { data, requests } = harness([{ body: Array.from({ length: 500 }, () => row) }, { body: [dated] }]);
  const cards = await data.listProspects();
  assert.equal(cards.length, 501);
  assert.equal(cards[0].applied_on, null);
  assert.equal(cards[500].applied_on, '2026-09-01');
  assert.equal(cards[500].discovered_on, '2026-08-31');
  assert.equal(cards[500].updated_at, revision);
  assert.equal(requests[0].url.searchParams.get('order'), 'board_position.asc,created_at.desc,id.asc');
  assert.equal(requests[0].url.searchParams.get('offset'), '0');
  assert.equal(requests[1].url.searchParams.get('offset'), '500');
  assert.equal(requests[0].url.searchParams.get('select').includes('job_description'), false);
  assert.ok(requests[0].url.searchParams.get('select').split(',').includes('applied_on'));
  assert.ok(requests[0].url.searchParams.get('select').split(',').includes('discovered_on'));
});

test('duplicate identity query includes every page, job URL/status/date and exact revision', async () => {
  const { data, requests } = harness([{ body: Array.from({ length: 500 }, () => row) }, { body: [{ ...row, job_url: 'https://example.invalid/job' }] }]);
  const identities = await data.listProspectIdentities();
  assert.equal(identities.length, 501);
  assert.equal(identities[500].job_url, 'https://example.invalid/job');
  assert.equal(identities[500].updated_at, revision);
  assert.equal(requests[0].url.searchParams.get('select'), 'id,company,title,job_url,location,status,applied_on,updated_at');
  assert.equal(requests[0].url.searchParams.get('order'), 'id.asc');
  assert.equal(requests[1].url.searchParams.get('offset'), '500');
  assert.equal(requests.every(request => request.method === 'GET'), true);
});

test('invalid input is rejected without HTTP calls', async () => {
  const { data, requests } = harness([]);
  await assert.rejects(data.updateProspect(id, { owner_id: id }, revision));
  await assert.rejects(data.updateProspect(id, {}, revision));
  await assert.rejects(data.updateProspect(id, { notes: 'x' }, 'yesterday'));
  await assert.rejects(data.updateAssessment(id, { title: 'not an assessment' }, revision));
  await assert.rejects(data.changeStatus(id, 'invented', revision));
  assert.equal(requests.length, 0);
});

test('reordering uses the guarded RPC without status or history writes', async () => {
  const other = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const { data, requests } = harness([{ body: null }]);
  await data.reorderColumn('prospects', [id, other], [other, id]);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url.pathname, '/rest/v1/rpc/reorder_prospect_column');
  assert.deepEqual(requests[0].body, { column_id: 'prospects', expected_ids: [id, other], ordered_ids: [other, id] });
});
test('stale reorder and network failures are surfaced without retry', async () => {
  const { data, requests } = harness([{ status: 409, body: { code: '40001', message: 'Board changed' } }]);
  await assert.rejects(data.reorderColumn('prospects', [id], [id]), StaleProspectError);
  assert.equal(requests.length, 1);
});

test('local calendar dates near UTC midnight use the user timezone without shifting the day', async () => {
  const { localCalendarDate } = await import('../data.js');
  const previous = process.env.TZ;
  try {
    process.env.TZ = 'America/Los_Angeles';
    assert.equal(localCalendarDate(new Date('2026-10-17T00:30:00Z')), '2026-10-16');
    process.env.TZ = 'Asia/Tokyo';
    assert.equal(localCalendarDate(new Date('2026-10-16T23:30:00Z')), '2026-10-17');
    process.env.TZ = 'Pacific/Honolulu';
    assert.equal(localCalendarDate(new Date('2024-03-01T00:30:00Z')), '2024-02-29');
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});

test('Applied creation fills only an absent date in its single insert', async () => {
  const { localCalendarDate } = await import('../data.js');
  for (const applied_on of [undefined, null, '', '2025-04-12']) {
    const { data, requests } = harness([{ body: { ...row, status: 'applied', applied_on: applied_on || localCalendarDate() } }]);
    await data.createProspect({ id, company: 'Example', title: 'Designer', status: 'applied', applied_on });
    assert.equal(requests.length, 1);
    assert.equal(requests[0].body.applied_on, applied_on || localCalendarDate());
  }
});

test('entering Applied sends status and local date atomically at the exact revision', async () => {
  const { localCalendarDate } = await import('../data.js');
  const date = localCalendarDate();
  const saved = { ...row, status: 'applied', applied_on: date, updated_at: '2026-10-16T12:00:01.000001+00:00' };
  const { data, requests } = harness([{ body: [row] }, { body: [saved] }]);
  assert.deepEqual(await data.changeStatus(id, 'applied', revision), saved);
  assert.deepEqual(requests.map(r => r.method), ['GET','PATCH']);
  assert.equal(requests[0].url.searchParams.get('select'), 'status,applied_on');
  assert.ok(requests.every(r => r.url.searchParams.get('updated_at') === `eq.${revision}`));
  assert.deepEqual(requests[1].body, { status: 'applied', applied_on: date });
});

test('existing dates and unchanged historical Applied status are not automatically stamped', async () => {
  for (const [status, applied_on] of [['prospect','2025-04-12'], ['applied',null], ['applied','2025-04-12']]) {
    const stored = { ...row, status, applied_on };
    const { data, requests } = harness([{ body: [stored] }, { body: [{ ...stored, status: 'applied' }] }]);
    await data.changeStatus(id, 'applied', revision);
    assert.deepEqual(requests[1].body, { status: 'applied' });
  }
});

test('failed Applied read/write and stale revisions do not issue a date-only write or retry', async () => {
  const failure = { code: 'TEST_FAILURE', message: 'Synthetic network failure' };
  for (const responses of [
    [{ status: 403, body: failure }],
    [{ body: [] }],
    [{ body: [row] }, { body: [] }],
    [{ body: [row] }, { status: 503, body: failure }]
  ]) {
    const count = responses.length;
    const { data, requests } = harness(responses);
    await assert.rejects(data.changeStatus(id, 'applied', revision));
    assert.equal(requests.length, count);
    for (const request of requests.filter(r => r.method === 'PATCH')) assert.equal(request.body.status, 'applied');
  }
});

test('board Applied history is owner/RLS-scoped, paginated in batches and read-only', async () => {
  const event = { id: 1, prospect_id: id, from_status: 'prospect', to_status: 'applied', recorded_at: revision };
  const { data, requests } = harness([{ body: Array.from({ length: 500 }, (_, i) => ({ ...event, id: i+1 })) },{ body: [{ ...event, id:501 }] }]);
  assert.equal((await data.listAppliedTransitions()).length,501);
  assert.equal(requests.length,2);
  assert.equal(requests[0].url.searchParams.get('to_status'),'eq.applied');
  assert.deepEqual(requests[0].url.searchParams.getAll('from_status'),['not.is.null','neq.applied']);
  assert.equal(requests[0].url.searchParams.get('order'),'recorded_at.asc,id.asc');
  assert.deepEqual(requests.map(r=>r.url.searchParams.get('offset')),['0','500']);
  assert.ok(requests.every(r=>r.method==='GET' && !r.url.searchParams.has('prospect_id')));
  const failed = harness([{status:403,body:{message:'History unavailable'}}]);
  await assert.rejects(failed.data.listAppliedTransitions(), error=>error.message==='History unavailable');
});

test('delete sends only the exact prospect ID and unmodified microsecond revision to the RPC', async () => {
  const { data, requests } = harness([{ body: id }]);
  await data.deleteProspect(id, revision);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url.pathname, '/rest/v1/rpc/delete_prospect');
  assert.equal(requests[0].method, 'POST');
  assert.deepEqual(requests[0].body, { prospect_id: id, expected_updated_at: revision });
});

test('delete never reports success for a missing/stale, linked, failed or unconfirmed response', async () => {
  for (const response of [{ status: 409, body: { code: '40001', message: 'stale' } }, { status: 409, body: { code: '23503', message: 'linked' } }, { status: 503, body: { code: 'TEST_FAILURE', message: 'unavailable' } }, { body: null }]) {
    const { data, requests } = harness([response]);
    await assert.rejects(data.deleteProspect(id, revision), response.body?.code === '40001' ? StaleProspectError : undefined);
    assert.equal(requests.length, 1);
  }
  const { data, requests } = harness([]);
  await assert.rejects(data.deleteProspect('invalid', revision));
  await assert.rejects(data.deleteProspect(id, 'invalid'));
  assert.equal(requests.length, 0);
});
