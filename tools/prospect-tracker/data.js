import {
  decodeProspect, normalizePatch, SCORE_FIELDS, validateConnections, validateId, validateStatus
} from './model.js';

/** @typedef {import('./database.types.js').Database} Database */
/** @typedef {import('./model.js').Prospect} Prospect */
/** @typedef {import('./model.js').ProspectPatch} ProspectPatch */
/** @typedef {import('./model.js').AssessmentPatch} AssessmentPatch */
/** @typedef {import('./model.js').Connection} Connection */
/** @typedef {import('./model.js').ProspectStatus} ProspectStatus */
/** @typedef {import('./model.js').StatusEvent} StatusEvent */
/** @typedef {Pick<Prospect, 'company_logo_url'|'id'|'company'|'title'|'location'|'work_arrangement'|'status'|'applied_on'|'discovered_on'|'created_at'|'updated_at'|'board_position'>} ProspectCard */
/** @typedef {Pick<Prospect, 'id'|'company'|'title'|'job_url'|'location'|'status'|'applied_on'|'updated_at'>} ProspectIdentity */

export class StaleProspectError extends Error {
  constructor(action = 'saving') {
    super(`Prospect changed, is unavailable, or is no longer accessible. Reload before ${action}.`);
    this.name = 'StaleProspectError';
  }
}

/** @param {string} value */
function validateRevision(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) {
    throw new Error('The exact updated_at returned by Supabase is required');
  }
  // Do not parse/reformat it: PostgreSQL may return microseconds, unlike JS Date.
}

/** Browser-local calendar date, matching the date input's YYYY-MM-DD value.
 * @param {Date} [date] */
export function localCalendarDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Domain-specific access only; RLS is always the authority for ownership.
 * Use one instance per shared application client. No status-event write API.
 * @param {import('@supabase/supabase-js').SupabaseClient<Database>} client
 */
