// Explicit, loopback-only live acceptance harness. Never deploy this file.
// Synthetic Auth identity only; no database access or private records.
import {createIngestionHandler} from '../../../../tools/prospect-tracker/ingestion/handler.js';
import {createBranding} from '../../../../supabase/functions/job-ingest/branding.ts';
const owner='11111111-1111-4111-8111-111111111111';
const branding=createBranding({origin:'https://logo-fixture.example.com',owner,secret:'fixture-only-signing-key-not-for-production'});
Deno.serve({hostname:'127.0.0.1',port:9253},request=>{
  const origin=request.headers.get('origin')??'http://127.0.0.1';
  if(!/^http:\/\/127\.0\.0\.1(?::\d+)?$/.test(origin))return new Response(null,{status:403});
  return createIngestionHandler({ownerId:owner,allowedOrigins:[origin],authenticate:token=>Promise.resolve(token.endsWith('.synthetic')?owner:null),fetcher:fetch,resolveBranding:branding.resolve,retrieveLogo:branding.deliver})(request);
});
