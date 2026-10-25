import { getRadarClient } from './supabase-client.js';
import { readLogoRecords, resolveLogoDryRun } from './logo-backfill.js';
import { retrieveJob } from './ingestion-client.js';
import { createLogoLoader } from './company-logo-delivery.js';
import { atsLogoUrl } from './ats-logo.js';

const run=/** @type {HTMLButtonElement} */(document.getElementById('run'));
const status=/** @type {HTMLElement} */(document.getElementById('progress'));
const report=/** @type {HTMLElement} */(document.getElementById('report'));
run.addEventListener('click',async()=>{
  run.disabled=true;status.textContent='Verifying session and reading your prospects…';
  try {
    const client=await getRadarClient(), records=await readLogoRecords(client);
    const load=createLogoLoader(client);
    /** Render using the same credential-free paths as the avatar, with a fresh
     * decoder and no shared failure cache. Never attach remote markup.
     * @param {string} url */
    const render=async(url)=>{
      const controller=new AbortController();let objectUrl='';
      const timer=setTimeout(()=>controller.abort(),8000);
      const img=new window.Image();img.referrerPolicy='no-referrer';img.crossOrigin='anonymous';
      try {
        const source=atsLogoUrl(url)?(objectUrl=URL.createObjectURL(await load(url,controller.signal))):url;
        return await new Promise(resolve=>{
          const abort=()=>{img.removeAttribute('src');resolve(false);};
          controller.signal.addEventListener('abort',abort,{once:true});
          if(controller.signal.aborted){abort();return;}
          img.onload=()=>{controller.signal.removeEventListener('abort',abort);resolve(img.naturalWidth>0&&img.naturalHeight>0);};
          img.onerror=()=>{controller.signal.removeEventListener('abort',abort);resolve(false);};img.src=source;
        });
      } catch {return false;}
      finally {clearTimeout(timer);img.onload=null;img.onerror=null;img.removeAttribute('src');if(objectUrl)URL.revokeObjectURL(objectUrl);}
    };
    const result=await resolveLogoDryRun(records,{retrieve:url=>retrieveJob(client,url,globalThis.AbortSignal.timeout(18000)),render,progress:count=>{status.textContent=`Examined ${count} of ${records.length}. No prospect writes.`;}});
    report.textContent=JSON.stringify(result,null,2);
    status.textContent='Dry run complete. No prospect records changed. Review and explicit approval are required before any updates.';
  } catch {status.textContent='Dry run could not complete. Sign in to Prospect Tracker and reload this page to retry. No prospect records changed.';}
});

run.disabled=false;
