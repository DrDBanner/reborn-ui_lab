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
 assert(app.innerHTML.includes('PLAYING'));
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

test('Playing opens the matching output detail without changing streams',async()=>{
 const {ctx,app}=boot();await ready();
 const before=vm.runInContext('JSON.stringify(state.model.sessions)',ctx);
 await vm.runInContext("onAction('select-session',{dataset:{id:'s2'}})",ctx);
 assert.equal(vm.runInContext('state.model.selectedSessionId',ctx),'s2');
 assert.equal(vm.runInContext('state.model.selectedOutputId',ctx),'d4');
 assert.equal(vm.runInContext('state.detailDeviceId',ctx),'d4');
 assert.equal(vm.runInContext('state.view',ctx),'device');
 assert(app.innerHTML.includes('output-item is-selected')||app.innerHTML.includes('aria-current="page"'));
 await vm.runInContext("onAction('select-session',{dataset:{id:'s1'}})",ctx);
 assert.equal(vm.runInContext('state.detailOutputId',ctx),'g1');
 assert.equal(vm.runInContext('state.view',ctx),'group');
 assert.equal(vm.runInContext('JSON.stringify(state.model.sessions)',ctx),before);
 await vm.runInContext("state.model.sessions.push({id:'pair-test',targetId:'p1',sourceId:'flux',status:'paused'});onAction('select-session',{dataset:{id:'pair-test'}})",ctx);
 assert.equal(vm.runInContext('state.detailOutputId',ctx),'p1');
 assert.equal(vm.runInContext('state.view',ctx),'group');
 await vm.runInContext("onField('session',{value:'s2'})",ctx);
 assert.equal(vm.runInContext('state.detailOutputId',ctx),'p1');
 await vm.runInContext("onAction('select-session',{dataset:{id:'missing'}})",ctx);
 assert.equal(vm.runInContext('state.detailOutputId',ctx),'p1');
 assert.equal(vm.runInContext('state.toasts.at(-1).kind',ctx),'error');
});
test('device functions expose the second preset layer and save to its bound device',async()=>{
 const {ctx,app}=boot();await ready();
 await vm.runInContext("onAction('device-open',{dataset:{id:'d1'}});onAction('device-tab',{dataset:{value:'functions'}});onAction('preset-gesture',{dataset:{value:'double'}})",ctx);
 assert(app.innerHTML.includes('Button presets'));
 assert(app.innerHTML.includes('data-value="double" aria-pressed="true"'));
 await vm.runInContext("onAction('preset-edit',{dataset:{id:'d1',gesture:'double'}})",ctx);
 const original=vm.runInContext('JSON.stringify(state.model.devices[0].presets)',ctx);
 const other=vm.runInContext('JSON.stringify(state.model.devices[1].doublePresets)',ctx);
 await vm.runInContext("onAction('preset-source-choose',{dataset:{id:'ndr2'}});onAction('preset-slot',{dataset:{index:'1'}});onAction('preset-source-choose',{dataset:{id:'flux'}})",ctx);
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
 assert(app.innerHTML.includes('aria-label="Output views"'));
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
 await vm.runInContext("onField('session',{value:'s2'})",ctx);
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
 assert(app.innerHTML.includes('class="targets-grid output-cards"'));
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
 assert(app.innerHTML.includes('value="d3" selected'));
 assert.equal(vm.runInContext('state.presetGesture',ctx),'double');
 await vm.runInContext("onField('preset-device',{value:'d4',dataset:{id:'g1'}})",ctx);
 assert.equal(vm.runInContext('state.presetDeviceId',ctx),'d3');
 const other=vm.runInContext('JSON.stringify(state.model.devices[0].doublePresets)',ctx);
 await vm.runInContext("onAction('preset-edit',{dataset:{id:'d3',gesture:'double'}})",ctx);
 await vm.runInContext("onAction('preset-source-choose',{dataset:{id:'ndrinfo'}})",ctx);
 await vm.runInContext("onAction('preset-save',{dataset:{}});onAction('preset-play',{dataset:{id:'d3',key:'1',gesture:'double'}})",ctx);
 assert.equal(vm.runInContext("state.model.devices.find(device=>device.id==='d3').doublePresets[0]",ctx),'ndrinfo');
 assert.equal(vm.runInContext('JSON.stringify(state.model.devices[0].doublePresets)',ctx),other);
 assert.equal(vm.runInContext("state.model.sessions.find(session=>session.targetId==='g1').sourceId",ctx),'ndrinfo');
 assert.equal(vm.runInContext("state.model.sessions.find(session=>session.targetId==='d4').sourceId",ctx),'ndrinfo');
});


