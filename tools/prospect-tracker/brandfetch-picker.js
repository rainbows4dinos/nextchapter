// @ts-expect-error Browser asset revision; TypeScript does not resolve URL query strings.
import { companyAvatar } from './company-avatar.js?v=20261026-brandfetch-picker';
import { brandfetchLogo, searchBrands } from './brandfetch.js';

/** A live autocomplete in the existing editor. No persistence or identity inference.
 * @param {(url:string,ready:boolean)=>void} select */
export function brandfetchPicker(select) {
  /** @template {keyof HTMLElementTagNameMap} T @param {T} tag @param {string} [className] */
  const node = (tag, className = '') => { const item = document.createElement(tag); item.className = className; return item; };
  const root = node('div', 'company-logo-search');
  const label = node('label', 'nc-field__label'); label.htmlFor = 'company-logo-search'; label.textContent = 'Find a Company';
  const query = node('input', 'nc-input'); query.id = label.htmlFor; query.type = 'search'; query.maxLength = 120; query.autocomplete = 'off';
  const status = node('p', 'company-logo-feedback'); status.setAttribute('role', 'status');
  const results = node('div', 'company-logo-results'); results.setAttribute('role', 'group'); results.setAttribute('aria-label', 'Company Matches');
  const preview = node('div', 'company-logo-preview'); preview.hidden = true;
  const image = node('div');
  const variantLabel = node('label', 'nc-field__label'); variantLabel.htmlFor = 'company-logo-variant'; variantLabel.textContent = 'Logo Style';
  const variant = node('select', 'nc-input'); variant.id = variantLabel.htmlFor;
  for (const [value, text] of [['icon', 'Icon'], ['symbol', 'Symbol'], ['logo', 'Logo']]) { const option = node('option'); option.value = value; option.textContent = text; variant.append(option); }
  const imageStatus = node('p', 'company-logo-feedback'); imageStatus.setAttribute('role', 'status');
  preview.append(image, variantLabel, variant, imageStatus); root.append(label, query, status, results, preview);
  /** @type {ReturnType<typeof setTimeout>|undefined} */ let debounce;
  /** @type {AbortController|undefined} */ let request;
  let generation = 0, imageGeneration = 0, active = false;
  /** @type {{name:string,domain:string}|null} */ let selected = null;
  const cancelRequest = () => { generation++; clearTimeout(debounce); request?.abort(); results.replaceChildren(); };
  const showSelection = () => {
    if (!selected) return;
    const reference = brandfetchLogo(selected.domain, variant.value);
    const current = ++imageGeneration;
    preview.hidden = false; imageStatus.textContent = 'Loading logo…'; select(reference, false);
    image.replaceChildren(companyAvatar(selected.name, true, reference, (/** @type {boolean} */ loaded) => {
      if (!active || current !== imageGeneration) return;
      imageStatus.textContent = loaded ? '' : 'This logo style is unavailable. Try another style or image URL.';
      select(reference, loaded);
    }));
  };
  variant.addEventListener('change', showSelection);
  const schedule = () => {
    cancelRequest(); const current = generation;
    if (selected) select('', false);
    selected = null; imageGeneration++; preview.hidden = true; image.replaceChildren();
    const text = query.value.trim();
    status.textContent = text ? 'Searching…' : 'Enter a company name to find its logo.';
    if (!text) return;
    debounce = setTimeout(() => {
      const controller = new AbortController(); request = controller;
      let timedOut = false;
      const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 8000);
      void searchBrands(text, controller.signal).then(matches => {
        if (!active || current !== generation) return;
        status.textContent = matches.length ? 'Choose the company you mean.' : 'No companies found. Try another name or use an image URL.';
        for (const match of matches) {
          const button = node('button', 'company-logo-result'); button.type = 'button'; button.setAttribute('aria-pressed', 'false');
          const copy = node('span'); const name = node('strong'); name.textContent = match.name; const domain = node('span'); domain.textContent = match.domain; copy.append(name, domain);
          button.append(companyAvatar(match.name, false, brandfetchLogo(match.domain)), copy);
          button.addEventListener('click', () => {
            for (const other of results.querySelectorAll('button')) other.setAttribute('aria-pressed', String(other === button));
            selected = match; variant.value = 'icon'; showSelection();
          });
          results.append(button);
        }
      }).catch(error => {
        if (!active || current !== generation) return;
        status.textContent = timedOut ? 'Search timed out. Edit the name to try again or use an image URL.' : error instanceof Error && !controller.signal.aborted ? error.message : 'Search canceled.';
      }).finally(() => clearTimeout(timeout));
    }, 300);
  };
  query.addEventListener('input', schedule);
  query.addEventListener('keydown', event => { if (event.key === 'Enter') event.preventDefault(); });
  return { root, query,
    open(/** @type {string} */ company) { active = true; query.value = company; variant.value = 'icon'; schedule(); },
    close() { active = false; cancelRequest(); imageGeneration++; selected = null; image.replaceChildren(); preview.hidden = true; status.textContent = ''; },
    custom() { imageGeneration++; selected = null; preview.hidden = true; image.replaceChildren(); }
  };
}
