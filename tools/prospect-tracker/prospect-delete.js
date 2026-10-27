import { gravityIcon } from '../shared/icons.mjs';
import { setAlert } from '../shared/status.mjs';

/** Existing-record deletion only. The modal owns confirmation and repeat-submit protection.
 * @param {HTMLFormElement} form
 * @param {{getProspect:()=>import('./model.js').Prospect, canDelete:()=>boolean,
 * remove:(row:import('./model.js').Prospect)=>Promise<void>, onSuccess:()=>void}} options
 */
export function mountProspectDelete(form, options) {
  const trigger = document.createElement('button'); trigger.type = 'button';
  trigger.className = 'nc-button nc-button--tertiary nc-button--lg nc-button--icon-only editor__delete';
  trigger.setAttribute('aria-label', 'Delete prospect'); trigger.title = 'Delete prospect';
  trigger.setAttribute('aria-haspopup', 'dialog'); trigger.append(gravityIcon('trash-bin'));
  form.querySelector('.editor__action-controls')?.append(trigger);
  const dialog = document.createElement('dialog'); dialog.className = 'prospect-delete-dialog nc-menu-elevation';
  dialog.setAttribute('aria-labelledby', 'delete-prospect-title'); dialog.setAttribute('aria-describedby', 'delete-prospect-description');
  const title = document.createElement('h2'); title.id = 'delete-prospect-title'; title.textContent = 'Delete this prospect?';
  const description = document.createElement('p'); description.id = 'delete-prospect-description';
  const name = document.createElement('strong');
  description.append('Remove ', name, " from your tracker? This can't be undone.");
  const feedback = document.createElement('div');
  const actions = document.createElement('div'); actions.className = 'actions';
  const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'Cancel'; cancel.autofocus = true;
  cancel.className = 'nc-button nc-button--tertiary nc-button--lg';
  const confirm = document.createElement('button'); confirm.type = 'button'; confirm.textContent = 'Delete Prospect';
  confirm.className = 'nc-button nc-button--primary nc-button--lg';
  actions.append(cancel, confirm); dialog.append(title, description, feedback, actions); form.closest('.editor')?.append(dialog);
  /** @type {import('./model.js').Prospect|null} */ let selected = null;
  let pending = false, disposed = false;
  trigger.addEventListener('click', () => {
    if (!options.canDelete() || dialog.open) return;
    selected = options.getProspect(); name.textContent = `${selected.title} at ${selected.company}`;
    feedback.replaceChildren(); dialog.showModal(); cancel.focus();
  });
  cancel.addEventListener('click', () => { if (!pending) dialog.close(); });
  dialog.addEventListener('cancel', event => { if (pending) event.preventDefault(); });
  dialog.addEventListener('close', () => { selected = null; if (trigger.isConnected && !trigger.disabled) trigger.focus(); });
  confirm.addEventListener('click', async () => {
    if (pending || !selected || !options.canDelete()) return;
    pending = true; cancel.disabled = true; confirm.disabled = true;
    confirm.textContent = 'Deleting…'; dialog.setAttribute('aria-busy', 'true');
    setAlert(feedback, { message: 'Deleting prospect…' });
    try {
      await options.remove(selected);
      if (disposed) return;
      dialog.close(); options.onSuccess();
    } catch (error) {
      if (!disposed) setAlert(feedback, { message: `Could not delete this prospect. ${error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String(error.message) : 'Check your connection and try again.'} Your draft is still here.`, variant: 'danger' });
    } finally {
      pending = false; cancel.disabled = false; confirm.disabled = false;
      confirm.textContent = 'Delete Prospect'; dialog.removeAttribute('aria-busy');
      if (!disposed && dialog.open) cancel.focus();
    }
  });
  return () => { disposed = true; if (dialog.open) dialog.close(); dialog.remove(); trigger.remove(); };
}
