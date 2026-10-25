// @ts-expect-error Browser asset revision; TypeScript does not resolve URL query strings.
import { createDateFilter } from './date-filter.js?v=20261024-radio-label';
import { applicationDate, appliedHistoryMap, defaultDateFilter } from './board-dates.js';
import { gravityIcon } from '../shared/icons.mjs';
import { bindFieldValidation } from '../shared/fields.mjs';
import { setAlert } from '../shared/status.mjs';
import { BOARD_COLUMNS, formatAppliedDate, searchBoardGroups, statusLabel } from './view-model.js';
import { STATUSES, SELECTABLE_STATUSES, WORK_ARRANGEMENTS, validateHttpUrl } from './model.js';
import { createHandoff, HANDOFF_TTL } from '../shared/resume-handoff.mjs';
import { STATUS_BADGE_TONES } from './prospect-status.js';
// @ts-expect-error Browser asset revision; TypeScript does not resolve URL query strings.
import { mountBoardDrag } from './kanban.js?v=20261019-filtered-order';

/** @param {HTMLElement} element @param {import('./model.js').ProspectStatus} status */
export function setProspectStatusBadge(element, status) {
  element.className = `nc-status-badge nc-status-badge--${STATUS_BADGE_TONES[status]}`;
  element.textContent = statusLabel(status);
}
/** @param {import('./model.js').ProspectStatus} status */
function statusBadge(status) {
  const badge = el('span'); setProspectStatusBadge(badge, status); return badge;
}

/** Figma Company Avatar Sm (206:18776): the company's first letter or digit; decorative, the name follows it.
 * @param {string} company @param {boolean} [large] */
function companyAvatar(company, large = false) {
  const initial = (company.match(/[\p{L}\p{N}]/u)?.[0] ?? '?').toLocaleUpperCase();
  const avatar = el('span', initial, `nc-avatar nc-avatar--company nc-avatar--${large ? 'lg' : 'sm'}`); avatar.setAttribute('aria-hidden', 'true');
  return avatar;
}
/** @template {keyof HTMLElementTagNameMap} T @param {T} tag @param {string} [text] @param {string} [className] */
export function el(tag, text = '', className = '') {
  const node = document.createElement(tag);
  node.textContent = text;
  node.className = className;
  return node;
}
/** @param {string} text @param {() => void} action @param {string} [className] */
export function button(text, action, className = 'secondary') {
  const node = el('button', text, className);
  node.type = 'button';
  node.addEventListener('click', action);
  return node;
}
/** @param {string} text @param {string} href */
function link(text, href) { const node = el('a', text); node.href = href; return node; }
/** @param {HTMLElement} root @param {string} message @param {(() => void)} [retry] */
export function messageView(root, message, retry) {
  const panel = el('section', '', 'panel');
  const feedback = el('div');
  if (message.startsWith('Loading')) {
    feedback.setAttribute('role', 'status');
    const spinner = el('span', '', 'nc-spinner'); spinner.setAttribute('aria-hidden', 'true');
    feedback.append(spinner, el('span', message)); feedback.className = 'loading-message';
  } else setAlert(feedback, { message, variant: retry ? 'danger' : 'info' });
  panel.append(feedback);
  if (retry) panel.append(button('Try again', retry, 'secondary nc-button nc-button--tertiary nc-button--lg'));
  root.replaceChildren(panel);
}
/** @typedef {{query:string, doneOpen:boolean, scrollLeft:number, scrollTop:Record<string,number>, status?:string, date?:import('./board-dates.js').DateFilter}} BoardState */
/** @param {HTMLElement} root @param {import('./data.js').ProspectCard[]} cards
 * @param {Partial<import('./kanban.js').MoveOptions> & {state?:BoardState, loadAppliedHistory?:(signal:AbortSignal)=>Promise<import('./data.js').StatusEvent[]>}} [options] */
