// Run with synthetic radar-server.js on 8779 and isolated Chrome CDP on 9229.
// Real browser + vendored Supabase SDK + disposable PostgreSQL. No hosted data.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const endpoint = await (await fetch('http://127.0.0.1:9229/json/version')).json();
const ws = new globalThis.WebSocket(endpoint.webSocketDebuggerUrl);
await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
let sequence = 0;
const waiting = new Map();
ws.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (!message.id) return;
  const pending = waiting.get(message.id); waiting.delete(message.id);
  if (message.error) pending.reject(new Error(JSON.stringify(message.error))); else pending.resolve(message.result);
});
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = ++sequence; waiting.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
});
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const call = (method, params) => send(method, params, sessionId);
async function evaluate(expression) {
  const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result.value;
}
async function wait(expression) {
  for (let i = 0; i < 100; i++) {
    try { if (await evaluate(expression)) return; } catch { /* navigation may replace the context */ }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('Timed out: ' + expression + ' Page: ' + await evaluate('location.href + document.body.innerText.slice(0,1000)'));
}
const base = 'http://127.0.0.1:8779/tools/prospect-tracker/';
const board = base + '#/board';
const first = crypto.randomUUID(), second = crypto.randomUUID();
const detail = id => base + '#/prospects/' + id;
async function navigate(url) {
  await evaluate('window.testNavigation=true');
  const destination = new URL(url); destination.searchParams.set('acceptance', crypto.randomUUID());
  await call('Page.navigate', { url: destination.href });
  await wait('!window.testNavigation');
}
async function settled() { await wait("document.getElementById('workspace').getAttribute('aria-busy')!=='true'"); }
const field = name => `document.querySelector('#prospect-form [name="${name}"]')`;
async function status(value) {
  await evaluate(`(()=>{const select=document.querySelector('#status-form select');select.value='${value}';select.dispatchEvent(new Event('change',{bubbles:true}))})()`);
  await settled();
}
async function saveDetails() {
  await evaluate("document.getElementById('prospect-form').requestSubmit()"); await settled();
}
const store = `(await import('./data.js')).createRadarDataAccess(await (await import('./supabase-client.js')).getRadarClient())`;
async function stored(id) { return evaluate(`(async()=>{const data=${store};return data.getProspect('${id}')})()`); }
try {
  await call('Page.enable', {}); await call('Network.enable', {});
  await call('Network.setBlockedURLs', { urls: ['https://*'] });
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await call('Page.navigate', { url: board });
  await wait("!!document.querySelector('.board') || !document.getElementById('login').hidden");
  const today = await evaluate(`(async()=>{
    const {getRadarClient}=await import('./supabase-client.js');const client=await getRadarClient();
    const auth=await client.auth.signInWithPassword({email:'radar@example.invalid',password:'fixture-only-password'});if(auth.error)throw auth.error;
    const {createRadarDataAccess,localCalendarDate}=await import('./data.js');const data=createRadarDataAccess(client);
    for(const id of ${JSON.stringify([first, second])})await data.createProspect({id,company:'Applied Date Synthetic',title:'Designer'});
    return localCalendarDate();
  })()`);
  await navigate(detail(first)); await wait("!!document.querySelector('#status-form select')");
  await evaluate(`${field('notes')}.value='Keep this unsaved draft';${field('notes')}.dispatchEvent(new Event('input',{bubbles:true}))`);
  await status('applied');
  assert.equal(await evaluate(`${field('applied_on')}.value`), today, 'successful status save updates the date control');
  assert.equal(await evaluate(`${field('notes')}.value`), 'Keep this unsaved draft');
  await saveDetails();
  assert.equal((await stored(first)).applied_on, today, 'later details save retains the generated date');
  await status('interviewing'); await status('applied');
  assert.equal(await evaluate(`${field('applied_on')}.value`), today);
  // A manual retroactive date remains a draft during a separate status save.
  await evaluate(`${field('applied_on')}.value='2024-02-29';${field('applied_on')}.dispatchEvent(new Event('input',{bubbles:true}))`);
  await status('prospect'); await status('applied');
  assert.equal(await evaluate(`${field('applied_on')}.value`), '2024-02-29');
  await saveDetails(); assert.equal((await stored(first)).applied_on, '2024-02-29');
  const historyCount = await evaluate(`(async()=>{const d=${store};return (await d.listStatusEvents('${first}')).length})()`);
  await evaluate(`${field('applied_on')}.value='';${field('applied_on')}.dispatchEvent(new Event('input',{bubbles:true}))`);
  await saveDetails();
  assert.equal((await stored(first)).applied_on, null);
  await status('applied'); assert.equal((await stored(first)).applied_on, null);
  assert.equal(await evaluate(`(async()=>{const d=${store};return (await d.listStatusEvents('${first}')).length})()`), historyCount);
  // A failed Details transition preserves the saved status/date and unsaved notes.
  await navigate(detail(second)); await wait("!!document.querySelector('#status-form select')");
  await evaluate(`${field('notes')}.value='Recoverable draft';${field('notes')}.dispatchEvent(new Event('input',{bubbles:true}))`);
  await evaluate("fetch('/__fixture/fail-next-save',{method:'POST'})");
  await status('applied');
  await wait("document.querySelector('#status-feedback').textContent.includes('Synthetic save failure')");
  assert.equal(await evaluate("document.querySelector('#status-form select').value"), 'prospect');
  assert.equal(await evaluate(`${field('applied_on')}.value`), '');
  assert.equal(await evaluate(`${field('notes')}.value`), 'Recoverable draft');
  assert.equal((await stored(second)).applied_on, null);
  await saveDetails();
  await navigate(board); await wait("!!document.querySelector('.board')");
  async function dragToApplied() {
    await evaluate(`(()=>{const card=document.querySelector('[data-prospect-id="${second}"]'),column=document.querySelector('[data-column-id=applied]'),dt=new DataTransfer();card.dispatchEvent(new DragEvent('dragstart',{bubbles:true,cancelable:true,dataTransfer:dt}));column.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:dt}));column.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}));card.dispatchEvent(new DragEvent('dragend',{bubbles:true,dataTransfer:dt}));})()`);
    await settled();
  }
  await evaluate("fetch('/__fixture/fail-next-save',{method:'POST'})");
  await dragToApplied();
  assert.equal((await stored(second)).status, 'prospect'); assert.equal((await stored(second)).applied_on, null);
  assert.equal(await evaluate(`document.querySelector('[data-prospect-id="${second}"]').closest('.column').dataset.columnId`), 'prospects');
  await dragToApplied();
  assert.equal((await stored(second)).applied_on, today);
  assert.ok(await evaluate(`document.querySelector('[data-prospect-id="${second}"]').textContent.includes('Applied ')`));
  await navigate(detail(second)); await wait("!!document.querySelector('#status-form select')");
  assert.equal(await evaluate(`${field('applied_on')}.value`), today);
  const shot = await call('Page.captureScreenshot', { format: 'png' });
  await writeFile('/tmp/nextchapter-applied-date.png', Buffer.from(shot.data, 'base64'));
  console.log('Passed Details/board automatic dates, returned-form synchronization, draft preservation, manual correction/clearing, history counts, failed-save rollback and refresh persistence.');
} finally { await send('Target.closeTarget', { targetId }); ws.close(); }
