import { mountIngestion } from '../../ingestion-ui.js';
import { recognizePosting } from '../../ingestion/posting-url.js';
// Real form/handoff components, synthetic data, no writes or external navigation.
import { editorView } from '../../ui.js';
import { readDetails } from '../../view-model.js';
import { readHandoff } from '../../../shared/resume-handoff.mjs';
const host=document.getElementById('host'), result=document.getElementById('result');
const check=(condition,message)=>{if(!condition)throw Error(message);};
const row={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',company:'Example',title:'Designer',status:'prospect',connections:[],hiring_manager:{name:'Alex Example',title:'Design Director',company:'Example',profile_url:'https://example.org/team/alex',status:'manual'}};
try{
  const form=editorView(host,row);
  check(!host.textContent.includes('Find People'),'old action removed');
  const name=form.elements.namedItem('hiring_manager_name'), profile=form.elements.namedItem('hiring_manager_profile_url');
  check(name.value==='Alex Example'&&profile.value===row.hiring_manager.profile_url,'saved values shown');
  profile.value='javascript:alert(1)';profile.dispatchEvent(new window.Event('input',{bubbles:true}));
  check(!profile.checkValidity(),'unsafe URL invalid');
  profile.value='https://portfolio.example.org/alex';profile.dispatchEvent(new window.Event('input',{bubbles:true}));
  check(profile.checkValidity(),'non-LinkedIn professional URL accepted');
  name.value='';name.dispatchEvent(new window.Event('input',{bubbles:true}));check(name.required&&!name.checkValidity(),'details require a name');
  name.value='Unsaved name';name.dispatchEvent(new window.Event('input',{bubbles:true}));
  check(readDetails(new FormData(form)).hiring_manager.name==='Unsaved name','form read includes manual edits');
  const originalOpen=window.open;let destination='';
  window.open=()=>({opener:null,location:{replace:url=>{destination=String(url);}},close(){}});
  try{[...host.querySelectorAll('button')].find(button=>button.textContent==='Send to Résumé Builder').click();}
  finally{window.open=originalOpen;}
  const received=readHandoff(window.localStorage,new URL(destination));
  check(received.job.hiring_manager.name==='Alex Example','handoff uses saved contact rather than unsaved form');
  check(Object.keys(received.job.hiring_manager).sort().join(',')==='name,status','only compatible recipient fields transferred');
  window.localStorage.removeItem(received.key);
  for(const key of ['name','title','company','profile_url']){const input=form.elements.namedItem('hiring_manager_'+key);input.value='';input.dispatchEvent(new window.Event('input',{bubbles:true}));}
  check(form.checkValidity()&&readDetails(new FormData(form)).hiring_manager===null,'all fields clear to null');
  const fresh=editorView(host,null);check(!fresh.elements.namedItem('hiring_manager_name').required,'contact optional for creation');
  const input=fresh.elements.namedItem('hiring_manager_name');input.value='Keep Manual Contact';input.dispatchEvent(new window.Event('input',{bubbles:true}));
  const posting='https://boards.greenhouse.io/example/jobs/12345', identity=recognizePosting(posting);
  const preview={draft:{company:'Imported Company',title:'Imported Designer',job_url:identity.canonical_url,discovered_on:'2026-10-28'},identity:{...identity,requisition_id:null},original_url:posting,retrieved_at:new Date().toISOString(),method:'greenhouse-job-board-api',field_sources:{},warnings:[]};
  const ingestion=mountIngestion(fresh,{client:{functions:{invoke:async()=>({data:preview,error:null})}},data:{listProspectIdentities:async()=>[]},createId:row.id,current:()=>true,busy:()=>{},markDirty:()=>{},canReplace:()=>true});
  const jobInput=host.querySelector('#ingestion-url');jobInput.value=posting;jobInput.closest('form').requestSubmit();
  for(let i=0;i<100&&!host.textContent.includes('Preview — review before saving');i++)await new Promise(resolve=>setTimeout(resolve,10));
  check(host.textContent.includes('Preview — review before saving'),'mocked ingestion completed');
  check(fresh.elements.namedItem('hiring_manager_name').value==='Keep Manual Contact','reimport preserves manual contact in actual UI');
  check(fresh.querySelector('.prospect-job-details').open,'ingestion opens job details rather than contact disclosure');
  ingestion.dispose();
  result.textContent='PASS: saved fields, removed Find People, URL validation, optional-name rules, edit/clear, saved-only handoff, minimal compatible payload, optional creation, ingestion preservation';
}catch(error){result.textContent='FAIL: '+error.message;throw error;}
