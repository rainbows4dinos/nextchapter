import { dateRange, validCalendarDate } from './board-dates.js';
import { gravityIcon } from '../shared/icons.mjs';

/** @type {readonly [import('./board-dates.js').DateFilter['preset'],string][]} */
export const DATE_RANGES = [['7','Last 7 days'], ['30','Last 30 days'], ['90','Last 90 days'], ['year','Last year'], ['custom','Custom range'], ['all','All dates']];
/** Presentation only: calendar dates never shift with the viewer's timezone.
 * @param {string} start @param {string} end @param {Date} [today] */
export function customRangeLabel(start, end, today = new Date()) {
  if (!validCalendarDate(start) || !validCalendarDate(end)) return 'Custom range';
  const first = new Date(`${start}T00:00:00Z`), last = new Date(`${end}T00:00:00Z`);
  const firstYear = first.getUTCFullYear(), lastYear = last.getUTCFullYear();
  /** @param {Date} date @param {boolean} year */
  const format = (date, year) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(year ? {year:'numeric'} : {}), timeZone: 'UTC' });
  if (start === end) return format(first, firstYear !== today.getFullYear());
  return `${format(first, firstYear !== lastYear)} – ${format(last, firstYear !== lastYear || lastYear !== today.getFullYear())}`;
}
/** @param {import('./board-dates.js').DateFilter} filter @param {Date} [today] */
export function dateFilterLabel(filter, today = new Date()) {
  if (filter.preset === 'all') return 'All dates';
  const range = filter.preset === 'custom' ? customRangeLabel(filter.start, filter.end, today) : DATE_RANGES.find(([value]) => value === filter.preset)?.[1];
  return `${filter.basis === 'added' ? 'Added' : 'Applied'}: ${range}`;
}
/** One date control with a native, light-dismiss popover and standard radio groups.
 * Draft custom dates never replace the applied filter until the range is valid.
 * @param {import('./board-dates.js').DateFilter} filter
 * @param {()=>void} onChange @param {AbortSignal} signal */
