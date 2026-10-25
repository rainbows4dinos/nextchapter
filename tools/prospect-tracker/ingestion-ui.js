import { mergeLogo } from './company-logo.js';
import { bindFieldValidation, setFieldError } from '../shared/fields.mjs';
import { setAlert } from '../shared/status.mjs';
import { retrieveJob } from './ingestion-client.js';
import { duplicateCandidates } from './duplicate-match.js';
import { el, button } from './ui.js';
import { errorMessage, statusLabel } from './view-model.js';
import { PROVIDER_NAMES } from './ingestion/posting-url.js';

/** UI adapter only: editable preview and explicit duplicate decisions.
 * @param {HTMLFormElement} form
 * @param {{client: import('@supabase/supabase-js').SupabaseClient<import('./database.types.js').Database>, data: ReturnType<typeof import('./data.js').createRadarDataAccess>, createId: string, current: () => boolean, busy: (value: boolean) => void, markDirty: () => void, canReplace: () => boolean}} options
 */
export function mountIngestion(form, options) {
  const panel = el('section', '', 'panel ingestion');
  const heading = el('h2', 'Import a Job Posting'); heading.id = 'job-import-title'; panel.setAttribute('aria-labelledby', heading.id);
  panel.append(heading, el('p', 'Paste a job URL to automatically fill in prospect details.', 'muted'));
  const supported = el('details', '', 'ingestion__supported');
  supported.append(el('summary', 'Supported Job Sites'), el('p', 'Greenhouse, Ashby, Lever, Workable and supported Workday sites. For Workable, use the full company/job address shown after opening the posting. Other sites can be entered manually.', 'muted'));
  const retrieveForm = el('form');
  const fields = el('fieldset');
  const label = el('div', '', 'nc-field');
  const caption = el('label', 'Job Posting URL', 'nc-field__label'); caption.htmlFor = 'ingestion-url'; const required = el('span', '*', 'nc-field__required'); required.setAttribute('aria-hidden', 'true'); caption.append(required); label.append(caption);
  const input = el('input', '', 'nc-input'); input.id = 'ingestion-url'; input.type = 'url'; input.required = true; input.maxLength = 2048; label.append(input);
  const retrieve = el('button', 'Retrieve Posting', 'primary nc-button nc-button--primary nc-button--lg'); retrieve.type = 'submit';
  fields.append(label, retrieve); retrieveForm.append(fields); bindFieldValidation(retrieveForm);
  const cancel = button('Cancel Retrieval', () => { controller?.abort(); }, 'nc-button nc-button--tertiary nc-button--lg ingestion-cancel'); cancel.hidden = true;
  const feedback = el('div'); feedback.setAttribute('role', 'status');
  const duplicates = el('div'); duplicates.setAttribute('aria-live', 'polite');
  panel.append(retrieveForm, supported, feedback, duplicates, cancel);
  const layout = /** @type {HTMLElement} */ (form.closest('.editor__panels'));
  const desktop = window.matchMedia('(min-width:1200px)');
  const placePanel = () => {
    const focused = document.activeElement;
    if (desktop.matches) layout.append(panel); else layout.prepend(panel);
    if (focused instanceof window.HTMLElement && panel.contains(focused)) focused.focus({ preventScroll: true });
  };
  placePanel(); desktop.addEventListener('change', placePanel);
  /** @type {AbortController|null} */
  let controller = null;
  let hasPreview = false;
  let approved = '';
  form.addEventListener('input', event => {
    const hint = event.target instanceof Element ? event.target.closest('.nc-field')?.querySelector('.field-origin') : null;
    if (hint) hint.textContent = 'Edited by you';
  });
  /** @param {import('./model.js').DetailsPatch} patch @param {ReturnType<typeof duplicateCandidates>} candidates */
  function signature(patch, candidates) {
    return JSON.stringify([patch.company, patch.title, patch.job_url, patch.location, candidates.map(item => item.prospect.id).sort()]);
  }
  /** @param {ReturnType<typeof duplicateCandidates>} candidates @param {import('./model.js').DetailsPatch} patch */
  function showDuplicates(candidates, patch) {
    duplicates.replaceChildren();
    if (!candidates.length) { duplicates.append(el('p', 'No likely duplicate found.', 'muted')); return; }
    duplicates.append(el('h3', 'Review likely duplicates'), el('p', 'No records will be merged. Open an existing prospect or explicitly save a separate one.'));
    const list = el('ul');
    for (const { prospect, reason } of candidates) {
      const item = el('li', `${prospect.company} — ${prospect.title} · ${statusLabel(prospect.status)}${prospect.applied_on ? ' · Applied ' + prospect.applied_on : ''}\n${reason}`);
      const link = el('a', 'Open existing'); link.href = `#/prospects/${prospect.id}`;
      item.append(el('br'), link); list.append(item);
    }
    duplicates.append(list, button('Save separately', () => {
      approved = signature(patch, candidates); form.requestSubmit();
    }, 'primary'));
  }
  retrieveForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (controller || !options.canReplace()) return;
    controller = new AbortController();
    cancel.hidden = false; cancel.setAttribute('data-retrieving', '');
    const active = controller;
    const timer = setTimeout(() => active.abort(), 20000);
    options.busy(true); feedback.setAttribute('role', 'status');
    const loading = el('div', '', 'loading-message'); const spinner = el('span', '', 'nc-spinner'); spinner.setAttribute('aria-hidden', 'true'); loading.append(spinner, el('span', 'Retrieving posting…'));
    feedback.replaceChildren(loading); duplicates.replaceChildren(); approved = '';
    try {
      const preview = await retrieveJob(options.client, input.value, active.signal);
      if (!options.current() || active.signal.aborted) return;
      for (const name of ['company','title','job_url','location','work_arrangement','employment_type','compensation_text','job_description','posted_on','discovered_on']) {
        const control = /** @type {HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement|null} */ (form.elements.namedItem(name));
        if (!control) continue;
        control.value = String(preview.draft[/** @type {keyof typeof preview.draft} */ (name)] ?? '');
        if (name === 'company') control.dispatchEvent(new window.Event('change', { bubbles: true }));
        if (name === 'job_url') control.dispatchEvent(new window.Event('input', { bubbles: true }));
        control.closest('.nc-field')?.querySelector('.field-origin')?.remove();
        const origin = el('small', preview.field_sources[name] ? (name === 'discovered_on' ? 'First captured in Prospect Tracker (UTC); editable' : `Extracted from ${PROVIDER_NAMES[preview.identity.provider]}`) : 'Not supplied; complete if known', 'field-origin nc-field__helper');
        origin.id = `${control.id}-origin`; control.closest('.nc-field')?.append(origin);
        const described = new Set((control.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean)); described.add(origin.id);
        control.setAttribute('aria-describedby', [...described].join(' ')); setFieldError(control, '');
      }
      const logo = /** @type {HTMLInputElement|null} */ (form.elements.namedItem('company_logo_url'));
      const override = /** @type {HTMLInputElement|null} */ (form.elements.namedItem('company_logo_override'));
      if (logo && override) {
        const merged = mergeLogo({ company_logo_url: logo.value, company_logo_override: override.value === 'true' }, preview.draft.company_logo_url);
        logo.value = merged.company_logo_url ?? ''; override.value = String(merged.company_logo_override);
        logo.dispatchEvent(new window.Event('logo-candidate'));
      }
      const details = form.querySelector('details'); if (details) details.open = true;
      const save = form.querySelector('button[type="submit"]'); if (save) save.textContent = 'Save prospect';
      hasPreview = true; options.markDirty();
      const warnings = el('ul', '', 'muted'); for (const warning of preview.warnings) warnings.append(el('li', warning.replace('does not change Radar status', 'does not change Prospect Tracker status')));
      feedback.replaceChildren(el('h3', 'Preview — review before saving'), el('p', `${PROVIDER_NAMES[preview.identity.provider]} · ${preview.identity.board}${'region' in preview.identity && preview.identity.region ? ' · ' + preview.identity.region.toUpperCase() : ''} · Posting ${preview.identity.posting_id}${preview.identity.requisition_id ? ' · Requisition ' + preview.identity.requisition_id : ''}`, 'muted'), warnings, el('p', preview.draft.company_logo_url ? 'Employer logo available — select the company avatar to review or change it.' : 'Select the company avatar to add a logo.', 'muted'));
      const candidates = duplicateCandidates(preview.draft, await options.data.listProspectIdentities(), options.createId);
      if (options.current() && !active.signal.aborted) showDuplicates(candidates, preview.draft);
    } catch (error) {
      if (options.current() && !active.signal.aborted) { feedback.removeAttribute('role'); const errorAlert = el('p'); setAlert(errorAlert, { message: `${errorMessage(error)} Nothing was saved. Your current draft is still here; manual entry remains available.`, variant: 'danger' }); feedback.replaceChildren(errorAlert); }
      else if (options.current()) { feedback.removeAttribute('role'); const errorAlert = el('p'); setAlert(errorAlert, { message: 'Retrieval canceled or timed out. Nothing was saved. Try again or add the details manually.', variant: 'danger' }); feedback.replaceChildren(errorAlert); }
    } finally {
      const restoreFocus = document.activeElement === cancel;
      clearTimeout(timer); controller = null; cancel.hidden = true; cancel.removeAttribute('data-retrieving');
      if (options.current()) { options.busy(false); if (restoreFocus) retrieve.focus(); }
    }
  });
  return {
    dispose() { controller?.abort(); desktop.removeEventListener('change', placePanel); },
    /** Fresh check before each save. Changed facts or new matches invalidate consent.
     * @param {import('./model.js').DetailsPatch} patch
     */
    async check(patch) {
      if (!hasPreview) return true;
      const candidates = duplicateCandidates(patch, await options.data.listProspectIdentities(), options.createId);
      if (!options.current()) return false;
      if (!candidates.length || approved === signature(patch, candidates)) return true;
      showDuplicates(candidates, patch); duplicates.scrollIntoView({ block: 'nearest' });
      return false;
    }
  };
}