test('typed preset chooser saves drafts, discards cancellation and captures the device source',async()=>{
 const {ctx,app}=boot();await ready();
 const original=vm.runInContext('JSON.stringify(state.model.devices[0].presets)',ctx);
 await vm.runInContext("onAction('preset-edit',{dataset:{id:'d1',gesture:'single'}});onAction('preset-source-type',{dataset:{value:'library'}});onAction('preset-source-choose',{dataset:{id:'track-demo'}})",ctx);
 assert(app.innerHTML.includes('Library track'));
 assert.equal(vm.runInContext('JSON.stringify(state.model.devices[0].presets)',ctx),original);
 await vm.runInContext("onAction('close-modal',{dataset:{}})",ctx);
 assert.equal(vm.runInContext('JSON.stringify(state.model.devices[0].presets)',ctx),original);
 await vm.runInContext("onAction('preset-edit',{dataset:{id:'d1',gesture:'single'}});onAction('preset-source-choose',{dataset:{id:'track-demo'}});onAction('preset-slot',{dataset:{index:'1'}});onAction('preset-source-choose',{dataset:{id:'spotify-album-demo'}});onAction('preset-slot',{dataset:{index:'2'}});onAction('preset-source-choose',{dataset:{id:'native-demo'}});onAction('preset-slot',{dataset:{index:'3'}});onField('session',{value:'s2'});onAction('preset-use-current',{dataset:{}});onAction('preset-clear',{dataset:{index:'4'}})",ctx);
 assert.equal(vm.runInContext('state.modal.draft[3]',ctx),'flux');
 await vm.runInContext("onAction('preset-save',{dataset:{}})",ctx);
 assert.equal(vm.runInContext('state.model.devices[0].presets[0]',ctx),'track-demo');
 assert.equal(vm.runInContext('state.model.devices[0].presets[1]',ctx),'spotify-album-demo');
 assert.equal(vm.runInContext('state.model.devices[0].presets[2]',ctx),'native-demo');
 assert.equal(vm.runInContext('state.model.devices[0].presets[4]',ctx),null);
 assert.equal(vm.runInContext('state.model.devices[0].doublePresets[0]',ctx),'album1');
});
test('volume lightbox stays bound to its output and separates individual trims from overall volume',async()=>{
 const {ctx,app}=boot();await ready();
 await vm.runInContext("onAction('open-volume-controls',{dataset:{}})",ctx);
 assert(app.innerHTML.includes('Volume · Downstairs'));
 assert(app.innerHTML.includes('Volume for Living Room R'));
 const office=vm.runInContext("state.model.devices.find(d=>d.id==='d4').volume",ctx);
 await vm.runInContext("onField('dialog-device-volume',{value:'47',dataset:{id:'d2'}})",ctx);
 assert.equal(vm.runInContext("state.model.devices.find(d=>d.id==='d2').volume",ctx),47);
 assert.equal(vm.runInContext("state.model.sessions.find(s=>s.id==='s1').volume",ctx),25);
 await vm.runInContext("onField('dialog-device-volume',{value:'99',dataset:{id:'d4'}})",ctx);
 assert.equal(vm.runInContext("state.model.devices.find(d=>d.id==='d4').volume",ctx),office);
 await vm.runInContext("onField('session',{value:'s2'});onField('dialog-volume',{value:'30',dataset:{id:'s1'}})",ctx);
 assert.equal(vm.runInContext("state.model.devices.find(d=>d.id==='d2').volume",ctx),52);
 assert.equal(vm.runInContext("state.model.sessions.find(s=>s.id==='s1').volume",ctx),30);
 assert.equal(vm.runInContext("state.model.sessions.find(s=>s.id==='s2').volume",ctx),28);
 await vm.runInContext("onAction('close-modal',{dataset:{}});onField('volume',{value:'40'})",ctx);
 assert.equal(vm.runInContext("state.model.devices.find(d=>d.id==='d4').volume",ctx),40);
 assert.equal(vm.runInContext("state.model.sessions.find(s=>s.id==='s1').volume",ctx),30);
});

