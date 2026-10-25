import { test } from 'node:test';
import assert from 'node:assert/strict';
import { employerLogo } from '../ingestion/company-logo.js';

const ashbyLogo='https://app.ashbyhq.com/api/images/org-theme-logo/7454e9c9-98e8-4b89-9fd8-3302af9316ae/0f073f86-7286-4094-abe3-fcf2f4feaf3f/e3c668be-6e4b-42a1-a439-50b91520e11c.png';

test('matched employer metadata accepts Ashby org-theme-logo, excluding ATS and social assets',()=>{
  assert.equal(employerLogo({name:'Propel',logo:ashbyLogo},'Propel'),ashbyLogo);
  for(const logo of [ashbyLogo.replace('org-theme-logo','org-theme-social'),'https://app.ashbyhq.com/logo.png','https://jobs.ashbyhq.com/favicon.png']) assert.equal(employerLogo({name:'Propel',logo},'Propel'),null);
  assert.equal(employerLogo({name:'Other Employer',logo:ashbyLogo},'Propel'),null);
});

const greenhouseLogo='https://s8-recruiting.cdn.greenhouse.io/external_greenhouse_job_boards/logos/400/109/000/original/2_1(LI).jpg';
const greenhouseUrl='https://job-boards.greenhouse.io/shopmy/jobs/5448826008';

const header = (logo = greenhouseLogo+'?1746799866', company = 'ShopMy', canonical = greenhouseUrl) => `<html><head><link rel="canonical" href="${canonical}"></head><body><main class="main job-post"><div class="job-post-container"><div class="image-container"><img class="logo" alt="${company} Logo" src="${logo}"></div></div></main></body></html>`;

test('Greenhouse selects only the employer header bound to company and posting', async()=>{
  const { greenhouseBranding }=await import('../ingestion/greenhouse-branding.js');
  assert.equal(greenhouseBranding(header(),'ShopMy',greenhouseUrl),greenhouseLogo);
  assert.equal(greenhouseBranding(header(greenhouseLogo,'Other'),'ShopMy',greenhouseUrl),null);
  assert.equal(greenhouseBranding(header(greenhouseLogo,'ShopMy',greenhouseUrl+'1'),'ShopMy',greenhouseUrl),null);
  assert.equal(greenhouseBranding(header().replace('image-container','description'),'ShopMy',greenhouseUrl),null);
  assert.equal(greenhouseBranding(header().replace('<div class="job-post-container">','<div class="description"><div class="job-post-container">'),'ShopMy',greenhouseUrl),null);
  assert.equal(greenhouseBranding(header().replace('alt="ShopMy Logo"','alt="Greenhouse Logo"'),'ShopMy',greenhouseUrl),null);
  assert.equal(greenhouseBranding(header()+header(),'ShopMy',greenhouseUrl),null);
  assert.equal(greenhouseBranding(`<meta property="og:image" content="${greenhouseLogo}">`,'ShopMy',greenhouseUrl),null);
});

test('Greenhouse API facts survive missing, redirected and ambiguous optional branding', async()=>{
  const { ingestGreenhouse }=await import('../ingestion/greenhouse.js');
  for(const [index,response] of [new Response(header(),{headers:{'content-type':'text/html'}}),new Response(null,{status:302}),new Response(header()+header(),{headers:{'content-type':'text/html'}})].entries()) {
    const calls=[];
    const preview=await ingestGreenhouse(greenhouseUrl+'?ignored=secret',{signal:new AbortController().signal,fetcher:async(url,init)=>{
      calls.push([url,init]);return calls.length===1?Response.json({id:5448826008,company_name:'ShopMy',title:'Designer'}):response;
    }});
    assert.equal(preview.draft.company,'ShopMy');assert.equal(preview.draft.title,'Designer');
    assert.equal(preview.draft.company_logo_url,index===0?greenhouseLogo:undefined);
    assert.equal(calls[1][0],greenhouseUrl);assert.equal(calls[1][1].redirect,'manual');
  }
});

