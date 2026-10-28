import { readHiringManager } from './hiring-manager.js';
import { matchesDate } from './board-dates.js';
import { normalizePatch, validateId } from './model.js';

/** Presentation only: persisted statuses and the status editor stay canonical.
 * @type {readonly {id: string, label: string, statuses: readonly import('./model.js').ProspectStatus[], dropStatus: import('./model.js').ProspectStatus|null}[]}
 */
export const BOARD_COLUMNS = [
  { id: 'prospects', label: 'Prospects', statuses: ['prospect', 'interested', 'applying'], dropStatus: 'prospect' },
  { id: 'applied', label: 'Applied', statuses: ['applied'], dropStatus: 'applied' },
  { id: 'in-process', label: 'In-Process', statuses: ['recruiter', 'interviewing', 'final', 'offer'], dropStatus: 'recruiter' },
  { id: 'done', label: 'Done', statuses: ['passed', 'rejected', 'withdrawn', 'closed'], dropStatus: null }
];

/** Same-column drops never change a status, including grouped/legacy statuses.
 * @param {import('./model.js').ProspectStatus} status @param {string} destination
 * @returns {null|{kind:'default', status:import('./model.js').ProspectStatus}|{kind:'choose', statuses:readonly import('./model.js').ProspectStatus[]}} */
export function resolveBoardDrop(status, destination) {
  const column = BOARD_COLUMNS.find(column => column.id === destination);
  if (!column || column.statuses.includes(status)) return null;
  return column.dropStatus ? { kind: 'default', status: column.dropStatus } : { kind: 'choose', statuses: column.statuses };
}

/** @param {string} status */
export function statusLabel(status) {
  return status === 'final' ? 'Final round' : status.charAt(0).toUpperCase() + status.slice(1);
}
/** Calendar dates must not shift to the previous day in the viewer's timezone.
 * @param {string|null} date
 */
export function formatAppliedDate(date) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return null;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}
/** @param {string} hash @returns {{kind: 'board'|'new'|'detail'|'missing', id?: string}} */
export function parseRoute(hash) {
  if (!hash || hash === '#/board') return { kind: 'board' };
  if (hash === '#/prospects/new') return { kind: 'new' };
  const match = /^#\/prospects\/([^/]+)$/.exec(hash);
  if (match) {
    try { return { kind: 'detail', id: validateId(match[1]) }; } catch { /* unavailable route */ }
  }
  return { kind: 'missing' };
}
/** @param {import('./data.js').ProspectCard[]} cards */
export function groupCards(cards) {
  return BOARD_COLUMNS.map(column => {
    const grouped = cards.filter(card => column.statuses.includes(card.status));
    grouped.sort((a, b) => (a.board_position ?? 0) - (b.board_position ?? 0)
      || (Date.parse(b.created_at) - Date.parse(a.created_at) || 0) || a.id.localeCompare(b.id));
    return { ...column, cards: grouped };
  });
}
/** Move visible cards within their existing slots; hidden cards stay at the same indices.
 * Invalid/stale visible IDs leave the full order unchanged.
 * @param {string[]} expected @param {string[]} visible @param {string} movedId @param {string|null} beforeId
 * @returns {string[]} */
export function reorderVisibleCards(expected, visible, movedId, beforeId) {
  const visibleSet = new Set(visible);
  if (!visibleSet.has(movedId) || visibleSet.size !== visible.length
    || expected.filter(id => visibleSet.has(id)).some((id, index) => visible[index] !== id)
    || visible.some(id => !expected.includes(id))
    || (beforeId !== null && (!visibleSet.has(beforeId) || beforeId === movedId))) return [...expected];
  const ordered = visible.filter(id => id !== movedId);
  ordered.splice(beforeId === null ? ordered.length : ordered.indexOf(beforeId), 0, movedId);
  let index = 0;
  return expected.map(id => visibleSet.has(id) ? ordered[index++] : id);
}
/** Filter after central column ordering; never mutate or reorder the source data.
 * @param {import('./data.js').ProspectCard[]} cards @param {string} query
 * @param {import('./board-dates.js').DateFilter} [dateFilter] @param {ReadonlyMap<string,string>} [history] @param {Date} [today] @param {string} [status] */
export function searchBoardGroups(cards, query, dateFilter, history = new Map(), today = new Date(), status = 'all') {
  const search = query.trim().toLowerCase();
  return groupCards(cards).map(group => ({
    ...group, total: group.cards.length,
    cards: group.cards.filter(card => (!search || card.company.toLowerCase().includes(search) || card.title.toLowerCase().includes(search))
      && (!status || status === 'all' || card.status === status)
      && (!dateFilter || matchesDate(card, dateFilter, history, today)))
  }));
}
/** Only core fields belong in this form; never clear assessments/connections.
 * @param {FormData} form @param {{includeLogo?:boolean}} [options]
 * @returns {import('./model.js').DetailsPatch}
 */
export function readDetails(form, { includeLogo = true } = {}) {
  /** @type {Record<string, string>} */
  const patch = {};
  for (const key of ['company', 'title', 'job_url', 'source', 'location', 'work_arrangement',
    'employment_type', 'compensation_text', 'job_description', 'posted_on', 'discovered_on', 'applied_on', 'notes']) {
    patch[key] = String(form.get(key) ?? '');
  }
  const logo = includeLogo && form.has('company_logo_url') ? { company_logo_url: String(form.get('company_logo_url') ?? ''), company_logo_override: form.get('company_logo_override') === 'true' } : {};
  return /** @type {import('./model.js').DetailsPatch} */ (normalizePatch({ ...patch, ...logo, ...(form.has('hiring_manager_name') ? { hiring_manager: readHiringManager(form) } : {}) }));
}
/** @param {unknown} error */
export function errorMessage(error) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    if (/fetch|network/i.test(error.message)) return 'Could not reach Supabase. Check your connection and try again. Your draft is still here.';
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}
