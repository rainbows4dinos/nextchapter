// Offline component regression: real editor and modal, disposable fake delete callback.
import { editorView } from '../../ui.js';
import { mountProspectDelete } from '../../prospect-delete.js';
const host = document.getElementById('host'), result = document.getElementById('result');
const check = (condition, message) => { if (!condition) throw Error(message); };
const row = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', company: '<Company>', title: '<Designer>', status: 'prospect', connections: [], updated_at: '2026-10-26T12:00:00.123456Z' };
let calls = 0, successes = 0, fail = true, release;
try {
  const newForm = editorView(host, null);
  check(!newForm.querySelector('[aria-label="Delete prospect"]'), 'unsaved editor must not offer delete');
  const form = editorView(host, row);
  form.elements.namedItem('notes').value = 'Keep my unsaved notes';
  const dispose = mountProspectDelete(form, { getProspect: () => row, canDelete: () => true,
    remove: selected => {
      calls++; check(selected.id === row.id, 'exact selected ID');
      return new Promise((resolve, reject) => { release = () => fail ? reject(Error('Synthetic network failure')) : resolve(); });
    }, onSuccess: () => { successes++; }
  });
  const trigger = form.querySelector('[aria-label="Delete prospect"]'), dialog = host.querySelector('dialog');
  check(trigger.title === 'Delete prospect' && trigger.type === 'button' && trigger.classList.contains('nc-button--tertiary') && trigger.classList.contains('nc-button--icon-only'), 'canonical icon-only tertiary button');
  check(trigger.querySelector('use').getAttribute('href').endsWith('#trash-bin'), 'Trash icon');
  trigger.click();
  const [cancel, confirm] = dialog.querySelectorAll('button');
  check(dialog.open && !calls && document.activeElement === cancel, 'opening is safe and focuses Cancel');
  check(dialog.textContent.includes('<Designer> at <Company>') && !dialog.querySelector('img'), 'safe record label');
  cancel.click(); await new Promise(resolve => setTimeout(resolve, 0));
  check(!dialog.open && !calls && document.activeElement === trigger, 'Cancel leaves record and restores focus');
  trigger.click(); confirm.click(); confirm.click();
  check(calls === 1 && !successes && dialog.open && confirm.disabled && cancel.disabled, 'pending state suppresses repeat requests');
  const escape = new window.Event('cancel', { cancelable: true }); dialog.dispatchEvent(escape);
  check(escape.defaultPrevented, 'pending modal cannot dismiss through Escape');
  release(); await new Promise(resolve => setTimeout(resolve, 0));
  check(dialog.open && !confirm.disabled && !successes && dialog.textContent.includes('Synthetic network failure'), 'failure remains visible and retryable');
  check(form.elements.namedItem('notes').value === 'Keep my unsaved notes', 'failed deletion preserves draft');
  fail = false; confirm.click(); check(calls === 2, 'one explicit retry'); release();
  await new Promise(resolve => setTimeout(resolve, 0));
  check(!dialog.open && successes === 1, 'confirmed success closes modal exactly once');
  dispose(); check(!host.querySelector('dialog') && !form.querySelector('[aria-label="Delete prospect"]'), 'cleanup removes modal and trigger');
  result.textContent = 'PASS: new/existing editor, canonical trigger, confirmation, safe labels, Cancel/focus, pending/Escape guard, repeat clicks, failure/draft, retry/success, cleanup';
} catch (error) { result.textContent = 'FAIL: ' + error.message; throw error; }