export function boardView(root, cards, options = {}) {
  const state = options.state ?? { query: '', doneOpen: false, scrollLeft: 0, scrollTop: {} };
  const dateFilter = state.date ??= defaultDateFilter();
  const controller = new AbortController();
  const listenerOptions = { signal: controller.signal };
  const heading = el('div', '', 'board-heading');
  const title = el('h2');
  const toolbar = el('div', '', 'board-toolbar');
  toolbar.setAttribute('role', 'group'); toolbar.setAttribute('aria-label', 'Board actions');
  const add = link('Add Prospect', '#/prospects/new');
  add.className = 'nc-button nc-button--primary nc-button--lg';
  add.prepend(gravityIcon('plus', { size: 16 }));
  const search = el('div', '', 'board-search'); search.setAttribute('role', 'search');
  const results = el('span', '', 'board-search-results'); results.setAttribute('role', 'status');
  const searchField = el('div', '', 'board-search-field');
  const label = el('label', 'Filter prospects', 'nc-visually-hidden'); label.htmlFor = 'board-search';
  const input = el('input', '', 'nc-input'); input.id = 'board-search'; input.type = 'search';
  input.placeholder = 'Filter prospects'; input.value = state.query;
  const clear = button('', () => { input.value = ''; state.query = ''; update(loadedCards); input.focus(); }, 'nc-button board-search-clear');
  clear.setAttribute('aria-label', 'Clear search'); clear.title = 'Clear search';
  clear.append(gravityIcon('xmark', { size: 16 }));
  searchField.append(label, input, clear); search.append(results, searchField);
  const status = el('select', '', 'nc-select'); status.id = 'board-status'; status.setAttribute('aria-label', 'Current status');
  for (const [value, text] of [['all','All statuses'], ...STATUSES.map(value => [value, statusLabel(value)])]) {
    const option = el('option', text); option.value = value; status.append(option);
  }
  status.value = state.status ?? 'all';
  const statusControl = el('span', '', 'nc-select-wrap board-status'); statusControl.append(status, gravityIcon('chevron-down'));
  const dateControl = createDateFilter(dateFilter, () => update(loadedCards), controller.signal);
  const historyNote = el('div', '', 'board-history-note');
  const historyMessage = el('span'); historyMessage.setAttribute('role', 'status');
  const retryHistory = button('Retry history', () => { historyState = 'idle'; update(loadedCards); }, 'nc-button nc-button--tertiary nc-button--sm');
  historyNote.append(historyMessage, retryHistory);
  toolbar.append(search, statusControl, dateControl);
  const toolbarRow = el('div', '', 'board-toolbar-row'); toolbarRow.append(title, toolbar);
  heading.append(toolbarRow, historyNote);
  const headerActions = document.getElementById('tracker-add');
  if (headerActions) headerActions.replaceChildren(add); else toolbarRow.prepend(add);
  const hint = el('p', '', 'nc-visually-hidden');
  hint.id = 'board-instructions';
  const board = el('div', '', 'board');
  board.tabIndex = 0;
  board.setAttribute('role', 'region'); board.setAttribute('aria-label', 'Prospects by lifecycle');
  board.setAttribute('aria-describedby', hint.id);
  const columns = BOARD_COLUMNS.map(group => {
    const done = group.id === 'done';
    const column = done ? el('details', '', 'column column-done') : el('section', '', 'column');
    column.dataset.columnId = group.id;
    if (column instanceof window.HTMLDetailsElement) column.open = state.doneOpen;
    const title = el('h3', `${group.label} `);
    const count = el('span', '', 'count'); title.append(count);
    if (done) {
      const summary = el('summary'); summary.append(title); column.append(summary);
    } else {
      column.append(title);
    }
    const list = el('div', '', 'column-cards'); list.id = `${group.id}-cards`;
    list.tabIndex = 0; list.setAttribute('role', 'region'); list.setAttribute('aria-label', `${group.label} prospects`);
    column.append(list); board.append(column);
    return { id: group.id, column, count, list };
  });
  root.replaceChildren(heading, hint, board);
  let loadedCards = cards;
  /** @type {'idle'|'loading'|'ready'|'error'} */
  let historyState = 'idle';
  /** @type {Map<string,string>} */
  let history = new Map();
  let previousFilters = '';
  let rendered = false;
  let disposeDrag = () => {};
  function saveState() {
    state.scrollLeft = board.scrollLeft;
    for (const { id, column, list } of columns) {
      state.scrollTop[id] = list.scrollTop;
      if (column instanceof window.HTMLDetailsElement) state.doneOpen = column.open;
    }
  }
  /** Update results only: toolbar/input, column headers and scroll containers stay mounted.
   * @param {import('./data.js').ProspectCard[]} nextCards */
  function update(nextCards) {
    if (rendered) saveState();
    loadedCards = nextCards;
    const focused = document.activeElement instanceof Element ? document.activeElement.closest('[data-prospect-id]')?.getAttribute('data-prospect-id') : null;
    disposeDrag();
    if (dateFilter.basis === 'applied' && historyState === 'idle') {
      historyState = 'loading';
      if (!options.loadAppliedHistory) historyState = 'error';
      else void options.loadAppliedHistory(controller.signal).then(events => {
        if (controller.signal.aborted) return;
        history = appliedHistoryMap(events); historyState = 'ready'; update(loadedCards);
      }).catch(() => {
        if (controller.signal.aborted) return;
        historyState = 'error'; update(loadedCards);
      });
    }
    const groups = searchBoardGroups(loadedCards, state.query, dateFilter, history, new Date(), state.status);
    const searching = !!state.query.trim() || dateFilter.preset !== 'all' || !!state.status && state.status !== 'all';
    const incomplete = dateFilter.basis === 'applied' && historyState !== 'ready';
    historyNote.hidden = dateFilter.basis !== 'applied' || !incomplete;
    historyMessage.textContent = historyState === 'error' ? 'Applied history could not be loaded. Results are incomplete.'
      : historyState === 'loading' ? 'Loading Applied history. Results are incomplete.'
        : '';
    retryHistory.hidden = historyState !== 'error';
    const filterKey = JSON.stringify([state.query, state.status, dateFilter, historyState]);
    const changedFilters = filterKey !== previousFilters; previousFilters = filterKey;
    const matches = groups.reduce((sum, group) => sum + group.cards.length, 0);
    title.textContent = `Prospects (${loadedCards.length})`;
    clear.hidden = !input.value;
    results.hidden = matches === loadedCards.length;
    results.textContent = `${matches} of ${loadedCards.length}`;
    hint.className = 'nc-visually-hidden';
    hint.textContent = 'Drag to reorder or move between columns on desktop. Keyboard: focus a card and press Alt + ↑ or ↓ to reorder.' + (searching ? ' Hidden cards stay in place when you reorder filtered results.' : '');
    for (const group of groups) {
      const { count, list, column } = columns.find(column => column.id === group.id) ?? columns[0];
      if (group.id === 'done' && column instanceof window.HTMLDetailsElement && changedFilters && searching && group.cards.length) column.open = true;
      count.textContent = searching ? `${group.cards.length} of ${group.total}` : String(group.total);
      list.replaceChildren(...group.cards.map(card => {
        const node = link('', `#/prospects/${card.id}`); node.className = 'prospect-card';
        node.dataset.prospectId = card.id;
        node.setAttribute('aria-describedby', hint.id);
        node.setAttribute('aria-keyshortcuts', 'Alt+ArrowUp Alt+ArrowDown');
        const header = el('span', '', 'prospect-card__header');
        header.append(companyAvatar(card.company), el('strong', card.company, 'prospect-card__company'));
        const meta = el('span', '', 'prospect-card__meta');
        meta.append(statusBadge(card.status));
        const grip = gravityIcon('grip'); grip.classList.add('prospect-card__grip');
        node.append(header, el('span', card.title, 'prospect-card__title'), meta, grip);
        const appliedDate = formatAppliedDate(card.applied_on);
        if (appliedDate) {
          const time = el('time', `Applied ${appliedDate}`); time.dateTime = card.applied_on ?? '';
          meta.append(time);
        }
        if (!appliedDate && dateFilter.basis === 'applied') {
          const application = applicationDate(card, history);
          if (application.source === 'history') {
            const time = el('time', `Applied status recorded ${formatAppliedDate(application.date)}`, 'history-date');
            time.dateTime = application.date ?? ''; meta.append(time);
          } else meta.append(el('small', incomplete ? 'Application date unavailable — history incomplete' : 'Application date unknown'));
        }
        return node;
      }));
      if (!group.cards.length) list.append(el('p', incomplete ? 'Results incomplete — check Applied history' : searching ? 'No matching prospects' : 'No prospects', 'empty-column'));
      list.scrollTop = state.scrollTop[group.id] ?? 0;
    }
    board.scrollLeft = state.scrollLeft;
    if (options.move) disposeDrag = mountBoardDrag(board, loadedCards, { move: options.move, canMove: options.canMove ?? (() => true), reorder: options.reorder });
    if (focused) (/** @type {HTMLElement|null} */ (board.querySelector(`[data-prospect-id="${focused}"]`)) ?? board).focus({ preventScroll: true });
    rendered = true;
  }
  status.addEventListener('change', () => { state.status = status.value; update(loadedCards); }, listenerOptions);
  input.addEventListener('input', () => { state.query = input.value; update(loadedCards); }, listenerOptions);
  update(cards);
  return {
    update,
    /** Reveal a saved move only when it still matches the current search.
     * @param {string} id */
    revealCard(id) {
      const card = board.querySelector(`[data-prospect-id="${id}"]`);
      if (!card) return;
      const column = card.closest('.column');
      if (column instanceof window.HTMLDetailsElement) column.open = true;
      card.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    },
    dispose: () => { saveState(); controller.abort(); disposeDrag(); add.remove(); }
  };
}
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
function selectField(name, label, options, value, unknown = false) {
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
/** @param {HTMLElement} root @param {import('./model.js').Prospect|null} row */
export function editorView(root, row) {
  const editor = el('div', '', row ? 'editor editor--detail' : 'editor');
  const back = link('← Back to board', '#/board'); back.className = 'editor__back';
  const heading = el(row ? 'h1' : 'h2', row ? row.company : 'Add prospect', 'editor__heading');
  if (row) {
    back.className = 'editor__back nc-paddle'; back.textContent = '';
    const arrow = el('span', '', 'nc-button nc-button--secondary nc-button--sm nc-button--icon-only');
    arrow.append(gravityIcon('arrow-left')); arrow.setAttribute('aria-hidden', 'true');
    back.append(arrow, el('span', 'Back to Board', 'nc-paddle__label'));
    const title = el('div', '', 'editor__title'); title.append(companyAvatar(row.company, true), heading);
    const header = el('div', '', 'editor__header'); header.append(back, title); editor.append(header);
  } else editor.append(back, heading);
  const panels = el('div', '', 'editor__panels'); editor.append(panels);
  const form = el('form', '', 'panel'); form.id = 'prospect-form';
  const fields = el('fieldset');
  const grid = el('div', '', 'field-grid');
  grid.append(field('company', 'Company *', row?.company ?? ''), field('title', 'Role / title *', row?.title ?? ''));
  const jobUrl = field('job_url', 'Job URL', row?.job_url ?? '', 'url');
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
  fields.append(grid, jobUrl, field('job_description', 'Job description', row?.job_description ?? '', 'textarea'));
  const details = el('details'); details.append(el('summary', 'More job details'));
  const extra = el('div', '', 'field-grid');
  for (const [name, label] of /** @type {const} */ ([['source','Source'], ['location','Location'], ['employment_type','Employment type'], ['compensation_text','Compensation range / type']])) {
    extra.append(field(name, label, row?.[name] ?? '', name === 'compensation_text' ? 'textarea' : 'text'));
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
  extra.append(selectField('work_arrangement', 'Work arrangement', WORK_ARRANGEMENTS, row?.work_arrangement ?? '', true));
  for (const [name, label] of /** @type {const} */ ([['posted_on','Posted date'], ['discovered_on','Discovered date'], ['applied_on','Applied date']])) extra.append(field(name, label, row?.[name] ?? '', 'date'));
  details.append(extra, field('notes', 'Notes', row?.notes ?? '', 'textarea'));
  if (row) {
    const primaryDetails = el('div', '', 'field-grid');
    for (const name of ['location', 'employment_type', 'work_arrangement', 'compensation_text']) {
      const wrapper = extra.querySelector(`[name="${name}"]`)?.closest('.nc-field');
      if (wrapper) primaryDetails.append(wrapper);
    }
    fields.append(primaryDetails);
    details.open = true;
  }
  fields.append(details);
  const feedback = el('p', '', 'feedback nc-alert'); feedback.id = 'save-feedback'; feedback.setAttribute('role','status');
  const save = el('button', row ? 'Save details' : 'Add prospect', 'primary nc-button nc-button--primary nc-button--lg'); save.type = 'submit';
  fields.append(feedback, save);
  if (row) {
    const feedback = el('p', '', 'feedback nc-alert'); feedback.setAttribute('role', 'status');
    const send = button('Send to Résumé Builder', () => {
      let key = '';
      let tab;
      try {
        const destination = new URL('../resume-tailor.html', window.location.href);
        const handoff = createHandoff(window.localStorage, destination, {
          company: row.company, title: row.title, description: row.job_description ?? ''
        });
        key = handoff.key;
        // Open synchronously from the click, then detach the opener before navigation.
        tab = window.open('about:blank', '_blank');
        if (!tab) throw new Error('Allow pop-ups for this site, then try again.');
        tab.opener = null;
        tab.location.replace(handoff.url.href);
        feedback.classList.remove('error');
        setAlert(feedback, { message: 'Opened Résumé Builder with this prospect’s saved job details.', variant: 'success' });
        setTimeout(() => { try { window.localStorage.removeItem(key); } catch { /* read enforces expiry */ } }, HANDOFF_TTL);
      } catch (error) {
        tab?.close();
        if (key) { try { window.localStorage.removeItem(key); } catch { /* expires on read */ } }
        feedback.classList.add('error');
        const message = error instanceof Error && error.message.startsWith('Allow pop-ups')
          ? error.message : 'Could not send job details. Browser storage may be unavailable or full. Your prospect is unchanged; try again or copy the fields manually.';
        setAlert(feedback, { message, variant: 'danger' });
      }
    }, 'secondary nc-button nc-button--tertiary nc-button--lg');
    const actions = el('div', '', 'actions'); actions.append(save, send);
    fields.append(actions, feedback);
  }
  form.append(fields); bindFieldValidation(form); panels.append(form);
  if (row) {
    const sidebar = el('aside', '', 'panel editor__status'); sidebar.setAttribute('aria-label', 'Prospect status and history');
    const section = el('section'); section.setAttribute('aria-labelledby', 'prospect-status-title');
    const statusTitle = el('h2', 'Status'); statusTitle.id = 'prospect-status-title'; section.append(statusTitle);
    const content = el('div', '', 'editor__status-content');
    const currentBadge = statusBadge(row.status); currentBadge.id = 'current-status-badge'; content.append(currentBadge);
    const statusForm = el('form', '', 'status-controls'); statusForm.id = 'status-form';
    const statusFields = el('fieldset', '', 'status-controls');
    statusFields.append(selectField('status', 'Change Status', SELECTABLE_STATUSES, row.status));
    statusForm.append(statusFields); content.append(statusForm);
    const help = el('p', 'Status saves automatically when selected. Applied date is editable under More job details.', 'editor__status-help'); help.id = 'status-help';
    statusFields.querySelector('select')?.setAttribute('aria-describedby', help.id);
    content.append(help);
    const statusFeedback = el('p', '', 'feedback nc-alert'); statusFeedback.id = 'status-feedback'; statusFeedback.setAttribute('role','status'); content.append(statusFeedback);
    section.append(content); sidebar.append(section);
    const history = el('section'); history.id = 'history'; history.setAttribute('aria-live','polite'); history.setAttribute('aria-labelledby', 'status-history-title'); sidebar.append(history); panels.append(sidebar);
  }
  root.replaceChildren(editor);
  return form;
}
/** @param {HTMLElement} root @param {import('./model.js').StatusEvent[]} events */
export function historyView(root, events) {
  const list = el('ol', '', 'history');
  for (const event of events) {
    const item = el('li');
    if (event.from_status) item.append(statusBadge(/** @type {import('./model.js').ProspectStatus} */ (event.from_status)), document.createTextNode(' → '));
    else item.append(document.createTextNode('Added as '));
    item.append(statusBadge(/** @type {import('./model.js').ProspectStatus} */ (event.to_status)));
    const time = el('time', new Date(event.recorded_at).toLocaleString()); time.dateTime = event.recorded_at; item.append(time); list.append(item);
  }
  const title = el('h3', 'Status history'); title.id = 'status-history-title';
  root.replaceChildren(title, events.length ? list : el('p', 'No status events recorded yet.', 'editor__status-help'));
}