test('only verified Greenhouse numeric cache versions canonicalize consistently; arbitrary/signed queries stay rejected', async()=>{
  const { logoUrl }=await import('../company-logo.js');
  const { atsLogoUrl }=await import('../ats-logo.js');
  assert.equal(logoUrl(greenhouseLogo+'?1746799866'),greenhouseLogo);
  assert.equal(employerLogo({name:'ShopMy',logo:greenhouseLogo+'?1746799866'},'ShopMy'),greenhouseLogo);
  for(const value of [greenhouseLogo+'?token=secret',ashbyLogo+'?v=1',greenhouseLogo+'?1746799866&secret=1','https://127.0.0.1/a.png','https://app.ashbyhq.com.evil.org'+new URL(ashbyLogo).pathname,ashbyLogo.replace('/api/images/','/api/images/%2e%2e/'),ashbyLogo+'#secret']) assert.equal(atsLogoUrl(value),null);
});

test('raster content validation accepts PNG with generic MIME, rejects markup, malformed images and oversized dimensions', async()=>{
  const { rasterType }=await import('../ingestion/logo-image.js');
  const png=new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aOGkAAAAASUVORK5CYII=','base64'));
  assert.equal(rasterType(png),'image/png');
  for(const data of [new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>bad()</script></svg>'),png.slice(0,24),new TextEncoder().encode('<html>This is not an image</html>')]) assert.throws(()=>rasterType(data));
  const huge=png.slice();new DataView(huge.buffer).setUint32(16,10000);assert.throws(()=>rasterType(huge));
});

test('logo action uses the existing owner gate and serves only validated raster delivery responses',async()=>{
  const { createIngestionHandler }=await import('../ingestion/handler.js');
  const owner='11111111-1111-4111-8111-111111111111';let calls=0;
  const handler=(authenticate=async()=>owner)=>createIngestionHandler({ownerId:owner,allowedOrigins:['https://example.org'],authenticate,fetcher:async()=>{throw Error('unexpected posting retrieval');},retrieveLogo:async()=>{calls++;return {bytes:new Uint8Array([1,2,3]),type:'image/png'};}});
  const request=()=>new Request('https://example.org',{method:'POST',headers:{authorization:'Bearer fixture','content-type':'application/json',origin:'https://example.org'},body:JSON.stringify({action:'logo',url:ashbyLogo})});
  assert.equal((await handler(async()=>null)(request())).status,401);
  assert.equal((await handler(async()=>crypto.randomUUID())(request())).status,403);assert.equal(calls,0);
  const response=await handler()(request());assert.equal(calls,1);assert.equal(response.headers.get('content-type'),'application/octet-stream');assert.equal(response.headers.get('x-logo-content-type'),'image/png');assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.equal(response.headers.get('cache-control'),'no-store');assert.deepEqual(new Uint8Array(await response.arrayBuffer()),new Uint8Array([1,2,3]));
});

test('real Functions SDK preserves PNG binary bytes through authenticated delivery',async()=>{
  const { startFixture }=await import('./fixtures/radar-server.js');
  const { createClient }=await import('../vendor/supabase.js');
  const { createLogoLoader }=await import('../company-logo-delivery.js');
  const png=new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aOGkAAAAASUVORK5CYII=','base64'));
  const fixture=await startFixture(0,{retrieveLogo:async()=>({bytes:png,type:'image/png'})});
  const client=createClient(fixture.origin,'sb_publishable_synthetic',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  try {
    assert.equal((await client.auth.signInWithPassword({email:'radar@example.invalid',password:'fixture-only-password'})).error,null);
    const image=await createLogoLoader(client)(ashbyLogo,new AbortController().signal);
    assert.equal(image.type,'image/png');assert.deepEqual(new Uint8Array(await image.arrayBuffer()),png);
  } finally { await client.auth.signOut();await fixture.close(); }
});
