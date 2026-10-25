import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveLogoDryRun, readLogoRecords } from '../logo-backfill.js';
const url='https://jobs.ashbyhq.com/example/11111111-aaaa-4111-8111-111111111111';
const logo='https://cdn.example.com/logo.png';
const row=(id,patch={})=>({id,company:'Example Studio',job_url:url,company_logo_url:null,company_logo_override:false,updated_at:'2026-10-25T00:00:00.123456Z',...patch});
const preview=(company='Example Studio',image=logo)=>({draft:{company,company_logo_url:image},field_sources:{company:'Matched metadata'}});

test('dry run protects manual replacement/clear and usable logos; no write capability exists',async()=>{
  let retrieves=0;const result=await resolveLogoDryRun([row('manual',{company_logo_override:true,company_logo_url:logo}),row('clear',{company_logo_override:true}),row('existing',{company_logo_url:logo}),row('unsupported',{job_url:'https://example.org/job'}),row('empty',{job_url:null}),row('new')],{retrieve:async()=>{retrieves++;return preview();},render:async()=>true});
  assert.equal(retrieves,1);assert.deepEqual(result.summary,{examined:6,eligible:1,candidates_found:1,candidates_rejected:0,skipped:5,expected_updates:1});assert.equal(result.rows.at(-1).updated_at,'2026-10-25T00:00:00.123456Z');
});
test('requires matching employer, validated candidate and successful actual rendering',async()=>{
  for(const [value,render,reason] of [[preview('Different Company'),true,'employer'],[preview('Example Studio','http://unsafe.org/a'),true,'URL rejected'],[preview(),false,'decoding'],[preview('Example Studio',null),true,'No usable']]){
    const result=await resolveLogoDryRun([row('a')],{retrieve:async()=>value,render:async()=>render});assert.equal(result.summary.expected_updates,0);assert.match(result.rows[0].reason,new RegExp(reason));
  }
});
test('deduplicates identical postings/images without merging different Ashby jobs on the same board',async()=>{
  const calls=[];let images=0;
  const result=await resolveLogoDryRun([row('a'),row('b'),row('c',{job_url:url.replace('11111111-aaaa','22222222-bbbb')})],{retrieve:async value=>{calls.push(value);return preview();},render:async()=>{images++;return true;}});
  assert.equal(calls.length,2);assert.equal(images,1);assert.equal(result.summary.expected_updates,3);
});
test('invalid existing automatic logos qualify; individual retrieval failures do not stop other records',async()=>{
  const result=await resolveLogoDryRun([row('a',{company_logo_url:'http://invalid.org/a'}),row('b',{job_url:url.replace('11111111-aaaa','22222222-bbbb')})],{retrieve:async value=>{if(value===url)throw Error('unavailable');return preview();},render:async()=>true});assert.equal(result.summary.eligible,2);assert.equal(result.summary.expected_updates,1);assert.match(result.rows[0].reason,/retrieval failed/);
});
test('read path verifies Auth, explicitly filters owner, paginates minimal fields and exposes no writes',async()=>{
  const calls=[];const owner='owner';
  const query={
    select(fields){calls.push(fields);return query;},
    eq(key,value){assert.equal(key,'owner_id');assert.equal(value,owner);return query;},
    order(){return query;},
    async range(){return {data:[row('a')],error:null};}
  };
  const client={auth:{getUser:async()=>({data:{user:{id:owner}},error:null})},from:table=>{calls.push(table);return query;}};
  assert.equal((await readLogoRecords(client)).length,1);assert.doesNotMatch(calls[1],/description|notes|assessment/);
  await assert.rejects(readLogoRecords({...client,auth:{getUser:async()=>({data:{user:null},error:Error()})}}));
});
