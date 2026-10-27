/** Strict, query-free references. CDN parameters are constructed only at render time. */
let clientId = '';
/** @param {unknown} value */
export function configureBrandfetch(value) {
  clientId = typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value.trim()) ? value.trim() : '';
}
export function brandfetchEnabled() { return !!clientId; }

/** @param {unknown} value @returns {string|null} */
export function brandfetchDomain(value) {
  if (typeof value !== 'string' || value.length > 253) return null;
  const domain = value.toLowerCase();
  if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain) ||
      /(?:^|\.)(?:localhost|local|localdomain|internal|lan|home|corp|test|invalid|example|onion|home\.arpa)$/.test(domain)) return null;
  return domain;
}
/** @param {unknown} value @returns {{domain:string,variant:string}|null} */
export function brandfetchReference(value) {
  if (typeof value !== 'string') return null;
  const match = /^https:\/\/cdn\.brandfetch\.io\/domain\/([^/]+)\/type\/(icon|symbol|logo)$/.exec(value);
  const domain = match && brandfetchDomain(match[1]);
  return match && domain ? { domain, variant: match[2] } : null;
}
/** @param {string} domain @param {string} [variant] */
export function brandfetchLogo(domain, variant = 'icon') {
  const reference = `https://cdn.brandfetch.io/domain/${domain}/type/${variant}`;
  if (!brandfetchReference(reference)) throw new Error('Choose a valid company logo.');
  return reference;
}
/** Returns a direct image URL only; never fetch its bytes through application code.
 * @param {string} value */
export function brandfetchImage(value) {
  const ref = brandfetchReference(value);
  return ref && clientId ? `${brandfetchLogo(ref.domain, ref.variant)}/w/112/h/112/theme/dark/fallback/404?c=${encodeURIComponent(clientId)}` : null;
}
/** Live, user-driven autocomplete only. No stored responses or authenticated client.
 * @param {string} query @param {AbortSignal} signal @param {typeof fetch} [request]
 * @returns {Promise<{name:string,domain:string}[]>} */
export async function searchBrands(query, signal, request = fetch) {
  query = query.trim().slice(0, 120);
  if (!query || !clientId) return [];
  const response = await request(`https://api.brandfetch.io/v2/search/${encodeURIComponent(query)}?c=${encodeURIComponent(clientId)}`, {
    credentials: 'omit', referrerPolicy: 'origin', cache: 'no-store', signal
  });
  if (response.status === 429) throw new Error('Too many searches. Please wait a moment and try again.');
  if (!response.ok) throw new Error('Company search is unavailable. Try again or use an image URL.');
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error('Company search is unavailable. Try again or use an image URL.');
  return data.slice(0, 5).flatMap(row => {
    const domain = brandfetchDomain(row?.domain);
    return domain ? [{ domain, name: typeof row?.name === 'string' && row.name.trim() ? row.name : domain }] : [];
  });
}
