import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {renameItem,groupSettingsDraft,saveGroupSettings,groupLeaderCandidates,remoteGroupKeyDevices,createComposite,updateMembership,normalizeScenario,entity} from '../src/app/model.js';
const base=JSON.parse(fs.readFileSync(new URL('../public/data/scenarios/home.json',import.meta.url),'utf8'));
const fresh=()=>structuredClone(base);
test('temporary group names are editable without altering identity, membership or playback',()=>{
 const m=fresh(),id=createComposite(m,'group','Bedroom + Terrace R',['d6','d7'],false),before=structuredClone(m.sessions);
 renameItem(m,id,' Evening ');assert.equal(entity(m,id).name,'Evening');assert.equal(entity(m,id).persistent,false);assert.deepEqual(m.sessions,before);assert.throws(()=>renameItem(m,id,'   '));
});
test('group settings draft supports cancel and only permits a pair main speaker to lead',()=>{
 const m=fresh(),before=structuredClone(m),draft=groupSettingsDraft(m,'g1');draft.persistent=false;
 assert.deepEqual(m,before);assert.deepEqual(groupLeaderCandidates(m,m.groups[0]).map(d=>d.id),['d1','d3']);
 draft.leaderDeviceId='d2';assert.throws(()=>saveGroupSettings(m,draft),/main speaker/);assert.deepEqual(m,before);
});
test('group settings store remote templates per receiver, apart from both preset banks',()=>{
 const m=fresh(),draft=groupSettingsDraft(m,'g1'),before=structuredClone(m.sessions),banks=m.devices.map(d=>[d.presets,d.doublePresets]);
 draft.persistent=false;draft.leaderDeviceId='d3';draft.bindings.d4.thumbsUp=true;draft.bindings.d1.thumbsDown=true;saveGroupSettings(m,draft);
 assert.equal(m.groups[0].leaderDeviceId,'d3');assert.equal(m.groups[0].persistent,false);
 for(const id of ['d1','d4'])assert.deepEqual(entity(m,id).groupKeys.templates[0],{id:'g1',name:'Downstairs',leaderDeviceId:'d3',deviceIds:['d1','d2','d3'],persistent:false});
 assert.equal(entity(m,'d4').groupKeys.bindings.thumbsUp,'g1');assert.deepEqual(m.sessions,before);assert.deepEqual(m.devices.map(d=>[d.presets,d.doublePresets]),banks);
});
test('remote group keys preserve other bindings and unbinding does not delete saved templates',()=>{
 const m=fresh(),d=entity(m,'d4');d.groupKeys={templates:[{id:'other',name:'Other group'}],bindings:{thumbsDown:'other'}};
 let draft=groupSettingsDraft(m,'g1');draft.bindings.d4.thumbsUp=true;saveGroupSettings(m,draft);
 assert.equal(d.groupKeys.bindings.thumbsDown,'other');draft=groupSettingsDraft(m,'g1');draft.bindings.d4.thumbsUp=false;saveGroupSettings(m,draft);
 assert.deepEqual(d.groupKeys.bindings,{thumbsDown:'other'});assert.equal(d.groupKeys.templates.length,2);
});
test('offline receivers, stale members and concurrent remote assignments reject the whole save',()=>{
 for(const failure of ['offline','stale','concurrent']){
  const m=fresh(),draft=groupSettingsDraft(m,'g1');draft.persistent=false;draft.bindings.d4.thumbsUp=true;
  if(failure==='offline')entity(m,'d4').status='offline';
  if(failure==='stale')m.groups[0].memberIds.push('d5');
  if(failure==='concurrent')entity(m,'d4').groupKeys={templates:[],bindings:{thumbsUp:'other'}};
  const before=structuredClone(m);assert.throws(()=>saveGroupSettings(m,draft));assert.deepEqual(m,before);
 }
});
test('missing remote capability stays unknown and removing the main member clears its role',()=>{
 const m=fresh();m.devices.forEach(d=>delete d.capabilities.grouping?.remoteKeys);assert.deepEqual(remoteGroupKeyDevices(m),[]);
 const fixture=fresh();normalizeScenario(m,fixture);assert(remoteGroupKeyDevices(m).length>0);
 updateMembership(m,'g1','p1',false);assert.equal(m.groups[0].leaderDeviceId,null);
 const draft=groupSettingsDraft(m,'g1');draft.leaderDeviceId='d3';saveGroupSettings(m,draft);assert.equal(m.groups[0].leaderDeviceId,'d3');
});
