/** Logos are references, never markup. No credentials, query payloads, local
 * addresses, or fragments; image requests must not carry prospect information.
 * @param {unknown} value @returns {string|null} */
export function logoUrl(value) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || value.length > 2048) throw new Error('Company logo must be a public HTTPS image URL without credentials, query parameters or fragments.');
  const raw = value.trim();
  if (!raw) return null;
  const url = new URL(raw);
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.port ||
      !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(host) || /(?:^|\.)(?:localhost|local|internal|test|invalid|example)$/.test(host) ||
      /^\d+(?:\.\d+)*$/.test(host) || /[\s\\<>"]/.test(raw)) {
    throw new Error('Company logo must be a public HTTPS image URL without credentials, query parameters or fragments.');
  }
  return url.href;
}

/** Copy automatic candidates only until the user edits or explicitly clears.
 * The marker is persisted with the prospect; retrieval never clears it.
 * @param {{company_logo_url?:string|null,company_logo_override?:boolean}} current
 * @param {string|null|undefined} candidate */
export function mergeLogo(current, candidate) {
  return current.company_logo_override ? { company_logo_url: current.company_logo_url ?? null, company_logo_override: true }
    : { company_logo_url: logoUrl(candidate), company_logo_override: false };
}
