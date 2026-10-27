import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import { startFixture } from '../fixtures/radar-server.js';
const fixture = await startFixture();
const endpoint=await (await fetch('http://127.0.0.1:9242/json/version')).json();
const ws=new globalThis.WebSocket(endpoint.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let id=0;const pending=new Map();
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result)}});
const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});ws.send(JSON.stringify({id,method,params,sessionId}))});
const {targetId}=await send('Target.createTarget',{url:'about:blank'});const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});const call=(method,params)=>send(method,params,sessionId);
await call('Page.enable'); ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Page.javascriptDialogOpening')call('Page.handleJavaScriptDialog',{accept:true})});
const ev=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description);return r.result.value};
const wait=async expression=>{for(let i=0;i<100;i++){if(await ev(expression))return;await new Promise(r=>setTimeout(r,100))}throw Error('Timeout '+expression)};

const transparentPng=await ev("(()=>{const canvas=document.createElement('canvas');canvas.width=10;canvas.height=10;return canvas.toDataURL('image/png').split(',')[1];})()");
const layouts = new Map();
const requests=[];
await call('Network.enable');await call('Fetch.enable',{patterns:[{urlPattern:'https://cdn.example.com/*'}]});
ws.addEventListener('message',async e=>{const m=JSON.parse(e.data);if(m.method!=='Fetch.requestPaused')return;const {requestId,request}=m.params;requests.push(request);if(request.url.includes('slow'))return;if(request.url.includes('broken')){await call('Fetch.failRequest',{requestId,errorReason:'Failed'});return;}await call('Fetch.fulfillRequest',{requestId,responseCode:request.url.includes('broken')?404:200,responseHeaders:[{name:'Content-Type',value:'image/png'},{name:'Access-Control-Allow-Origin',value:'*'}],body:transparentPng});});
const input=async(name,value)=>{
 if(name==='company_logo_url') {
  // Seed legacy references through the existing form contract; URL-entry UI was removed.
  await ev(`(async()=>{const {logoUrl}=await import('./company-logo.js');try{logoUrl(${JSON.stringify(value)});}catch{return;}const e=document.querySelector('[name=company_logo_url]');e.value=${JSON.stringify(value)};document.querySelector('[name=company_logo_override]').value='true';e.dispatchEvent(new Event('logo-candidate'));e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
 } else await ev(`(()=>{const e=document.querySelector('[name="${name}"]');e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
};
const save=async()=>{await ev("document.getElementById('prospect-form').requestSubmit()");await wait("document.querySelector('#workspace').getAttribute('aria-busy')==='false' && !!document.querySelector('#status-form')");};
const retrieve=async()=>{await ev("document.querySelector('.ingestion form').requestSubmit()");await wait("document.querySelector('.ingestion').textContent.includes('Preview — review before saving') && document.querySelector('#workspace').getAttribute('aria-busy')==='false'");};
try{
await call('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await call('Page.navigate',{url:fixture.origin+'/tools/prospect-tracker/'});
await wait("!!document.querySelector('#login:not([hidden])')");await ev("document.getElementById('login-email').value='radar@example.invalid';document.getElementById('login-password').value='fixture-only-password';document.getElementById('login-form').requestSubmit()");await wait("!!document.querySelector('.board')");
await ev("location.hash='#/prospects/new'");await wait("!!document.querySelector('.ingestion')");
assert.equal(await ev("document.querySelector('.editor__heading').textContent"),'Add Prospect');
await input('company','Draft Company');assert.equal(await ev("document.querySelector('.editor__heading').textContent"),'Draft Company');
await input('company','');assert.equal(await ev("document.querySelector('.editor__heading').textContent"),'Add Prospect');
await input('company','Draft Company');await wait("document.querySelector('.company-logo-trigger').textContent==='D'");
await input('company_logo_url','https://cdn.example.com/draft.png');
await ev("document.querySelector('.company-logo-trigger').click()");await wait("document.querySelector('#company-logo-editor').matches(':popover-open')");
assert.equal(await ev("!!document.getElementById('company-logo-input')"),false);await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await wait("document.activeElement.classList.contains('company-logo-trigger')");
assert.equal(await ev("document.querySelector('[name=company_logo_url]').value"),'https://cdn.example.com/draft.png');
await ev("document.querySelector('.editor__back').click()");await wait("!!document.querySelector('.board')");
assert.equal((await (await fetch(fixture.origin+'/__fixture')).json()).prospects,0);
await ev("location.hash='#/prospects/new'");await wait("!!document.querySelector('.ingestion')");
assert.equal(await ev("document.querySelector('.ingestion-cancel').hidden"),true);
await ev("document.getElementById('ingestion-url').value='https://apply.workable.com/example/j/NOTFOUND404/';document.querySelector('.ingestion form').requestSubmit()");
await wait("document.querySelector('.ingestion').textContent.includes('Nothing was saved') && document.querySelector('#workspace').getAttribute('aria-busy')==='false'");
await ev("document.getElementById('ingestion-url').value='https://job-boards.greenhouse.io/example/jobs/99999';document.querySelector('.ingestion form').requestSubmit()");
await wait("!document.querySelector('.ingestion-cancel').hidden");await ev("document.querySelector('.ingestion-cancel').focus();document.querySelector('.ingestion-cancel').click()");
await wait("document.querySelector('.ingestion').textContent.includes('canceled or timed out') && document.querySelector('#workspace').getAttribute('aria-busy')==='false'");
assert.equal(await ev("document.activeElement.textContent"),'Retrieve Posting');
assert.equal(await ev("document.querySelector('.ingestion-cancel').hidden"),true);
await ev("document.getElementById('ingestion-url').value='https://apply.workable.com/example/j/ABC123DEF4/'");await retrieve();
assert.equal(await ev("document.querySelector('[name=company_logo_url]').value"),'https://cdn.example.com/employer.png');
assert.equal(await ev("document.querySelector('[name=company_logo_url]').type"),'hidden');
assert.equal(await ev("document.querySelector('.editor__heading').textContent"),await ev("document.querySelector('[name=company]').value"));
for(const width of [1440,1200,899,390])for(const light of [false,true]) {
 await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await ev(`document.body.classList.toggle('light',${light});scrollTo(0,0)`);await new Promise(r=>setTimeout(r,350));
 assert.equal(await ev('document.documentElement.scrollWidth>innerWidth'),false);
 assert.equal(await ev("document.querySelector('[name=job_description]').getBoundingClientRect().height"),212);
 await wait("!!document.querySelector('.editor__title .nc-avatar--logo')");
 assert.deepEqual(await ev("(()=>{const a=document.querySelector('.editor__title .nc-avatar');return {background:getComputedStyle(a).backgroundColor,initialsHidden:a.firstElementChild.hidden,fit:getComputedStyle(a.querySelector('img')).objectFit};})()"),{background:'rgb(255, 255, 255)',initialsHidden:true,fit:'contain'});
 assert.equal(await ev("document.getElementById('tracker-heading').hidden"),true);
 assert.equal(await ev("document.querySelector('.editor__heading').textContent"),await ev("document.querySelector('[name=company]').value"));
 assert.equal(await ev("document.querySelector('.editor__back').classList.contains('nc-paddle')"),true);
 const layout = await ev("(()=>{const main=document.querySelector('.editor__main').getBoundingClientRect(),utility=document.querySelector('.ingestion').getBoundingClientRect();return {mainLeft:main.left,mainTop:main.top,mainWidth:main.width,utilityLeft:utility.left,utilityTop:utility.top,utilityWidth:utility.width,first:document.querySelector('.editor__panels').firstElementChild.className,sticky:getComputedStyle(document.querySelector('.ingestion')).position}})()");
 assert.equal(layout.sticky,'static');
 if(width>=1200){assert.ok(layout.mainLeft<layout.utilityLeft);assert.equal(layout.mainTop,layout.utilityTop);assert.equal(layout.utilityWidth,440);assert.ok(layout.mainWidth>layout.utilityWidth);assert.equal(layout.first,'editor__main');}
 else{assert.ok(layout.utilityTop<layout.mainTop);assert.equal(layout.mainWidth,layout.utilityWidth);assert.ok(layout.first.includes('ingestion'));}

 layouts.set(width+':'+light, await ev("(()=>{const main=document.querySelector('.editor__main').getBoundingClientRect(),back=document.querySelector('.editor__back').getBoundingClientRect(),avatar=document.querySelector('.company-logo-trigger').getBoundingClientRect();return {left:main.left,width:main.width,backLeft:back.left,backTop:back.top,avatarTop:avatar.top}})()"));

 const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(`/private/tmp/shared-prospect-create-${width}-${light?'light':'dark'}.png`,Buffer.from(shot.data,'base64'));
}
await wait("!!document.querySelector('.editor__title img:not([hidden])')");
await input('company_logo_url','https://cdn.example.com/manual.png');await retrieve();assert.equal(await ev("document.querySelector('[name=company_logo_url]').value"),'https://cdn.example.com/manual.png');
await ev("document.querySelector('.company-logo-trigger').click()");await wait("document.querySelector('#company-logo-editor').matches(':popover-open')");await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await input('company_logo_url','');await retrieve();assert.equal(await ev("document.querySelector('[name=company_logo_url]').value"),'');assert.equal(await ev("document.querySelector('[name=company_logo_override]').value"),'true');
await input('company_logo_url','http://cdn.example.com/unsafe.png');assert.equal(await ev("!!document.getElementById('company-logo-input')"),false);assert.equal(await ev("document.querySelector('[name=company_logo_url]').value"),'');
const fieldsBefore = await ev("[...document.querySelectorAll('.prospect-fields .nc-field__label')].map(e=>e.textContent).sort()");
assert.equal(await ev("document.querySelector('[name=company_logo_url]').type"),'hidden');
assert.equal(await ev("document.querySelector('.editor__heading').textContent"),await ev("document.querySelector('[name=company]').value"));
assert.equal((await (await fetch(fixture.origin+'/__fixture')).json()).prospects,0,'logo edits/retrieval never create a record');
await input('company_logo_url','https://cdn.example.com/manual.png');await save();
assert.deepEqual(await ev("[...document.querySelectorAll('.prospect-fields .nc-field__label')].map(e=>e.textContent).sort()"),fieldsBefore);
assert.equal(await ev("document.querySelector('[name=company_logo_override]').value"),'true');
await wait("!!document.querySelector('.editor__title img:not([hidden])')");
await ev("document.querySelector('.company-logo-trigger').click()");await wait("document.querySelector('#company-logo-editor').matches(':popover-open')");
await input('company_logo_url','http://cdn.example.com/unsafe.png');
assert.equal(await ev("!!document.getElementById('company-logo-input')"),false);
assert.equal(await ev("document.querySelector('[name=company_logo_url]').value"),'https://cdn.example.com/manual.png');
await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await wait("document.activeElement.classList.contains('company-logo-trigger')");
assert.equal(await ev("document.querySelector('#prospect-form [name=company_logo_url]').type"),'hidden');
assert.equal(await ev("document.getElementById('prospect-form').innerText.includes('Company Logo URL')"),false);
for(const width of [1440,1200,899,390])for(const light of [false,true]){await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await ev(`document.body.classList.toggle('light',${light});scrollTo(0,0)`);await new Promise(r=>setTimeout(r,350));assert.equal(await ev('document.documentElement.scrollWidth>innerWidth'),false);assert.equal(await ev("document.querySelector('.editor__title .nc-avatar').getBoundingClientRect().width"),56);assert.deepEqual(await ev("(()=>{const main=document.querySelector('.editor__main').getBoundingClientRect(),back=document.querySelector('.editor__back').getBoundingClientRect(),avatar=document.querySelector('.company-logo-trigger').getBoundingClientRect();return {left:main.left,width:main.width,backLeft:back.left,backTop:back.top,avatarTop:avatar.top}})()"),layouts.get(width+':'+light));assert.equal(await ev("getComputedStyle(document.querySelector('.editor__status')).position"),width>=1200?'sticky':'static');const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(`/private/tmp/issue29-details-${width}-${light?'light':'dark'}.png`,Buffer.from(shot.data,'base64'));await ev("document.querySelector('.company-logo-trigger').click()");await wait("document.querySelector('#company-logo-editor').matches(':popover-open')");const pop=await call('Page.captureScreenshot',{format:'png'});await writeFile(`/private/tmp/issue29-logo-editor-${width}-${light?'light':'dark'}.png`,Buffer.from(pop.data,'base64'));assert.equal(await ev("document.getElementById('company-logo-editor').getBoundingClientRect().right<=innerWidth"),true);await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await wait("document.activeElement.classList.contains('company-logo-trigger')");}
await ev("document.querySelector('.editor__back').click()");await wait("!!document.querySelector('.prospect-card img:not([hidden])')");assert.equal(await ev("document.querySelector('.prospect-card .nc-avatar').getBoundingClientRect().width"),28);assert.equal(await ev("document.querySelector('.prospect-card img').draggable"),false);assert.equal(await ev("document.querySelector('.prospect-card .nc-avatar').getAttribute('aria-hidden')"),'true');
await ev("document.querySelector('.prospect-card').click()");await wait("!!document.querySelector('#status-form')");await input('company_logo_url','https://cdn.example.com/broken.png');await save();await wait("!document.querySelector('.editor__title img')");assert.equal(await ev("document.querySelector('.editor__title .nc-avatar').firstElementChild.hidden"),false);assert.equal(await ev("document.querySelector('.editor__title .nc-avatar').classList.contains('nc-avatar--logo')"),false);
const before=requests.filter(e=>e.url.endsWith('broken.png')).length;await input('notes','Unrelated edit');await save();await new Promise(r=>setTimeout(r,200));assert.equal(requests.filter(e=>e.url.endsWith('broken.png')).length,before);
await input('company_logo_url','https://cdn.example.com/slow.png');
assert.equal(await ev("document.querySelector('.editor__title .nc-avatar').classList.contains('nc-avatar--logo')"),false);
assert.equal(await ev("document.querySelector('.editor__title .nc-avatar').firstElementChild.hidden"),false);
assert.equal(await ev("document.querySelector('.editor__title img').hidden"),true);
assert.equal(await ev("document.querySelector('.editor__title img').src.endsWith('/slow.png')"),true);
await save();await new Promise(r=>setTimeout(r,8300));assert.equal(await ev("document.querySelector('.editor__title img')===null"),true);
await ev("if(!document.getElementById('company-logo-editor').matches(':popover-open'))document.querySelector('.company-logo-trigger').click()");await wait("document.querySelector('#company-logo-editor').matches(':popover-open')");await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await input('company_logo_url','');await save();
await call('Page.reload',{});await new Promise(r=>setTimeout(r,600));await wait("!!document.querySelector('#status-form')");assert.equal(await ev("document.querySelector('[name=company_logo_url]').value"),'');assert.equal(await ev("document.querySelector('[name=company_logo_override]').value"),'true');
await ev("location.hash='#/prospects/new'");await wait("!!document.querySelector('.ingestion')");
await input('company','Manual Company');await input('title','Manual Designer');await input('job_url','https://example.com/job');
assert.equal(await ev("document.querySelector('.job-url-control__open').href"),'https://example.com/job');
await input('company_logo_url','https://cdn.example.com/manual-create.png');
await fetch(fixture.origin+'/__fixture/fail-next-save',{method:'POST'});await ev("document.getElementById('prospect-form').requestSubmit()");await wait("document.getElementById('save-feedback').classList.contains('nc-alert--danger')");

assert.equal(await ev("document.querySelector('[name=company_logo_url]').value"),'https://cdn.example.com/manual-create.png');assert.equal(await ev("document.querySelector('[name=company_logo_override]').value"),'true');
await save();assert.equal(await ev("document.querySelector('[name=company]').value"),'Manual Company');assert.equal(await ev("document.querySelector('[name=company_logo_url]').value"),'https://cdn.example.com/manual-create.png');
await ev("document.querySelector('[name=status]').value='applied';document.querySelector('[name=status]').dispatchEvent(new Event('change',{bubbles:true}))");await wait("document.querySelector('#current-status-badge').textContent==='Applied'");await wait("document.querySelector('[name=applied_on]').value!=='' && document.querySelector('#history').textContent.includes('Applied')");
assert.equal((await (await fetch(fixture.origin+'/__fixture')).json()).prospects,2);
assert.ok(requests.length);for(const request of requests){assert.equal(Object.keys(request.headers).some(k=>k.toLowerCase()==='referer'),false);assert.equal(Object.keys(request.headers).some(k=>k.toLowerCase()==='cookie'),false);assert.equal(new URL(request.url).search,'');}
console.log('PASS detection preview, repeat retrieval override/clear, HTTPS validation, save/reload, themes/responsive geometry, board activation, decorative avatars, broken/slow suppression, keyboard clear and private-request headers');
}finally{await send('Target.closeTarget',{targetId});ws.close();await fixture.close();}
