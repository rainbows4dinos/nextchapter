import { localCalendarDate } from './data.js';

/** @typedef {{basis:'added'|'applied', preset:'7'|'30'|'90'|'year'|'all'|'custom', start:string, end:string}} DateFilter */
/** @returns {DateFilter} */
export const defaultDateFilter = () => ({ basis: 'added', preset: '90', start: '', end: '' });
/** @param {string} date */
export function validCalendarDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(date + 'T00:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}
/** Local calendar boundaries, with next-day exclusive timestamp end (including DST).
 * @param {DateFilter} filter @param {Date} [today] */
export function dateRange(filter, today = new Date()) {
  let start = '', end = '', error = '';
  if (filter.preset === 'custom') {
    start = filter.start; end = filter.end;
    if (!validCalendarDate(start) || !validCalendarDate(end)) error = 'Choose both a valid start and end date.';
    else if (start > end) error = 'Start date must be on or before end date.';
  } else if (filter.preset !== 'all') {
    end = localCalendarDate(today);
    const beginning = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (filter.preset === 'year') {
      const year = today.getFullYear() - 1, month = today.getMonth();
      beginning.setFullYear(year, month, 1);
      beginning.setDate(Math.min(today.getDate(), new Date(year, month + 1, 0).getDate()));
    } else beginning.setDate(beginning.getDate() - (Number(filter.preset) - 1));
    start = localCalendarDate(beginning);
  }
  const startTime = start && !error ? new Date(start + 'T00:00:00').getTime() : null;
  const nextDay = end && !error ? new Date(end + 'T00:00:00') : null;
  nextDay?.setDate(nextDay.getDate() + 1);
  return { start, end, error, startTime, endTime: nextDay?.getTime() ?? null };
}
/** First genuine Applied transition; initial/import events are never application evidence.
 * @param {import('./data.js').StatusEvent[]} events */
export function appliedHistoryMap(events) {
  /** @type {Map<string,string>} */
  const history = new Map();
  for (const event of events) {
    if (event.to_status !== 'applied' || !event.from_status || event.from_status === 'applied' || !Number.isFinite(Date.parse(event.recorded_at))) continue;
    const previous = history.get(event.prospect_id);
    if (!previous || Date.parse(event.recorded_at) < Date.parse(previous)) history.set(event.prospect_id, event.recorded_at);
  }
  return history;
}
/** @param {import('./data.js').ProspectCard} card @param {ReadonlyMap<string,string>} history
 * @returns {{date:string|null, source:'recorded'|'history'|'missing', timestamp?:string}} */
export function applicationDate(card, history) {
  if (card.applied_on && validCalendarDate(card.applied_on)) return { date: card.applied_on, source: 'recorded' };
  const timestamp = history.get(card.id);
  if (timestamp && Number.isFinite(Date.parse(timestamp))) return { date: localCalendarDate(new Date(timestamp)), source: 'history', timestamp };
  return { date: null, source: 'missing' };
}
/** @param {import('./data.js').ProspectCard} card @param {DateFilter} filter
 * @param {ReadonlyMap<string,string>} history @param {Date} [today] */
export function matchesDate(card, filter, history, today = new Date()) {
  const range = dateRange(filter, today);
  if (range.error) return false;
  if (filter.preset === 'all') return true;
  const applied = applicationDate(card, history);
  if (filter.basis === 'applied' && applied.source === 'recorded') return !!applied.date && applied.date >= range.start && applied.date <= range.end;
  const timestamp = filter.basis === 'added' ? card.created_at : applied.timestamp;
  if (!timestamp) return false;
  const time = Date.parse(timestamp);
  return range.startTime !== null && range.endTime !== null && time >= range.startTime && time < range.endTime;
}