export function createRadarDataAccess(client) {
  /** All owner-accessible identities, independently of board presentation limits.
   * @returns {Promise<ProspectIdentity[]>}
   */
  async function listProspectIdentities() {
    /** @type {ProspectIdentity[]} */
    const prospects = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await client.from('prospects')
        .select('id,company,title,job_url,location,status,applied_on,updated_at')
        .order('id', { ascending: true }).range(offset, offset + 499);
      if (error) throw error;
      prospects.push(...data.map(row => ({ ...row, status: validateStatus(row.status) })));
      if (data.length < 500) return prospects;
    }
  }
  /** @returns {Promise<ProspectCard[]>} */
  async function listProspects() {
    /** @type {ProspectCard[]} */
    const cards = [];
    const pageSize = 500;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await client.from('prospects')
        .select('company_logo_url,id,company,title,location,work_arrangement,status,applied_on,discovered_on,created_at,updated_at,board_position')
        .order('board_position', { ascending: true }).order('created_at', { ascending: false }).order('id', { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (error) throw error;
      for (const row of data) {
        if (row.work_arrangement !== null && !['remote', 'hybrid', 'onsite', 'flexible'].includes(row.work_arrangement)) {
          throw new Error('Invalid stored work arrangement');
        }
        cards.push({ ...row, status: validateStatus(row.status), work_arrangement: /** @type {ProspectCard['work_arrangement']} */ (row.work_arrangement) });
      }
      if (data.length < pageSize) return cards;
    }
  }

  /** @param {string} id @returns {Promise<Prospect|null>} */
  async function getProspect(id) {
    const { data, error } = await client.from('prospects').select('*').eq('id', validateId(id)).maybeSingle();
    if (error) throw error;
    return data ? decodeProspect(data) : null;
  }

  /**
   * Caller retains the same UUID for retries; a failed insert is never silently
   * retried or converted into an overwrite. Use getProspect(id) to reconcile.
   * @param {import('./model.js').NewProspect} input
   * @param {string} [expectedOwner] Optional owner assertion for asynchronous Radar handoffs; RLS enforces it.
   * @returns {Promise<Prospect>}
   */
  async function createProspect(input, expectedOwner) {
    const { id, status = 'prospect', ...patch } = input;
    validateId(id);
    const values = normalizePatch(patch);
    if (!values.company || !values.title) throw new Error('company and title are required');
    if (status === 'applied' && values.applied_on == null) values.applied_on = localCalendarDate();
    const { data, error } = await client.from('prospects').insert({
      ...values, ...(expectedOwner!==undefined ? { owner_id: validateId(expectedOwner) } : {}), id, status: validateStatus(status), company: values.company, title: values.title
    }).select('*').single();
    if (error) throw error;
    return decodeProspect(data);
  }

  /**
   * @param {string} id
   * @param {Database['public']['Tables']['prospects']['Update']} values
   * @param {string} expectedUpdatedAt
   * @returns {Promise<Prospect>}
   */
  async function save(id, values, expectedUpdatedAt) {
    validateId(id);
    validateRevision(expectedUpdatedAt);
    if (!Object.keys(values).length) throw new Error('No changes supplied');
    const { data, error } = await client.from('prospects').update(values)
      .eq('id', id).eq('updated_at', expectedUpdatedAt).select('*').maybeSingle();
    if (error) throw error;
    if (!data) throw new StaleProspectError();
    return decodeProspect(data);
  }

  /** @param {string} id @param {ProspectPatch} patch @param {string} expectedUpdatedAt */
  async function updateProspect(id, patch, expectedUpdatedAt) {
    return save(id, normalizePatch(patch), expectedUpdatedAt);
  }

  /** @param {string} id @param {AssessmentPatch} patch @param {string} expectedUpdatedAt */
  async function updateAssessment(id, patch, expectedUpdatedAt) {
    const fields = new Set([...SCORE_FIELDS, 'assessment_rationale', 'assessment_concerns']);
    for (const key of Object.keys(patch)) if (!fields.has(key)) throw new Error(`Not an assessment field: ${key}`);
    return updateProspect(id, patch, expectedUpdatedAt);
  }

  /** Replace the bounded list, guarded by the prospect revision.
   * @param {string} id @param {Connection[]} connections @param {string} expectedUpdatedAt
   */
  async function setConnections(id, connections, expectedUpdatedAt) {
    return updateProspect(id, { connections: validateConnections(connections) }, expectedUpdatedAt);
  }

  /** @param {string} id @param {ProspectStatus} status @param {string} expectedUpdatedAt */
  async function changeStatus(id, status, expectedUpdatedAt) {
    validateId(id); validateRevision(expectedUpdatedAt); validateStatus(status);
    /** @type {Database['public']['Tables']['prospects']['Update']} */
    const values = { status };
    if (status === 'applied') {
      // Read at the caller's exact revision, then CAS the status/date in one write.
      // A historical or deliberately cleared Applied date is not a new transition.
      const { data, error } = await client.from('prospects').select('status,applied_on')
        .eq('id', id).eq('updated_at', expectedUpdatedAt).maybeSingle();
      if (error) throw error;
      if (!data) throw new StaleProspectError();
      if (data.status !== 'applied' && data.applied_on === null) values.applied_on = localCalendarDate();
    }
    return save(id, values, expectedUpdatedAt);
  }

  /** @param {string} prospectId @returns {Promise<StatusEvent[]>} */
  async function listStatusEvents(prospectId) {
    validateId(prospectId);
    /** @type {StatusEvent[]} */
    const events = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await client.from('prospect_status_events').select('*')
        .eq('prospect_id', prospectId).order('id', { ascending: true }).range(offset, offset + 499);
      if (error) throw error;
      for (const event of data) {
        validateStatus(event.to_status);
        if (event.from_status !== null) validateStatus(event.from_status);
      }
      events.push(...data);
      if (data.length < 500) return events;
    }
  }

  /** Owner-scoped via history RLS. Paginated batches, never one request per card.
   * @param {AbortSignal} [signal] @returns {Promise<StatusEvent[]>} */
  async function listAppliedTransitions(signal) {
    /** @type {StatusEvent[]} */
    const events = [];
    for (let offset = 0; ; offset += 500) {
      let query = client.from('prospect_status_events').select('id,prospect_id,from_status,to_status,recorded_at')
        .eq('to_status', 'applied').not('from_status', 'is', null).neq('from_status', 'applied')
        .order('recorded_at', { ascending: true }).order('id', { ascending: true }).range(offset, offset + 499);
      if (signal) query = query.abortSignal(signal);
      const { data, error } = await query;
      if (error) throw error;
      events.push(...data);
      if (data.length < 500) return events;
    }
  }

  /** Permanently remove one owned record at its exact saved revision.
   * History cleanup is atomic in the RPC; no direct table DELETE is exposed.
   * @param {string} id @param {string} expectedUpdatedAt */
  async function deleteProspect(id, expectedUpdatedAt) {
    validateId(id); validateRevision(expectedUpdatedAt);
    const { data, error } = await client.rpc('delete_prospect', { prospect_id: id, expected_updated_at: expectedUpdatedAt });
    if (error?.code === '40001') throw new StaleProspectError('deleting');
    if (error?.code === '23503') throw new Error('This prospect is linked to a Career Radar opportunity and cannot be deleted.');
    if (error) throw error;
    if (data !== id) throw new Error('Deletion was not confirmed. Reload the saved prospect before trying again.');
  }

  /** @param {string} columnId @param {string[]} expectedIds @param {string[]} orderedIds */
  async function reorderColumn(columnId, expectedIds, orderedIds) {
    expectedIds.forEach(id => validateId(id)); orderedIds.forEach(id => validateId(id));
    const { error } = await client.rpc('reorder_prospect_column', { column_id: columnId, expected_ids: expectedIds, ordered_ids: orderedIds });
    if (error?.code === '40001') throw new StaleProspectError();
    if (error) throw error;
  }

  return { deleteProspect, listAppliedTransitions, reorderColumn, listProspects, listProspectIdentities, getProspect, createProspect, updateProspect, updateAssessment, setConnections, changeStatus, listStatusEvents };
}