export function createDateFilter(filter, onChange, signal) {
  const wrapper = document.createElement('div'); wrapper.className = 'board-date-filter';
  const trigger = document.createElement('button'); trigger.type = 'button'; trigger.id = 'board-date-trigger';
  trigger.className = 'nc-button board-date-trigger'; trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-controls', 'board-date-popover'); trigger.setAttribute('aria-expanded', 'false');
  const label = document.createElement('span'); trigger.append(label, gravityIcon('calendar', { size: 16 }));
  const panel = document.createElement('div'); panel.id = 'board-date-popover'; panel.className = 'board-date-popover';
  panel.popover = 'auto'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Filter by date');
  trigger.popoverTargetElement = panel;
  let draft = { ...filter };
  /** @type {HTMLInputElement[]} */
  const choices = [];
  const custom = document.createElement('div'); custom.className = 'board-custom-dates';
  /** @param {string} name @param {string} caption */
  function dateInput(name, caption) {
    const field = document.createElement('label'); field.className = 'nc-field'; field.append(caption);
    const input = document.createElement('input'); input.type = 'date'; input.name = name; input.className = 'nc-input';
    input.setAttribute('aria-describedby', 'board-date-feedback'); field.append(input); custom.append(field); return input;
  }
  const start = dateInput('board-start', 'Start date'), end = dateInput('board-end', 'End date');
  start.value = draft.start; end.value = draft.end;
  const feedback = document.createElement('p'); feedback.id = 'board-date-feedback'; feedback.className = 'board-date-feedback';
  feedback.setAttribute('role', 'status');
  /** @param {string} title @param {string} name @param {readonly [string,string][]} values @param {(value:string)=>void} select */
  function group(title, name, values, select) {
    const fieldset = document.createElement('fieldset'); const legend = document.createElement('legend'); legend.textContent = title;
    const options = document.createElement('div'); options.className = 'board-date-options';
    fieldset.append(legend, options);
    for (const [value, text] of values) {
      const option = document.createElement('label'); option.className = 'board-date-option';
      const input = document.createElement('input'); input.type = 'radio'; input.name = name; input.value = value;
      input.addEventListener('change', () => { if (input.checked) select(value); }, { signal });
      choices.push(input); option.append(input, text); options.append(option);
    }
    return fieldset;
  }
  const typeGroup = group('Date type', 'board-date-basis', [['added','Added'],['applied','Applied']], value => {
    draft.basis = filter.basis = /** @type {import('./board-dates.js').DateFilter['basis']} */ (value);
    refresh(); onChange();
  });
  typeGroup.className = 'board-date-type';
  typeGroup.querySelector('legend')?.classList.add('nc-visually-hidden');
  for (const input of typeGroup.querySelectorAll('input')) input.classList.add('nc-visually-hidden');
  const typeNote = document.createElement('span'); typeNote.id = 'board-date-type-description'; typeNote.className = 'nc-visually-hidden';
  typeNote.textContent = 'Date type is remembered and used only when a date range is active.';
  typeGroup.setAttribute('aria-describedby', typeNote.id); typeGroup.append(typeNote);
  const rangeGroup = group('Date range', 'board-date-range', DATE_RANGES, value => {
    draft.preset = /** @type {import('./board-dates.js').DateFilter['preset']} */ (value);
    if (value === 'all') { draft.start = ''; draft.end = ''; start.value = ''; end.value = ''; }
    commit();
    if (value === 'custom') start.focus();
  });
  panel.append(typeGroup, rangeGroup, custom, feedback); wrapper.append(trigger, panel);
  function refresh() {
    typeGroup.dataset.inactive = String(filter.preset === 'all');
    label.textContent = dateFilterLabel(filter); trigger.title = label.textContent;
    trigger.setAttribute('aria-label', `Date filter: ${label.textContent}`);
    for (const input of choices) input.checked = input.value === (input.name === 'board-date-basis' ? draft.basis : draft.preset);
    custom.hidden = draft.preset !== 'custom';
    const error = dateRange(draft).error;
    feedback.hidden = !error;
    feedback.textContent = error ? `${error} Results keep the last valid date range.` : '';
    for (const input of [start,end]) input.setAttribute('aria-invalid', String(!!error));
  }
  function commit() {
    if (!dateRange(draft).error) { Object.assign(filter, draft); onChange(); }
    refresh(); position();
  }
  for (const input of [start,end]) input.addEventListener('input', () => {
    draft.start = start.value; draft.end = end.value; commit();
  }, { signal });
  function position() {
    if (!panel.matches(':popover-open')) return;
    const box = trigger.getBoundingClientRect();
    const width = panel.getBoundingClientRect().width;
    panel.style.left = `${Math.max(12, Math.min(box.right - width, window.innerWidth - width - 12))}px`;
    panel.style.top = `${Math.min(box.bottom + 8, Math.max(12, window.innerHeight - panel.offsetHeight - 12))}px`;
  }
  panel.addEventListener('toggle', () => {
    const open = panel.matches(':popover-open'); trigger.setAttribute('aria-expanded', String(open));
    if (open) { position(); (/** @type {HTMLInputElement|null} */ (typeGroup.querySelector('input:checked')))?.focus({ preventScroll: true }); }
  }, { signal });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && panel.matches(':popover-open')) { event.preventDefault(); panel.hidePopover(); trigger.setAttribute('aria-expanded', 'false'); trigger.focus(); }
  }, { signal });
  window.addEventListener('resize', position, { signal });
  // Closing on scroll keeps the popover anchored without intercepting scrolling inside it.
  document.addEventListener('scroll', event => {
    if (panel.matches(':popover-open') && event.target instanceof window.Node && !panel.contains(event.target)) panel.hidePopover();
  }, { signal, capture: true });
  signal.addEventListener('abort', () => { if (panel.matches(':popover-open')) panel.hidePopover(); }, { once: true });
  refresh(); return wrapper;
}
