import { getRadarClient } from './supabase-client.js';
import { approvedLogoRows, applyApprovedLogos } from './logo-backfill-apply.js';
const button=/** @type {HTMLButtonElement} */(document.getElementById('apply'));
const file=/** @type {HTMLInputElement} */(document.getElementById('manifest'));
const digest=/** @type {HTMLInputElement} */(document.getElementById('digest'));
const progress=/** @type {HTMLElement} */(document.getElementById('progress'));
const report=/** @type {HTMLElement} */(document.getElementById('report'));
button.addEventListener('click',async()=>{
  button.disabled=true;
  try{
    const selected=file.files?.[0];
    if(!selected||selected.size>1024*1024||!/^[a-f0-9]{64}$/.test(digest.value.trim()))throw new Error('Select the approved manifest and its SHA-256 digest.');
    const bytes=await selected.arrayBuffer();
    const actual=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),byte=>byte.toString(16).padStart(2,'0')).join('');
    if(actual!==digest.value.trim())throw new Error('Manifest does not match the reviewed digest.');
    const approvals=approvedLogoRows(JSON.parse(new TextDecoder().decode(bytes)));
    progress.textContent=`Applying ${approvals.length} approved proposals with fresh eligibility and revision checks…`;
    const result=await applyApprovedLogos(await getRadarClient(),approvals,count=>{progress.textContent=`Processed ${count} of ${approvals.length}.`;});
    report.textContent=JSON.stringify(result,null,2);progress.textContent='Approved operation complete. Review verification results below.';
  }catch(error){progress.textContent=error instanceof Error?error.message:'Operation failed; do not retry automatically.';}
});
button.disabled=false;
