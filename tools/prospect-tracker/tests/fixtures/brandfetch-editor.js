// Native DOM regression harness. All Search responses/image events are synthetic.
import { configureBrandfetch } from '../../brandfetch.js';
import { companyLogoEditor } from '../../company-logo-editor.js';
import { configureLogoDelivery } from '../../company-avatar.js?v=20261026-brandfetch-picker';
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
   check(value.startsWith('https://cdn.brandfetch.io/')&&this.crossOrigin==='anonymous'&&this.referrerPolicy==='origin','direct credential-free image with origin referrer');
   Promise.resolve().then(()=>{if(value.includes('/type/symbol/'))this.dispatchEvent(new window.Event('error'));else{Object.defineProperty(this,'naturalWidth',{value:112,configurable:true});this.dispatchEvent(new window.Event('load'));}});
  }});
  window.fetch=async(url,options)=>{
   calls++;const parsed=new URL(url),q=decodeURIComponent(parsed.pathname.split('/').pop());
   check(parsed.origin==='https://api.brandfetch.io'&&parsed.pathname.startsWith('/v2/search/')&&options.credentials==='omit'&&options.referrerPolicy==='origin'&&options.cache==='no-store'&&!options.headers,'free live Search without credentials or cache');
   if(['Timeout','Late'].includes(q))return new Promise((resolve,reject)=>{if(q==='Late')late=resolve;options.signal.addEventListener('abort',()=>{aborts++;if(q!=='Late')reject(Error('aborted'));});});
   if(q==='Rate')return new Response('',{status:429});if(q==='Fail')return new Response('',{status:503});
   return Response.json(q==='Empty'?[]:[{name:'Example',domain:'example.org'},{name:'Example',domain:'another.org'},{name:null,domain:'third.org'},null]);
  };
  configureBrandfetch('synthetic_public_client');configureLogoDelivery(async()=>{backend++;throw Error('Unexpected backend');});
  const editor=companyLogoEditor({company:'Example'});document.getElementById('host').replaceChildren(editor.trigger,editor.panel,editor.value,editor.override);
  editor.trigger.click();await wait(()=>editor.panel.matches(':popover-open'));
  const query=editor.panel.querySelector('input[type=search]'),use=editor.panel.querySelector('button[type=submit]');
  const matches=()=>editor.panel.querySelectorAll('.company-logo-result');
  await wait(()=>matches().length===3);
  check(query.value==='Example'&&!editor.value.value&&editor.override.value==='false','prefilled query with no automatic selection or draft mutation');
  matches()[0].click();await wait(()=>!use.disabled);check(!editor.value.value,'selection preview stays local to editor');
  const variant=editor.panel.querySelector('select');variant.value='symbol';variant.dispatchEvent(new window.Event('change'));await wait(()=>editor.panel.textContent.includes('unavailable'));check(use.disabled,'unavailable variant blocks Use Logo');
  const button=text=>Array.from(editor.panel.querySelectorAll('button')).find(b=>b.textContent===text);
  button('Cancel').click();await wait(()=>!editor.panel.matches(':popover-open')&&matches().length===0);check(!editor.value.value&&editor.override.value==='false','Cancel discards selection');
  editor.trigger.click();await wait(()=>matches().length===3);matches()[0].click();await wait(()=>!use.disabled);use.click();await wait(()=>!editor.panel.matches(':popover-open')&&matches().length===0);
  check(editor.value.value==='https://cdn.brandfetch.io/domain/example.org/type/icon'&&editor.override.value==='true','Use Logo makes an unsaved manual override');
  editor.trigger.click();await wait(()=>matches().length===3);
  fire(query,'First');fire(query,'Second');fire(query,'Empty');const before=calls;await wait(()=>editor.panel.textContent.includes('No companies found'));check(calls===before+1,'typing debounces to latest query');
  fire(query,'Rate');await wait(()=>editor.panel.textContent.includes('wait a moment'));check(true,'rate limit feedback');
  fire(query,'Fail');await wait(()=>editor.panel.textContent.includes('unavailable'));check(true,'recoverable Search error');
  fire(query,'Timeout');await wait(()=>editor.panel.textContent.includes('timed out'));check(aborts>0,'timeout aborts request');
  fire(query,'Late');await wait(()=>!!late);fire(query,'Empty');late(Response.json([{name:'Obsolete',domain:'obsolete.org'}]));await wait(()=>editor.panel.textContent.includes('No companies found'));check(!editor.panel.textContent.includes('Obsolete'),'obsolete results are ignored');
  fire(query,'');await wait(()=>matches().length===0);check(editor.panel.textContent.includes('Enter a company'),'empty query releases results');
  editor.panel.querySelector('details').open=true;fire(editor.panel.querySelector('input[type=url]'),'https://cdn.brandfetch.io/domain/another.org/type/logo');use.click();await wait(()=>!editor.panel.matches(':popover-open')&&matches().length===0);check(editor.value.value.endsWith('/another.org/type/logo'),'custom URL replacement');
  editor.trigger.click();await wait(()=>matches().length===3);button('Remove Logo').click();await wait(()=>!editor.panel.matches(':popover-open')&&matches().length===0);check(!editor.value.value&&editor.override.value==='true','explicit clearing remains authoritative');
  check(backend===0,'no authenticated backend image delivery');result.textContent+='COMPLETE — all component regressions passed.\n';
 }catch(error){result.textContent+=`FAIL ${error.message}\n`;}
 finally{window.fetch=originalFetch;window.setTimeout=originalTimer;Object.defineProperty(window.HTMLImageElement.prototype,'src',descriptor);configureBrandfetch('');document.getElementById('run').disabled=false;}
};
