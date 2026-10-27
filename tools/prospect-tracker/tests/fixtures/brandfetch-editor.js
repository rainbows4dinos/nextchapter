// Native DOM regressions; synthetic Search/image events, no remote/database writes.
import { configureBrandfetch } from '../../brandfetch.js';
import { companyLogoEditor } from '../../company-logo-editor.js';
import { configureLogoDelivery } from '../../company-avatar.js?v=20261026-logo-grid';
const result=document.getElementById('result');
const check=(ok,message)=>{if(!ok)throw Error(message);result.textContent+=`PASS ${message}\n`;};
const wait=async predicate=>{for(let i=0;i<150;i++){if(predicate())return;await new Promise(done=>setTimeout(done,20));}throw Error('Component wait timed out');};
const fire=(element,value)=>{element.value=value;element.dispatchEvent(new window.Event('input',{bubbles:true}));};
document.getElementById('run').onclick=async()=>{
 result.textContent='';document.getElementById('run').disabled=true;
 const originalFetch=window.fetch,originalTimer=window.setTimeout,descriptor=Object.getOwnPropertyDescriptor(window.HTMLImageElement.prototype,'src');
 let calls=0,aborts=0,backend=0,late;
 try{
  window.setTimeout=(fn,ms,...args)=>originalTimer(fn,ms===8000?100:ms,...args);
  Object.defineProperty(window.HTMLImageElement.prototype,'src',{configurable:true,set(value){
   check(value.startsWith('https://cdn.brandfetch.io/')&&this.crossOrigin==='anonymous'&&this.referrerPolicy==='origin','direct anonymous image with origin referrer');
   Promise.resolve().then(()=>{if(value.includes('/unavailable.org/'))this.dispatchEvent(new window.Event('error'));else{Object.defineProperty(this,'naturalWidth',{value:112,configurable:true});this.dispatchEvent(new window.Event('load'));}});
  }});
  window.fetch=async(url,options)=>{
   calls++;const parsed=new URL(url),q=decodeURIComponent(parsed.pathname.split('/').pop());
   check(parsed.origin==='https://api.brandfetch.io'&&parsed.pathname.startsWith('/v2/search/')&&options.credentials==='omit'&&options.cache==='no-store','free live Search, no credentials or cache');
   if(['Timeout','Late'].includes(q))return new Promise((resolve,reject)=>{if(q==='Late')late=resolve;options.signal.addEventListener('abort',()=>{aborts++;if(q!=='Late')reject(Error('aborted'));});});
   if(q==='Rate')return new Response('',{status:429});if(q==='Fail')return new Response('',{status:503});
   return Response.json(q==='Empty'?[]:[{name:'Example',domain:'example.org'},{name:'A very long company name that should be truncated without breaking the grid',domain:'a-very-long-company-domain.example.org'},{name:null,domain:'unavailable.org'}]);
  };
  configureBrandfetch('synthetic_public_client');configureLogoDelivery(async()=>{backend++;throw Error('Unexpected backend');});
  let editor=companyLogoEditor({company:'Example'});const host=document.getElementById('host');host.replaceChildren(editor.trigger,editor.panel,editor.value,editor.override);
  const matches=()=>editor.panel.querySelectorAll('.company-logo-result');
  const open=async()=>{editor.trigger.click();await wait(()=>matches().length===3&&matches()[0].dataset.ready==='true');};
  await open();check(!editor.value.value&&editor.override.value==='false','no automatic selection');
  check(!editor.trigger.title&&!editor.panel.querySelector('form')&&!editor.panel.querySelector('input[type=url]'),'no tooltip, footer or URL form');
  check(matches()[2].disabled&&matches()[2].textContent.includes('Unavailable'),'broken logo cannot be selected');
  editor.panel.querySelector('input[type=search]').dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));check(document.activeElement===matches()[0],'ArrowDown enters the grid');matches()[0].dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));check(document.activeElement===matches()[1],'arrow keys navigate logo tiles');
  check(window.getComputedStyle(matches()[1].querySelector('strong')).textOverflow==='ellipsis','long names use truncation');
  editor.panel.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await wait(()=>matches().length===0);check(!editor.value.value&&document.activeElement===editor.trigger,'Escape dismisses without changes and returns focus');
  await open();matches()[0].click();await wait(()=>!editor.panel.matches(':popover-open')&&matches().length===0);check(editor.value.value.endsWith('/example.org/type/icon')&&editor.override.value==='true','single click updates only new draft and closes');
  let saves=0,release,fail=true;
  editor=companyLogoEditor({company:'Example',company_logo_url:'https://cdn.brandfetch.io/domain/previous.org/type/icon',company_logo_override:true},{saveLogo:async()=>{saves++;await new Promise(done=>{release=done;});if(fail)throw Error('Could not save the logo. Try again.');}});
  host.replaceChildren(editor.trigger,editor.panel,editor.value,editor.override);await open();matches()[0].click();matches()[0].click();check(saves===1&&matches()[0].disabled&&matches()[0].getAttribute('aria-busy')==='true','saving state prevents duplicates');
  release();await wait(()=>editor.panel.textContent.includes('Could not save'));check(editor.panel.matches(':popover-open')&&editor.value.value.includes('previous.org'),'failure keeps picker and prior logo');
  fail=false;matches()[0].click();release();await wait(()=>matches().length===0);check(saves===2&&editor.value.value.includes('example.org'),'retry saves once and closes');
  await open();const query=editor.panel.querySelector('input[type=search]');fire(query,'First');fire(query,'Second');fire(query,'Empty');const before=calls;await wait(()=>editor.panel.textContent.includes('No logos found'));check(calls===before+1,'typing is debounced');
  fire(query,'Rate');await wait(()=>editor.panel.textContent.includes('Could not search'));check(true,'rate limit recovery');
  fire(query,'Timeout');await wait(()=>editor.panel.textContent.includes('timed out'));check(aborts>0,'timeout aborts');
  fire(query,'Late');await wait(()=>!!late);fire(query,'Empty');late(Response.json([{name:'Obsolete',domain:'obsolete.org'}]));await wait(()=>editor.panel.textContent.includes('No logos found'));check(!editor.panel.textContent.includes('Obsolete'),'obsolete results ignored');
  fire(query,'');await wait(()=>matches().length===0);check(!editor.panel.textContent.includes('No logos found'),'empty query clears state');
  editor.panel.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await wait(()=>!editor.panel.matches(':popover-open'));check(backend===0,'no authenticated image proxy');
  result.textContent+='COMPLETE — all component regressions passed.\n';
 }catch(error){result.textContent+=`FAIL ${error.message}\n`;}
 finally{window.fetch=originalFetch;window.setTimeout=originalTimer;Object.defineProperty(window.HTMLImageElement.prototype,'src',descriptor);configureBrandfetch('');document.getElementById('run').disabled=false;}
};
