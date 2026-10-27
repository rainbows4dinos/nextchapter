import { test } from 'node:test';
import assert from 'node:assert/strict';
import { brandfetchReference, brandfetchLogo, brandfetchImage, brandfetchDomain, configureBrandfetch, searchBrands } from '../brandfetch.js';
import { logoUrl, mergeLogo } from '../company-logo.js';
import { createLogoLoader } from '../company-logo-delivery.js';
import { createRadarDataAccess } from '../data.js';
import { createClient } from '../vendor/supabase.js';
import { startFixture } from './fixtures/radar-server.js';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

test('strict query-free domain/variant references and fixed runtime image parameters', () => {
  configureBrandfetch('synthetic_public_client');
  for (const variant of ['icon','symbol','logo']) {
    const ref=brandfetchLogo('example.org',variant);
    assert.deepEqual(brandfetchReference(ref),{domain:'example.org',variant});
    assert.equal(logoUrl(ref),ref);
    assert.equal(brandfetchImage(ref),`${ref}/w/112/h/112/theme/dark/fallback/404?c=synthetic_public_client`);
  }
  for (const ref of [
    'http://cdn.brandfetch.io/domain/example.org/type/icon',
    'https://user:pass@cdn.brandfetch.io/domain/example.org/type/icon',
    'https://cdn.brandfetch.io:443/domain/example.org/type/icon',
    'https://cdn.brandfetch.io/domain/example.org/type/icon?c=anything',
    'https://cdn.brandfetch.io/domain/example.org/type/icon#fragment',
    'https://cdn.brandfetch.io/domain/example.org/type/svg',
    'https://cdn.brandfetch.io/domain/example.org/type/icon/extra',
    'https://cdn.brandfetch.io/domain/%65xample.org/type/icon',
    'https://cdn.brandfetch.io/domain/a/../example.org/type/icon'
  ]) { assert.equal(brandfetchReference(ref),null); assert.throws(()=>logoUrl(ref)); }
  assert.equal(brandfetchReference('https://cdn.brandfetch.io.evil.org/domain/example.org/type/icon'),null);
  for (const domain of ['localhost','127.0.0.1','2130706433','0x7f000001','[::1]','foo.local','foo.internal','foo.test','-bad.org','bad-.org','foo..org','foo.org:443','foo.org?x','foo.org/path']) {
    assert.equal(brandfetchDomain(domain),null,domain); assert.throws(()=>brandfetchLogo(domain));
  }
  configureBrandfetch('not valid'); assert.equal(brandfetchImage(brandfetchLogo('example.org')),null);
  assert.equal(logoUrl('https://images.example.org/logo.png'),'https://images.example.org/logo.png');
});

