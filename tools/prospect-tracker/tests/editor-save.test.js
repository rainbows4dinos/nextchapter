import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '../vendor/supabase.js';
import { createRadarDataAccess, StaleProspectError } from '../data.js';
import { readDetails } from '../view-model.js';
import { startFixture } from './fixtures/radar-server.js';

test('interleaved logo/details saves preserve the independent logo and exact revision guards', async () => {
  const fixture=await startFixture();
  const client=createClient(fixture.origin,'sb_publishable_synthetic',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  try {
    await client.auth.signInWithPassword({email:'radar@example.invalid',password:'fixture-only-password'});
    const data=createRadarDataAccess(client);
    const form=new FormData();form.set('company','Example');form.set('title','Designer');form.set('notes','Explicit form edit');
    const original='https://images.example.org/old.png',first='https://cdn.brandfetch.io/domain/example.org/type/icon',second='https://cdn.brandfetch.io/domain/example.org/type/symbol';
    form.set('company_logo_url',original);form.set('company_logo_override','false');
    let row=await data.createProspect({id:crypto.randomUUID(),company:'Example',title:'Designer',company_logo_url:original});
    // Creation accepts the selected draft reference; saved forms exclude it.
    assert.equal(readDetails(form).company_logo_url,original);
    row=await data.updateProspect(row.id,{company_logo_url:first,company_logo_override:true},row.updated_at);
    const details=readDetails(form,{includeLogo:false});
    assert.equal('company_logo_url' in details,false);assert.equal('company_logo_override' in details,false);
    row=await data.updateProspect(row.id,details,row.updated_at);
    assert.equal(row.company_logo_url,first);assert.equal(row.company_logo_override,true);assert.equal(row.notes,'Explicit form edit');
    const stale=row.updated_at;
    row=await data.updateProspect(row.id,{company_logo_url:second,company_logo_override:true},row.updated_at);
    assert.equal(row.notes,'Explicit form edit');assert.equal(row.company_logo_url,second);
    await assert.rejects(data.updateProspect(row.id,details,stale),StaleProspectError);
    const saved=await data.getProspect(row.id);
    assert.equal(saved.company_logo_url,second);assert.equal(saved.notes,'Explicit form edit');
    row=await data.updateProspect(row.id,{company_logo_url:null,company_logo_override:true},saved.updated_at);
    row=await data.updateProspect(row.id,details,row.updated_at);
    assert.equal(row.company_logo_url,null);assert.equal(row.company_logo_override,true);
    assert.equal((await data.listStatusEvents(row.id)).length,1);
    assert.equal((await data.listProspects()).length,1);
  } finally { await client.auth.signOut();await fixture.close(); }
});
