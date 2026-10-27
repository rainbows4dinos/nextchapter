import { peopleSearch } from './people-search.js';

/** Saved values are captured here; form controls and private prospect fields are never read.
 * @param {{company?:string|null,title?:string|null}} saved */
export function findPeople(saved) {
  const searches = peopleSearch(saved.company, saved.title);
  const wrapper = document.createElement('div'); wrapper.className = 'find-people';
  const trigger = document.createElement('button'); trigger.type = 'button'; trigger.textContent = 'Find People';
  trigger.className = 'nc-button nc-button--tertiary nc-button--lg';
  trigger.setAttribute('aria-haspopup', 'dialog'); trigger.setAttribute('aria-controls', 'find-people-panel'); trigger.setAttribute('aria-expanded', 'false');
  const panel = document.createElement('div'); panel.id = 'find-people-panel'; panel.popover = 'auto';
  panel.className = 'find-people__panel nc-menu-elevation'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-labelledby', 'find-people-title');
  trigger.popoverTargetElement = panel;
  const title = document.createElement('h2'); title.id = 'find-people-title'; title.textContent = 'Find People';
  const disclaimer = document.createElement('p'); disclaimer.className = 'muted'; disclaimer.textContent = 'Search leads to verify—not confirmed hiring managers.';
  panel.append(title, disclaimer);
  /** @param {string} label @param {string|null} href @param {string} destination */
  function option(label, href, destination) {
    const item = document.createElement(href ? 'a' : 'span'); item.className = 'find-people__option';
    const caption = document.createElement('span'); caption.textContent = label;
    const detail = document.createElement('small'); detail.textContent = `${destination} · ${href ? 'Opens in a new tab' : 'Company name required'}`;
    item.append(caption, detail);
    if (item instanceof window.HTMLAnchorElement && href) {
      item.href = href; item.target = '_blank'; item.rel = 'noopener noreferrer';
      item.addEventListener('click', () => { panel.hidePopover(); trigger.focus({ preventScroll: true }); });
    } else item.setAttribute('aria-disabled', 'true');
    panel.append(item);
  }
  option('Potential Hiring Managers / Team Leaders', searches.leaders, 'Google');
  option('Recruiters / Talent Acquisition', searches.recruiters, 'Google');
  option('Check My Network', searches.company ? 'https://www.linkedin.com/' : null, 'LinkedIn');
  const guidance = document.createElement('p'); guidance.className = 'muted';
  guidance.textContent = searches.company
    ? `On LinkedIn, search for ${searches.company}. Select People, filter to current employees, then check first-degree connections. Consider second-degree connections for possible introductions.`
    : 'Add a clear company name and save the prospect before searching. Unknown or confidential employers cannot be targeted reliably.';
  const privacy = document.createElement('p'); privacy.className = 'muted'; privacy.textContent = 'Google receives the saved company name and role keywords only when you open a search. Results may include former employees or unrelated companies.';
  panel.append(guidance, privacy); wrapper.append(trigger, panel);
  const dismiss = () => { panel.hidePopover(); trigger.focus({ preventScroll: true }); };
  const position = () => {
    const anchor = trigger.getBoundingClientRect();
    panel.style.left = `${Math.max(16, Math.min(anchor.left, window.innerWidth - panel.offsetWidth - 16))}px`;
    panel.style.top = `${Math.max(16, Math.min(anchor.bottom + 8, window.innerHeight - panel.offsetHeight - 16))}px`;
  };
  /** @type {AbortController|undefined} */ let events;
  panel.addEventListener('toggle', () => {
    events?.abort();
    const open = panel.matches(':popover-open'); trigger.setAttribute('aria-expanded', String(open));
    if (!open) return;
    position(); (panel.querySelector('a') ?? panel).focus({ preventScroll: true });
    events = new AbortController();
    window.addEventListener('resize', position, { signal: events.signal });
    document.addEventListener('scroll', event => {
      if (event.target instanceof window.Node && !panel.contains(event.target)) position();
    }, { capture: true, signal: events.signal });
  });
  panel.tabIndex = -1;
  panel.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); dismiss(); } });
  // Disconnect scoped viewport listeners when the editor is replaced, including an open popover.
  const removed = new window.MutationObserver(() => { if (!wrapper.isConnected) { events?.abort(); removed.disconnect(); } });
  trigger.addEventListener('click', () => { removed.observe(wrapper.closest('.editor')?.parentElement ?? document.body, { childList: true }); });
  return wrapper;
}
