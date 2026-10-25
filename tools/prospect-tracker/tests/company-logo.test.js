import { test } from 'node:test';
import assert from 'node:assert/strict';
import { logoUrl, mergeLogo } from '../company-logo.js';
import { employerLogo, addEmployerLogo } from '../ingestion/company-logo.js';
import { normalizeAshby } from '../ingestion/ashby.js';
import { normalizeLever } from '../ingestion/lever.js';
import { normalizeWorkday } from '../ingestion/workday.js';
import { normalizeWorkable } from '../ingestion/workable.js';
import { normalizeGreenhouse } from '../ingestion/greenhouse.js';
import { recognizePosting } from '../ingestion/posting-url.js';
import { decodePreview } from '../ingestion-client.js';
import { createRadarDataAccess, StaleProspectError } from '../data.js';
import { startFixture } from './fixtures/radar-server.js';
import { createClient } from '../vendor/supabase.js';
import { createLocalDatabase } from '../scripts/local-database.js';

const logo = 'https://cdn.example.com/employer.png';
const org = { name: 'Example Studio', logo };
const now = new Date('2026-10-25T12:00:00Z');

test('logo URLs reject credentials, payloads and private/non-HTTPS addresses', () => {
  assert.equal(logoUrl(logo), logo); assert.equal(logoUrl(''), null);
  for (const url of ['http://cdn.example.com/a.png','javascript:alert(1)','data:image/svg+xml,test','https://user:pass@cdn.example.com/a.png','https://127.0.0.1/a','https://[::1]/a','https://0x7f000001/a','https://foo.local/a','https://cdn.example.com/a?prospect=secret','https://cdn.example.com/a#secret','https://cdn.example.com:444/a','https://cdn.example.com/"bad']) assert.throws(() => logoUrl(url), undefined, url);
});

test('detection accepts only an unambiguous employer-bound logo, never page/publisher/ATS branding', () => {
  assert.equal(employerLogo(org, org.name), logo);
  assert.equal(employerLogo({ ...org, logo: { '@type':'ImageObject', contentUrl: logo } }, org.name), logo);
  for (const input of [{ ...org, name: 'Other Company' }, { ...org, logo: [logo] }, { ...org, logo:{url:logo,contentUrl:logo+'x'} }, { name:'Lever',logo }, { name:'Example Recruiting',logo }, { ...org, logo:'https://jobs.lever.co/logo.png' }, { ...org, image:logo, logo:undefined }, [org]]) assert.equal(employerLogo(input, org.name), null);
  const draft={company:org.name};addEmployerLogo(draft,{},[org,{...org,logo:'https://cdn.example.com/other.png'}]);assert.equal(draft.company_logo_url,undefined);
});

test('each provider retains safe employer metadata in a boundary-validated preview', () => {
  const cases = [
    ['https://jobs.ashbyhq.com/example/11111111-aaaa-4111-8111-111111111111', (identity,url) => normalizeAshby({title:'Designer'},identity,{hiringOrganization:org},url,now)],
    ['https://jobs.lever.co/example/11111111-aaaa-4111-8111-111111111111', (identity,url) => normalizeLever({text:'Designer'},identity,{hiringOrganization:org},url,now)],
    ['https://apply.workable.com/example/j/ABC123DEF4/', (identity,url) => normalizeWorkable({title:'Designer'},identity,{...org},url,now)],
    ['https://job-boards.greenhouse.io/example/jobs/12345', (identity,url) => normalizeGreenhouse({id:12345,title:'Designer',company_name:org.name,hiringOrganization:org},identity,url,now)]
  ];
  for(const [url,normalize] of cases){const preview=normalize(recognizePosting(url),url);assert.equal(preview.draft.company_logo_url,logo);assert.equal(decodePreview(preview,url).draft.company_logo_url,logo);}
  const url='https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite/job/US-CA-Santa-Clara/Designer_JR12345';
  const identity=recognizePosting(url);
  const preview=normalizeWorkday({hiringOrganization:org,jobPostingInfo:{title:'Designer'}},identity,{hiringOrganization:org},url,now);assert.equal(preview.draft.company_logo_url,logo);
  const conflict=normalizeWorkday({hiringOrganization:org,jobPostingInfo:{title:'Designer'}},identity,{hiringOrganization:{name:'Other',logo}},url,now);assert.equal(conflict.draft.company_logo_url,undefined);
});

test('manual replacement and explicit clearing remain authoritative through repeat retrieval', () => {
  assert.deepEqual(mergeLogo({},logo),{company_logo_url:logo,company_logo_override:false});
  for(const value of [null,'https://cdn.example.com/manual.png']) assert.deepEqual(mergeLogo({company_logo_url:value,company_logo_override:true},logo),{company_logo_url:value,company_logo_override:true});
});

test('logo create/edit/clear/reload uses guarded SDK writes and does not add status events', async () => {
  const fixture=await startFixture();
  const client=createClient(fixture.origin,'sb_publishable_synthetic',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  try {
    assert.equal((await client.auth.signInWithPassword({email:'radar@example.invalid',password:'fixture-only-password'})).error,null);
    const data=createRadarDataAccess(client);
    let row=await data.createProspect({id:crypto.randomUUID(),company:org.name,title:'Designer',company_logo_url:logo});
    assert.equal(row.company_logo_override,false);assert.equal((await data.listProspects())[0].company_logo_url,logo);
    const stale=row.updated_at;
    row=await data.updateProspect(row.id,{company_logo_url:'https://cdn.example.com/manual.png',company_logo_override:true},row.updated_at);
    await assert.rejects(data.updateProspect(row.id,{company_logo_url:null},stale),StaleProspectError);
    row=await data.updateProspect(row.id,{company_logo_url:logo,company_logo_override:false,notes:'Refreshed facts'},row.updated_at);
    assert.equal(row.company_logo_url,'https://cdn.example.com/manual.png');assert.equal(row.company_logo_override,true);
    row=await data.updateProspect(row.id,{company_logo_url:null,company_logo_override:true},row.updated_at);
    row=await data.updateProspect(row.id,{company_logo_url:logo,company_logo_override:false},row.updated_at);
    assert.equal((await data.getProspect(row.id)).company_logo_url,null);assert.equal((await data.listStatusEvents(row.id)).length,1);
  } finally {await client.auth.signOut({scope:'local'});await fixture.close();}
});

test('logo columns retain owner RLS and reject unsafe stored URL syntax', async()=>{
  const db=await createLocalDatabase();const owner=crypto.randomUUID(),other=crypto.randomUUID(),id=crypto.randomUUID();
  try {
    await db.query('insert into auth.users(id) values ($1),($2)',[owner,other]);
    await db.exec('set role authenticated');
    await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:owner})]);
    await db.query('insert into prospects(id,company,title,company_logo_url) values ($1,$2,$3,$4)',[id,'Example','Designer',logo]);
    await assert.rejects(db.query('update prospects set company_logo_url=$1 where id=$2',['javascript:alert(1)',id]));
    await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:other})]);
    assert.equal((await db.query('select company_logo_url from prospects where id=$1',[id])).rows.length,0);
    assert.equal((await db.query('update prospects set company_logo_url=null where id=$1 returning id',[id])).rows.length,0);
  } finally {await db.close();}
});
