import { gravityIcon } from '../shared/icons.mjs';
import { WORK_ARRANGEMENTS, validateHttpUrl } from './model.js';
import { statusLabel } from './view-model.js';

/** @template {keyof HTMLElementTagNameMap} T @param {T} tag @param {string} [text] @param {string} [className] */
function el(tag, text = '', className = '') { const node = document.createElement(tag); node.textContent = text; node.className = className; return node; }
/** @param {string} text @param {string} href */
function link(text, href) { const node = el('a', text); node.href = href; return node; }

/** @param {string} name @param {string} label @param {string} value @param {string} [type] */
function field(name, label, value, type = 'text') {
  const wrapper = el('div', '', 'nc-field');
  const caption = el('label', label.replace(/ \*$/, ''), 'nc-field__label');
  if (label.endsWith(' *')) { const required = el('span', '*', 'nc-field__required'); required.setAttribute('aria-hidden', 'true'); caption.append(required); }
  wrapper.append(caption);
  const input = type === 'textarea' ? el('textarea') : el('input');
  if (input instanceof HTMLInputElement) input.type = type;
  input.name = name; input.value = value; input.id = `${name}-field`; caption.htmlFor = input.id;
  input.className = type === 'textarea' ? 'nc-textarea' : 'nc-input';
  input.required = name === 'company' || name === 'title';
  wrapper.append(input);
  return wrapper;
}
/** @param {string} name @param {string} label @param {readonly string[]} options @param {string} value @param {boolean} [unknown] */
export function selectField(name, label, options, value, unknown = false) {
  const wrapper = el('div', '', 'nc-field'); const select = el('select', '', 'nc-select'); select.name = name;
  select.id = `${name}-field`; const caption = el('label', label, 'nc-field__label'); caption.htmlFor = select.id;
  wrapper.append(caption);
  const closed = el('span', '', 'nc-select-wrap'); closed.append(select, gravityIcon('chevron-down')); wrapper.append(closed);
  if (unknown) { const option = el('option', 'Not specified'); option.value = ''; select.append(option); }
  if (name === 'status' && value === 'applying') {
    const current = el('option', 'Applying (retired)'); current.value = value; current.disabled = true; select.append(current);
  }
  for (const item of options) { const option = el('option', statusLabel(item)); option.value = item; select.append(option); }
  select.value = value; return wrapper;
}
/** Shared fields only. Pages own ingestion, actions, status and persistence.
 * Mode preserves each workflow's existing disclosure placement and order.
 * @param {import('./model.js').DetailsPatch} values
 * @param {{mode:'create'|'edit'}} options */
export function prospectFields(values, { mode }) {
  const fields = el('fieldset', '', 'prospect-fields');
  const grid = el('div', '', 'field-grid');
  grid.append(field('company', 'Company *', values.company ?? ''), field('title', 'Role / title *', values.title ?? ''));
  const jobUrl = field('job_url', 'Job URL', values.job_url ?? '', 'url');
  const urlInput = /** @type {HTMLInputElement} */ (jobUrl.querySelector('input'));
  const urlControl = el('div', '', 'nc-input-group job-url-control');
  const open = link('Open', ''); open.className = 'nc-input-group__action job-url-control__open'; open.target = '_blank'; open.rel = 'noopener noreferrer'; open.setAttribute('aria-label', 'Open job posting');
  const updateOpen = () => {
    const value = urlInput.value.trim();
    try { if (!value) throw new Error('Empty URL'); validateHttpUrl(value); open.href = value; open.hidden = false; }
    catch { open.hidden = true; open.removeAttribute('href'); }
    urlControl.classList.toggle('job-url-control--linked', !open.hidden);
  };
  urlControl.append(urlInput, open); jobUrl.append(urlControl);
  urlInput.addEventListener('input', updateOpen); urlInput.addEventListener('change', updateOpen); updateOpen();
  fields.append(grid);
  fields.append(jobUrl, field('job_description', 'Job description', values.job_description ?? '', 'textarea'));
  const details = el('details'); details.append(el('summary', 'More job details'));
  const extra = el('div', '', 'field-grid');
  for (const [name, label] of /** @type {const} */ ([['source','Source'], ['location','Location'], ['employment_type','Employment type'], ['compensation_text','Compensation range / type']])) {
    extra.append(field(name, label, values[name] ?? '', name === 'compensation_text' ? 'textarea' : 'text'));
  }
  const source = extra.querySelector('input[name="source"]');
  if (source) {
    source.setAttribute('list', 'source-options');
    const options = el('datalist'); options.id = 'source-options';
    for (const value of ['ChatGPT', 'LinkedIn', 'Welcome to the Jungle', 'Referral', 'Company site', 'Other']) {
      const option = el('option'); option.value = value; options.append(option);
    }
    extra.append(options);
    const helper = el('small', 'Optional discovery channel; any text is allowed.', 'nc-field__helper');
    helper.id = 'source-field-helper'; source.setAttribute('aria-describedby', helper.id); source.closest('.nc-field')?.append(helper);
  }
  extra.append(selectField('work_arrangement', 'Work arrangement', WORK_ARRANGEMENTS, values.work_arrangement ?? '', true));
  for (const [name, label] of /** @type {const} */ ([['posted_on','Posted date'], ['discovered_on','Discovered date'], ['applied_on','Applied date']])) extra.append(field(name, label, values[name] ?? '', 'date'));
  details.append(extra, field('notes', 'Notes', values.notes ?? '', 'textarea'));
  if (mode === 'edit') {
    const primaryDetails = el('div', '', 'field-grid');
    for (const name of ['location', 'employment_type', 'work_arrangement', 'compensation_text']) {
      const wrapper = extra.querySelector(`[name="${name}"]`)?.closest('.nc-field');
      if (wrapper) primaryDetails.append(wrapper);
    }
    fields.append(primaryDetails);
    details.open = true;
  }
  fields.append(details);
  return { fields, companyInput: /** @type {HTMLInputElement} */ (grid.querySelector('[name="company"]')) };
}
