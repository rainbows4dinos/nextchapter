// Test-only loopback bridge to the production transport; no private records.
// Run explicitly for live-company-logo.mjs. Never deploy this server.
import { retrieveLogo } from '../../../../supabase/functions/job-ingest/logo-transport.ts';
Deno.serve({hostname:'127.0.0.1',port:9251},async(request)=>{
  try {
    const {url}=await request.json();
    const image=await retrieveLogo(url,request.signal);
    return new Response(new Blob([image.bytes],{type:image.type}));
  } catch { return new Response('Image unavailable',{status:502}); }
});
