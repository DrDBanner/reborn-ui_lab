import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(project,'ST_Reborn_UI_Lab_Standalone.html'),'utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
function boot(){
 const memory=new Map();
 const app={innerHTML:''};
 const htmlDoc={dataset:{},style:{setProperty(){}},classList:{add(){}}};
 const ctx={
  console,Response,URL,URLSearchParams,Blob,Math,Date,structuredClone,fetch:globalThis.fetch,
  setTimeout,clearTimeout,
  localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)},
  document:{getElementById:()=>app,documentElement:htmlDoc,fonts:{ready:Promise.resolve(),*[Symbol.iterator](){}},addEventListener(){},activeElement:null,querySelectorAll:()=>[]},
  location:{search:'?offlineIcons=1'},
 };
 ctx.window=ctx;vm.createContext(ctx);
 scripts.forEach(js=>vm.runInContext(js,ctx,{timeout:3000}));
 return {ctx,app};
}
const ready=()=>new Promise(resolve=>setTimeout(resolve,12));
test('single file loads, renders and switches views/scenarios without a backend',async()=>{
 const {ctx,app}=boot();await ready();
 assert(app.innerHTML.includes('Discover stations'));
 assert(!app.innerHTML.includes('Quick presets'));
 assert(app.innerHTML.includes('PLAYBACKS'));
 await vm.runInContext("onAction('navigate',{dataset:{value:'outputs'}})",ctx);await ready();
 assert(app.innerHTML.includes('Outputs &amp; playbacks') || app.innerHTML.includes('Outputs & playbacks'));
 await vm.runInContext("onAction('load-scenario',{dataset:{id:'many'}})",ctx);await ready();
 assert(app.innerHTML.includes('30'));
 await vm.runInContext("onAction('navigate',{dataset:{value:'lab'}})",ctx);await ready();
 assert(app.innerHTML.includes('Design Lab'));
 await vm.runInContext("onField('speaker-variant',{value:'panel'})",ctx);await ready();
 assert(app.innerHTML.includes('A · Contextual player panel'));
});
test('source selection opens an output picker then preserves independent streams',async()=>{
 const {ctx,app}=boot();await ready();
 const sessionsBefore=vm.runInContext('JSON.stringify(state.model.sessions)',ctx);
 await vm.runInContext("onAction('source-select',{dataset:{id:'ndr2'}})",ctx);await ready();
 assert(app.innerHTML.includes('Play NDR 2 on'));
 assert.equal(vm.runInContext('JSON.stringify(state.model.sessions)',ctx),sessionsBefore);
 await vm.runInContext("onAction('assign-output',{dataset:{id:'d7'}})",ctx);await ready();
 const count=vm.runInContext('state.model.sessions.length',ctx);
 assert.equal(count,3);
 assert.equal(vm.runInContext("state.model.sessions.some(s=>s.targetId==='g1')",ctx),true);
 assert.equal(vm.runInContext("state.model.sessions.some(s=>s.targetId==='d4')",ctx),true);
 assert.equal(vm.runInContext("state.model.sessions.some(s=>s.targetId==='d7'&&s.sourceId==='ndr2')",ctx),true);
});

test('session selection leaves streams and configuration selection unchanged',async()=>{
 const {ctx,app}=boot();await ready();
 const before=vm.runInContext('JSON.stringify(state.model.sessions)',ctx);
 const selectedDevice=vm.runInContext('state.model.selectedDeviceId',ctx);
 await vm.runInContext("onAction('select-session',{dataset:{id:'s2'}})",ctx);
 assert.equal(vm.runInContext('state.model.selectedSessionId',ctx),'s2');
 assert.equal(vm.runInContext('JSON.stringify(state.model.sessions)',ctx),before);
 assert.equal(vm.runInContext('state.model.selectedDeviceId',ctx),selectedDevice);
});
test('device functions expose the second preset layer and save to its bound device',async()=>{
 const {ctx,app}=boot();await ready();
 await vm.runInContext("onAction('device-open',{dataset:{id:'d1'}});onAction('device-tab',{dataset:{value:'functions'}});onAction('preset-gesture',{dataset:{value:'double'}})",ctx);
 assert(app.innerHTML.includes('Button presets'));
 assert(app.innerHTML.includes('2×'));
 await vm.runInContext("onAction('preset-edit',{dataset:{id:'d1',gesture:'double'}})",ctx);
 const original=vm.runInContext('JSON.stringify(state.model.devices[0].presets)',ctx);
 const other=vm.runInContext('JSON.stringify(state.model.devices[1].doublePresets)',ctx);
 ctx.document.querySelectorAll=selector=>selector==='[data-preset-index]'?['ndr2','flux','','','',''].map(value=>({value})):[];
 await vm.runInContext("onAction('preset-save',{dataset:{}})",ctx);
 assert.equal(vm.runInContext('state.model.devices[0].doublePresets[0]',ctx),'ndr2');
 assert.equal(vm.runInContext('JSON.stringify(state.model.devices[0].presets)',ctx),original);
 assert.equal(vm.runInContext('JSON.stringify(state.model.devices[1].doublePresets)',ctx),other);
 await vm.runInContext("onAction('preset-play',{dataset:{id:'d1',key:'1',gesture:'double'}})",ctx);
 assert.equal(vm.runInContext("state.model.sessions.find(s=>s.targetId==='g1').sourceId",ctx),'ndr2');
 assert.equal(vm.runInContext("state.model.sessions.find(s=>s.targetId==='d4').sourceId",ctx),'ndrinfo');
});
test('logo menu contains chrome and closes on navigation',async()=>{
 const {ctx,app}=boot();await ready();
 assert(!app.innerHTML.includes('data-field="scenario"'));
 await vm.runInContext("onAction('toggle-app-menu',{dataset:{}})",ctx);
 assert(app.innerHTML.includes('data-field="scenario"'));
 assert(app.innerHTML.includes('Design Lab'));
 await vm.runInContext("onAction('navigate',{dataset:{value:'lab'}})",ctx);
 assert.equal(vm.runInContext('state.appMenuOpen',ctx),false);
});

