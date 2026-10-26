import { postingWebsite, unambiguousWebsite } from './employer-website.js';
import { Parser } from 'htmlparser2';
import { atsLogoUrl } from '../ats-logo.js';
import { retrievePosting } from './bounded-fetch.js';

/** Only Greenhouse's employer header slot, bound to the API company and exact
 * canonical posting. Never description images, footer logos or social metadata.
 * @param {string} html @param {string} company @param {string} canonical */
export function greenhouseBranding(html, company, canonical) {
  const normalize = /** @param {string} value */ value => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
  /** @type {{name:string,classes:string[]}[]} */ const stack = [];
  /** @type {string[]} */ const logos = [];
  /** @type {string[]} */ const canonicals = [];
  const parser = new Parser({
    onopentag(name, attrs) {
      if (name === 'link' && attrs.rel?.toLowerCase() === 'canonical') {
        try { const url = new URL(attrs.href); if (url.protocol === 'http:') url.protocol = 'https:'; canonicals.push(url.href); } catch { canonicals.push('invalid'); }
      }
      if (name === 'img' && attrs.class?.split(/\s+/).includes('logo') && normalize(attrs.alt ?? '') === normalize(`${company} Logo`) &&
          stack.at(-4)?.name === 'body' && stack.at(-3)?.name === 'main' && stack.at(-3)?.classes.includes('job-post') &&
          stack.at(-2)?.classes.includes('job-post-container') && stack.at(-1)?.classes.includes('image-container')) {
        const logo = atsLogoUrl(attrs.src);
        if (logo && new URL(logo).hostname.endsWith('.cdn.greenhouse.io')) logos.push(logo);
        else logos.push('invalid');
      }
      stack.push({ name, classes: (attrs.class ?? '').split(/\s+/) });
    },
    onclosetag() { stack.pop(); }
  });
  parser.end(html);
  const logo = canonicals.length === 1 && canonicals[0] === canonical && logos.length === 1 && logos[0] !== 'invalid' ? logos[0] : null;
  console.debug('[company-logo]', logo ? 'candidate_accepted' : logos.length ? 'candidate_rejected' : 'no_candidate');
  return logo;
}

/** Optional bounded branding request; failures never discard API facts.
 * @param {import('./preview.js').IngestionPreview} preview
 * @param {{fetcher:typeof fetch,signal:AbortSignal}} options */
export async function addGreenhouseBranding(preview, options) {
  if (!preview.draft.company) return;
  try {
    const signal = globalThis.AbortSignal.any([options.signal, globalThis.AbortSignal.timeout(2500)]);
    const html = await retrievePosting(options.fetcher, preview.identity.canonical_url, signal, 'Greenhouse', 'html');
    preview.employer_website = unambiguousWebsite(preview.employer_website,postingWebsite(String(html),preview.draft.company,preview.identity.canonical_url));
    const logo = greenhouseBranding(/** @type {string} */ (html), preview.draft.company, preview.identity.canonical_url);
    if (logo && !preview.draft.company_logo_url) {
      preview.draft.company_logo_url = logo;
      preview.field_sources.company_logo_url = 'Greenhouse employer header matched to posting and company';
    }
  } catch { options.signal.throwIfAborted(); console.debug('[company-logo]', 'branding_retrieval_failed'); }
}
