// @ts-expect-error Browser asset revision; TypeScript does not resolve URL query strings.
import { companyAvatar } from './company-avatar.js?v=20261026-brandfetch-picker';
import { logoUrl } from './company-logo.js';
import { bindFieldValidation } from '../shared/fields.mjs';
import { brandfetchEnabled } from './brandfetch.js';
import { brandfetchPicker } from './brandfetch-picker.js';

/** Company identity editing lives on the avatar; hidden fields retain the
 * existing guarded prospect save contract. No database writes happen here.
 * @param {Pick<import('./model.js').DetailsPatch, 'company'|'company_logo_url'|'company_logo_override'>} row */
export function companyLogoEditor(row) {
  /** @template {keyof HTMLElementTagNameMap} T @param {T} tag @param {string} [className] */
  const node = (tag, className = '') => { const item = document.createElement(tag); item.className = className; return item; };
  const value = node('input'); value.type = 'hidden'; value.name = 'company_logo_url'; value.value = row.company_logo_url ?? '';
  const override = node('input'); override.type = 'hidden'; override.name = 'company_logo_override'; override.value = String(row.company_logo_override ?? false);
  const trigger = node('button', 'company-logo-trigger'); trigger.type = 'button'; trigger.title = 'Edit company logo';
  trigger.setAttribute('aria-label', 'Edit Company Logo'); trigger.setAttribute('aria-haspopup', 'dialog'); trigger.setAttribute('aria-expanded', 'false');
  const panel = node('div', 'company-logo-popover nc-menu-elevation'); panel.id = 'company-logo-editor'; panel.popover = 'auto'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-labelledby', 'company-logo-title');
  trigger.popoverTargetElement = panel; trigger.setAttribute('aria-controls', panel.id);
  const heading = node('h2'); heading.id = 'company-logo-title'; heading.textContent = 'Company Logo';
  const form = node('form'); const fields = node('fieldset');
  const field = node('div', 'nc-field'); const label = node('label', 'nc-field__label'); label.htmlFor = 'company-logo-input'; label.textContent = 'Image URL';
  const input = node('input', 'nc-input'); input.id = label.htmlFor; input.type = 'url'; input.maxLength = 2048; input.placeholder = 'Paste an image URL'; input.required = true;
  const validate = () => { try { logoUrl(input.value); input.setCustomValidity(''); } catch { input.setCustomValidity('Enter a public HTTPS image URL without query parameters.'); } };
  input.addEventListener('input', () => { validate(); use.disabled = !input.value; });
  field.append(label, input);
  const actions = node('div', 'actions');
  const use = node('button', 'nc-button nc-button--primary nc-button--lg'); use.type = 'submit'; use.textContent = 'Use Logo';
  const remove = node('button', 'nc-button nc-button--tertiary nc-button--lg'); remove.type = 'button'; remove.textContent = 'Remove Logo';
  const cancel = node('button', 'nc-button nc-button--tertiary nc-button--lg'); cancel.type = 'button'; cancel.textContent = 'Cancel';
  cancel.addEventListener('click', () => { panel.hidePopover(); trigger.focus(); });
  const picker = brandfetchEnabled() ? brandfetchPicker((url, ready) => { input.value = url; validate(); use.disabled = !ready; }) : null;
  if (picker) {
    const custom = node('details', 'company-logo-custom'); const summary = node('summary'); summary.textContent = 'Use an Image URL'; custom.append(summary, field);
    fields.append(picker.root, custom);
    input.addEventListener('input', () => picker.custom());
  } else fields.append(field);
  actions.append(use, remove, cancel); fields.append(actions); form.append(fields); bindFieldValidation(form);
  panel.append(heading, form);
  let company = row.company ?? '';
  const refresh = () => trigger.replaceChildren(companyAvatar(company, true, value.value));
  value.addEventListener('logo-candidate', refresh);
  const commit = (/** @type {string|null} */ url) => {
    value.value = url ?? ''; override.value = 'true';
    value.dispatchEvent(new window.Event('input', { bubbles: true }));
    refresh(); panel.hidePopover(); trigger.focus();
  };
  form.addEventListener('submit', event => { event.preventDefault(); event.stopPropagation(); validate(); if (!use.disabled && form.reportValidity()) commit(logoUrl(input.value)); });
  remove.addEventListener('click', () => commit(null));
  /** @type {AbortController|undefined} */ let openEvents;
  const position = () => {
    const box = trigger.getBoundingClientRect();
    panel.style.left = `${Math.max(12, Math.min(box.left, window.innerWidth - panel.offsetWidth - 12))}px`;
    panel.style.top = `${Math.max(12, Math.min(box.bottom + 8, window.innerHeight - panel.offsetHeight - 12))}px`;
  };
  const panelSize = new window.ResizeObserver(position);
  panel.addEventListener('toggle', () => {
    const open = panel.matches(':popover-open'); trigger.setAttribute('aria-expanded', String(open));
    openEvents?.abort();
    panelSize.disconnect();
    if (!open) { picker?.close(); return; }
    form.reset(); input.setCustomValidity(''); input.value = value.value; use.disabled = !value.value;
    picker?.open(company);
    remove.disabled = !value.value;
    position(); panelSize.observe(panel);
    (picker?.query ?? input).focus({ preventScroll: true });
    openEvents = new AbortController(); const { signal } = openEvents;
    document.addEventListener('scroll', event => { if (event.target instanceof window.Node && !panel.contains(event.target)) panel.hidePopover(); }, { capture: true, signal });
    window.addEventListener('resize', () => panel.hidePopover(), { signal });
  });
  panel.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); panel.hidePopover(); trigger.focus(); } });
  refresh(); return { trigger, panel, value, override, updateCompany(/** @type {string} */ name) { company = name; refresh(); } };
}