test('section overview shortcuts remain available while their contents are collapsed',async()=>{
 const {ctx,app}=boot();await ready();
 await vm.runInContext("onAction('toggle-section',{dataset:{value:'playbacks'}});onAction('toggle-section',{dataset:{value:'outputs'}})",ctx);
 assert(app.innerHTML.includes('aria-label="All playbacks"'));
 assert(app.innerHTML.includes('aria-label="Manage all outputs"'));
 assert(!app.innerHTML.includes('class="session-card'));
 await vm.runInContext("onAction('navigate',{dataset:{value:'sessions'}})",ctx);
 assert(app.innerHTML.includes('Sources, playback and available functions in one place'));
 assert.equal(vm.runInContext('state.model.ui.outputScope',ctx),'active');
 await vm.runInContext("onAction('toggle-app-menu',{dataset:{}})",ctx);
 assert(!app.innerHTML.includes('Connections & devices'));
});

test('radio filter disclosure, full controls and pin preference survive updates',async()=>{
 const {ctx,app}=boot();await ready();
 await vm.runInContext("onAction('radio-filter',{dataset:{}})",ctx);
 for(const field of ['radio-country','radio-language','radio-order','radio-bitrate','radio-working','radio-compatible','radio-output'])assert(app.innerHTML.includes('data-field="'+field+'"'));
 await vm.runInContext("onField('radio-country',{value:'France'});onField('radio-language',{value:'French'});onAction('pin-radio-filters',{dataset:{}})",ctx);
 assert(app.innerHTML.includes('Paris Jazz'));
 assert(app.innerHTML.includes('radio-controls is-pinned'));
 assert.equal(vm.runInContext('state.model.ui.radioFiltersPinned',ctx),true);
 await vm.runInContext("onAction('apply-radio-filter',{dataset:{}})",ctx);
 assert.equal(vm.runInContext('state.radioFiltersOpen',ctx),false);
 assert.equal(vm.runInContext('state.model.ui.radioFiltersPinned',ctx),true);
});

test('rename dialog supports cancel, validation and safely rendered names',async()=>{
 const {ctx,app}=boot();await ready();
 await vm.runInContext("onAction('device-open',{dataset:{id:'d4'}});onAction('device-rename',{dataset:{id:'d4'}});onField('device-name',{value:'Cancelled'});onAction('close-modal',{dataset:{}})",ctx);
 assert.equal(vm.runInContext("state.model.devices.find(d=>d.id==='d4').name",ctx),'Office');
 await vm.runInContext("onAction('device-rename',{dataset:{id:'d4'}});onField('device-name',{value:'   '});onAction('device-rename-save',{dataset:{}})",ctx);
 assert.equal(vm.runInContext('state.modal.kind',ctx),'rename');
 assert(app.innerHTML.includes('Enter a device name'));
 await vm.runInContext("onField('device-name',{value:'Office <demo>'});onAction('device-rename-save',{dataset:{}})",ctx);
 assert.equal(vm.runInContext("state.model.devices.find(d=>d.id==='d4').name",ctx),'Office <demo>');
 assert(app.innerHTML.includes('Office &lt;demo&gt;'));
 assert(!app.innerHTML.includes('Office <demo>'));
 assert.equal(vm.runInContext('state.modal',ctx),null);
});


