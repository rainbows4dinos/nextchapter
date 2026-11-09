/** Celebrate an acknowledged transition, never a loaded or ordinarily edited row.
 * @param {string} previousStatus @param {{status:string}} saved */
export function isHiredTransition(previousStatus, saved) {
  return previousStatus !== 'hired' && saved.status === 'hired';
}

/** Native modal supplies focus containment and Escape dismissal, like prospect deletion.
 * Caller owns route/session cleanup; no replay state is persisted.
 * @param {{company:string,title:string}} prospect @param {Element|null} [returnFocus] @returns {()=>void} */
export function showHiredCelebration(prospect, returnFocus = document.activeElement) {
  const dialog = document.createElement('dialog');
  dialog.className = 'prospect-delete-dialog hired-celebration nc-menu-elevation';
  dialog.setAttribute('aria-labelledby', 'hired-title');
  dialog.setAttribute('aria-describedby', 'hired-prospect hired-description');
  const symbol = document.createElement('div'); symbol.className = 'hired-celebration__symbol';
  symbol.textContent = '✦'; symbol.setAttribute('aria-hidden', 'true');
  const title = document.createElement('h2'); title.id = 'hired-title'; title.textContent = 'You got the job! 🎉';
  const name = document.createElement('p'); name.id = 'hired-prospect'; name.className = 'hired-celebration__prospect';
  name.textContent = `${prospect.title} at ${prospect.company}`;
  const description = document.createElement('p'); description.id = 'hired-description'; description.textContent = 'A new chapter begins.';
  const actions = document.createElement('div'); actions.className = 'actions';
  const dismiss = document.createElement('button'); dismiss.type = 'button'; dismiss.autofocus = true;
  dismiss.className = 'nc-button nc-button--primary nc-button--lg'; dismiss.textContent = 'Continue';
  actions.append(dismiss); dialog.append(symbol, title, name, description, actions);
  document.body.append(dialog);
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const confetti = document.createElement('div'); confetti.className = 'hired-confetti'; confetti.setAttribute('aria-hidden', 'true');
  // Bounded deterministic CSS particles; no animation loop or dependency.
  if (!motion.matches) {
    for (let i = 0; i < 32; i++) {
      const piece = document.createElement('i');
      piece.style.setProperty('--x', `${(i * 37) % 100}%`);
      piece.style.setProperty('--delay', `${(i % 8) * 60}ms`);
      piece.style.setProperty('--turn', `${i % 2 ? 540 : -420}deg`);
      confetti.append(piece);
    }
    dialog.prepend(confetti);
  }
  const stopMotion = () => { if (motion.matches) confetti.remove(); };
  motion.addEventListener('change', stopMotion);
  const timer = window.setTimeout(() => confetti.remove(), 2800);
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true; window.clearTimeout(timer); motion.removeEventListener('change', stopMotion);
    if (dialog.open) dialog.close();
    dialog.remove();
    if (returnFocus instanceof window.HTMLElement && returnFocus.isConnected) returnFocus.focus({ preventScroll: true });
  };
  dismiss.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', dispose);
  dialog.showModal(); dismiss.focus();
  return dispose;
}
