import { logoDiagnostic } from './logo-diagnostics.js';

/** Authenticated Edge Function request; the ATS never receives browser headers.
 * No company identity or prospect ID is sent. No persistent image cache.
 * @param {import('@supabase/supabase-js').SupabaseClient<import('./database.types.js').Database>} client */
export function createLogoLoader(client) {
  /** @param {string} url @param {AbortSignal} signal */
  return async (url, signal) => {
    const { data, error, response } = await client.functions.invoke('job-ingest', { body: { action: 'logo', url }, signal });
    const type = response?.headers.get('x-logo-content-type') ?? '';
    if (error || !(data instanceof Blob) || !['image/png','image/jpeg','image/webp'].includes(type) || data.size > 2 * 1024 * 1024) {
      let outcome = 'image_retrieval_failed';
      if (error && 'context' in error && error.context instanceof Response) {
        try {
          const body = await error.context.json();
          if (body.error?.code === 'logo_content_rejected') outcome = 'image_content_rejected';
          if (body.error?.code === 'logo_candidate_rejected') outcome = 'candidate_rejected';
        } catch { /* Log only the outcome, never server details. */ }
      }
      logoDiagnostic(outcome); throw new Error('Company image unavailable');
    }
    return new Blob([data], { type });
  };
}
