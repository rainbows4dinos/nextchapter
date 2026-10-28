import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HANDOFF_TTL, createHandoff, readHandoff, consumeHandoff, clearExpiredHandoffs, useHandoffContact } from '../../shared/resume-handoff.mjs';

const destination = new URL('https://example.github.io/career-context/tools/resume-tailor.html');
const job = { company: 'Example', title: 'Designer', description: 'Full description\n\n• Details <script>inert text</script>' };
const token = '11111111-1111-4111-8111-111111111111';
function storage() {
  const data = new Map();
  return { get length() { return data.size; }, key: i => [...data.keys()][i] ?? null,
    getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
}
const fields = () => ({ company: { value: '' }, title: { value: '' }, description: { value: '' } });

test('exact complete and long text round trips once, with only a token in a Pages-relative URL', () => {
  for (const description of [job.description, ('Long line 😀\n\n').repeat(30000)]) {
    const store = storage();
    const input = { ...job, description };
    const url = new URL('../resume-tailor.html', 'https://example.github.io/career-context/tools/prospect-tracker/index.html');
    const sent = createHandoff(store, url, input, 100, token);
    assert.equal(sent.url.pathname, destination.pathname);
    assert.equal(sent.url.search, '');
    assert.ok(sent.url.href.length < 150);
    const received = readHandoff(store, sent.url, 101);
    const output = fields();
    assert.equal(consumeHandoff(store, received, output, () => assert.fail('blank fields do not confirm')), true);
    assert.deepEqual(Object.fromEntries(Object.entries(output).map(([key, field]) => [key, field.value])), input);
    assert.equal(store.length, 0);
    assert.throws(() => readHandoff(store, sent.url, 102), /missing/);
  }
});

test('missing optional content stays empty; replacement requires confirmation and decline preserves draft', () => {
  for (const approve of [true, false]) {
    const store = storage(); const sent = createHandoff(store, destination, { ...job, company: '', description: '' }, 100, token);
    const output = fields(); output.description.value = 'My draft';
    let prompts = 0;
    assert.equal(consumeHandoff(store, readHandoff(store, sent.url, 101), output, () => { prompts++; return approve; }), approve);
    assert.equal(prompts, 1);
    assert.equal(output.description.value, approve ? '' : 'My draft');
    assert.equal(store.length, 0);
  }
});

test('standalone navigation and unrelated Builder tabs do not consume pending transfers; repeated sends remain isolated', () => {
  const store = storage();
  const first = createHandoff(store, destination, job, 100, token);
  const second = createHandoff(store, destination, { ...job, company: 'Second' }, 101, '22222222-2222-4222-8222-222222222222');
  assert.equal(readHandoff(store, destination, 102), null);
  const otherProject = new URL(first.url); otherProject.pathname = '/other/tools/resume-tailor.html';
  assert.throws(() => readHandoff(store, otherProject, 102), /missing/);
  assert.equal(store.length, 2);
  const output = fields(); consumeHandoff(store, readHandoff(store, second.url, 102), output, () => true);
  assert.equal(output.company.value, 'Second');
  assert.equal(readHandoff(store, first.url, 102).job.company, 'Example');
});

test('expired, future, malformed, wrong-version, missing and non-string payloads are rejected and removed', () => {
  for (const raw of ['{', 'null', '{}', JSON.stringify({ version: 2, createdAt: 100, job }), JSON.stringify({ version: 1, createdAt: 100, job: { ...job, description: 1 } }), JSON.stringify({ version: 1, createdAt: 200, job })]) {
    const store = storage(); const sent = createHandoff(store, destination, job, 100, token);
    store.setItem(sent.key, raw);
    assert.throws(() => readHandoff(store, sent.url, 101), /invalid/);
    assert.equal(store.length, 0);
  }
  const store = storage(); const sent = createHandoff(store, destination, job, 100, token);
  assert.throws(() => readHandoff(store, sent.url, 100 + HANDOFF_TTL), /expired/);
  const bad = new URL(destination); bad.hash = 'radar-handoff=../bad';
  assert.throws(() => readHandoff(store, bad, 101), /invalid/);
});

test('abandoned transfers expire without deleting unrelated settings or other projects', () => {
  const store = storage(); createHandoff(store, destination, job, 100, token);
  store.setItem('theme', 'light'); store.setItem('career-resume-handoff:/other/tools/resume-tailor.html:bad', '{');
  clearExpiredHandoffs(store, destination, 100 + HANDOFF_TTL);
  assert.equal(store.length, 2); assert.equal(store.getItem('theme'), 'light');
});

test('storage read/write/delete failures propagate and failed consumption preserves all fields', () => {
  for (const operation of ['getItem', 'setItem', 'removeItem']) {
    const store = storage(); const sent = createHandoff(store, destination, job, 100, token);
    const received = readHandoff(store, sent.url, 101);
    store[operation] = () => { throw new Error('storage blocked'); };
    if (operation === 'getItem') assert.throws(() => readHandoff(store, sent.url, 101), /blocked/);
    if (operation === 'setItem') assert.throws(() => createHandoff(store, destination, job, 101, token), /blocked/);
    if (operation === 'removeItem') {
      const output = fields(); output.title.value = 'Existing title';
      assert.throws(() => consumeHandoff(store, received, output, () => true), /blocked/);
      assert.equal(output.title.value, 'Existing title'); assert.equal(output.company.value, '');
    }
  }
});

test('contact handoff preserves recipients until explicit use, with replacement consent and later edits',()=>{
  for(const status of ['manual','suggested','user_selected','user_verified'])for(const approve of [true,false]){
    const store=storage();const input={...job,hiring_manager:{name:'Alex Example',status}};
    const sent=createHandoff(store,destination,input,100,token), received=readHandoff(store,sent.url,101);
    const recipient={value:'My existing recipient'};let prompts=0;
    consumeHandoff(store,received,fields(),()=>true);
    assert.equal(recipient.value,'My existing recipient','no automatic recipient use for any provenance');
    useHandoffContact(received.job.hiring_manager,recipient,()=>{prompts++;return approve;});
    assert.equal(prompts,1);assert.equal(recipient.value,approve?'Alex Example':'My existing recipient');
    recipient.value='Edited after transfer';assert.equal(recipient.value,'Edited after transfer');
    assert.equal(store.length,0);
  }
  const recipient={value:''};
  assert.equal(useHandoffContact({name:'Alex',status:'manual'},recipient,()=>assert.fail('explicit action on blank field needs no extra prompt')),true);
  assert.equal(recipient.value,'Alex');
});

test('missing contact and rejected job replacement preserve recipient without another prompt',()=>{
  for(const hasContact of [false,true]){
    const store=storage();const sent=createHandoff(store,destination,{...job,...(hasContact?{hiring_manager:{name:'Alex',status:'manual'}}:{})},100,token);
    const output=fields();if(hasContact)output.company.value='Keep draft';
    const recipient={value:'Keep recipient'};
    consumeHandoff(store,readHandoff(store,sent.url,101),output,()=>false);
    assert.equal(recipient.value,'Keep recipient');
  }
});

test('contact transport rejects extra/incompatible fields and malformed provenance',()=>{
  for(const hiring_manager of [{name:'Alex',status:'manual',profile_url:'https://example.org'},{name:'',status:'manual'},{name:'Alex',status:'confirmed'},'Alex']){
    assert.throws(()=>createHandoff(storage(),destination,{...job,hiring_manager},100,token));
  }
  assert.throws(()=>createHandoff(storage(),destination,{...job,notes:'Do not transfer'},100,token));
});
