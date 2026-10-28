import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateHiringManager } from '../hiring-manager.js';
import { normalizePatch, decodeProspect } from '../model.js';
import { readDetails } from '../view-model.js';
import { createLocalDatabase } from '../scripts/local-database.js';
import { startFixture } from './fixtures/radar-server.js';
import { createClient } from '../vendor/supabase.js';
import { createRadarDataAccess, StaleProspectError } from '../data.js';
import { retrieveJob } from '../ingestion-client.js';
const owner='11111111-1111-4111-8111-111111111111', other='22222222-2222-4222-8222-222222222222';
const contact={name:'Alex Example',title:'Design Director',company:'Example Studio',profile_url:'https://example.org/team/alex',status:'manual'};

test('contact validation supports empty/manual and future provenance without arbitrary data or unsafe URLs',()=>{
  assert.equal(validateHiringManager(null),null);
  assert.equal(validateHiringManager({name:' ',title:''}),null);
  assert.deepEqual(validateHiringManager({...contact,name:' Alex Example '}),contact);
  for(const status of ['manual','suggested','user_selected','user_verified'])assert.equal(validateHiringManager({...contact,status}).status,status);
  for(const input of [{title:'Director'},{...contact,name:'x'.repeat(121)},{...contact,status:'confirmed'},{...contact,notes:'private'},{...contact,profile_url:'javascript:alert(1)'},{...contact,profile_url:'https://user:pass@example.org'},{...contact,profile_url:'not a URL'}])assert.throws(()=>validateHiringManager(input));
  assert.equal(normalizePatch({hiring_manager:null}).hiring_manager,null);
});

test('form reading persists contact separately and clearing does not affect notes',()=>{
  const form=new FormData();form.set('company','Example');form.set('title','Designer');form.set('notes','Separate notes');
  for(const [key,value]of Object.entries(contact))form.set('hiring_manager_'+key,value);
  assert.deepEqual(readDetails(form).hiring_manager,contact);
  for(const key of ['name','title','company','profile_url'])form.set('hiring_manager_'+key,'');
  assert.equal(readDetails(form).hiring_manager,null);assert.equal(readDetails(form).notes,'Separate notes');
});

test('additive contact schema preserves owner RLS and rejects malformed JSON',async()=>{
  const db=await createLocalDatabase();
  try{
    await db.query('insert into auth.users(id)values($1),($2)',[owner,other]);
    await db.exec('set role authenticated');
    await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:owner})]);
    const {rows}=await db.query("insert into public.prospects(company,title,hiring_manager)values('Example','Designer',$1)returning id",[JSON.stringify(contact)]);
    for(const input of [{...contact,status:'confirmed'},{...contact,name:''},{...contact,extra:true},{...contact,profile_url:'javascript:alert(1)'},{...contact,profile_url:'https://user@example.org'},{...contact,name:'a'.repeat(121)}])await assert.rejects(db.query('update public.prospects set hiring_manager=$1 where id=$2',[JSON.stringify(input),rows[0].id]),e=>e.code==='23514');
    await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:other})]);
    assert.equal((await db.query('select * from public.prospects')).rows.length,0);
    assert.equal((await db.query('update public.prospects set hiring_manager=null where id=$1 returning id',[rows[0].id])).rows.length,0);
    await assert.rejects(db.query('insert into public.prospects(owner_id,company,title,hiring_manager)values($1,$2,$3,$4)',[owner,'Other','Designer',JSON.stringify(contact)]),e=>e.code==='42501');
  }finally{await db.close();}
});

test('SDK create/edit/clear/reload preserves contact, revision guards, history and re-ingestion',async()=>{
  const fixture=await startFixture();
  const client=createClient(fixture.origin,'sb_publishable_synthetic',{auth:{persistSession:false,autoRefreshToken:false}});
  try{
    await client.auth.signInWithPassword({email:'radar@example.invalid',password:'fixture-only-password'});
    const data=createRadarDataAccess(client);
    let row=await data.createProspect({id:crypto.randomUUID(),company:'Example',title:'Designer',hiring_manager:contact});
    assert.deepEqual((await data.getProspect(row.id)).hiring_manager,contact);
    const old=row.updated_at;
    row=await data.updateProspect(row.id,{hiring_manager:{...contact,name:'Sam Example'}},old);
    await assert.rejects(data.updateProspect(row.id,{hiring_manager:null},old),StaleProspectError);
    const preview=await retrieveJob(client,'https://boards.greenhouse.io/example/jobs/12345',new AbortController().signal);
    assert.equal('hiring_manager'in preview.draft,false);
    row=await data.updateProspect(row.id,preview.draft,row.updated_at);
    assert.equal(row.hiring_manager.name,'Sam Example');
    assert.equal((await data.listStatusEvents(row.id)).length,1);
    await fetch(fixture.origin+'/__fixture/fail-next-save',{method:'POST'});
    await assert.rejects(data.updateProspect(row.id,{hiring_manager:null},row.updated_at));
    assert.equal((await data.getProspect(row.id)).hiring_manager.name,'Sam Example');
    row=await data.updateProspect(row.id,{hiring_manager:null},row.updated_at);
    assert.equal((await data.getProspect(row.id)).hiring_manager,null);
    const legacy=await data.createProspect({id:crypto.randomUUID(),company:'Legacy',title:'Designer'});
    assert.equal(legacy.hiring_manager,null);
    const without={...legacy};delete without.hiring_manager;
    assert.equal(decodeProspect(without).hiring_manager,null);
  }finally{await client.auth.signOut();await fixture.close();}
});
