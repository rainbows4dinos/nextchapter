/** @typedef {{name:string,title?:string,company?:string,profile_url?:string,status:'manual'|'suggested'|'user_selected'|'user_verified'}} HiringManager */
export const CONTACT_STATUSES = ['manual', 'suggested', 'user_selected', 'user_verified'];
/** @param {unknown} input @returns {HiringManager|null} */
export function validateHiringManager(input) {
  if (input == null) return null;
  if (typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid potential hiring manager.');
  const value = /** @type {Record<string,unknown>} */ (input);
  if (Object.keys(value).some(key => !['name','title','company','profile_url','status'].includes(key))) throw new Error('Unknown potential hiring manager field.');
  /** @type {Record<string,string>} */ const contact = {};
  for (const [key, limit] of /** @type {[string,number][]} */ ([['name',120],['title',160],['company',160],['profile_url',2048]])) {
    if (value[key] == null) continue;
    if (typeof value[key] !== 'string') throw new Error('Potential hiring manager fields must be text.');
    const text = value[key].trim();
    if (text.length > limit) throw new Error(`Potential hiring manager ${key} is too long.`);
    if (text) contact[key] = text;
  }
  if (!Object.keys(contact).length) return null;
  if (!contact.name) throw new Error('Add a potential hiring manager name, or clear the contact details.');
  const status = value.status ?? 'manual';
  if (!CONTACT_STATUSES.includes(/** @type {string} */ (status))) throw new Error('Invalid potential hiring manager status.');
  if (contact.profile_url) {
    let url;
    try { url = new URL(contact.profile_url); } catch { throw new Error('Use a complete HTTP/HTTPS professional profile URL.'); }
    if (!['http:','https:'].includes(url.protocol) || url.username || url.password || /\s|\\/.test(contact.profile_url)) throw new Error('Use an HTTP/HTTPS professional profile URL without credentials.');
  }
  return /** @type {HiringManager} */ ({ ...contact, status });
}

/** @param {FormData} form */
export function readHiringManager(form) {
  return validateHiringManager({
    name: String(form.get('hiring_manager_name') ?? ''), title: String(form.get('hiring_manager_title') ?? ''),
    company: String(form.get('hiring_manager_company') ?? ''), profile_url: String(form.get('hiring_manager_profile_url') ?? ''),
    status: String(form.get('hiring_manager_status') ?? 'manual')
  });
}
