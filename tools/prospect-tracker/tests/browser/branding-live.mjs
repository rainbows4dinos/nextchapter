// Run the loopback branding-live-server.ts first. Optional LOGO_LIVE_CASES is a
// private, outside-repo JSON file of {company,posting} entries. No hosted writes.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {startFixture} from '../fixtures/radar-server.js';
const cases=process.env.LOGO_LIVE_CASES?JSON.parse(await readFile(process.env.LOGO_LIVE_CASES,'utf8')):[{company:'Propel',posting:'https://jobs.ashbyhq.com/propel/e46ef4e0-33b0-4f21-acdf-6d7e78ec6b47'}];
const fixture=await startFixture(0,{ingestionHandler:async request=>fetch('http://127.0.0.1:9253',{method:'POST',headers:request.headers,body:await request.text(),signal:request.signal})});
const endpoint=await(await fetch('http://127.0.0.1:9242/json/version')).json();const ws=new globalThis.WebSocket(endpoint.webSocketDebuggerUrl);await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));
let id=0;const pending=new Map();ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}});
const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});ws.send(JSON.stringify({id,method,params,sessionId}));});
const {targetId}=await send('Target.createTarget',{url:'about:blank'});const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});const call=(method,params)=>send(method,params,sessionId);
const ev=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description);return r.result.value;};
const wait=async expression=>{for(let i=0;i<240;i++){if(await ev(expression))return;await new Promise(resolve=>setTimeout(resolve,100));}throw Error('Timeout '+expression);};
const results=[];
ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.sessionId===sessionId&&m.method==='Page.javascriptDialogOpening')void call('Page.handleJavaScriptDialog',{accept:true});});
try{
 await call('Page.enable');await call('Page.navigate',{url:fixture.origin+'/tools/prospect-tracker/'});await wait("!!document.querySelector('#login:not([hidden])')");await ev("document.getElementById('login-email').value='radar@example.invalid';document.getElementById('login-password').value='fixture-only-password';document.getElementById('login-form').requestSubmit()");await wait("!!document.querySelector('.board')");
 for(const item of cases){
  await call('Page.navigate',{url:fixture.origin+'/tools/prospect-tracker/#/prospects/new'});await wait("!!document.querySelector('.ingestion')");
  await ev(`document.getElementById('ingestion-url').value=${JSON.stringify(item.posting)};document.querySelector('.ingestion form').requestSubmit()`);
  await wait("document.querySelector('#workspace').getAttribute('aria-busy')==='false' && document.querySelector('.ingestion')?.textContent.includes('Preview — review before saving')");
  await wait(`document.querySelector('[name=company]')?.value===${JSON.stringify(item.company)}`);
  await wait("!!document.querySelector('.editor__title img:not([hidden])')");
  const result=await ev("(()=>{const img=document.querySelector('.editor__title img');return {company:document.querySelector('[name=company]').value,selected:document.querySelector('[name=company_logo_url]').value,width:img.naturalWidth,height:img.naturalHeight,loaded:!img.hidden,managed:img.src.startsWith('blob:')};})()");
  for(const width of [1440,390])for(const light of [false,true]){await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await ev(`document.body.classList.toggle('light',${light})`);assert.equal(await ev('document.documentElement.scrollWidth>innerWidth'),false);}
  await call('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});const directory=process.env.LOGO_LIVE_OUTPUT??'/private/tmp';await writeFile(directory+'/branding-'+item.company.replace(/[^a-z0-9]/ig,'-')+'.png',Buffer.from(shot.data,'base64'),{mode:0o600});
  await ev("(async()=>{const {companyAvatar}=await import('./company-avatar.js?v=20261026-branding-selection');const small=companyAvatar(document.querySelector('[name=company]').value,false,document.querySelector('[name=company_logo_url]').value);small.id='verification-small-avatar';document.body.append(small);})()");
  await wait("!!document.querySelector('#verification-small-avatar img:not([hidden])')");
  assert.equal(await ev("document.getElementById('verification-small-avatar').getBoundingClientRect().width"),28);
  await ev("document.getElementById('verification-small-avatar').remove()");
  result.smallAvatarLoaded=true;results.push(result);console.log(item.company,'preview rendered',result.width+'x'+result.height);
 }
 const state=await(await fetch(fixture.origin+'/__fixture')).json();assert.equal(state.prospects,0);assert.equal(state.attempts,0);assert.equal(state.events,0);
 if(process.env.LOGO_LIVE_OUTPUT)await writeFile(process.env.LOGO_LIVE_OUTPUT+'/browser-results.json',JSON.stringify(results,null,2),{mode:0o600});
 console.log('PASS real-source ingestion, candidate selection and native decoding; both themes/responsive; zero prospect writes');
}finally{await send('Target.closeTarget',{targetId});ws.close();await fixture.close();}
