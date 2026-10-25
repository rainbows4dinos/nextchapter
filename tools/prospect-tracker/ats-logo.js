/** Public employer asset routes verified in supported ATS responses. This is
 * deliberately not a generic hostname allowlist or an arbitrary image fetcher.
 * Greenhouse's bare numeric version parameter can be discarded; other query
 * strings and signed URLs are not rewritten.
 * @param {unknown} value @returns {string|null} */
export function atsLogoUrl(value) {
  if (typeof value !== 'string' || value.length > 2048 || /[\s\\<>"%]/.test(value)) return null;
  let url; try { url = new URL(value); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash) return null;
  const uuid = '[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}';
  const ashby = url.hostname === 'app.ashbyhq.com' && new RegExp(`^/api/images/org-theme-logo/${uuid}/${uuid}/${uuid}\\.(?:png|jpe?g|webp)$`, 'i').test(url.pathname);
  const greenhouse = /^s\d{1,2}-recruiting\.cdn\.greenhouse\.io$/.test(url.hostname) && /^\/external_greenhouse_job_boards\/logos\/(?:\d+\/){3}original\/[a-zA-Z0-9_.()-]{1,200}\.(?:png|jpe?g|webp)$/.test(url.pathname);
  const lever = ['lever-client-logos.s3.us-west-2.amazonaws.com','lever-client-logos.s3.amazonaws.com'].includes(url.hostname) && new RegExp(`^/${uuid}-[0-9]{10,16}\\.(?:png|jpe?g|webp)$`, 'i').test(url.pathname);
  const workable = url.hostname === 'workablehr.s3.amazonaws.com' && /^\/uploads\/account\/logo\/\d+\/logo$/.test(url.pathname);
  if (!ashby && !greenhouse && !lever && !workable) return null;
  if (url.search && !(greenhouse && /^\?\d{10,16}$/.test(url.search))) return null;
  url.search = ''; return url.href;
}
