import test from 'node:test';
import assert from 'node:assert/strict';
import {artworkBounds,assessLogo,selectLogo} from '../ingestion/logo-suitability.js';
const candidate=(patch={})=>({url:'https://cdn.example.com/logo.png',source:'ats',role:'ats-logo',employerMatched:true,width:256,height:256,...patch});
const bounds=(left,top,right,bottom,width,height)=>({left:left/width,top:top/height,right:right/width,bottom:bottom/height});
test('decoded artwork is measured against white, without cropping source images',()=>{
  const data=new Uint8ClampedArray(4*4*4);assert.equal(artworkBounds(data,4,4),null);
  data.set([255,255,255,255],0);assert.equal(artworkBounds(data,4,4),null);
  data.set([0,0,0,255],(1*4+2)*4);assert.deepEqual(artworkBounds(data,4,4),{left:.5,top:.25,right:.75,bottom:.5});
  assert.throws(()=>artworkBounds(data,1,1));
});
test('employer attribution and explicit marketing/social/platform rejection precede geometry',()=>{
  for(const context of ['marketing','social','ats-platform'])assert.equal(assessLogo(candidate({context})).accepted,false);
  assert.equal(assessLogo(candidate({employerMatched:false})).accepted,false);
  assert.equal(assessLogo(candidate({bounds:null})).accepted,false);
});
test('audit-like square symbols, 128px icons, square lockups and padded colored marks remain preferred',()=>{
  for(const item of [candidate({width:498,height:498,bounds:bounds(104,67,393,411,498,498)}),candidate({width:467,height:467}),candidate({width:128,height:128}),candidate({width:1001,height:1001}),candidate({width:2400,height:2400,bounds:bounds(669,785,1731,1615,2400,2400)}),candidate({width:391,height:361,bounds:bounds(17,18,377,343,391,361)})]){
    const favicon=candidate({url:'https://cdn.example.com/icon.png',source:'website',role:'favicon'});
    assert.equal(selectLogo([item,favicon]).selected,item);
  }
});
test('audit-like horizontal and padded wordmarks prefer a suitable official icon without becoming invalid',()=>{
  const icon=candidate({source:'website',role:'touch-icon'});
  for(const item of [candidate({width:873,height:198}),candidate({width:2428,height:468}),candidate({width:2091,height:733,bounds:bounds(235,208,1856,526,2091,733)}),candidate({width:3600,height:1884,bounds:bounds(228,738,3375,1146,3600,1884)})]){
    assert.equal(assessLogo(item).accepted,true);assert.ok(assessLogo(item).flags.length);
    assert.equal(selectLogo([item,icon]).selected,icon);assert.equal(selectLogo([item]).selected,item);
  }
});
test('a colorful rectangular marketing asset is rejected even when geometry looks adequate',()=>{
  assert.equal(selectLogo([candidate({width:1200,height:630,context:'marketing'})]).selected,null);
  assert.equal(assessLogo(candidate({width:1200,height:630})).accepted,true,'geometry cannot infer marketing semantics');
});

test('role preference is not unconditional when a declared icon has inadequate native resolution',()=>{
  const low=candidate({source:'website',role:'touch-icon',width:16,height:16});
  const adequate=candidate({source:'website',role:'favicon',width:128,height:128});
  assert.equal(selectLogo([low,adequate]).selected,adequate);
  const smaller=candidate({source:'website',role:'favicon',width:32,height:32});
  assert.equal(selectLogo([low,smaller]).selected,low,'with similar flags the declared role remains a preference');
});
