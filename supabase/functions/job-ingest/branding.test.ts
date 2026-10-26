import assert from 'node:assert/strict';
import {createLogoReferences} from './logo-reference.ts';
import {createBranding} from './branding.ts';
import {rasterMetadata} from '../../../tools/prospect-tracker/ingestion/logo-image.js';
import {managedLogoUrl} from '../../../tools/prospect-tracker/managed-logo.js';
const owner='11111111-1111-4111-8111-111111111111',origin='https://api.example.com',secret='fixture-only-signing-key-not-for-production';
const png=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aOGkAAAAASUVORK5CYII='),c=>c.charCodeAt(0));
const site='https://employer.example.com/';
const preview=()=>({draft:{company:'Example'},identity:{provider:'greenhouse' as const,board:'example',posting_id:'123',canonical_url:'https://job-boards.greenhouse.io/example/jobs/123',retrieval_url:'https://boards-api.greenhouse.io/v1/boards/example/jobs/123',requisition_id:null},original_url:'https://job-boards.greenhouse.io/example/jobs/123',retrieved_at:'2026-10-26T00:00:00Z',method:'greenhouse-job-board-api' as const,field_sources:{company:'company_name'},warnings:[] as string[],employer_website:{url:site,kind:'matched-posting-link' as const,source:'matched posting'}});
Deno.test('managed references verify exact issuer, owner and public asset proof without private identifiers in payload',async()=>{
 const refs=createLogoReferences(origin,secret),reference=await refs.issue({url:site+'icon.png',site,role:'touch-icon'},owner);
 assert.equal(managedLogoUrl(reference),reference);assert.equal((await refs.verify(reference,owner)).url,site+'icon.png');
 const payload=JSON.parse(atob(reference.split('/').at(-1)!.split('.')[1].replaceAll('-','+').replaceAll('_','/')));
 assert.equal(JSON.stringify(payload).includes(owner),false);assert.deepEqual(Object.keys(payload).sort(),['role','site','url','v']);
 await assert.rejects(refs.verify(reference,'other-owner'));
 await assert.rejects(refs.verify(reference.replace('api.example.com','evil.example.com'),owner));
 await assert.rejects(createLogoReferences('https://other.example.com',secret).verify(reference.replace('api.example.com','other.example.com'),owner));
 await assert.rejects(refs.verify(reference.slice(0,-5)+'AAAAA',owner));
 await assert.rejects(refs.issue({url:'https://127.0.0.1/a',site,role:'touch-icon'},owner));
});
Deno.test('bounded discovery ignores social/unrelated images, signs only declared assets and serves non-CORS PNG with generic MIME',async()=>{
 const calls:string[]=[];
 // deno-lint-ignore require-await -- async transport fixture matches the production seam.
 const resource=async(url:string)=>{calls.push(url);if(url===site)return {bytes:new TextEncoder().encode('<meta property="og:image" content="/banner.png"><img src="/partner.png"><link rel="apple-touch-icon" href="/icon.png">'),type:'text/html'};if(url===site+'icon.png')return {bytes:png,type:'application/octet-stream'};throw Error('Unexpected fetch');};
 const service=createBranding({origin,owner,secret,resource});const result=await service.resolve(preview(),new AbortController().signal);
 assert.equal(result.logo_candidates?.length,1);assert.equal(result.logo_candidates![0].role,'touch-icon');assert.deepEqual(calls,[site,site+'icon.png']);
 const image=await service.deliver(result.logo_candidates![0].url,new AbortController().signal);assert.deepEqual(image.bytes,png);assert.equal(image.type,'image/png');
 const before=calls.length;await assert.rejects(service.deliver(site+'unverified.png',new AbortController().signal));assert.equal(calls.length,before,'raw website URLs never reach transport');
});
Deno.test('absent website evidence and optional discovery failures do not crawl or discard posting facts',async()=>{
 const p=preview();delete (p as Partial<typeof p>).employer_website;
 let calls=0;const service=createBranding({origin,owner,secret,resource:()=>{calls++;return Promise.reject(Error());}});
 const result=await service.resolve(p,new AbortController().signal);assert.equal(calls,0);assert.equal(result.draft.company,'Example');
 const failure=await service.resolve(preview(),new AbortController().signal);assert.equal(failure.draft.company,'Example');assert.equal(failure.logo_candidates?.length,0);
});
Deno.test('manifest and asset budgets stay bounded; marketing context is rejected before image retrieval',async()=>{
 const calls:string[]=[];
 // deno-lint-ignore require-await -- async transport fixture matches the production seam.
 const resource=async(url:string)=>{calls.push(url);if(url===site)return {type:'text/html',bytes:new TextEncoder().encode('<link rel="manifest" href="/manifest.json"><link rel="icon" href="/one.png"><link rel="icon" href="/two.png"><link rel="icon" href="/three.png"><link rel="icon" href="/four.png">')};if(url.endsWith('.json'))return {type:'application/json',bytes:new TextEncoder().encode(JSON.stringify({icons:[{src:'/manifest-icon.png'}]}))};return {type:'image/png',bytes:png};};
 const p={...preview(),draft:{company:'Example',company_logo_url:'https://cdn.example.com/now-hiring-primary.png'}};
 const service=createBranding({origin,owner,secret,resource});const result=await service.resolve(p,new AbortController().signal);
 assert.equal(calls.length,5);assert.equal(calls.some(url=>url.includes('four.png')||url.includes('now-hiring')),false);assert.equal(result.logo_candidates?.length,3);
});
Deno.test('invalid HTML, SVG and animated PNG content never become managed image candidates',()=>{
 assert.throws(()=>rasterMetadata(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg">bad</svg>')));
 const apng=new Uint8Array(png.length+12);apng.set(png.slice(0,33));apng.set([0,0,0,0,97,99,84,76,0,0,0,0],33);apng.set(png.slice(33),45);assert.throws(()=>rasterMetadata(apng));
});
