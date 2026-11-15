import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {state,startDeviceIdentification,stopDeviceIdentification,resetUi} from '../src/app/store.js';
const fixture=JSON.parse(fs.readFileSync(new URL('../public/data/scenarios/home.json',import.meta.url),'utf8'));
function prepare(t){
 t.mock.timers.enable({apis:['setTimeout','Date'],now:100000});
 state.appSettings={identificationSeconds:30};state.model=structuredClone(fixture);state.scenarioId='home';state.catalog=null;resetUi();
 t.after(()=>resetUi());
}
test('identification times out at thirty seconds and preserves playback, volume and persisted model',t=>{
 prepare(t);const before=JSON.stringify(state.model);
 startDeviceIdentification('d1','sound');assert.equal(state.identification.endsAt-state.identification.startedAt,30000);
 t.mock.timers.tick(29000);assert.equal(state.identification.deviceId,'d1');
 t.mock.timers.tick(1000);assert.equal(state.identification,null);
 assert.equal(JSON.stringify(state.model),before);
});
test('identification supports stop, replacement, reset and loss of availability',t=>{
 prepare(t);startDeviceIdentification('d1','sound');
 t.mock.timers.tick(3000);startDeviceIdentification('d2','blink');
 t.mock.timers.tick(7000);assert.equal(state.identification.deviceId,'d2');
 stopDeviceIdentification();assert.equal(state.identification,null);
 startDeviceIdentification('d1','blink');resetUi();t.mock.timers.tick(10000);assert.equal(state.identification,null);
 startDeviceIdentification('d1','sound');state.model.devices[0].status='offline';t.mock.timers.tick(1000);assert.equal(state.identification,null);
 assert.throws(()=>startDeviceIdentification('d1','sound'));
 assert.throws(()=>startDeviceIdentification('g1','sound'));
 state.model.devices[0].status='online';state.model.devices[0].capabilities.identification=[];
 assert.throws(()=>startDeviceIdentification('d1','blink'));
});

test('custom identification duration is captured at start',t=>{
 prepare(t);state.appSettings.identificationSeconds=7;startDeviceIdentification('d1','sound');
 state.appSettings.identificationSeconds=30;t.mock.timers.tick(6000);assert(state.identification);
 t.mock.timers.tick(1000);assert.equal(state.identification,null);
 startDeviceIdentification('d1','blink');assert.equal(state.identification.duration,30000);
});
