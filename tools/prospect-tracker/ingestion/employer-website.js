import { employerMatches } from './company-logo.js';
import { Parser } from 'htmlparser2';
import { logoUrl } from '../company-logo.js';

const normalized=/** @param {string} value */value=>value.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
const excluded=/(?:^|\.)(?:greenhouse\.(?:io|com)|ashbyhq\.com|lever\.co|workable\.com|myworkdayjobs\.com|myworkdaysite\.com|workday\.com|linkedin\.com|facebook\.com|instagram\.com|twitter\.com|x\.com|youtube\.com|youtu\.be|github\.com|google\.com)$/i;
/** Public query-free website reference. HTTP metadata may identify a hostname,
 * but only its HTTPS equivalent is ever retrieved, with normal TLS validation.
 * @param {unknown} value @returns {string|null} */
export function employerWebsiteUrl(value) {
  if(typeof value!=='string'||value.length>1000||/[\s\\<>"]/.test(value))return null;
  try{const url=new URL(value);if(url.protocol==='http:')url.protocol='https:';const safe=logoUrl(url.href);if(!safe||excluded.test(url.hostname)||/\b(?:recruiting|staffing|recruitment)\b/i.test(url.hostname))return null;return safe;}catch{return null;}
}
/** @typedef {{url:string,kind:'matched-organization'|'matched-posting-link'|'bound-provider-account',source:string}} WebsiteEvidence */
/** @param {unknown} organization @param {string|null|undefined} company @param {string} source @returns {WebsiteEvidence|undefined} */
export function organizationWebsite(organization,company,source) {
  if(!organization||typeof organization!=='object'||!company)return;
  const org=/** @type {Record<string,unknown>} */(organization);
  if(!employerMatches(org.name,company)||typeof org.sameAs!=='string')return;
  const url=employerWebsiteUrl(org.sameAs);return url?{url,kind:'matched-organization',source}:undefined;
}
/** Only explicit company/homepage labels in a matched posting. Not arbitrary
 * description links, social icons, privacy links or name-derived domains.
 * Ambiguous distinct website destinations fail closed.
 * @param {string} html @param {string} company @param {string} source @returns {WebsiteEvidence|undefined} */
export function postingWebsite(html,company,source) {
  if(!employerMatches(company,company))return;
  /** @type {string[]} */const found=[];let href='',label='',active=false;
  const parser=new Parser({onopentag(name,attrs){if(name==='a'){href=attrs.href??'';label='';active=true;}},ontext(text){if(active)label+=text;},onclosetag(name){if(name==='a'&&active){const text=normalized(label),employer=normalized(company);if([employer,employer+' home page',employer+' homepage',employer+' website','visit '+employer].includes(text)){const url=employerWebsiteUrl(href);if(url)found.push(url);}active=false;}}});parser.end(html);
  const unique=[...new Set(found)];return unique.length===1?{url:unique[0],kind:'matched-posting-link',source}:undefined;
}
/** @param {WebsiteEvidence|undefined} a @param {WebsiteEvidence|undefined} b */
export function unambiguousWebsite(a,b) {
  if(a&&b&&new URL(a.url).hostname.replace(/^www\./,'')!==new URL(b.url).hostname.replace(/^www\./,''))return;
  return a??b;
}