test('notifications stack, dismiss independently and expire normal messages after eight seconds',async()=>{
 const {ctx,app}=boot();await ready();
 const timers=[];ctx.setTimeout=(fn,delay)=>{const timer={fn,delay,unref(){}};timers.push(timer);return timer};ctx.clearTimeout=()=>{};
 await vm.runInContext("clearToast();toast('First <note>');toast('Second');toast('Problem',{kind:'error'})",ctx);
 assert.equal(vm.runInContext('state.toasts.length',ctx),3);
 assert(app.innerHTML.includes('First &lt;note&gt;'));
 assert.equal(timers.filter(timer=>timer.delay===8000).length,2);
 timers.find(timer=>timer.delay===8000).fn();
 assert.equal(vm.runInContext('state.toasts[0].leaving',ctx),true);
 timers.find(timer=>timer.delay===240).fn();
 assert.equal(vm.runInContext('state.toasts.length',ctx),2);
 assert.equal(vm.runInContext('state.toasts[1].kind',ctx),'error');
 await vm.runInContext("onAction('dismiss-toast',{dataset:{id:state.toasts[1].id}})",ctx);
 assert.equal(vm.runInContext('state.toasts[1].leaving',ctx),true);
});

test('stopped playbacks do not render a player or Playing section; paused playback is explicit',async()=>{
 const {ctx,app}=boot();await ready();
 await vm.runInContext("state.model.sessions.forEach(s=>s.status='stopped');notify()",ctx);
 assert(!app.innerHTML.includes('<footer class="player"'));assert(!app.innerHTML.includes('data-section="playbacks"'));assert(!app.innerHTML.includes('has-player'));
 assert(!app.innerHTML.includes('data-action="source-play"'));
 await vm.runInContext("state.model.sessions[1].status='paused';state.model.selectedSessionId='s1';notify()",ctx);
 assert(app.innerHTML.includes('<footer class="player"'));assert(app.innerHTML.includes('Paused ·'));assert(app.innerHTML.includes('Office'));
 assert.equal(vm.runInContext('currentSession(state.model).id',ctx),'s2');
});
test('player casting uses its actual source after cancelling another source choice',async()=>{
 const {ctx,app}=boot();await ready();
 await vm.runInContext("onAction('source-select',{dataset:{id:'ndr2'}});onAction('close-modal',{dataset:{}});onAction('open-output-picker',{dataset:{}})",ctx);
 assert(app.innerHTML.includes('Play FluxFM on'));
 assert.equal(vm.runInContext('state.speakerPickerFor',ctx),'flux');
});