test('station artwork plays immediately on the player output and preserves independent streams',async()=>{
 const {ctx,app}=boot();await ready();
 await vm.runInContext("onAction('select-session',{dataset:{id:'s2'}})",ctx);
 const other=vm.runInContext("JSON.stringify(state.model.sessions.find(item=>item.targetId==='g1'))",ctx);
 assert(app.innerHTML.includes('aria-label="Play 1LIVE on Office"'));
 await vm.runInContext("onAction('source-play',{dataset:{id:'1live',target:'d4'}})",ctx);
 assert.equal(vm.runInContext('state.modal',ctx),null);
 assert.equal(vm.runInContext("currentSession(state.model).targetId",ctx),'d4');
 assert.equal(vm.runInContext("currentSession(state.model).sourceId",ctx),'1live');
 assert.equal(vm.runInContext("JSON.stringify(state.model.sessions.find(item=>item.targetId==='g1'))",ctx),other);
 const before=vm.runInContext('JSON.stringify(state.model.sessions)',ctx);
 await vm.runInContext("onAction('source-play',{dataset:{id:'ndr2',target:'d5'}})",ctx);
 assert.equal(vm.runInContext('JSON.stringify(state.model.sessions)',ctx),before);
 await vm.runInContext("onAction('select-session',{dataset:{id:'s1'}});onAction('source-play',{dataset:{id:'ndr2',target:'g1'}})",ctx);
 assert.equal(vm.runInContext('currentSession(state.model).targetId',ctx),'g1');
 assert.equal(vm.runInContext('state.model.history[0]',ctx),'ndr2');
});
test('unified workspace scopes active outputs and toggles only the named playback',async()=>{
 const {ctx,app}=boot();await ready();
 await vm.runInContext("onAction('navigate',{dataset:{value:'outputs',scope:'active'}})",ctx);
 assert(app.innerHTML.includes('class="targets-grid"'));
 assert(app.innerHTML.includes('Button presets'));
 assert.equal(vm.runInContext('state.model.ui.outputScope',ctx),'active');
 const before=vm.runInContext("JSON.stringify(state.model.sessions.find(item=>item.id==='s1'))",ctx);
 await vm.runInContext("onAction('toggle-output-playback',{dataset:{id:'s2'}})",ctx);
 assert.equal(vm.runInContext("state.model.sessions.find(item=>item.id==='s2').status",ctx),'paused');
 assert.equal(vm.runInContext("JSON.stringify(state.model.sessions.find(item=>item.id==='s1'))",ctx),before);
 await vm.runInContext("onAction('navigate',{dataset:{value:'outputs',scope:'all'}})",ctx);
 assert.equal(vm.runInContext('state.model.ui.outputScope',ctx),'all');
 await vm.runInContext("onAction('device-open',{dataset:{id:'d4',tab:'functions'}})",ctx);
 assert(app.innerHTML.includes('Button presets'));
});
test('transfer dialog previews, applies chosen keys and reports per-device results',async()=>{
 const {ctx,app}=boot();await ready();
 await vm.runInContext("onAction('button-transfer-open',{dataset:{id:'d1'}});onAction('button-transfer-all',{dataset:{value:'none'}});onField('button-transfer-key',{value:'single:1',checked:true});onField('button-transfer-target',{value:'g1',checked:true})",ctx);
 assert(app.innerHTML.includes('Transfer 2 assignments'));
 await vm.runInContext("onAction('button-transfer-save',{dataset:{}})",ctx);
 assert.equal(vm.runInContext('state.modal.kind',ctx),'button-transfer-result');
 assert(app.innerHTML.includes('Transfer results'));
 assert.equal(vm.runInContext('state.modal.report.results.length',ctx),2);
 assert.equal(vm.runInContext("state.model.devices.find(item=>item.id==='d2').presets[0]",ctx),'1live');
});

test('group button selector binds gesture, edits and recall to the chosen physical member',async()=>{
 const {ctx,app}=boot();await ready();
 await vm.runInContext("onAction('group-open',{dataset:{id:'g1'}});onField('preset-device',{value:'d3',dataset:{id:'g1'}});onAction('preset-gesture',{dataset:{id:'d3',value:'double'}})",ctx);
 assert(app.innerHTML.includes('Assignments on Kitchen. Playback uses Downstairs.'));
 assert.equal(vm.runInContext('state.presetGesture',ctx),'double');
 await vm.runInContext("onField('preset-device',{value:'d4',dataset:{id:'g1'}})",ctx);
 assert.equal(vm.runInContext('state.presetDeviceId',ctx),'d3');
 const other=vm.runInContext('JSON.stringify(state.model.devices[0].doublePresets)',ctx);
 await vm.runInContext("onAction('preset-edit',{dataset:{id:'d3',gesture:'double'}})",ctx);
 ctx.document.querySelectorAll=selector=>selector==='[data-preset-index]'?['ndrinfo','flux','','','',''].map(value=>({value})):[];
 await vm.runInContext("onAction('preset-save',{dataset:{}});onAction('preset-play',{dataset:{id:'d3',key:'1',gesture:'double'}})",ctx);
 assert.equal(vm.runInContext("state.model.devices.find(device=>device.id==='d3').doublePresets[0]",ctx),'ndrinfo');
 assert.equal(vm.runInContext('JSON.stringify(state.model.devices[0].doublePresets)',ctx),other);
 assert.equal(vm.runInContext("state.model.sessions.find(session=>session.targetId==='g1').sourceId",ctx),'ndrinfo');
 assert.equal(vm.runInContext("state.model.sessions.find(session=>session.targetId==='d4').sourceId",ctx),'ndrinfo');
});
