import { employerLogo } from './company-logo.js';
import { Parser } from 'htmlparser2';
import { logoUrl } from '../company-logo.js';
import { organizationWebsite } from './employer-website.js';

/** @typedef {{url:string,role:import('./logo-suitability.js').LogoRole}} DeclaredIcon */
/** @param {unknown} value @param {string} base */
function assetUrl(value,base){try{if(typeof value!=='string'||value.length>1000||/[\s\\<>"]/.test(value))return null;return logoUrl(new URL(value,base).href);}catch{return null;}}
/** Inert declarations only. No scripts, page images, social images or guessed
 * root paths. Upstream caller owns verified identity, byte and request budgets.
 * @param {string} html @param {string} website @param {string} company */
export function websiteIcons(html,website,company) {
  /** @type {DeclaredIcon[]} */const icons=[];
  /** @type {string[]} */const manifests=[];
  let script=false,buffer='',scripts=0;
  /** @type {unknown[]} */const roots=[];
  const parser=new Parser({onopentag(name,a){
    if(name==='link'){
      const rel=(a.rel??'').toLowerCase().split(/\s+/),url=assetUrl(a.href,website);
      if(!url||/svg|gif/i.test(a.type??''))return;
      if(rel.includes('apple-touch-icon')||rel.includes('apple-touch-icon-precomposed'))icons.push({url,role:'touch-icon'});
      else if(rel.includes('icon'))icons.push({url,role:'favicon'});
      else if(rel.includes('manifest')&&new URL(url).origin===new URL(website).origin)manifests.push(url);
    }
    if(name==='script'){script=/^application\/ld\+json(?:\s*;|$)/i.test(a.type??'')&&scripts++<16;buffer='';}
  },ontext(text){if(script)buffer+=text;},onclosetag(name){if(name==='script'&&script){try{roots.push(JSON.parse(buffer));}catch{/* Ambiguity is normal. */}script=false;}}});parser.end(html);
  const queue=roots.map(value=>({value,depth:0}));
  for(let i=0;i<queue.length&&i<200;i++){
    const {value,depth}=queue[i];if(depth>8)continue;
    if(Array.isArray(value)){queue.push(...value.slice(0,100).map(value=>({value,depth:depth+1})));continue;}
    if(!value||typeof value!=='object')continue;const obj=/** @type {Record<string,unknown>} */(value);
    const types=Array.isArray(obj['@type'])?obj['@type']:[obj['@type']];
    if(types.includes('Organization')&&organizationWebsite({...obj,sameAs:website},company,website)){
      const logo=obj.logo;const image=logo&&typeof logo==='object'?/** @type {Record<string,unknown>} */(logo):{};
      if(!(image.url&&image.contentUrl&&image.url!==image.contentUrl)){const url=assetUrl(typeof logo==='string'?logo:image.contentUrl??image.url,website);if(url)icons.push({url,role:'organization-logo'});}
    }
    if(obj['@graph'])queue.push({value:obj['@graph'],depth:depth+1});
  }
  const priority=['touch-icon','manifest-icon','favicon','organization-logo'];
  const unique=icons.filter(icon=>!!employerLogo({name:company,logo:icon.url},company)).sort((a,b)=>priority.indexOf(a.role)-priority.indexOf(b.role)).filter((icon,index,all)=>all.findIndex(other=>other.url===icon.url)===index);
  return {icons:unique.slice(0,3),manifest:[...new Set(manifests)].length===1?manifests[0]:null};
}
/** @param {unknown} input @param {string} manifest @returns {DeclaredIcon[]} */
export function manifestIcons(input,manifest) {
  if(!input||typeof input!=='object')return[];
  const icons=/** @type {{icons?:unknown}} */(input).icons;if(!Array.isArray(icons))return[];
  return icons.slice(0,16).flatMap(item=>{
    if(!item||typeof item!=='object'||typeof item.src!=='string'||/svg|gif/i.test(item.type??''))return[];
    const purposes=typeof item.purpose==='string'?item.purpose.split(/\s+/):['any'];
    if(!purposes.includes('any'))return[]; // Avoid imposing a platform mask/crop.
    const url=assetUrl(item.src,manifest);return url?[{url,role:/** @type {const} */('manifest-icon')}]:[];
  }).slice(0,3);
}

/** Explicit source-context indicators, not a vision classifier. "logo" or a
 * social platform name alone is insufficient to reject legitimate artwork.
 * @param {string} url @returns {'branding'|'marketing'} */
export function brandingContext(url) {
  let path;try{path=decodeURIComponent(new URL(url).pathname);}catch{return 'marketing';}
  return /(?:now[-_ ]hiring|(?:marketing|social)[-_ ](?:banner|image)|(?:^|[/_.-])og[-_ ]image)/i.test(path)?'marketing':'branding';
}
