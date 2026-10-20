// Run with synthetic radar-server.js on 8781 and isolated Chrome CDP on 9231.
// Real browser + vendored Supabase SDK + disposable PostgreSQL. No hosted data.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const endpoint = await (await fetch('http://127.0.0.1:9231/json/version')).json();
const ws = new globalThis.WebSocket(endpoint.webSocketDebuggerUrl);
await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
let sequence = 0;
const waiting = new Map();
const requests = [];
ws.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.method === 'Network.requestWillBeSent') requests.push(message.params.request);
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
const base = 'http://127.0.0.1:8781/tools/prospect-tracker/';
const ids = Array.from({length:7},()=>crypto.randomUUID());
async function openDates() { await evaluate("(()=>{const panel=document.getElementById('board-date-popover');if(!panel.matches(':popover-open'))document.getElementById('board-date-trigger').click();})()"); await wait("document.getElementById('board-date-trigger').getAttribute('aria-expanded')==='true'"); }
async function select(name,value) { await openDates(); await evaluate(`document.querySelector('[name="${name}"][value="${value}"]').click()`); }
async function status(value) { await evaluate(`(()=>{const select=document.getElementById('board-status');select.value='${value}';select.dispatchEvent(new Event('change',{bubbles:true}));})()`); }
async function dates(start,end) {
  await select('board-date-range','custom');
  await evaluate(`(()=>{const start=document.querySelector('[name=board-start]'),end=document.querySelector('[name=board-end]');start.value='${start}';end.value='${end}';end.dispatchEvent(new Event('input',{bubbles:true}));})()`);
}
async function settleVisuals() { await evaluate('(async()=>{await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));await Promise.all(document.getAnimations().filter(a=>a.effect.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));})()'); }
const shown = () => evaluate("[...document.querySelectorAll('.prospect-card')].map(card=>card.dataset.prospectId)");
async function key(id) {
  await evaluate(`document.querySelector('[data-prospect-id="${id}"]').focus()`);
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowUp',code:'ArrowUp',modifiers:1,windowsVirtualKeyCode:38});
  await call('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowUp',code:'ArrowUp',modifiers:1});
}
try {
  await call('Page.enable', {}); await call('Network.enable', {});
  await call('Network.setBlockedURLs',{urls:['https://*']});
  await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await call('Page.navigate',{url:base});
  await wait("!!document.getElementById('workspace')");
  const today = await evaluate(`(async()=>{
    const client=await (await import('./supabase-client.js')).getRadarClient();
    const auth=await client.auth.signInWithPassword({email:'radar@example.invalid',password:'fixture-only-password'});if(auth.error)throw auth.error;
    const ids=${JSON.stringify(ids)};
    const statuses=['applied','interviewing','rejected','applied','prospect','prospect','rejected'];
    const dates=['2025-10-05','2025-10-11','2025-10-04',null,null,null,'2025-10-08'];
    const names=['Start Boundary','End Boundary','Outside','Initial Applied import','Historical fallback','Undated','Manual date'];
    for(let i=0;i<ids.length;i++){const result=await client.from('prospects').insert({id:ids[i],company:names[i],title:'Designer',status:statuses[i],applied_on:dates[i]}).select('*').single();if(result.error)throw result.error;}
    for(const status of ['applied','rejected']){const result=await client.from('prospects').update({status}).eq('id',ids[4]);if(result.error)throw result.error;}
    return (await import('./data.js')).localCalendarDate();
  })()`);
  await evaluate('window.fixtureReloading=true'); await call('Page.reload',{}); await wait('!window.fixtureReloading');
  await wait("document.querySelectorAll('.prospect-card').length===7");
  assert.equal(await evaluate("document.querySelector('[name=board-date-basis]:checked').value"),'added');
  assert.equal(await evaluate("document.getElementById('board-date-trigger').textContent"),'All dates');
  assert.equal(await evaluate("document.querySelectorAll('.board-toolbar select').length"),1,'date filter uses no native selects');
  assert.equal(await evaluate("!!document.querySelector('#tracker-heading a[href=\"#/prospects/new\"]')"),true);
  assert.equal(await evaluate("document.querySelectorAll('.board-custom-dates input')[0].closest('.board-custom-dates').hidden"),true);
  await wait("document.getElementById('workspace').getAttribute('aria-busy')!=='true'");
  const original = await shown();
  const statsBefore = await evaluate("fetch('/__fixture').then(r=>r.json())");
  await key(ids[1]); assert.deepEqual(await shown(),original,'single visible card cannot move past its column boundary');
  assert.equal(await evaluate(`document.querySelector('[data-prospect-id="${ids[1]}"]').hasAttribute('aria-keyshortcuts')`),true);
  const dragAvailable = await evaluate(`(()=>{const card=document.querySelector('[data-prospect-id="${ids[1]}"]'),column=card.closest('.column'),dt=new DataTransfer();card.dispatchEvent(new DragEvent('dragstart',{bubbles:true,cancelable:true,dataTransfer:dt}));column.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:dt,clientY:column.getBoundingClientRect().top+30}));const available=!!document.querySelector('.board-insertion');card.dispatchEvent(new DragEvent('dragend',{bubbles:true,dataTransfer:dt}));return available;})()`);
  assert.equal(dragAvailable,true,'default date filter allows drag insertion');
  for (const [value,label] of [['7','Last 7 days'],['30','Last 30 days'],['90','Last 90 days'],['year','Last year']]) {
    await select('board-date-range',value);
    assert.equal(await evaluate("document.getElementById('board-date-trigger').textContent"), `Added: ${label}`);
    assert.equal((await shown()).length,7,'Added presets apply immediately');
  }
  await select('board-date-range','all');
  await evaluate("fetch('/__fixture/fail-next-history',{method:'POST'})");
  await select('board-date-basis','applied');
  await wait("document.querySelector('.board-history-note').textContent.includes('could not be loaded')");
  assert.ok(await evaluate("document.querySelector('.board-search-results').textContent.includes('incomplete')"));
  await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Retry history').click()");
  await wait("document.querySelector('.board-history-note').textContent.includes('Review/correct')");
  await dates('2025-10-05','2025-10-11');
  assert.deepEqual((await shown()).sort(),[ids[0],ids[1],ids[6]].sort());
  assert.equal(await evaluate("document.querySelector('.board-search-results').textContent"),'3 of 7 matches');
  assert.ok(await evaluate("document.getElementById('board-date-trigger').textContent.includes('Applied: Oct 5 – Oct 11, 2025')"));
  await evaluate("(()=>{const input=document.getElementById('board-search');input.value='Boundary';input.dispatchEvent(new Event('input',{bubbles:true}));})()");
  assert.deepEqual((await shown()).sort(),[ids[0],ids[1]].sort());
  await evaluate("document.getElementById('board-date-popover').hidePopover()");
  // Open details and return without a full reload: range, basis and search remain.
  await wait("Number(document.querySelector('.board').dataset.suppressActivationUntil || 0)<=Date.now()");
  await evaluate(`document.querySelector('[data-prospect-id="${ids[0]}"]').click()`);
  await wait("!!document.getElementById('prospect-form')");
  await evaluate("document.querySelector('.editor__back').click()"); await wait("!!document.querySelector('.board')");
  await wait("document.querySelector('.board-history-note').textContent.includes('Review/correct')");
  assert.equal(await evaluate("document.querySelector('[name=board-start]').value"),'2025-10-05');
  assert.equal(await evaluate("document.querySelector('[name=board-end]').value"),'2025-10-11');
  assert.equal(await evaluate("document.getElementById('board-search').value"),'Boundary');
  await evaluate("document.querySelector('[aria-label=\"Clear search\"]').click()");
  await dates(today,today);
  assert.deepEqual(await shown(),[ids[4]],'later-status record matches its historical Applied timestamp');
  assert.ok(await evaluate(`document.querySelector('[data-prospect-id="${ids[4]}"]').textContent.includes('Applied status recorded')`));
  assert.equal(await evaluate("document.querySelector('[data-column-id=done]').open"),true,'matching Done history is discoverable');
  const lastValid = await shown();
  await dates('2026-10-12','2026-10-01');
  assert.deepEqual(await shown(),lastValid,'invalid custom range retains applied filter');
  assert.ok(await evaluate("document.getElementById('board-date-feedback').textContent.includes('Start date must')"));
  await dates('','2026-10-01'); assert.deepEqual(await shown(),lastValid,'incomplete range retains applied filter');
  await dates('2001-01-01','2001-01-07');
  assert.equal(await evaluate("document.querySelector('.board-search-results').textContent"),'No matches');
  await select('board-date-range','all');
  assert.deepEqual(await shown(),original,'All dates restores underlying order across lifecycle columns');
  assert.equal(await evaluate("document.querySelector('[name=board-date-basis]:checked').value"),'applied','clearing retains basis');
  assert.equal(await evaluate("document.querySelector('.board-date-type').dataset.inactive"),'true','remembered type has neutral styling under All dates');
  await select('board-date-range','90');
  assert.equal(await evaluate("document.getElementById('board-date-trigger').textContent"),'Applied: Last 90 days');
  assert.equal(await evaluate("document.querySelector('.board-date-type').dataset.inactive"),'false');
  await select('board-date-range','all');
  assert.ok(await evaluate(`document.querySelector('[data-prospect-id="${ids[3]}"]').textContent.includes('Application date unknown')`));
  assert.ok(await evaluate(`document.querySelector('[data-prospect-id="${ids[5]}"]').textContent.includes('Application date unknown')`));
  assert.deepEqual(await evaluate("fetch('/__fixture').then(r=>r.json())"),statsBefore,'filtering did not write records/history');
  // Status and search compose independently with dates, and survive clearing dates.
  await dates('2025-10-05','2025-10-11'); await status('rejected');
  assert.deepEqual(await shown(),[ids[6]],'Rejected prospect matches authoritative application date within the week');
  await status('interviewing');
  assert.deepEqual(await shown(),[ids[1]]);
  await evaluate("(()=>{const input=document.getElementById('board-search');input.value='Boundary';input.dispatchEvent(new Event('input',{bubbles:true}));})()");
  await evaluate("document.getElementById('board-date-popover').hidePopover()");
  await evaluate(`document.querySelector('[data-prospect-id="${ids[1]}"]').click()`);
  await wait("!!document.getElementById('prospect-form')");
  await evaluate("document.querySelector('.editor__back').click()");
  await wait("!!document.querySelector('.board')");
  assert.equal(await evaluate("document.getElementById('board-status').value"),'interviewing','status survives card navigation');
  assert.equal(await evaluate("document.getElementById('board-search').value"),'Boundary');
  await wait("document.querySelector('.board-history-note').textContent.includes('Review/correct')");
  await select('board-date-range','all'); assert.deepEqual(await shown(),[ids[1]]);
  assert.equal(await evaluate("document.getElementById('board-status').value"),'interviewing');
  await status('all');
  assert.deepEqual((await shown()).sort(),[ids[0],ids[1]].sort());
  await evaluate("document.querySelector('[aria-label=\"Clear search\"]').click()");
  // Escape restores trigger focus; a trusted outside click dismisses the popover.
  await openDates();
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  assert.equal(await evaluate("document.getElementById('board-date-trigger').getAttribute('aria-expanded')"),'false');
  assert.equal(await evaluate('document.activeElement.id'),'board-date-trigger');
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});
  await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await wait("document.getElementById('board-date-popover').matches(':popover-open')");
  await wait("document.activeElement.name==='board-date-basis'");
  assert.equal(await evaluate("getComputedStyle(document.activeElement.closest('label')).outlineStyle"),'solid','segmented choice has visible keyboard focus');
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowLeft',code:'ArrowLeft',windowsVirtualKeyCode:37});
  await call('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowLeft',code:'ArrowLeft',windowsVirtualKeyCode:37});
  assert.equal(await evaluate("document.querySelector('[name=board-date-basis]:checked').value"),'added');
  assert.equal(await evaluate("document.getElementById('board-date-trigger').textContent"),'All dates');
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
  await call('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
  assert.equal(await evaluate("document.querySelector('[name=board-date-basis]:checked').value"),'applied');
  const outside = await evaluate("(()=>{const b=document.querySelector('#tracker-heading h1').getBoundingClientRect();return {x:b.left+10,y:b.top+10};})()");
  await call('Input.dispatchMouseEvent',{type:'mousePressed',...outside,button:'left',clickCount:1});
  await call('Input.dispatchMouseEvent',{type:'mouseReleased',...outside,button:'left',clickCount:1});
  await wait("!document.getElementById('board-date-popover').matches(':popover-open')");
  // Native pointer focus does not leave a ring; keyboard disclosure focus remains visible.
  const donePoint = await evaluate("(()=>{const b=document.querySelector('.column-done summary').getBoundingClientRect();return {x:b.left+12,y:b.top+8};})()");
  await call('Input.dispatchMouseEvent',{type:'mousePressed',...donePoint,button:'left',clickCount:1});
  await call('Input.dispatchMouseEvent',{type:'mouseReleased',...donePoint,button:'left',clickCount:1});
  assert.equal(await evaluate("document.querySelector('.column-done summary').matches(':focus-visible')"),false);
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.column-done summary')).outlineStyle"),'none');
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  await evaluate("document.querySelector('.column-done summary').focus()");
  assert.equal(await evaluate("document.querySelector('.column-done summary').matches(':focus-visible')"),true);
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.column-done summary')).outlineStyle"),'solid');
  const doneOpen = await evaluate("document.querySelector('.column-done').open");
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});
  await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  assert.equal(await evaluate("document.querySelector('.column-done').open"),!doneOpen,'keyboard toggle works');
  const historyRequests = requests.filter(request=>{const u=new URL(request.url);return u.pathname.endsWith('/prospect_status_events') && u.searchParams.has('to_status');});
  assert.ok(historyRequests.length>=2);
  assert.ok(historyRequests.every(request=>request.method==='GET' && !new URL(request.url).searchParams.has('prospect_id')),'history was batched, not requested per-card');
  await dates('2025-10-05','2025-10-11');
  await evaluate("document.getElementById('board-date-popover').hidePopover()");
  for(const light of [false,true])for(const width of [1440,900,600,390,320]){
    await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
    await evaluate(`document.body.classList.toggle('light',${light})`); await settleVisuals();
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'no page-level horizontal overflow');
    await openDates(); await settleVisuals();
    assert.equal(await evaluate("(()=>{const b=document.getElementById('board-date-popover').getBoundingClientRect();return b.left>=0&&b.right<=innerWidth&&b.top>=0&&b.bottom<=innerHeight;})()"),true,'popover fits viewport');
    await evaluate("document.getElementById('board-date-popover').hidePopover()");
  }
  await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await evaluate('document.body.classList.remove("light")'); await settleVisuals();
  await writeFile('/tmp/nextchapter-date-filter-desktop.png',Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:1000,deviceScaleFactor:1,mobile:false});
  await settleVisuals();
  assert.equal(await evaluate("document.querySelector('.nextchapter-menu-toggle').getAttribute('aria-expanded')"),'false');
  await writeFile('/tmp/nextchapter-date-filter-mobile.png',Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
  await openDates(); await settleVisuals();
  console.log('Polished custom popover height:',await evaluate("document.getElementById('board-date-popover').getBoundingClientRect().height"));
  assert.equal(await evaluate("!!document.querySelector('.board-date-timezone')"),false,'no technical footer');
  assert.equal(await evaluate("[...document.querySelectorAll('.board-date-option')].every(row=>row.getBoundingClientRect().height>=32)"),true,'comfortable option targets');
  await writeFile('/tmp/nextchapter-date-popover-mobile.png',Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
  console.log('Passed defaults, custom ranges, search composition, inclusive limits, incomplete-history retry, fallback/missing labels, Done discovery, navigation retention, filtered reorder availability, read-only filtering, both themes and five responsive widths.');
} finally { await send('Target.closeTarget',{targetId});ws.close(); }
