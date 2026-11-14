import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {addToGroup,membershipPlan,membershipError,entity,leafDeviceIds,visibleOutputs,rootOutputId,groupLeaderCandidates,assignSource,validateScenario,removeDevice,dissolveComposite} from '../src/app/model.js';
const fixture=JSON.parse(fs.readFileSync(new URL('../public/data/scenarios/home.json',import.meta.url),'utf8'));
const fresh=()=>structuredClone(fixture);
function secondGroup(m){m.groups.push({id:'g2',name:'Upstairs',memberIds:['d5','d6'],persistent:false,leaderDeviceId:'d5',volume:25});return 'g2'}
test('adding a device from either direction preserves destination playback and replaces only its stream',()=>{
 const m=fresh(),before=structuredClone(m.sessions[0]),bank=structuredClone(m.devices[3].presets),plan=membershipPlan(m,'g1','d4');
 assert.equal(plan.replaced.sourceId,'ndrinfo');assert.equal(plan.rootId,'g1');addToGroup(m,'g1','d4',plan);
 assert.deepEqual(m.sessions,[before]);assert.deepEqual(m.devices[3].presets,bank);assert(leafDeviceIds(m,'g1').includes('d4'));
});
test('nested groups keep their structure but have one root playback and physical members once',()=>{
 const m=fresh();secondGroup(m);assignSource(m,'ndr2','g2');const before=structuredClone(m.groups[0]),root=structuredClone(m.sessions.find(s=>s.targetId==='g2'));
 addToGroup(m,'g2','g1');assert.deepEqual(m.groups[0],before);assert.deepEqual(leafDeviceIds(m,'g2'),['d5','d6','d1','d2','d3']);
 assert.equal(rootOutputId(m,'d1'),'g2');assert(!visibleOutputs(m).some(t=>t.id==='g1'));assert(m.sessions.some(s=>s.id===root.id&&s.targetId==='g2'));assert(!m.sessions.some(s=>s.targetId==='g1'));assert.deepEqual(validateScenario(m),[]);
 assert.deepEqual(groupLeaderCandidates(m,entity(m,'g2')).map(d=>d.id),['d5','d6','d1','d3']);
 assignSource(m,'1live','g1');assert(m.sessions.some(s=>s.targetId==='g2'&&s.sourceId==='1live'));assert(!m.sessions.some(s=>s.targetId==='g1'));
});
test('silent destination adopts the joining active source; two silent items stay silent',()=>{
 const m=fresh();secondGroup(m);const origin=m.sessions.find(s=>s.targetId==='g1');origin.status='paused';addToGroup(m,'g2','g1');
 assert(m.sessions.some(s=>s.id===origin.id&&s.status==='paused'&&s.targetId==='g2'));
 const silent=fresh();silent.sessions=[];addToGroup(silent,'g1','d7');assert.deepEqual(silent.sessions,[]);
});
test('self, cycles, existing membership, offline state and stale playback are rejected before mutation',()=>{
 const m=fresh();secondGroup(m);addToGroup(m,'g2','g1');
 for(const [group,member] of [['g2','g2'],['g1','g2'],['g2','d1']]){const before=JSON.stringify(m);assert(membershipError(m,group,member));assert.throws(()=>addToGroup(m,group,member));assert.equal(JSON.stringify(m),before)}
 const n=fresh(),plan=membershipPlan(n,'g1','d7');n.sessions[0].sourceId='ndr2';const before=JSON.stringify(n);assert.throws(()=>addToGroup(n,'g1','d7',plan),/changed/);assert.equal(JSON.stringify(n),before);
 n.devices.find(d=>d.id==='d7').status='offline';assert(membershipError(n,'g1','d7'));
});
test('cycle and multiple-parent imports are invalid; deleting nested topology leaves no dangling references',()=>{
 const m=fresh();secondGroup(m);m.groups[0].memberIds.push('g2');m.groups[1].memberIds.push('g1');assert(validateScenario(m).some(e=>e.includes('cyclic')));
 const n=fresh();secondGroup(n);n.groups[1].memberIds.push('d3');assert(validateScenario(n).some(e=>e.includes('multiple parents')));
 const p=fresh();secondGroup(p);addToGroup(p,'g2','g1');removeDevice(p,'d1');assert.deepEqual(validateScenario(p),[]);
 const q=fresh();secondGroup(q);addToGroup(q,'g2','g1');dissolveComposite(q,'g1');assert.deepEqual(validateScenario(q),[]);assert(entity(q,'g2'));
});
test('N scenario has exactly fifty physical devices and thirty-eight addressable targets',()=>{
 const m=JSON.parse(fs.readFileSync(new URL('../public/data/scenarios/many.json',import.meta.url),'utf8'));assert.equal(m.devices.length,50);assert.equal(visibleOutputs(m).length,38);assert.equal(new Set(m.devices.map(d=>d.ip)).size,50);assert.deepEqual(validateScenario(m),[]);
});

test('membership review also exposes legacy member-level playbacks before collapsing them',()=>{
 const m=fresh();secondGroup(m);m.sessions.push({id:'legacy-a',targetId:'d5',sourceId:'album1',status:'playing',volume:20},{id:'legacy-b',targetId:'d6',sourceId:'ndr2',status:'playing',volume:21});
 const plan=membershipPlan(m,'g1','g2');assert.equal(plan.playback.targetId,'g1');assert.equal(plan.replacedPlaybacks.length,2);
 addToGroup(m,'g1','g2',plan);assert(!m.sessions.some(s=>['legacy-a','legacy-b'].includes(s.id)));assert(m.sessions.some(s=>s.targetId==='d4'));
});
