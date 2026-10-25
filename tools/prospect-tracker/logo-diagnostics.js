/** Opt-in developer diagnostics: outcomes only, never URLs, names or tokens.
 * Enable with localStorage.setItem('nextchapter:logo-debug', '1').
 * @param {string} outcome */
export function logoDiagnostic(outcome) {
  try { if (globalThis.localStorage?.getItem('nextchapter:logo-debug') === '1') console.debug('[company-logo]', outcome); } catch { /* Storage may be disabled. */ }
}