test('public generator explicitly emits optional client ID without copying secrets', async () => {
  const folder=await mkdtemp(join(tmpdir(),'brandfetch-config-'));
  try {
    await mkdir(join(folder,'scripts'));
    await writeFile(join(folder,'package.json'),'{"type":"module"}');
    await writeFile(join(folder,'config.js'),await readFile(new URL('../config.js',import.meta.url)));
    await writeFile(join(folder,'scripts/generate-public-config.js'),await readFile(new URL('../scripts/generate-public-config.js',import.meta.url)));
    const env={...process.env,SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic',BRANDFETCH_CLIENT_ID:'synthetic_public_client',ANTHROPIC_API_KEY:'must_not_emit',RADAR_LOGO_SIGNING_KEY:'must_not_emit'};
    execFileSync(process.execPath,[join(folder,'scripts/generate-public-config.js')],{env});
    const output=await readFile(join(folder,'public-env.js'),'utf8');
    assert.match(output,/synthetic_public_client/);assert.doesNotMatch(output,/must_not_emit|SIGNING|ANTHROPIC/);
    delete env.BRANDFETCH_CLIENT_ID;
    execFileSync(process.execPath,[join(folder,'scripts/generate-public-config.js')],{env});
    assert.doesNotMatch(await readFile(join(folder,'public-env.js'),'utf8'),/BRANDFETCH/);
    env.BRANDFETCH_CLIENT_ID='invalid client';
    assert.throws(()=>execFileSync(process.execPath,[join(folder,'scripts/generate-public-config.js')],{env,stdio:'pipe'}));
  } finally { await rm(folder,{recursive:true,force:true}); }
});

test('Search is live, bounded, credential-free; null names and duplicate candidates do not select an identity', async () => {
  configureBrandfetch('synthetic_public_client');
  const controller=new AbortController(); let calls=0;
  const rows=await searchBrands('  Example & Company  ',controller.signal,async(url,options)=>{
    calls++;
    assert.equal(url,'https://api.brandfetch.io/v2/search/Example%20%26%20Company?c=synthetic_public_client');
    assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'origin');assert.equal(options.cache,'no-store');assert.equal(options.signal,controller.signal);assert.equal(options.headers,undefined);
    return Response.json([null,{domain:null},{name:null,domain:'example.org'},{name:'Example',domain:'other.org'},{name:'Example',domain:'third.org'},{name:'Ignore',domain:'sixth.org'}]);
  });
  assert.deepEqual(rows,[{name:'example.org',domain:'example.org'},{name:'Example',domain:'other.org'},{name:'Example',domain:'third.org'}]);
  assert.deepEqual(await searchBrands(' ',controller.signal,async()=>{throw Error('Must not request');}),[]);
  assert.equal(calls,1);
  for (const status of [429,503]) await assert.rejects(searchBrands('Example',controller.signal,async()=>new Response('',{status})),status===429?/wait a moment/:/unavailable/);
  await assert.rejects(searchBrands('Example',controller.signal,async()=>Response.json({bad:true})),/unavailable/);
  const pending=searchBrands('Example',controller.signal,async(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason))));
  controller.abort(new Error('Obsolete request'));await assert.rejects(pending,/Obsolete/);
});

test('Brandfetch never uses authenticated logo delivery; manual choices preserve ingestion precedence', async () => {
  const reference=brandfetchLogo('example.org');
  const loader=createLogoLoader({functions:{invoke(){throw Error('Must not invoke backend');}}});
  await assert.rejects(loader(reference,new AbortController().signal),/direct image/);
  assert.deepEqual(mergeLogo({company_logo_url:reference,company_logo_override:true},'https://images.example.org/auto.png'),{company_logo_url:reference,company_logo_override:true});
  assert.deepEqual(mergeLogo({company_logo_url:null,company_logo_override:true},reference),{company_logo_url:null,company_logo_override:true});
});

test('query-free references create, save, reload and clear using existing owner-scoped schema without history changes', async () => {
  const fixture=await startFixture();
  const client=createClient(fixture.origin,'sb_publishable_synthetic',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  try {
    await client.auth.signInWithPassword({email:'radar@example.invalid',password:'fixture-only-password'});
    const data=createRadarDataAccess(client),ref=brandfetchLogo('example.org');
    let row=await data.createProspect({id:crypto.randomUUID(),company:'Example',title:'Designer',company_logo_url:ref,company_logo_override:true});
    assert.equal(row.company_logo_url,ref);assert.equal(row.company_logo_override,true);
    await fetch(fixture.origin+'/__fixture/fail-next-save',{method:'POST'});
    await assert.rejects(data.updateProspect(row.id,{company_logo_url:brandfetchLogo('example.org','logo')},row.updated_at));
    assert.equal((await data.listProspects())[0].company_logo_url,ref);
    const before = row;
    row=await data.updateProspect(row.id,{company_logo_url:brandfetchLogo('example.org','symbol'),company_logo_override:true},row.updated_at);
    assert.deepEqual(Object.keys(row).filter(key=>JSON.stringify(row[key])!==JSON.stringify(before[key])).sort(),['company_logo_url','updated_at']);
    await assert.rejects(data.updateProspect(row.id,{company_logo_url:ref,company_logo_override:true},before.updated_at),/changed|stale/i);
    assert.equal((await data.listProspects())[0].company_logo_url,row.company_logo_url);
    row=await data.updateProspect(row.id,{company_logo_url:null,company_logo_override:true},row.updated_at);
    assert.equal(row.company_logo_url,null);assert.equal(row.company_logo_override,true);
    const counts=await (await fetch(fixture.origin+'/__fixture')).json();
    assert.equal(counts.prospects,1);assert.equal(counts.events,1);assert.equal(counts.retrieves,0);
  } finally { await client.auth.signOut();await fixture.close(); }
});
