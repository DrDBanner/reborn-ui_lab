import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {leafDeviceIds,visibleOutputs,assignSource,createComposite,updateMembership,dissolveComposite,removeDevice,validateScenario,buttonProfile,buttonPresets,setButtonPreset,recallButtonPreset,normalizeScenario} from '../src/app/model.js';
const base=JSON.parse(fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public/data/scenarios/home.json'),'utf8'));
const fresh=()=>structuredClone(base);
test('pair and group resolve to physical speakers',()=>{const m=fresh();assert.deepEqual(leafDeviceIds(m,'p1'),['d1','d2']);assert.deepEqual(leafDeviceIds(m,'g1'),['d1','d2','d3'])});
test('sidebar avoids redundant child output entries',()=>{const m=fresh();const ids=visibleOutputs(m).map(x=>x.id);assert(ids.includes('g1'));assert(!ids.includes('p1'));assert(!ids.includes('d1'));assert(ids.includes('d4'))});
test('assigning source affects overlapping sessions only',()=>{const m=fresh();assignSource(m,'1live','g1');assert.equal(m.sessions.length,2);assert(m.sessions.some(x=>x.targetId==='d4'));assert(m.sessions.some(x=>x.targetId==='g1'&&x.sourceId==='1live'))});
test('building pair fails if device already belongs to pair',()=>{const m=fresh();assert.throws(()=>createComposite(m,'pair','Double',['d1','d4']))});
test('temporary group from ungrouped devices can be created and dissolved',()=>{const m=fresh();const id=createComposite(m,'group','New',['d4','d5']);assert.deepEqual(leafDeviceIds(m,id),['d4','d5']);dissolveComposite(m,id);assert(!m.groups.some(x=>x.id===id))});
test('scenario shapes validated',()=>assert.deepEqual(validateScenario(fresh()),[]));

test('removing a device cleans up orphan pairs, groups and sessions',()=>{const m=fresh();removeDevice(m,'d1');assert.equal(m.pairs.length,0);assert.equal(m.groups.length,0);assert.equal(m.sessions.length,1);assert.deepEqual(validateScenario(m),[])})

test('button banks remain independent and reject unsupported keys or gestures',()=>{
 const m=fresh(),d=m.devices[0],before=[...d.presets];
 setButtonPreset(m,d.id,1,'double','ndr2');
 assert.deepEqual(d.presets,before);
 assert.equal(buttonPresets(d,'double')[0],'ndr2');
 assert.throws(()=>setButtonPreset(m,d.id,0,'single','flux'));
 assert.throws(()=>setButtonPreset(m,d.id,7,'double','flux'));
 const single=m.devices.find(d=>d.id==='d4');
 assert.throws(()=>setButtonPreset(m,single.id,1,'double','flux'));
 const buttonless={id:'none',brand:'Bose',model:'SoundTouch 10',capabilities:{}};
 m.devices.push(buttonless);
 assert.equal(buttonProfile(buttonless),null);
 assert.throws(()=>setButtonPreset(m,'none',1,'single','flux'));
});
test('device preset recall uses its composite output and preserves other streams',()=>{
 const m=fresh();setButtonPreset(m,'d1',1,'double','album1');
 recallButtonPreset(m,'d1',1,'double');
 assert.equal(m.sessions.find(s=>s.targetId==='g1').sourceId,'album1');
 assert.equal(m.sessions.find(s=>s.targetId==='d4').sourceId,'ndrinfo');
 m.devices[0].status='offline';
 assert.throws(()=>recallButtonPreset(m,'d1',1,'double'));
});
test('legacy migration preserves existing assignments and unknown devices',()=>{
 const m=fresh();delete m.devices[0].capabilities;delete m.devices[0].brand;delete m.devices[0].doublePresets;
 m.devices[0].presets[0]='wdr5';m.devices.push({id:'external',name:'External',presets:[]});
 normalizeScenario(m,base);
 assert.equal(m.devices[0].presets[0],'wdr5');
 assert.equal(m.devices[0].brand,'Bose');
 assert(buttonProfile(m.devices[0]).gestures.includes('double'));
 assert.equal(buttonProfile(m.devices.at(-1)),null);
 assert.equal(m.devices.at(-1).brand,null);
});
test('scenario validation rejects malformed capability data',()=>{
 const m=fresh();m.devices[0].capabilities.buttonPresets={keyCount:0,gestures:['triple']};
 assert(validateScenario(m).some(error=>error.includes('invalid button capabilities')));
});
