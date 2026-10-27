// @ts-expect-error Browser asset revision; TypeScript does not resolve URL query strings.
import { companyAvatar } from './company-avatar.js?v=20261026-logo-grid';
import { logoUrl } from './company-logo.js';
import { brandfetchEnabled } from './brandfetch.js';
import { brandfetchPicker } from './brandfetch-picker.js';
import { showToast } from '../shared/notifications.mjs';

/** @typedef {{saveLogo?:(url:string)=>Promise<void>}} LogoEditorOptions */
/** Identity UI; saved prospects use a supplied guarded logo-only update.
 * @param {Pick<import('./model.js').DetailsPatch, 'company'|'company_logo_url'|'company_logo_override'>} row
 * @param {LogoEditorOptions} [options] */
export function companyLogoEditor(row, options = {}) {
  /** @template {keyof HTMLElementTagNameMap} T @param {T} tag @param {string} [className] */
  const node = (tag, className = '') => { const item = document.createElement(tag); item.className = className; return item; };
  const value = node('input'); value.type = 'hidden'; value.name = 'company_logo_url'; value.value = row.company_logo_url ?? '';
  const override = node('input'); override.type = 'hidden'; override.name = 'company_logo_override'; override.value = String(row.company_logo_override ?? false);
  const trigger = node('button', 'company-logo-trigger'); trigger.type = 'button'; trigger.title = 'Edit company logo';
  trigger.setAttribute('aria-label', 'Edit Company Logo'); trigger.setAttribute('aria-haspopup', 'dialog'); trigger.setAttribute('aria-expanded', 'false');
  const panel = node('div', 'company-logo-popover nc-menu-elevation'); panel.id = 'company-logo-editor'; panel.popover = 'manual'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-labelledby', 'company-logo-title');
  panel.tabIndex = -1;
  trigger.setAttribute('aria-controls', panel.id);
  const heading = node('h2'); heading.id = 'company-logo-title'; heading.textContent = 'Choose a logo';
  let company = row.company ?? '';
  const refresh = () => trigger.replaceChildren(companyAvatar(company, true, value.value));
  value.addEventListener('logo-candidate', refresh);
  const dismiss = () => { if (!picker?.isSaving()) { panel.hidePopover(); trigger.focus(); } };
  const picker = brandfetchEnabled() ? brandfetchPicker(async reference => {
    const url = logoUrl(reference);
    if (!url) throw new Error('Choose an available logo.');
    trigger.disabled = true;
    try {
      if (options.saveLogo) await options.saveLogo(url);
      value.value = url; override.value = 'true';
      if (!options.saveLogo) {
        value.dispatchEvent(new window.Event('input', { bubbles: true }));
        showToast({ message: 'Logo selected.', variant: 'success' });
      }
      refresh(); panel.hidePopover();
    } finally { trigger.disabled = false; if (!panel.matches(':popover-open')) trigger.focus(); }
  }) : null;
  panel.append(heading);
  if (picker) panel.append(picker.root);
  else { const unavailable = node('p', 'company-logo-feedback'); unavailable.textContent = 'Logo search is unavailable right now.'; panel.append(unavailable); }
  trigger.addEventListener('click', () => { if (panel.matches(':popover-open')) dismiss(); else panel.showPopover(); });
  /** @type {AbortController|undefined} */ let openEvents;
  const position = () => {
    const box = trigger.getBoundingClientRect();
    panel.style.left = `${Math.max(12, Math.min(box.left, window.innerWidth - panel.offsetWidth - 12))}px`;
    panel.style.top = `${Math.max(12, Math.min(box.bottom + 8, window.innerHeight - panel.offsetHeight - 12))}px`;
  };
  const panelSize = new window.ResizeObserver(position);
  panel.addEventListener('toggle', () => {
    const open = panel.matches(':popover-open'); trigger.setAttribute('aria-expanded', String(open));
    openEvents?.abort(); panelSize.disconnect();
    trigger.title = open ? '' : 'Edit company logo';
    if (!open) { picker?.close(); return; }
    picker?.open(company, value.value); position(); panelSize.observe(panel); (picker?.query ?? panel).focus({ preventScroll: true });
    openEvents = new AbortController(); const { signal } = openEvents;
    document.addEventListener('pointerdown', event => { if (event.target instanceof window.Node && !panel.contains(event.target) && !trigger.contains(event.target)) dismiss(); }, { capture: true, signal });
    document.addEventListener('scroll', event => { if (event.target instanceof window.Node && !panel.contains(event.target)) dismiss(); }, { capture: true, signal });
    window.addEventListener('resize', () => { if (picker?.isSaving()) position(); else dismiss(); }, { signal });
  });
  panel.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); dismiss(); } });
  refresh(); return { trigger, panel, value, override, updateCompany(/** @type {string} */ name) { company = name; refresh(); } };
}
