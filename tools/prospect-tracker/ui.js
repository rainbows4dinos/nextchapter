// @ts-expect-error Browser asset revision; TypeScript does not resolve URL query strings.
import { companyLogoEditor } from './company-logo-editor.js?v=20261026-logo-grid';
// @ts-expect-error Browser asset revision; TypeScript does not resolve URL query strings.
import { companyAvatar } from './company-avatar.js?v=20261026-logo-grid';
import { prospectFields, selectField } from './prospect-form.js';
// @ts-expect-error Browser asset revision; TypeScript does not resolve URL query strings.
import { createDateFilter } from './date-filter.js?v=20261024-radio-label';
import { applicationDate, appliedHistoryMap, defaultDateFilter } from './board-dates.js';
import { gravityIcon } from '../shared/icons.mjs';
import { bindFieldValidation } from '../shared/fields.mjs';
import { setAlert } from '../shared/status.mjs';
import { BOARD_COLUMNS, formatAppliedDate, searchBoardGroups, statusLabel } from './view-model.js';
import { STATUSES, SELECTABLE_STATUSES } from './model.js';
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
        header.append(companyAvatar(card.company, false, card.company_logo_url), el('strong', card.company, 'prospect-card__company'));
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
/** @param {HTMLElement} root @param {import('./model.js').Prospect|null} row
 * @param {import('./company-logo-editor.js').LogoEditorOptions} [options] */
export function editorView(root, row, options = {}) {
  const editor = el('div', '', row ? 'editor editor--detail' : 'editor');
  const back = link('', '#/board'); back.className = 'editor__back nc-paddle';
  const arrow = el('span', '', 'nc-button nc-button--secondary nc-button--sm nc-button--icon-only');
  arrow.append(gravityIcon('arrow-left')); arrow.setAttribute('aria-hidden', 'true');
  back.append(arrow, el('span', 'Back to Board', 'nc-paddle__label'));
  const heading = el('h1', row ? row.company : 'Add Prospect', 'editor__heading');
  const logoEditor = companyLogoEditor(row ?? {}, options);
  const title = el('div', '', 'editor__title'); title.append(logoEditor.trigger, heading, logoEditor.panel);
  const header = el('div', '', 'editor__header'); header.append(back, title); editor.append(header);
  const panels = el('div', '', 'editor__panels'); editor.append(panels);
  const form = el('form', '', 'panel'); form.id = 'prospect-form';
  const { fields, companyInput } = prospectFields(row ?? {}, { mode: row ? 'edit' : 'create' });
  fields.append(logoEditor.value, logoEditor.override);
  const refreshCompany = () => {
    logoEditor.updateCompany(companyInput.value);
    if (!row) heading.textContent = companyInput.value.trim() || 'Add Prospect';
  };
  companyInput.addEventListener('input', refreshCompany);
  companyInput.addEventListener('change', refreshCompany);
  const feedback = el('p', '', 'feedback nc-alert'); feedback.id = 'save-feedback'; feedback.setAttribute('role','status');
  const save = el('button', row ? 'Save details' : 'Add prospect', 'primary nc-button nc-button--primary nc-button--lg'); save.type = 'submit';
  const cancel = button('Cancel', () => back.click(), 'nc-button nc-button--tertiary nc-button--lg');
  const controls = el('div', '', 'editor__action-controls'); controls.append(save, cancel);
  const footer = el('fieldset', '', 'editor__actions'); footer.setAttribute('aria-label', 'Prospect Actions'); footer.append(feedback, controls);
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
    const actions = el('div', '', 'actions'); actions.append(send);
    fields.append(actions, feedback);
  }
  form.append(fields, footer); bindFieldValidation(form);
  form.addEventListener('invalid', () => setAlert(feedback, { message: 'Review the highlighted fields before saving.', variant: 'danger' }), true);
  // Native focus/validation scrolling must account for the responsive footer,
  // including wrapped errors and the mobile safe-area inset. No nested scroller.
  const actionSize = new window.ResizeObserver(() => {
    if (!form.isConnected) { actionSize.disconnect(); return; }
    const height = `${Math.ceil(footer.getBoundingClientRect().height)}px`;
    editor.style.setProperty('--editor-action-height', height);
    document.documentElement.style.setProperty('--editor-action-height', height);
  });
  actionSize.observe(footer);
  const main = el('div', '', 'editor__main'); main.append(form); panels.append(main);
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
