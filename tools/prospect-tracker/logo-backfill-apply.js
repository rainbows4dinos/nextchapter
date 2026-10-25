import { createRadarDataAccess } from './data.js';
import { logoUrl } from './company-logo.js';
import { recognizePosting } from './ingestion/posting-url.js';
import { validateId } from './model.js';

/** @typedef {{id:string,company:string,provider:string,updated_at:string,candidate:string}} Approval */
/** Validate the complete manifest before any write. The operator separately
 * verifies its byte digest against the reviewed, approved artifact.
 * @param {unknown} input @returns {Approval[]} */
export function approvedLogoRows(input) {
  if(!input || typeof input!=='object')throw new Error('Invalid manifest');
  const report=/** @type {{rows?:unknown,summary?:{expected_updates?:unknown}}} */(input);
  if(!Array.isArray(report.rows))throw new Error('Invalid manifest rows');
  const selected=report.rows.filter(row=>row?.expectedUpdate===true);
  if(!selected.length || selected.length!==report.summary?.expected_updates)throw new Error('Invalid approval count');
  const ids=new Set();
  return selected.map(row=>{
    validateId(row.id);
    if(ids.has(row.id)||typeof row.company!=='string'||!row.company.trim()||typeof row.updated_at!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(row.updated_at)||!Number.isFinite(Date.parse(row.updated_at))||!row.eligible||!row.validated||!row.employerMatched||!row.renderable||!row.candidateFound||!['greenhouse','ashby','lever','workable','workday'].includes(row.provider)||!row.candidate||logoUrl(row.candidate)!==row.candidate)throw new Error('Invalid approved proposal');
    ids.add(row.id);
    return {id:row.id,company:row.company,provider:row.provider,updated_at:row.updated_at,candidate:row.candidate};
  });
}

/** Stable comparison for all stored non-logo data, including nested objects.
 * @param {unknown} value @returns {string} */
export function stableData(value) {
  if(Array.isArray(value))return '['+value.map(stableData).join(',')+']';
  if(value && typeof value==='object')return '{'+Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>JSON.stringify(key)+':'+stableData(item)).join(',')+'}';
  return JSON.stringify(value)??'null';
}
/** @param {Record<string,unknown>} row */
function nonLogo(row) { return Object.fromEntries(Object.entries(row).filter(([key])=>!['company_logo_url','company_logo_override','updated_at'].includes(key))); }

/** Explicitly approved application only. Reuses normal guarded owner-RLS save.
 * @param {import('@supabase/supabase-js').SupabaseClient<import('./database.types.js').Database>} client
 * @param {Approval[]} approvals @param {(count:number)=>void} [progress] */
export async function applyApprovedLogos(client,approvals,progress) {
  const auth=await client.auth.getUser();
  if(auth.error||!auth.data.user||auth.data.user.is_anonymous)throw new Error('Verified owner session required');
  const owner=auth.data.user.id, data=createRadarDataAccess(client);
  const readAll=async()=>{
    const rows=[];
    for(let offset=0;;offset+=500){
      const result=await client.from('prospects').select('*').eq('owner_id',owner).order('id').range(offset,offset+499);
      if(result.error)throw new Error('Owner-scoped verification read failed');
      rows.push(...result.data);if(result.data.length<500)return rows;
    }
  };
  const before=await readAll();
  const outcomes=[];
  for(const approval of approvals){
    const outcome={id:approval.id,company:approval.company,status:'skipped',reason:'',nonLogoUnchanged:false};
    try{
      const read=await client.from('prospects').select('*').eq('owner_id',owner).eq('id',approval.id).maybeSingle();
      if(read.error)throw new Error('Read failed');
      const row=read.data;
      if(!row){outcome.reason='Record unavailable';continue;}
      if(row.updated_at!==approval.updated_at){outcome.reason='Revision changed since dry run';continue;}
      if(row.company_logo_override){outcome.reason='Manual choice preserved';continue;}
      let existing;try{existing=logoUrl(row.company_logo_url);}catch{existing=null;}
      if(existing){outcome.reason='Existing logo reference preserved';continue;}
      if(row.company!==approval.company||!row.job_url||recognizePosting(row.job_url).provider!==approval.provider){outcome.reason='Identity or eligibility changed';continue;}
      // The only supplied fields are logo metadata. Exact microsecond revision
      // guards against any edit after the fresh eligibility read above.
      const saved=await data.updateProspect(approval.id,{company_logo_url:approval.candidate,company_logo_override:false},approval.updated_at);
      if(saved.company_logo_url!==approval.candidate||saved.company_logo_override)throw new Error('Logo write could not be confirmed');
      outcome.nonLogoUnchanged=stableData(nonLogo(row))===stableData(nonLogo(saved));
      outcome.status=outcome.nonLogoUnchanged?'updated':'verification_failed';
      outcome.reason=outcome.nonLogoUnchanged?'Logo saved; non-logo data unchanged':'Non-logo verification differed';
    }catch{outcome.status='failed';outcome.reason='Read/write failed or guarded revision conflicted; no retry';}
    finally{outcomes.push(outcome);progress?.(outcomes.length);}
  }
  const after=await readAll(), afterById=new Map(after.map(row=>[row.id,row]));
  const changed=before.filter(row=>stableData(row)!==stableData(afterById.get(row.id))).map(row=>row.id);
  const approvedIds=new Set(approvals.map(row=>row.id));
  const nonLogoChanges=before.filter(row=>!afterById.has(row.id)||stableData(nonLogo(row))!==stableData(nonLogo(/** @type {Record<string,unknown>} */(afterById.get(row.id))))).map(row=>row.id);
  const manualChanges=before.filter(row=>row.company_logo_override&&stableData(row)!==stableData(afterById.get(row.id))).map(row=>row.id);
  return {generated_at:new Date().toISOString(),summary:{approved:approvals.length,updated:outcomes.filter(row=>row.status==='updated').length,skipped:outcomes.filter(row=>row.status==='skipped').length,failed:outcomes.filter(row=>!['updated','skipped'].includes(row.status)).length,changed_records:changed.length,unapproved_changes:changed.filter(id=>!approvedIds.has(id)).length,non_logo_changes:nonLogoChanges.length,manual_choices_changed:manualChanges.length,record_count_unchanged:before.length===after.length},outcomes};
}
