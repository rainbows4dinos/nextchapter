import { managedLogoUrl } from '../../../tools/prospect-tracker/managed-logo.js';
import { employerWebsiteUrl } from '../../../tools/prospect-tracker/ingestion/employer-website.js';
import { logoUrl } from '../../../tools/prospect-tracker/company-logo.js';

const encode=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const decode=(value:string)=>Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/').padEnd(Math.ceil(value.length/4)*4,'=')),c=>c.charCodeAt(0));
const encoder=new TextEncoder();
/** Stable references survive saving without a schema change or URL expiry.
 * Owner-scoped HMAC is checked on every use; keep the key stable across deploys.
 * Only server-verified public asset/site/role metadata is encoded, no user data. */
export function createLogoReferences(origin:string,secret:string) {
  const issuer=new URL('/functions/v1/job-ingest/logo/',origin).href;
  if(secret.length<32)throw new Error('Logo signing key must have at least 32 characters');
  const key=crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
  const valid=(url:string,site:string,role:string)=>{
    const website=role==='ats-logo'?new URL(site).pathname==='/'&&/^(?:jobs(?:\.eu)?\.lever\.co|jobs\.ashbyhq\.com|job-boards\.greenhouse\.io|apply\.workable\.com|[a-z0-9.-]+\.myworkdayjobs\.com|[a-z0-9.-]+\.myworkdaysite\.com)$/.test(new URL(site).hostname)&&!!logoUrl(site):!!employerWebsiteUrl(site);
    return website&&!!logoUrl(url)&&url.length<=1000;
  };
  return {
    async issue(asset:{url:string,site:string,role:string},owner:string) {
      if(!valid(asset.url,asset.site,asset.role)||!['ats-logo','touch-icon','manifest-icon','favicon','organization-logo'].includes(asset.role))throw new Error('Invalid verified asset');
      const payload=encode(encoder.encode(JSON.stringify({v:1,url:asset.url,site:asset.site,role:asset.role})));
      const signed=await crypto.subtle.sign('HMAC',await key,encoder.encode(issuer+'\n'+owner+'\n'+payload));
      const reference=issuer+'v1.'+payload+'.'+encode(new Uint8Array(signed));
      if(reference.length>2048)throw new Error('Managed reference too long');
      return reference;
    },
    async verify(reference:string,owner:string) {
      if(!managedLogoUrl(reference)||!reference.startsWith(issuer))throw new Error('Invalid logo issuer');
      const [,payload,signature]=reference.slice(issuer.length).split('.');
      if(!await crypto.subtle.verify('HMAC',await key,decode(signature),encoder.encode(issuer+'\n'+owner+'\n'+payload)))throw new Error('Invalid logo signature');
      const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(decode(payload)));
      if(value.v!==1||typeof value.url!=='string'||typeof value.site!=='string'||!valid(value.url,value.site,value.role)||!['ats-logo','touch-icon','manifest-icon','favicon','organization-logo'].includes(value.role))throw new Error('Invalid logo proof');
      return value as {v:1,url:string,site:string,role:string};
    }
  };
}
