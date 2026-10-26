import { artworkBounds, selectLogo } from './ingestion/logo-suitability.js';
import { createLogoLoader } from './company-logo-delivery.js';
import { atsLogoUrl } from './ats-logo.js';
import { managedLogoUrl } from './managed-logo.js';
import { logoDiagnostic } from './logo-diagnostics.js';

/** Decode actual raster content with the browser's native image decoder. Draw
 * only a bounded analysis canvas; original artwork is never cropped or saved.
 * @param {import('./ingestion/logo-suitability.js').LogoCandidate} candidate
 * @param {ReturnType<typeof createLogoLoader>} load @param {AbortSignal} parent */
async function decodedCandidate(candidate,load,parent) {
  const controller=new AbortController();
  const cancel=()=>controller.abort();parent.addEventListener('abort',cancel,{once:true});if(parent.aborted)cancel();
  const timer=setTimeout(cancel,7500);const img=new window.Image();img.crossOrigin='anonymous';img.referrerPolicy='no-referrer';let objectUrl='';
  try{
    const src=atsLogoUrl(candidate.url)||managedLogoUrl(candidate.url)?(objectUrl=URL.createObjectURL(await load(candidate.url,controller.signal))):candidate.url;
    await new Promise((resolve,reject)=>{
      const abort=()=>{img.removeAttribute('src');reject(new Error('Image canceled'));};
      controller.signal.addEventListener('abort',abort,{once:true});
      if(controller.signal.aborted){abort();return;}
      img.onload=()=>{controller.signal.removeEventListener('abort',abort);resolve(null);};
      img.onerror=()=>{controller.signal.removeEventListener('abort',abort);reject(new Error('Image decode failed'));};img.src=src;
    });
    const width=img.naturalWidth,height=img.naturalHeight;
    if(!width||!height||width>4096||height>4096||width*height>8_000_000)throw new Error('Image dimensions rejected');
    const scale=Math.min(1,224/Math.max(width,height)),canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
    const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)throw new Error('Image analysis unavailable');
    context.drawImage(img,0,0,canvas.width,canvas.height);
    const bounds=artworkBounds(context.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height);
    return {...candidate,width,height,bounds};
  }finally{clearTimeout(timer);parent.removeEventListener('abort',cancel);controller.abort();img.onload=null;img.onerror=null;img.removeAttribute('src');if(objectUrl)URL.revokeObjectURL(objectUrl);}
}
/** @param {import('./ingestion/preview.js').IngestionPreview} preview
 * @param {import('@supabase/supabase-js').SupabaseClient<import('./database.types.js').Database>} client
 * @param {AbortSignal} signal @param {number} [budgetMs] */
export async function selectPreviewLogo(preview,client,signal,budgetMs=7500) {
  if(!preview.logo_candidates)return preview; // Compatible with older functions.
  const analysis=globalThis.AbortSignal.any([signal,globalThis.AbortSignal.timeout(Math.max(1,Math.min(7500,budgetMs)))]);
  const load=createLogoLoader(client);
  const decoded=await Promise.allSettled(preview.logo_candidates.map(candidate=>decodedCandidate(candidate,load,analysis)));
  signal.throwIfAborted();
  const candidates=decoded.flatMap(result=>result.status==='fulfilled'?[result.value]:[]);
  const decision=selectLogo(candidates);
  preview.draft.company_logo_url=decision.selected?.url??null;
  if(decision.selected){
    const flags=decision.reviewed.find(item=>item.candidate===decision.selected)?.flags??[];
    preview.field_sources.company_logo_url=`Verified employer ${decision.selected.source} ${decision.selected.role}; ${decision.reason}${flags.length?'; review flags: '+flags.join(', '):''}`;
    logoDiagnostic('candidate_selected');
  }else{delete preview.field_sources.company_logo_url;logoDiagnostic('initials_no_suitable_candidate');}
  return preview;
}
