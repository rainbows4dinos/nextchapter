import { test } from 'node:test';
import assert from 'node:assert/strict';
import { customRangeLabel, dateFilterLabel } from '../date-filter.js';
import { defaultDateFilter } from '../board-dates.js';

const today = new Date(2026, 9, 19, 12);
test('custom labels read as calendar dates and include years when ambiguous', () => {
  assert.equal(customRangeLabel('2026-09-30','2026-10-29',today), 'Sep 30 – Oct 29');
  assert.equal(customRangeLabel('2025-12-28','2026-01-10',today), 'Dec 28, 2025 – Jan 10, 2026');
  assert.equal(customRangeLabel('2025-10-05','2025-10-11',today), 'Oct 5 – Oct 11, 2025');
  assert.equal(customRangeLabel('2027-01-01','2027-01-07',today), 'Jan 1 – Jan 7, 2027');
  assert.equal(customRangeLabel('2026-10-19','2026-10-19',today), 'Oct 19');
  assert.equal(customRangeLabel('2024-02-29','2024-02-29',today), 'Feb 29, 2024');
  assert.equal(customRangeLabel('','2026-10-19',today), 'Custom range');
});
test('display formatting never shifts a calendar day across viewer timezones', () => {
  const previous = process.env.TZ;
  try {
    for (const timezone of ['America/Los_Angeles','Pacific/Honolulu','Asia/Tokyo']) {
      process.env.TZ = timezone;
      assert.equal(customRangeLabel('2026-09-30','2026-10-29',today), 'Sep 30 – Oct 29');
    }
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});
test('All dates omits the remembered basis and presets retain their existing labels', () => {
  const filter = {...defaultDateFilter(),basis:'applied'};
  assert.equal(dateFilterLabel(filter,today), 'All dates');
  assert.equal(dateFilterLabel({...filter,preset:'90'},today), 'Applied: Last 90 days');
  assert.equal(dateFilterLabel({...filter,basis:'added',preset:'30'},today), 'Added: Last 30 days');
  assert.equal(dateFilterLabel({...filter,preset:'custom',start:'2025-12-28',end:'2026-01-10'},today), 'Applied: Dec 28, 2025 – Jan 10, 2026');
});
