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
 assert(app.innerHTML.includes('Outputs &amp; groups') || app.innerHTML.includes('Outputs & groups'));
 await vm.runInContext("onAction('load-scenario',{dataset:{id:'many'}})",ctx);await ready();
 assert(app.innerHTML.includes('30'));
 await vm.runInContext("onAction('navigate',{dataset:{value:'lab'}})",ctx);await ready();
 assert(app.innerHTML.includes('Design Lab'));
 await vm.runInContext("onField('speaker-variant',{value:'panel'})",ctx);await ready();
 assert(app.innerHTML.includes('A · Contextual player panel'));
});
test('source selection opens an output picker then preserves independent streams',async()=>{
 const {ctx,app}=boot();await ready();
 await vm.runInContext("onAction('source-select',{dataset:{id:'ndr2'}})",ctx);await ready();
 assert(app.innerHTML.includes('Play NDR 2 on'));
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