test('one grouping dialog seeds the device and keeps name and membership drafts across stereo mode',async()=>{
 const {ctx,app}=boot();await ready();
 await vm.runInContext("onAction('device-open',{dataset:{id:'d4'}})",ctx);
 assert(app.innerHTML.indexOf('item-key-functions')<app.innerHTML.indexOf('item-membership'));
 assert(app.innerHTML.indexOf('item-membership')<app.innerHTML.indexOf('detail-tabs'));
 await vm.runInContext("onAction('device-tab',{dataset:{value:'network'}})",ctx);
 assert(app.innerHTML.includes('Add members…'));
 const before=vm.runInContext('JSON.stringify([state.model.groups,state.model.pairs,state.model.sessions])',ctx);
 await vm.runInContext("onAction('start-group-create',{dataset:{id:'d4'}});onField('composite-name',{value:'Office stereo'});onField('member-select',{value:'d5',checked:true});onField('composite-stereo',{checked:true})",ctx);
 assert.equal(vm.runInContext('state.modal.nameDraft',ctx),'Office stereo');
 assert.equal(vm.runInContext('state.modal.leftId',ctx),'d4');
 assert.equal(vm.runInContext('state.modal.rightId',ctx),'d5');
 assert(app.innerHTML.includes('Left · L'));
 await vm.runInContext("onField('composite-stereo',{checked:false});onAction('close-modal',{dataset:{}})",ctx);
 assert.equal(vm.runInContext('JSON.stringify([state.model.groups,state.model.pairs,state.model.sessions])',ctx),before);
 await vm.runInContext("onAction('start-group-create',{dataset:{id:'d4'}});onField('composite-name',{value:'Office stereo'});onField('composite-stereo',{checked:true});onField('composite-left',{value:'d5'});onField('composite-right',{value:'d4'});onAction('composite-create',{dataset:{}})",ctx);
 assert.equal(vm.runInContext('state.model.pairs.at(-1).name',ctx),'Office stereo');
 assert.equal(vm.runInContext('state.model.pairs.at(-1).leftDeviceId',ctx),'d5');
 assert.equal(vm.runInContext('state.model.pairs.at(-1).rightDeviceId',ctx),'d4');
 assert.equal(vm.runInContext('state.view',ctx),'group');
 assert(app.innerHTML.includes('Left · L'));
});
test('group mode supports existing pairs and rejects a stale membership before any mutation',async()=>{
 const {ctx}=boot();await ready();
 await vm.runInContext("dissolveComposite(state.model,'g1');onAction('start-group-create',{dataset:{}});onField('composite-name',{value:'New room'});onField('member-select',{value:'p1',checked:true});onField('member-select',{value:'d3',checked:true});onField('composite-persistent',{checked:false});onAction('composite-create',{dataset:{}})",ctx);
 assert.equal(vm.runInContext('state.model.groups.at(-1).persistent',ctx),false);
 assert.equal(vm.runInContext('state.model.groups.at(-1).name',ctx),'New room');
 assert.equal(vm.runInContext("state.model.groups.at(-1).memberIds.join(',')",ctx),'p1,d3');
 await vm.runInContext("onAction('start-group-create',{dataset:{id:'d4'}});onField('member-select',{value:'d5',checked:true});state.model.devices.find(d=>d.id==='d5').status='offline';onAction('composite-create',{dataset:{}})",ctx);
 assert.equal(vm.runInContext('state.model.groups.length',ctx),1);
 assert.equal(vm.runInContext('state.modal.kind',ctx),'create');
 assert.equal(vm.runInContext('state.toasts.at(-1).kind',ctx),'error');
});

