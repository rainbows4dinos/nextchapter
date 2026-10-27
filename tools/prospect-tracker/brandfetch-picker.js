// @ts-expect-error Browser asset revision; TypeScript does not resolve URL query strings.
import { companyAvatar } from './company-avatar.js?v=20261026-logo-grid';
import { brandfetchLogo, searchBrands } from './brandfetch.js';

/** Live manual selection only; persistence is supplied by the existing editor.
 * @param {(url:string)=>Promise<void>} select */
export function brandfetchPicker(select) {
  /** @template {keyof HTMLElementTagNameMap} T @param {T} tag @param {string} [className] */
  const node = (tag, className = '') => { const item = document.createElement(tag); item.className = className; return item; };
  const root = node('div', 'company-logo-search');
  const query = node('input', 'nc-input'); query.id = 'company-logo-search'; query.type = 'search'; query.maxLength = 120; query.autocomplete = 'off'; query.placeholder = 'Search companies'; query.setAttribute('aria-label', 'Search Companies');
  const status = node('p', 'company-logo-feedback'); status.setAttribute('role', 'status');
  const results = node('div', 'company-logo-results'); results.setAttribute('role', 'group'); results.setAttribute('aria-label', 'Company Logos');
  results.id = 'company-logo-results'; query.setAttribute('aria-controls', results.id);
  root.append(query, status, results);
  /** @type {ReturnType<typeof setTimeout>|undefined} */ let debounce;
  /** @type {AbortController|undefined} */ let request;
  let generation = 0, active = false, saving = false, selected = '';
  const cancelRequest = () => { generation++; clearTimeout(debounce); request?.abort(); results.replaceChildren(); };
  const schedule = () => {
    if (saving) return;
    cancelRequest(); const current = generation, text = query.value.trim();
    status.textContent = text ? 'Searching…' : ''; results.setAttribute('aria-busy', String(!!text));
    if (!text) return;
    debounce = setTimeout(() => {
      const controller = new AbortController(); request = controller; let timedOut = false;
      const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 8000);
      void searchBrands(text, controller.signal).then(matches => {
        if (!active || current !== generation) return;
        status.textContent = matches.length ? '' : 'No logos found. Try another company name.';
        for (const match of matches) {
          const reference = brandfetchLogo(match.domain);
          const button = node('button', 'company-logo-result'); button.type = 'button'; button.disabled = true;
          button.setAttribute('aria-label', `${match.name} — ${match.domain}`); button.setAttribute('aria-pressed', String(reference === selected)); button.setAttribute('aria-busy', 'true');
          const name = node('strong'); name.textContent = match.name; name.title = match.name;
          const domain = node('span', 'company-logo-domain'); domain.textContent = match.domain; domain.title = match.domain;
          const feedback = node('span', 'company-logo-tile-state'); feedback.textContent = 'Loading…';
          const image = companyAvatar(match.name, true, reference, (/** @type {boolean} */ loaded) => {
            if (!active || current !== generation) return;
            button.dataset.ready = String(loaded); button.disabled = saving || !loaded;
            button.setAttribute('aria-busy', 'false'); feedback.textContent = loaded ? '' : 'Unavailable';
          });
          button.append(image, name, domain, feedback);
          button.addEventListener('click', () => {
            if (saving || button.dataset.ready !== 'true') return;
            saving = true; query.disabled = true; button.setAttribute('aria-busy', 'true'); feedback.textContent = 'Saving…'; status.textContent = 'Saving logo…';
            for (const tile of results.querySelectorAll('button')) tile.disabled = true;
            void select(reference).then(() => { status.textContent = 'Logo selected.'; }).catch(error => {
              status.textContent = error instanceof Error ? error.message : 'Could not save the logo. Try again.';
            }).finally(() => {
              saving = false; query.disabled = false; button.setAttribute('aria-busy', 'false'); feedback.textContent = '';
              for (const tile of results.querySelectorAll('button')) tile.disabled = tile.dataset.ready !== 'true';
              if (active) button.focus();
            });
          });
          results.append(button);
        }
      }).catch(() => {
        if (!active || current !== generation) return;
        status.textContent = timedOut ? 'Search timed out. Edit the name to try again.' : 'Could not search right now. Edit the name to try again.';
      }).finally(() => { clearTimeout(timeout); if (current === generation) results.setAttribute('aria-busy', 'false'); });
    }, 300);
  };
  query.addEventListener('input', schedule);
  query.addEventListener('keydown', event => {
    if (event.key === 'Enter') event.preventDefault();
    if (event.key === 'ArrowDown') { event.preventDefault(); [...results.querySelectorAll('button')].find(tile => !tile.disabled)?.focus(); }
  });
  results.addEventListener('keydown', event => {
    const tiles = [...results.querySelectorAll('button')].filter(tile => !tile.disabled);
    const index = tiles.findIndex(tile => tile === document.activeElement);
    const columns = window.getComputedStyle(results).gridTemplateColumns.split(' ').length;
    const movement = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns };
    if (index < 0 || !(event.key in movement)) return;
    event.preventDefault();
    tiles[Math.max(0, Math.min(tiles.length - 1, index + movement[/** @type {keyof typeof movement} */ (event.key)]))]?.focus();
  });
  return { root, query, isSaving: () => saving,
    open(/** @type {string} */ company, /** @type {string} */ reference = '') { active = true; selected = reference; query.value = company; schedule(); },
    close() { active = false; cancelRequest(); status.textContent = ''; }
  };
}
