import { managedLogoUrl } from './managed-logo.js';
import { logoUrl } from './company-logo.js';
import { atsLogoUrl } from './ats-logo.js';
import { logoDiagnostic } from './logo-diagnostics.js';

/** @type {((url:string, signal:AbortSignal)=>Promise<Blob>)|null} */
let loadLogo = null;
/** Set once by the application using its existing authenticated client.
 * @param {typeof loadLogo} loader */
export function configureLogoDelivery(loader) { loadLogo = loader; failed.clear(); }

// Suppress repeated failures across board rerenders for this page session.
const failed = new Set();
/** Canonical Company Avatar: decorative because company text remains adjacent.
 * Remote content is only an image, with no referrer or cross-origin credentials.
 * @param {string} company @param {boolean} [large] @param {string|null} [logo] */
export function companyAvatar(company, large = false, logo = null) {
  const avatar = document.createElement('span');
  avatar.className = `nc-avatar nc-avatar--company nc-avatar--${large ? 'lg' : 'sm'}`;
  avatar.setAttribute('aria-hidden', 'true');
  const initials = document.createElement('span');
  initials.textContent = (company.match(/[\p{L}\p{N}]/u)?.[0] ?? '?').toLocaleUpperCase();
  avatar.append(initials);
  let url;
  try { url = logoUrl(logo); } catch { logoDiagnostic('candidate_rejected'); return avatar; }
  if (!url) { logoDiagnostic('no_candidate'); return avatar; }
  if (failed.has(url) || failed.size >= 128) return avatar;
  const img = document.createElement('img'); img.className = 'nc-avatar__image';
  img.alt = ''; img.draggable = false; img.referrerPolicy = 'no-referrer';
  img.crossOrigin = 'anonymous'; img.decoding = 'async'; img.hidden = true;
  const controller = new AbortController();
  let objectUrl = '';
  const release = () => { if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = ''; } };
  const fail = () => {
    controller.abort(); release(); logoDiagnostic('image_failed');
    initials.hidden = false; avatar.classList.remove('nc-avatar--logo');
    clearTimeout(timer); img.remove(); img.removeAttribute('src');
    if (failed.size < 128) failed.add(url);
  };
  const timer = setTimeout(fail, 8000);
  img.addEventListener('error', fail, { once: true });
  img.addEventListener('load', () => { clearTimeout(timer); if (img.naturalWidth) { initials.hidden = true; avatar.classList.add('nc-avatar--logo'); img.hidden = false; release(); logoDiagnostic('image_rendered'); } else fail(); }, { once: true });
  avatar.append(img);
  if (atsLogoUrl(url) || managedLogoUrl(url)) {
    if (!loadLogo) fail();
    else void loadLogo(url, controller.signal).then(blob => {
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(blob); img.src = objectUrl;
    }).catch(fail);
  } else img.src = url;
  return avatar;
}
