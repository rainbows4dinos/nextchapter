// Offline browser regression: real editor/popover, no external navigation or data writes.
import { editorView } from '../../ui.js';
const host = document.getElementById('host'), result = document.getElementById('result');
const check = (condition, message) => { if (!condition) throw Error(message); };
const wait = async predicate => {
  for (let i = 0; i < 100; i++) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 10)); }
  throw Error('Timed out');
};
const row = { id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', company:'Saved & Company', title:'Lead Product Designer', status:'prospect', connections:[], notes:'PRIVATE_NOTES', job_description:'PRIVATE_DESCRIPTION' };
try {
  editorView(host, null);
  check(!host.querySelector('.find-people'), 'saved-record-only action');
  const form = editorView(host, row);
  let submissions = 0; form.addEventListener('submit', event => { submissions++; event.preventDefault(); });
  form.elements.namedItem('company').value = 'UNSAVED_EMPLOYER';
  form.elements.namedItem('title').value = 'UNSAVED_ROLE';
  form.elements.namedItem('notes').value = 'UNSAVED_NOTES';
  const trigger = host.querySelector('.find-people button'), panel = host.querySelector('#find-people-panel');
  check(trigger.type === 'button' && trigger.classList.contains('nc-button--tertiary'), 'shared tertiary non-submit trigger');
  trigger.click(); await wait(() => trigger.getAttribute('aria-expanded') === 'true');
  document.dispatchEvent(new window.Event('scroll'));
  check(panel.matches(':popover-open'), 'scroll repositions without dismissing a newly opened popover');
  const links = [...panel.querySelectorAll('a')];
  check(links.length === 3 && document.activeElement === links[0], 'three choices and initial focus');
  check(panel.getAttribute('role') === 'dialog' && panel.getAttribute('aria-labelledby'), 'accessible popover name');
  for (const link of links) check(link.target === '_blank' && link.rel === 'noopener noreferrer', 'secure external links');
  check(links[2].href === 'https://www.linkedin.com/', 'ordinary LinkedIn homepage only');
  const query = new URL(links[0].href).searchParams.get('q');
  check(query.includes('Saved & Company') && query.includes('Design Manager'), 'saved context and conservative Lead handling');
  check(!links.map(link => link.href).join('').match(/UNSAVED|PRIVATE/), 'private fields and drafts excluded');
  panel.dispatchEvent(new window.KeyboardEvent('keydown', { key:'Escape', bubbles:true, cancelable:true }));
  await wait(() => trigger.getAttribute('aria-expanded') === 'false');
  check(!panel.matches(':popover-open') && document.activeElement === trigger, 'Escape restores focus');
  trigger.click(); await wait(() => trigger.getAttribute('aria-expanded') === 'true');
  links[0].addEventListener('click', event => event.preventDefault()); links[0].click();
  await wait(() => trigger.getAttribute('aria-expanded') === 'false');
  check(!submissions && form.elements.namedItem('company').value === 'UNSAVED_EMPLOYER' && form.elements.namedItem('title').value === 'UNSAVED_ROLE' && form.elements.namedItem('notes').value === 'UNSAVED_NOTES', 'opening links preserves all draft values without save');
  editorView(host, { ...row, company:'Confidential' });
  host.querySelector('.find-people button').click(); await wait(() => host.querySelector('#find-people-panel').matches(':popover-open'));
  check(!host.querySelector('#find-people-panel a') && host.querySelectorAll('[aria-disabled="true"]').length === 3, 'unknown company disabled safely');
  check(host.querySelector('#find-people-panel').textContent.includes('save the prospect'), 'missing company guidance');
  host.querySelector('#find-people-panel').hidePopover();
  result.textContent = 'PASS: saved-record-only, shared trigger, secure destinations, saved context, privacy, focus, Escape, no form submission, preserved drafts, missing company';
} catch (error) { result.textContent = 'FAIL: ' + error.message; throw error; }
