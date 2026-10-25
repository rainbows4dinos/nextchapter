import { logoUrl } from './company-logo.js';

// Suppress repeated failures across board rerenders for this page session.
const failed = new Set();
/** Canonical Company Avatar: decorative because company text remains adjacent.
 * Remote content is only an image, with no referrer or cross-origin credentials.
 * @param {string} company @param {boolean} [large] @param {string|null} [logo] */
export function companyAvatar(company, large = false, logo = null) {
  const avatar = document.createElement('span');
  avatar.className = `nc-avatar nc-avatar--company nc-avatar--${large ? 'lg' : 'sm'}`;
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = (company.match(/[\p{L}\p{N}]/u)?.[0] ?? '?').toLocaleUpperCase();
  let url;
  try { url = logoUrl(logo); } catch { return avatar; }
  if (!url || failed.has(url) || failed.size >= 128) return avatar;
  const img = document.createElement('img'); img.className = 'nc-avatar__image';
  img.alt = ''; img.draggable = false; img.referrerPolicy = 'no-referrer';
  img.crossOrigin = 'anonymous'; img.decoding = 'async'; img.hidden = true;
  const fail = () => {
    clearTimeout(timer); img.remove(); img.removeAttribute('src');
    if (failed.size < 128) failed.add(url);
  };
  const timer = setTimeout(fail, 8000);
  img.addEventListener('error', fail, { once: true });
  img.addEventListener('load', () => { clearTimeout(timer); if (img.naturalWidth) img.hidden = false; else fail(); }, { once: true });
  avatar.append(img); img.src = url;
  return avatar;
}
