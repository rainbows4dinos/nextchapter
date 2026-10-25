import test from 'node:test';
import assert from 'node:assert/strict';
import { approvedLogoRows,applyApprovedLogos,stableData } from '../logo-backfill-apply.js';
import { startFixture } from './fixtures/radar-server.js';
import { createClient } from '../vendor/supabase.js';
import { createRadarDataAccess } from '../data.js';
const logo='https://cdn.example.com/employer.png',url='https://apply.workable.com/example/j/ABC123DEF4/';
const proposal=row=>({id:row.id,company:row.company,provider:'workable',updated_at:row.updated_at,candidate:logo,expectedUpdate:true,eligible:true,validated:true,employerMatched:true,renderable:true,candidateFound:true});
test('rejects malformed, duplicated and unreviewable approved proposals before writes',()=>{
  const row=proposal({id:crypto.randomUUID(),company:'Example Studio',updated_at:'2026-10-25T00:00:00.123456Z'});
  assert.equal(approvedLogoRows({summary:{expected_updates:1},rows:[row]}).length,1);
  for(const value of [{summary:{expected_updates:2},rows:[row,row]},{summary:{expected_updates:1},rows:[{...row,renderable:false}]},{summary:{expected_updates:1},rows:[{...row,candidate:'http://unsafe.org/logo'}]}])assert.throws(()=>approvedLogoRows(value));
});
test('approved apply uses guarded logo-only saves, preserves stale/manual/existing records and verifies all fields',async()=>{
  const fixture=await startFixture();const client=createClient(fixture.origin,'sb_publishable_synthetic',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  try{
    await client.auth.signInWithPassword({email:'radar@example.invalid',password:'fixture-only-password'});const data=createRadarDataAccess(client);
    const rows=[];
    for(let i=0;i<4;i++)rows.push(await data.createProspect({id:crypto.randomUUID(),company:'Example Studio',title:'Designer',job_url:url,notes:'Preserve notes',...(i===2?{company_logo_override:true}:{}),...(i===3?{company_logo_url:logo}:{})}));
    const approvals=approvedLogoRows({summary:{expected_updates:4},rows:rows.map(proposal)});
    await data.updateProspect(rows[1].id,{notes:'Newer user edit'},rows[1].updated_at);
    const before=await(await fetch(fixture.origin+'/__fixture')).json();
    const result=await applyApprovedLogos(client,approvals);
    assert.deepEqual(result.summary,{approved:4,updated:1,skipped:3,failed:0,changed_records:1,unapproved_changes:0,non_logo_changes:0,manual_choices_changed:0,record_count_unchanged:true});
    assert.equal((await data.getProspect(rows[0].id)).company_logo_url,logo);
    assert.equal((await data.getProspect(rows[1].id)).notes,'Newer user edit');
    assert.equal((await data.getProspect(rows[2].id)).company_logo_override,true);
    const after=await(await fetch(fixture.origin+'/__fixture')).json();assert.equal(after.attempts,before.attempts+1);assert.equal(after.events,before.events);
    assert.equal(stableData({b:1,a:[2]}),stableData({a:[2],b:1}));
  }finally{await client.auth.signOut({scope:'local'});await fixture.close();}
});
test('individual guarded write failures do not overwrite data or prevent later approved updates',async()=>{
  const fixture=await startFixture();const client=createClient(fixture.origin,'sb_publishable_synthetic',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  try{
    await client.auth.signInWithPassword({email:'radar@example.invalid',password:'fixture-only-password'});const data=createRadarDataAccess(client);
    const rows=[];for(let i=0;i<2;i++)rows.push(await data.createProspect({id:crypto.randomUUID(),company:'Example Studio',title:'Designer',job_url:url}));
    await fetch(fixture.origin+'/__fixture/fail-next-save',{method:'POST'});
    const result=await applyApprovedLogos(client,approvedLogoRows({summary:{expected_updates:2},rows:rows.map(proposal)}));
    assert.equal(result.summary.failed,1);assert.equal(result.summary.updated,1);assert.equal(result.summary.non_logo_changes,0);
    assert.equal((await data.getProspect(rows[0].id)).company_logo_url,null);
  }finally{await client.auth.signOut({scope:'local'});await fixture.close();}
});