test('presets start compact with direct Once/Twice and reveal configuration only on request',async()=>{
 const {ctx,app}=boot();await ready();
 await vm.runInContext("onAction('device-open',{dataset:{id:'d1'}})",ctx);
 assert(app.innerHTML.includes('preset-compact-grid'));
 assert(!app.innerHTML.includes('data-action="preset-edit"'));
 assert(!app.innerHTML.includes('data-action="button-transfer-open"'));
 const before=vm.runInContext('JSON.stringify(state.model.sessions)',ctx);
 await vm.runInContext("onAction('preset-gesture',{dataset:{id:'d1',value:'double'}})",ctx);
 assert(app.innerHTML.includes('preset-key-name">Evening Jazz'));
 assert.equal(vm.runInContext('JSON.stringify(state.model.sessions)',ctx),before);
 await vm.runInContext("onAction('toggle-preset-details',{dataset:{id:'d1'}})",ctx);
 assert(app.innerHTML.includes('data-action="preset-edit"'));
 assert(app.innerHTML.includes('data-action="button-transfer-open"'));
 await vm.runInContext("onAction('toggle-preset-details',{dataset:{id:'d1'}});onAction('group-open',{dataset:{id:'g1'}})",ctx);
 assert(app.innerHTML.includes('id="preset-device"'));
 await vm.runInContext("onAction('toggle-preset-details',{dataset:{id:'g1'}})",ctx);
 assert(app.innerHTML.includes('id="preset-device"'));
 await vm.runInContext("onAction('group-tab',{dataset:{value:'sound'}})",ctx);
 assert(app.innerHTML.includes('id="group-volume"'));
 assert(app.innerHTML.includes('Volume for Kitchen'));
 assert(app.innerHTML.indexOf('item-key-functions')<app.innerHTML.indexOf('item-membership'));
 await vm.runInContext("onAction('group-tab',{dataset:{value:'advanced'}})",ctx);
 assert(app.innerHTML.includes('data-action="dissolve-group"'));
});

test('capture explicitly selects among simultaneous outputs without redirecting playback',async()=>{
 const {ctx,app}=boot();await ready();
 await vm.runInContext("onAction('preset-edit',{dataset:{id:'d1',gesture:'single'}});onAction('preset-slot',{dataset:{index:'2'}})",ctx);
 assert(app.innerHTML.includes('From playing outputs'));
 assert(app.innerHTML.includes('FluxFM · Downstairs'));
 assert(app.innerHTML.includes('NDR Info · Office'));
 assert(app.innerHTML.includes('Assign FluxFM to key 3'));
 const before=vm.runInContext('JSON.stringify(state.model.sessions)',ctx);
 const player=vm.runInContext('state.model.selectedSessionId',ctx);
 await vm.runInContext("onField('preset-playback',{value:'s2'});onAction('preset-use-current',{dataset:{session:'s2',source:'ndrinfo'}})",ctx);
 assert.equal(vm.runInContext('state.modal.draft[2]',ctx),'ndrinfo');
 assert.equal(vm.runInContext('JSON.stringify(state.model.sessions)',ctx),before);
 assert.equal(vm.runInContext('state.model.selectedSessionId',ctx),player);
 await vm.runInContext("onAction('preset-use-current',{dataset:{session:'s2',source:'flux'}})",ctx);
 assert.equal(vm.runInContext('state.toasts.at(-1).kind',ctx),'error');
 assert.equal(vm.runInContext('state.modal.draft[2]',ctx),'ndrinfo');
});
test('transfer destination tree de-duplicates groups and allows deselecting one member',async()=>{
 const {ctx,app}=boot();await ready();
 await vm.runInContext("onAction('button-transfer-open',{dataset:{id:'d1'}});onField('button-transfer-target',{value:'g1',checked:true})",ctx);
 assert.equal(vm.runInContext("state.modal.targetIds.slice().sort().join(',')",ctx),'d2,d3');
 assert.equal((app.innerHTML.match(/data-field="button-transfer-target" value="d2"/g)||[]).length,1);
 assert(!app.innerHTML.includes('data-field="button-transfer-target" value="d1"'));
 await vm.runInContext("onField('button-transfer-target',{value:'d2',checked:false})",ctx);
 assert.equal(vm.runInContext("state.modal.targetIds.join(',')",ctx),'d3');
 assert(app.innerHTML.includes('aria-checked="mixed"'));
 await vm.runInContext("onField('button-transfer-target',{value:'g1',checked:true});onField('button-transfer-target',{value:'d4',checked:true})",ctx);
 assert.equal(vm.runInContext('state.modal.targetIds.length',ctx),3);
});
