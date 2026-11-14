import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {leafDeviceIds,visibleOutputs,assignSource,createComposite,updateMembership,dissolveComposite,removeDevice,validateScenario} from '../src/app/model.js';
const base=JSON.parse(fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public/data/scenarios/home.json'),'utf8'));
const fresh=()=>structuredClone(base);
test('pair and group resolve to physical speakers',()=>{const m=fresh();assert.deepEqual(leafDeviceIds(m,'p1'),['d1','d2']);assert.deepEqual(leafDeviceIds(m,'g1'),['d1','d2','d3'])});
test('sidebar avoids redundant child output entries',()=>{const m=fresh();const ids=visibleOutputs(m).map(x=>x.id);assert(ids.includes('g1'));assert(!ids.includes('p1'));assert(!ids.includes('d1'));assert(ids.includes('d4'))});
test('assigning source affects overlapping sessions only',()=>{const m=fresh();assignSource(m,'1live','g1');assert.equal(m.sessions.length,2);assert(m.sessions.some(x=>x.targetId==='d4'));assert(m.sessions.some(x=>x.targetId==='g1'&&x.sourceId==='1live'))});
test('building pair fails if device already belongs to pair',()=>{const m=fresh();assert.throws(()=>createComposite(m,'pair','Double',['d1','d4']))});
test('temporary group from ungrouped devices can be created and dissolved',()=>{const m=fresh();const id=createComposite(m,'group','New',['d4','d5']);assert.deepEqual(leafDeviceIds(m,id),['d4','d5']);dissolveComposite(m,id);assert(!m.groups.some(x=>x.id===id))});
test('scenario shapes validated',()=>assert.deepEqual(validateScenario(fresh()),[]));

test('removing a device cleans up orphan pairs, groups and sessions',()=>{const m=fresh();removeDevice(m,'d1');assert.equal(m.pairs.length,0);assert.equal(m.groups.length,0);assert.equal(m.sessions.length,1);assert.deepEqual(validateScenario(m),[])})
