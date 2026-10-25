import { logoUrl } from './company-logo.js';
import { recognizePosting } from './ingestion/posting-url.js';

/** @typedef {Pick<import('./model.js').Prospect,'id'|'company'|'job_url'|'company_logo_url'|'company_logo_override'|'updated_at'>} LogoRecord */
/** Read-only decision engine. No write capability is accepted or returned.
 * @param {LogoRecord[]} records
 * @param {{retrieve:(url:string)=>Promise<import('./ingestion/preview.js').IngestionPreview>,render:(url:string)=>Promise<boolean>,progress?:(count:number)=>void}} services */
export async function resolveLogoDryRun(records, services) {
  const postings = new Map(); const images = new Map();
  const render = (/** @type {string} */ url) => {
    if (!images.has(url)) images.set(url, services.render(url).catch(() => false));
    return /** @type {Promise<boolean>} */ (images.get(url));
  };
  const name = (/** @type {string} */ value) => value.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
  const rows = [];
  for (const record of records) {
    const row = { id:record.id, company:record.company, updated_at:record.updated_at,
      provider:'', eligible:false, candidate:/** @type {string|null} */(null), candidateFound:false, validated:false,
      employerMatched:false, renderable:false, expectedUpdate:false, reason:'' };
    try {
      if (record.company_logo_override) { row.reason='Manual override or explicit clear — preserved'; continue; }
      if (!record.job_url) { row.reason='No posting URL'; continue; }
      let identity;
      try { identity=recognizePosting(record.job_url); } catch { row.reason='Unsupported posting URL'; continue; }
      row.provider=identity.provider;
      let existing;
      try { existing=logoUrl(record.company_logo_url); } catch { existing=null; }
      if (existing && await render(existing)) { row.reason='Existing logo renders — preserved'; continue; }
      row.eligible=true;
      // Same posting is resolved at most once per run. Rejections are cached too.
      const key=`${identity.retrieval_url}#${identity.posting_id}`;
      if (!postings.has(key)) postings.set(key,services.retrieve(identity.canonical_url));
      const preview=await postings.get(key);
      const candidate=preview.draft.company_logo_url;
      row.candidateFound=!!candidate;
      row.employerMatched=!!preview.draft.company && !!preview.field_sources.company && name(preview.draft.company)===name(record.company);
      if (!candidate) { row.reason='No usable candidate returned (missing or rejected upstream)'; continue; }
      try { row.candidate=logoUrl(candidate); row.validated=!!row.candidate; } catch { /* Rejected below. */ }
      if (!row.validated || !row.candidate) { row.reason='Candidate URL rejected'; continue; }
      if (!row.employerMatched) { row.reason='Posting employer does not exactly match saved company'; continue; }
      row.renderable=await render(row.candidate);
      if (!row.renderable) { row.reason='Candidate image failed delivery or decoding'; continue; }
      row.expectedUpdate=true; row.reason='Ready for approval — no write performed';
    } catch { row.reason='Posting retrieval failed or unavailable'; }
    finally { rows.push(row); services.progress?.(rows.length); }
  }
  return { generated_at:new Date().toISOString(), summary:{
    examined:rows.length, eligible:rows.filter(row=>row.eligible).length,
    candidates_found:rows.filter(row=>row.candidateFound).length,
    candidates_rejected:rows.filter(row=>row.candidateFound&&!row.expectedUpdate).length,
    skipped:rows.filter(row=>!row.expectedUpdate).length,
    expected_updates:rows.filter(row=>row.expectedUpdate).length
  },rows };
}

/** Authenticated, explicit owner filter plus RLS; paginated minimal reads only.
 * @param {import('@supabase/supabase-js').SupabaseClient<import('./database.types.js').Database>} client */
export async function readLogoRecords(client) {
  const {data,error}=await client.auth.getUser();
  if(error || !data.user || data.user.is_anonymous)throw new Error('Sign in to Prospect Tracker first.');
  const owner=data.user.id;
  /** @type {LogoRecord[]} */ const records=[];
  for(let offset=0;;offset+=500){
    const page=await client.from('prospects').select('id,company,job_url,company_logo_url,company_logo_override,updated_at').eq('owner_id',owner).order('id').range(offset,offset+499);
    if(page.error)throw new Error('Could not read owner-scoped prospects.');
    records.push(...page.data);
    if(page.data.length<500)return records;
  }
}
