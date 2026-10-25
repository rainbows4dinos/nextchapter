// Explicit live-source acceptance: real ATS responses and real pinned image
// retrieval; Auth/database are disposable local fixtures, never hosted records.
// Start logo-transport-server.ts and isolated Chrome CDP :9242 first.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { startFixture } from '../fixtures/radar-server.js';
const fixture=await startFixture(0,{fetcher:fetch,retrieveLogo:async(url,signal)=>{
  const response=await fetch('http://127.0.0.1:9251',{method:'POST',body:JSON.stringify({url}),signal});
  if(!response.ok)throw Error('Live logo delivery failed');
  return {bytes:new Uint8Array(await response.arrayBuffer()),type:response.headers.get('content-type')};
}});
const endpoint=await(await fetch('http://127.0.0.1:9242/json/version')).json();
const ws=new globalThis.WebSocket(endpoint.webSocketDebuggerUrl);await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));
let id=0;const pending=new Map();
ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}});
const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});ws.send(JSON.stringify({id,method,params,sessionId}));});
const {targetId}=await send('Target.createTarget',{url:'about:blank'});
const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});const call=(method,params)=>send(method,params,sessionId);
const ev=async(expression)=>{const result=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description);return result.result.value;};
const wait=async(expression)=>{for(let i=0;i<200;i++){if(await ev(expression))return;await new Promise(resolve=>setTimeout(resolve,100));}throw Error('Timeout '+expression);};
const results=[];const requests=[];
ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.sessionId===sessionId&&m.method==='Network.requestWillBeSent')requests.push(m.params.request.url);});
const cases=[['ShopMy','https://job-boards.greenhouse.io/shopmy/jobs/5448826008'],['Propel','https://jobs.ashbyhq.com/propel/e46ef4e0-33b0-4f21-acdf-6d7e78ec6b47'],['Skio','https://jobs.lever.co/skio/0110e9f5-4640-4daf-bc53-da03d6a4e642'],['Hugging Face','https://apply.workable.com/huggingface/j/81B46579FE/']];
try {
  await call('Page.enable');await call('Network.enable');await call('Page.navigate',{url:fixture.origin+'/tools/prospect-tracker/'});
  await wait("!!document.querySelector('#login:not([hidden])')");
  await ev("document.getElementById('login-email').value='radar@example.invalid';document.getElementById('login-password').value='fixture-only-password';document.getElementById('login-form').requestSubmit()");
  await wait("!!document.querySelector('.board')");
  for(const [employer,url] of cases){
    await ev("location.hash='#/prospects/new'");await wait("!!document.querySelector('.ingestion')");
    await ev(`document.getElementById('ingestion-url').value=${JSON.stringify(url)};document.querySelector('.ingestion form').requestSubmit()`);
    await wait(`document.querySelector('[name=company]')?.value===${JSON.stringify(employer)}`);
    await wait("!!document.querySelector('.editor__title img:not([hidden])')");
    const logo=await ev("document.querySelector('[name=company_logo_url]').value");
    assert.ok(logo);assert.equal(await ev("document.querySelector('.editor__title img').src.startsWith('blob:')"),true);
    await ev("document.getElementById('prospect-form').requestSubmit()");await wait("!!document.querySelector('#status-form') && document.querySelector('#workspace').getAttribute('aria-busy')==='false'");
    const hash=await ev('location.hash');
    await call('Page.reload',{});await wait("!!document.querySelector('#status-form')");
    assert.equal(await ev("document.querySelector('[name=company_logo_url]').value"),logo);
    assert.equal(await ev("document.querySelector('[name=company_logo_override]').value"),'false');
    await wait("!!document.querySelector('.editor__title img:not([hidden])')");
    for(const width of [1440,390])for(const light of [false,true]){
      await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await ev(`document.body.classList.toggle('light',${light})`);
      assert.equal(await ev('document.documentElement.scrollWidth>innerWidth'),false);
      assert.equal(await ev("document.querySelector('.editor__title .nc-avatar').getBoundingClientRect().width"),56);
    }
    await ev("document.querySelector('.editor__back').click()");await wait("!!document.querySelector('.board')");
    await wait(`(()=>{const card=[...document.querySelectorAll('.prospect-card')].find(c=>c.getAttribute('href')===${JSON.stringify(hash)} || c.textContent.includes(${JSON.stringify(employer)}));return !!card?.querySelector('img:not([hidden])');})()`);
    results.push({employer,extraction:'pass (live)',delivery:'pass (live pinned TLS)',preview:'pass',persistence:'pass (local DB, reload)',details:'pass',board:'pass'});
  }
  assert.equal((await(await fetch(fixture.origin+'/__fixture')).json()).prospects,4);
  assert.equal(requests.some(url=>/^https:.*(?:ashbyhq|greenhouse|amazonaws)/.test(url)),false,'ATS images must never be requested directly by the browser');
  await call('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile('/private/tmp/nextchapter-live-logo-board.png',Buffer.from(shot.data,'base64'));
  console.table(results);
} finally {await send('Target.closeTarget',{targetId});ws.close();await fixture.close();}
