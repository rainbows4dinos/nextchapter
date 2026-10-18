import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applicationDate, appliedHistoryMap, dateRange, defaultDateFilter, matchesDate } from '../board-dates.js';
import { searchBoardGroups } from '../view-model.js';

const filter = (values = {}) => ({ ...defaultDateFilter(), basis: 'applied', preset: 'custom', start: '2026-10-05', end: '2026-10-11', ...values });
const card = (values = {}) => ({ id: 'a', company: 'Example', title: 'Designer', status: 'applied', applied_on: null, created_at: '2026-10-08T12:00:00Z', board_position: 1, ...values });
const event = (values = {}) => ({ id: 1, prospect_id: 'a', from_status: 'prospect', to_status: 'applied', recorded_at: '2026-10-06T12:00:00Z', ...values });

test('Applied uses authoritative dates across all lifecycle statuses and inclusive boundaries', () => {
  for (const status of ['applied','interviewing','rejected','withdrawn','prospect']) {
    for (const applied_on of ['2026-10-05','2026-10-08','2026-10-11']) assert.equal(matchesDate(card({ status, applied_on }), filter(), new Map()), true);
    for (const applied_on of [null,'2026-10-04','2026-10-12']) assert.equal(matchesDate(card({ status, applied_on }), filter(), new Map()), false);
  }
  const history = appliedHistoryMap([event()]);
  assert.equal(matchesDate(card({ applied_on: '2025-01-01' }), filter(), history), false, 'manual correction overrides this week’s history/import');
  assert.equal(matchesDate(card({ applied_on: '2026-10-07', created_at: '2026-10-18T00:00:00Z' }), filter(), new Map()), true);
});

test('history selects the first genuine Applied transition, excludes initial events and never duplicates cards', () => {
  const history = appliedHistoryMap([
    event({ id: 0, from_status: null, recorded_at: '2026-10-01T12:00:00Z' }),
    event({ id: 3, from_status: 'interviewing', recorded_at: '2026-10-15T12:00:00Z' }),
    event(), event({ prospect_id: 'b', from_status: null }), event({ prospect_id: 'c', from_status: 'applied' })
  ]);
  assert.equal(history.get('a'), '2026-10-06T12:00:00Z');
  assert.equal(history.has('b'), false); assert.equal(history.has('c'), false);
  assert.equal(applicationDate(card(), history).source, 'history');
  assert.equal(matchesDate(card({ status: 'rejected' }), filter(), history), true);
  assert.equal(searchBoardGroups([card()], '', filter(), history).flatMap(g => g.cards).length, 1);
  assert.equal(matchesDate(card({ id: 'b' }), filter(), history), false);
  assert.equal(matchesDate(card({ id: 'b' }), filter({ preset: 'all' }), history), true);
  assert.equal(applicationDate(card({ id: 'b' }), history).source, 'missing');
});

test('all presets, default, leap-year clamp and invalid/incomplete custom ranges', () => {
  const today = new Date(2026, 9, 18, 12);
  assert.deepEqual(defaultDateFilter(), { basis: 'added', preset: '90', start: '', end: '' });
  for (const [preset,start] of [['7','2026-10-12'],['30','2026-09-19'],['90','2026-07-21'],['year','2025-10-18']]) {
    const range = dateRange(filter({ preset }), today);
    assert.equal(range.start, start); assert.equal(range.end, '2026-10-18'); assert.equal(range.error, '');
  }
  assert.equal(dateRange(filter({ preset: 'year' }), new Date(2024,1,29,12)).start, '2023-02-28');
  for (const values of [{ start: '' },{ end: '' },{ start:'2026-10-12' },{ start:'2026-02-30' }]) {
    const invalid = filter(values); assert.ok(dateRange(invalid).error); assert.equal(matchesDate(card(),invalid,new Map()), false);
  }
  assert.equal(dateRange(filter({ preset: 'all' })).startTime, null);
});

test('timestamp bounds use local midnight and next-day exclusive end across DST', () => {
  const previous = process.env.TZ;
  try {
    process.env.TZ = 'America/Los_Angeles';
    const day = filter({ basis:'added',start:'2026-03-08',end:'2026-03-08' });
    const range = dateRange(day);
    assert.equal(range.endTime - range.startTime, 23*60*60*1000);
    for (const [created_at,expected] of [['2026-03-08T07:59:59Z',false],['2026-03-08T08:00:00Z',true],['2026-03-09T06:59:59.999Z',true],['2026-03-09T07:00:00Z',false]]) assert.equal(matchesDate(card({created_at}),day,new Map()), expected);
    const fall = dateRange(filter({ start:'2026-11-01',end:'2026-11-01' }));
    assert.equal(fall.endTime - fall.startTime, 25*60*60*1000);
    assert.equal(matchesDate(card(), filter({ start:'2026-10-05', end:'2026-10-05' }), appliedHistoryMap([event({ recorded_at:'2026-10-06T00:30:00Z' })])), true);
    assert.equal(matchesDate(card({applied_on:'2026-10-05'}),filter({start:'2026-10-05',end:'2026-10-05'}),new Map()), true);
    process.env.TZ = 'Asia/Tokyo';
    assert.equal(matchesDate(card(),filter({start:'2026-10-06',end:'2026-10-06'}),appliedHistoryMap([event({recorded_at:'2026-10-05T23:30:00Z'})])),true);
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});

test('search AND date filtering preserves manual order and clearing restores it without mutating records', () => {
  const records = Object.freeze([
    Object.freeze(card({id:'c',company:'Other',board_position:3,applied_on:'2026-10-05'})),
    Object.freeze(card({id:'a',company:'Example',board_position:1,applied_on:'2026-10-05'})),
    Object.freeze(card({id:'b',company:'Example',board_position:2,applied_on:'2026-10-04'}))
  ]);
  assert.deepEqual(searchBoardGroups(records,'example',filter()).flatMap(g=>g.cards).map(c=>c.id), ['a']);
  assert.deepEqual(searchBoardGroups(records,'',filter()).flatMap(g=>g.cards).map(c=>c.id), ['a','c']);
  assert.deepEqual(searchBoardGroups(records,'',filter({preset:'all'})).flatMap(g=>g.cards).map(c=>c.id), ['a','b','c']);
  assert.deepEqual(records.map(c=>c.id), ['c','a','b']);
});
