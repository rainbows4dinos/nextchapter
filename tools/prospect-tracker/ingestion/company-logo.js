import { atsLogoUrl } from '../ats-logo.js';
import { logoUrl } from '../company-logo.js';
import { object, text } from './posting-facts.js';

const normalized = /** @param {string} name */ name => name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
const intermediary = /\b(?:greenhouse|ashby|lever|workable|workday|recruit(?:er|ing|ment)?|staffing|talent agency|confidential|undisclosed)\b/i;

/** Only an employer-bound logo, never og:image, publisher.logo or a page image.
 * Ambiguity is normal. Never retrieve the URL here.
 * @param {unknown} organization @param {string|undefined|null} company */
export function employerLogo(organization, company) {
  const org = object(organization), name = text(org.name);
  if (!name || !company || normalized(name) !== normalized(company) || intermediary.test(name)) return null;
  const image = org.logo;
  const imageObject = object(image);
  const candidate = typeof image === 'string' ? image : text(imageObject.contentUrl) ?? text(imageObject.url);
  if (imageObject.contentUrl && imageObject.url && imageObject.contentUrl !== imageObject.url) return null;
  try {
    const ats = atsLogoUrl(candidate);
    if (ats) return ats;
    const url = logoUrl(candidate);
    // Reject platform origins and known branding paths. Employer-specific
    // assets on independent CDNs can still be accepted.
    if (url && (/(?:^|\/)(?:greenhouse|ashby|lever|workable|workday)(?:[./_-]|$)/i.test(new URL(url).pathname) ||
      /(?:^|\.)(?:greenhouse\.(?:io|com)|ashbyhq\.com|lever\.co|workable\.com|workday\.com)$/.test(new URL(url).hostname))) return null;
    return url;
  } catch { return null; }
}

/** @param {import('../model.js').DetailsPatch} draft @param {Record<string,string>} sources
 * @param {unknown[]} organizations */
export function addEmployerLogo(draft, sources, organizations) {
  const logos = organizations.map(org => employerLogo(org, draft.company)).filter(Boolean);
  const unique = [...new Set(logos)];
  if (unique.length === 1) { draft.company_logo_url = unique[0]; sources.company_logo_url = 'Employer-bound logo metadata (review before saving)'; }
  console.debug('[company-logo]', unique.length === 1 ? 'candidate_accepted' : organizations.some(org => object(org).logo) ? 'candidate_rejected' : 'no_candidate');
}
