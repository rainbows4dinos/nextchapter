import test from 'node:test';
import assert from 'node:assert/strict';
import {organizationWebsite,postingWebsite,employerWebsiteUrl,unambiguousWebsite} from '../ingestion/employer-website.js';
import {websiteIcons,manifestIcons,brandingContext} from '../ingestion/website-icons.js';
const site='https://employer.example.com/';
test('website identity requires matched employer declarations or explicit homepage labels, never domains inferred from names',()=>{
  assert.equal(organizationWebsite({name:'Example',sameAs:site},'Example','posting').url,site);
  for(const org of [{name:'Other',sameAs:site},{name:'Example',sameAs:[site]},{name:'Example',sameAs:'https://linkedin.com/company/example'},{name:'Example',sameAs:'http://127.0.0.1/a'}])assert.equal(organizationWebsite(org,'Example','posting'),undefined);
  assert.equal(postingWebsite(`<a href="${site}">Example Home Page</a>`,'Example','posting').url,site);
  assert.equal(postingWebsite(`<a href="${site}">Privacy Policy</a>`,'Example','posting'),undefined);
  assert.equal(postingWebsite(`<a href="${site}">Example</a><a href="https://other.example.com/">Example</a>`,'Example','posting'),undefined);
  assert.equal(unambiguousWebsite({url:site},{url:'https://other.example.com/'}),undefined);
  assert.equal(employerWebsiteUrl('http://employer.example.com/'),site,'only HTTPS is retrieved');
  for(const value of ['https://localhost/a','https://[::1]/','https://foo.internal/','https://user:pass@employer.example.com/','https://employer.example.com/?secret=1','https://employer.example.com/#secret'])assert.equal(employerWebsiteUrl(value),null);
});
test('website discovery collects declared icons only, excludes social/partner images and bounds manifest/asset counts',()=>{
  const result=websiteIcons(`<meta property="og:image" content="/banner.png"><img src="/partner-logo.png"><link rel="apple-touch-icon" href="/touch.png"><link rel="icon" href="/small.png" type="image/x-icon"><link rel="icon" href="/unsafe.svg" type="image/svg+xml"><link rel="manifest" href="/site.webmanifest"><link rel="icon" href="https://127.0.0.1/a.png">`,site,'Example');
  assert.deepEqual(result.icons,[{url:site+'touch.png',role:'touch-icon'},{url:site+'small.png',role:'favicon'}]);assert.equal(result.manifest,site+'site.webmanifest');
  const icons=manifestIcons({icons:[{src:'/icon.png',purpose:'any'},{src:'/masked.png',purpose:'maskable'},{src:'/mono.png',purpose:'monochrome'},{src:'http://unsafe.example.com/a'}]},site+'site.webmanifest');assert.equal(icons.length,1);
});
test('organization logos on official pages must match the employer; unrelated structured and social artwork is ignored',()=>{
  const html=name=>`<script type="application/ld+json">${JSON.stringify({'@type':'Organization',name,logo:'/org.png'})}</script>`;
  assert.equal(websiteIcons(html('Example'),site,'Example').icons[0].role,'organization-logo');
  assert.equal(websiteIcons(html('Partner'),site,'Example').icons.length,0);
  assert.equal(brandingContext('https://cdn.example.com/now-hiring-primary.png'),'marketing');
  assert.equal(brandingContext('https://cdn.example.com/logo-linkedin.png'),'branding','platform word alone does not prove a marketing banner');
});

test('optional logo deadlines return already-retrieved posting facts instead of failing ingestion',async()=>{
  const {createIngestionHandler}=await import('../ingestion/handler.js');
  const owner='11111111-1111-4111-8111-111111111111';let called=false;
  const handler=createIngestionHandler({ownerId:owner,allowedOrigins:['https://example.com'],timeoutMs:160,authenticate:async()=>owner,fetcher:async()=>Response.json({id:123,title:'Designer',company_name:'Example'}),resolveBranding:async(preview,signal)=>{called=true;await new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('bounded optional work')),{once:true}));return preview;}});
  const response=await handler(new Request('https://example.com/',{method:'POST',headers:{authorization:'Bearer synthetic','content-type':'application/json'},body:JSON.stringify({url:'https://job-boards.greenhouse.io/example/jobs/123'})}));
  assert.equal(response.status,200);assert.equal(called,true);assert.equal((await response.json()).draft.company,'Example');
});
