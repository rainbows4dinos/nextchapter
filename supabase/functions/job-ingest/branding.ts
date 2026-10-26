import { atsLogoUrl } from '../../../tools/prospect-tracker/ats-logo.js';
import { managedLogoUrl } from '../../../tools/prospect-tracker/managed-logo.js';
import { brandingContext, manifestIcons, websiteIcons } from '../../../tools/prospect-tracker/ingestion/website-icons.js';
import { rasterMetadata, LOGO_BYTE_LIMIT } from '../../../tools/prospect-tracker/ingestion/logo-image.js';
import { pinnedResource, retrieveLogo } from './logo-transport.ts';
import { createLogoReferences } from './logo-reference.ts';
import { IngestionError } from '../../../tools/prospect-tracker/ingestion/errors.js';
type Preview=import('../../../tools/prospect-tracker/ingestion/preview.js').IngestionPreview;
type Candidate=import('../../../tools/prospect-tracker/ingestion/logo-suitability.js').LogoCandidate;

/** Trusted-only caller of the reusable pinned transport. Never expose this
 * resource function directly as a client URL-fetch action. */
export function createBranding(options:{origin:string,owner:string,secret?:string,resource?:typeof pinnedResource}) {
  const resource=options.resource??pinnedResource;
  const references=options.secret?createLogoReferences(options.origin,options.secret):null;
  const raster=async(url:string,signal:AbortSignal)=>{
    const result=await resource(url,signal,{accept:'image/png,image/jpeg,image/webp',byteLimit:LOGO_BYTE_LIMIT});
    return {...rasterMetadata(result.bytes),bytes:result.bytes};
  };
  return {
    async resolve(preview:Preview,parent:AbortSignal) {
      const current=preview.draft.company_logo_url;
      if(current&&brandingContext(current)!=='branding'){delete preview.draft.company_logo_url;delete preview.field_sources.company_logo_url;}
      if(!references)return preview; // Safe compatibility until the server key is configured.
      const signal=AbortSignal.any([parent,AbortSignal.timeout(8500)]);
      const candidates:Candidate[]=[];
      const add=async(url:string,source:'ats'|'website',role:Candidate['role'],site:string)=>{
        const context=brandingContext(url);
        if(context!=='branding'){console.debug('[company-logo]','rejected-marketing-context');return;}
        try{
          const image=await raster(url,signal);
          // Narrow ATS URLs remain backward-compatible references. Every other
          // asset needs an owner-bound server proof for credential-free delivery.
          const reference=source==='ats'&&atsLogoUrl(url)?atsLogoUrl(url)!:references?await references.issue({url,site,role},options.owner):null;
          if(!reference)return;
          candidates.push({url:reference,source,role,employerMatched:true,context,width:image.width,height:image.height});
        }catch{console.debug('[company-logo]','candidate-image-unavailable');}
      };
      const ats=current?add(current,'ats','ats-logo',new URL(preview.identity.canonical_url).origin+'/'):Promise.resolve();
      const website=preview.employer_website;
      const siteWork=(async()=>{
        if(!references||!website||!preview.draft.company)return;
        try{
          const page=await resource(website.url,signal,{accept:'text/html',byteLimit:1024*1024});
          if(page.type!=='text/html')return;
          const declared=websiteIcons(new TextDecoder().decode(page.bytes),website.url,preview.draft.company);
          let icons=declared.icons;
          if(declared.manifest){
            try{
              const response=await resource(declared.manifest,signal,{accept:'application/manifest+json,application/json',byteLimit:65536});
              if(['application/json','application/manifest+json'].includes(response.type)){
                const manifest=manifestIcons(JSON.parse(new TextDecoder().decode(response.bytes)),declared.manifest);
                const all=[...icons.filter(icon=>icon.role==='touch-icon'),...manifest,...icons.filter(icon=>icon.role!=='touch-icon')];
                icons=[...new Map(all.map(icon=>[icon.url,icon])).values()].slice(0,3);
              }
            }catch{/* Optional manifest never discards declared icons or ATS facts. */}
          }
          await Promise.allSettled(icons.map(icon=>add(icon.url,'website',icon.role,website.url)));
        }catch{console.debug('[company-logo]','verified-site-discovery-unavailable');}
      })();
      await Promise.allSettled([ats,siteWork]);parent.throwIfAborted();
      // Async completion order must not affect selection or ranking.
      const roles=['ats-logo','touch-icon','manifest-icon','favicon','organization-logo'];
      candidates.sort((a,b)=>roles.indexOf(a.role)-roles.indexOf(b.role)||a.url.localeCompare(b.url));
      preview.logo_candidates=candidates.slice(0,4);
      if(!candidates.length){delete preview.draft.company_logo_url;delete preview.field_sources.company_logo_url;}
      return preview;
    },
    async deliver(url:string,signal:AbortSignal) {
      if(atsLogoUrl(url))return retrieveLogo(url,signal);
      if(!references||!managedLogoUrl(url))throw new IngestionError('logo_candidate_rejected','Unsupported company image.',400);
      let proof;try{proof=await references.verify(url,options.owner);}catch{throw new IngestionError('logo_candidate_rejected','Invalid company image reference.',400);}
      const image=await raster(proof.url,signal);return {bytes:image.bytes,type:image.type};
    }
  };
}
