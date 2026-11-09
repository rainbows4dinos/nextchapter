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
const first = crypto.randomUUID();
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
  await evaluate(`(async()=>{
    const {getRadarClient}=await import('./supabase-client.js');const client=await getRadarClient();
    const auth=await client.auth.signInWithPassword({email:'radar@example.invalid',password:'fixture-only-password'});if(auth.error)throw auth.error;
    const data=${store}; await data.createProspect({id:'${first}',company:'New Chapter Studio',title:'Principal Product Designer'});
  })()`);
  await navigate(detail(first)); await wait("!!document.querySelector('#status-form select')");
  await evaluate("document.querySelector('#status-form select').focus();fetch('/__fixture/fail-next-save',{method:'POST'})");
  await status('hired');
  await wait("document.querySelector('#status-feedback').textContent.includes('Synthetic save failure')");
  assert.equal(await evaluate("!!document.querySelector('.hired-celebration')"), false);
  assert.equal((await stored(first)).status, 'prospect');
  await status('hired'); await wait("!!document.querySelector('.hired-celebration[open]')");
  assert.equal((await stored(first)).status, 'hired');
  assert.equal(await evaluate("document.querySelector('#hired-prospect').textContent"), 'Principal Product Designer at New Chapter Studio');
  assert.equal(await evaluate("document.activeElement.textContent"), 'Continue');
  assert.equal(await evaluate("document.querySelectorAll('.hired-confetti i').length"), 32);
  assert.equal(await evaluate("document.querySelector('.hired-celebration').matches(':modal')"), true);
  assert.equal(await evaluate("document.querySelector('.hired-celebration').getAttribute('aria-labelledby')"), 'hired-title');
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await wait("!document.querySelector('.hired-confetti')");
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  assert.equal(await evaluate("!!document.activeElement.closest('.hired-celebration') || document.activeElement===document.body"), true);
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await wait("!document.querySelector('.hired-celebration')");
  assert.equal(await evaluate("document.activeElement===document.querySelector('#status-form select')"), true);
  await evaluate(`${field('notes')}.value='Keep the milestone editable';${field('notes')}.dispatchEvent(new Event('input',{bubbles:true}))`);
  await saveDetails();
  assert.equal(await evaluate("!!document.querySelector('.hired-celebration')"), false);
  await navigate(detail(first)); await wait("!!document.querySelector('#status-form select')");
  assert.equal(await evaluate("!!document.querySelector('.hired-celebration')"), false, 'reload never replays');
  assert.equal(await evaluate("document.querySelector('#status-form select').value"), 'hired');
  await status('offer'); assert.equal((await stored(first)).status, 'offer');
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  for (const light of [false, true]) for (const width of [1440, 390]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width===390 });
    await evaluate(`document.body.classList.toggle('light',${light})`);
    await status('hired'); await wait("!!document.querySelector('.hired-celebration[open]')");
    assert.equal(await evaluate("document.querySelectorAll('.hired-confetti i').length"), 0);
    assert.equal(await evaluate("(()=>{const r=document.querySelector('.hired-celebration').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})()"), true);
    const shot = await call('Page.captureScreenshot', { format: 'png' });
    await writeFile(`/tmp/nextchapter-hired-${light?'light':'dark'}-${width}.png`, Buffer.from(shot.data,'base64'));
    await evaluate("document.querySelector('.hired-celebration button').click()");
    await wait("!document.querySelector('.hired-celebration')");
    await status('offer');
  }
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  // Board transitions share the same save and celebration semantics.
  await navigate(board); await wait("!!document.querySelector('.board')");
  const moveToHired = () => evaluate(`(()=>{const c=document.querySelector('[data-prospect-id="${first}"]');const e=new Event('dragstart',{bubbles:true,cancelable:true});Object.defineProperty(e,'dataTransfer',{value:new DataTransfer()});c.dispatchEvent(e);const d=new Event('drop',{bubbles:true,cancelable:true});Object.defineProperty(d,'dataTransfer',{value:e.dataTransfer});document.querySelector('[data-column-id="hired"]').dispatchEvent(d)})()`);
  await evaluate("fetch('/__fixture/fail-next-save',{method:'POST'})");
  await moveToHired(); await settled();
  assert.equal(await evaluate("!!document.querySelector('.hired-celebration')"), false);
  assert.equal((await stored(first)).status, 'offer');
  await moveToHired();
  await settled(); await wait("!!document.querySelector('.hired-celebration[open]')");
  await evaluate("document.querySelector('.hired-celebration button').click()");
  await wait("!document.querySelector('.hired-celebration')");
  await evaluate("(()=>{const s=document.querySelector('.board-status select');s.value='hired';s.dispatchEvent(new Event('change',{bubbles:true}))})()");
  assert.equal(await evaluate(`document.querySelectorAll('[data-prospect-id="${first}"]').length`), 1);
  const hiredCount = await evaluate("document.querySelectorAll('[data-column-id=hired] .prospect-card').length");
  assert.equal(await evaluate("document.querySelector('[data-column-id=hired] .count').textContent"), `${hiredCount} of ${hiredCount}`);
  assert.equal((await stored(first)).status, 'hired');
  for (const light of [false, true]) for (const width of [1440, 900, 600, 390]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    await evaluate(`document.body.classList.toggle('light',${light})`);
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
    assert.equal(await evaluate("document.querySelectorAll('[data-column-id=hired] .prospect-card').length"), hiredCount);
  }
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await evaluate('document.body.classList.remove("light")');
  const boardShot = await call('Page.captureScreenshot', { format: 'png' });
  await writeFile('/tmp/nextchapter-hired-board.png', Buffer.from(boardShot.data, 'base64'));
  console.log('Passed Hired persistence, failure recovery, one-time celebration, repeat transition, edits/reload, focus/Escape, reduced motion, board move/filter/counts, responsive light/dark screenshots.');
} finally { await send('Target.closeTarget', { targetId }); ws.close(); }
