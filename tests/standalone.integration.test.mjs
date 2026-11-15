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
 assert(app.innerHTML.includes('aria-label="Station search and filters"'));
 assert(!app.innerHTML.includes('Quick presets'));
 assert(app.innerHTML.includes('PLAYING'));
 await vm.runInContext("onAction('navigate',{dataset:{value:'outputs'}})",ctx);await ready();
 assert(app.innerHTML.includes('Outputs &amp; playbacks') || app.innerHTML.includes('Outputs & playbacks'));
 await vm.runInContext("onAction('load-scenario',{dataset:{id:'many'}})",ctx);await ready();
 assert.equal(vm.runInContext('state.model.devices.length',ctx),50);
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

test('player media navigation follows the selected source without changing any playback',async()=>{
 const {ctx,app}=boot();await ready();
 const run=code=>vm.runInContext(code,ctx);
 for(const [id,view,server] of [['flux','listen',null],['album1','library','plex'],['discover','spotify',null]]){
  run(`state.model.sessions[0].sourceId=${JSON.stringify(id)};state.model.selectedSessionId='s1';state.view='outputs';notify()`);
  const before=run('JSON.stringify(state.model.sessions)'),target=run('state.model.selectedOutputId');
  assert(app.innerHTML.includes('data-icon="read_more"'));
  assert.equal(run('JSON.stringify(materialIcons.read_more)===JSON.stringify(materialIcons.help)'),false);
  await run(`onAction('player-source',{dataset:{id:${JSON.stringify(id)},session:'s1'}})`);
  assert.equal(run('state.view'),view);
  if(server)assert.equal(run('state.model.ui.libraryServer'),server);
  assert.equal(run('JSON.stringify(state.model.sessions)'),before);
  assert.equal(run('state.model.selectedOutputId'),target);
 }
 run("state.model.libraryQueues=[{id:'library-queue-1',name:'Morning mix',trackIds:['library-track-1']}];notify();state.model.sessions[0].sourceId='library-queue-1';notify()");
 await run("onAction('player-source',{dataset:{id:'library-queue-1',session:'s1'}})");
 assert.equal(run('state.view'),'library');assert(app.innerHTML.includes('Morning mix'));
 await run("onField('session',{value:'s2'})");
 await run("onAction('player-source',{dataset:{id:'library-queue-1',session:'s1'}})");
 assert.equal(run('state.view'),'library');assert.equal(run('state.toasts.at(-1).kind'),'error');
 run("state.model.sessions.find(s=>s.id==='s2').sourceId='native-demo';notify()");
 assert(!app.innerHTML.includes('data-action="player-source"'));
});

test('radio information has an explicit insight action and preserves playback',async()=>{
 const {ctx,app}=boot();await ready();
 assert(app.innerHTML.includes('data-icon="search_insights"'));
 assert.equal(vm.runInContext('JSON.stringify(materialIcons.search_insights)===JSON.stringify(materialIcons.help)',ctx),false);
 const before=vm.runInContext('JSON.stringify(state.model.sessions)',ctx);
 await vm.runInContext("onAction('source-info',{dataset:{id:'flux'}})",ctx);
 assert(app.innerHTML.includes('aria-label="FluxFM"'));
 assert(app.innerHTML.includes('Alternative'));
 assert.equal(vm.runInContext('JSON.stringify(state.model.sessions)',ctx),before);
});

test('range wheel supports mouse and fine touchpad movement with bounds and disabled controls',async()=>{
 const {ctx}=boot();await ready();const run=code=>vm.runInContext(code,ctx);
 run(`var wheelTarget={dataset:{field:'volume'},value:String(currentSession(state.model).volume),min:'0',max:'100',step:'1',disabled:false,focus(){},closest(){return this}};
 var wheelPrevented=0;var wheel=(deltaY,extras={})=>onRangeWheel({target:wheelTarget,deltaX:0,deltaY,deltaMode:0,preventDefault(){wheelPrevented++},...extras});`);
 const start=run('currentSession(state.model).volume'),other=run('JSON.stringify(state.model.sessions[1])');
 run('wheel(-100)');assert.equal(run('currentSession(state.model).volume'),start+1);
 run('wheel(10);wheel(10);wheel(10)');assert.equal(run('currentSession(state.model).volume'),start+1);
 run('wheel(10)');assert.equal(run('currentSession(state.model).volume'),start);
 run('wheel(0,{deltaX:40})');assert.equal(run('currentSession(state.model).volume'),start+1);
 run("setOutputVolume(state.model,currentSession(state.model).targetId,100);wheelTarget.value='100';wheel(-100)");
 assert.equal(run('currentSession(state.model).volume'),100);
 run("setOutputVolume(state.model,currentSession(state.model).targetId,0);wheelTarget.value='0';wheel(3,{deltaMode:1})");
 assert.equal(run('currentSession(state.model).volume'),0);
 const prevented=run('wheelPrevented');
 run('wheelTarget.disabled=true;wheel(-100);wheelTarget.disabled=false;wheel(-100,{ctrlKey:true})');
 assert.equal(run('currentSession(state.model).volume'),0);assert.equal(run('wheelPrevented'),prevented);
 assert.equal(run('JSON.stringify(state.model.sessions[1])'),other);
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
 assert(app.innerHTML.includes('Enter a name'));
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

test('player output picker can join a member and keeps its bound playback when player selection changes',async()=>{
 const {ctx,app}=boot();await ready();const before=vm.runInContext('JSON.stringify(state.model)',ctx);
 await vm.runInContext("onAction('open-output-picker',{dataset:{}})",ctx);
 assert(app.innerHTML.includes('As member'));assert.equal(vm.runInContext('state.modal.asMember',ctx),false);
 await vm.runInContext("onField('picker-as-member',{checked:true});onAction('close-modal',{dataset:{}})",ctx);
 assert.equal(vm.runInContext('JSON.stringify(state.model)',ctx),before);
 await vm.runInContext("onAction('open-output-picker',{dataset:{}});onField('picker-as-member',{checked:true});onField('session',{value:'s2'});onAction('assign-output',{dataset:{id:'d5'}})",ctx);
 assert.equal(vm.runInContext("state.model.groups[0].memberIds.includes('d5')",ctx),true);
 assert.equal(vm.runInContext("state.model.sessions.find(s=>s.id==='s1').sourceId",ctx),'flux');
 assert.equal(vm.runInContext('state.model.sessions.length',ctx),2);
 assert.equal(vm.runInContext('state.model.selectedSessionId',ctx),'s1');
});
test('unchecked player casting stays independent and list pickers offer the same membership option',async()=>{
 const {ctx,app}=boot();await ready();
 await vm.runInContext("onAction('open-output-picker',{dataset:{}});onAction('assign-output',{dataset:{id:'d5'}})",ctx);
 assert.equal(vm.runInContext('state.model.sessions.length',ctx),3);assert.equal(vm.runInContext('state.model.groups.length',ctx),1);
 assert.equal(vm.runInContext('state.toasts.at(-1).message',ctx),'Playing FluxFM on Terrace L');
 await vm.runInContext("onAction('source-select',{dataset:{id:'ndr2'}})",ctx);
 assert(app.innerHTML.includes('data-field="picker-as-member"'));
 await vm.runInContext("onAction('assign-output',{dataset:{id:'d5'}})",ctx);
 assert.equal(vm.runInContext('state.toasts.at(-1).message',ctx),'Playing NDR 2 on Terrace L');
 await vm.runInContext("onAction('source-play',{dataset:{id:'flux',target:'d5'}})",ctx);
 assert.equal(vm.runInContext('state.toasts.at(-1).message',ctx),'Playing FluxFM on Terrace L');
});
test('stale member joins fail without changing topology or playback',async()=>{
 const {ctx}=boot();await ready();
 await vm.runInContext("onAction('open-output-picker',{dataset:{}});onField('picker-as-member',{checked:true});state.model.sessions.find(s=>s.id==='s1').status='stopped'",ctx);
 const before=vm.runInContext('JSON.stringify(state.model)',ctx);
 await vm.runInContext("onAction('assign-output',{dataset:{id:'d5'}})",ctx);
 assert.equal(vm.runInContext('JSON.stringify(state.model)',ctx),before);assert.equal(vm.runInContext('state.modal.kind',ctx),'picker');
 assert.equal(vm.runInContext('state.toasts.at(-1).kind',ctx),'error');
});

test('list Choose output joins the player output and explicitly applies the selected source to the whole group',async()=>{
 const {ctx,app}=boot();await ready();
 await vm.runInContext("onAction('source-select',{dataset:{id:'ndr2'}});onField('picker-as-member',{checked:true})",ctx);
 assert(app.innerHTML.includes('FluxFM on Downstairs will be replaced by NDR 2 for the whole output.'));
 await vm.runInContext("onAction('assign-output',{dataset:{id:'d5'}})",ctx);
 assert.equal(vm.runInContext("state.model.groups[0].memberIds.includes('d5')",ctx),true);
 assert.equal(vm.runInContext("state.model.sessions.find(s=>s.id==='s1').sourceId",ctx),'ndr2');
 assert.equal(vm.runInContext("state.model.sessions.find(s=>s.id==='s2').sourceId",ctx),'ndrinfo');
 assert(vm.runInContext('state.toasts.at(-1).message',ctx).includes('NDR 2 on Downstairs'));
});
test('list picker shows disabled membership when no current playback exists',async()=>{
 const {ctx,app}=boot();await ready();
 await vm.runInContext("state.model.sessions.forEach(s=>s.status='stopped');onAction('source-select',{dataset:{id:'flux'}})",ctx);
 assert(app.innerHTML.includes('data-field="picker-as-member"  disabled'));
 assert(app.innerHTML.includes('Start or select a playback to join.'));
 await vm.runInContext("onAction('assign-output',{dataset:{id:'d5'}})",ctx);
 assert.equal(vm.runInContext("state.model.sessions.find(s=>s.targetId==='d5').status",ctx),'playing');
});

test('group gear drafts persistence, main speaker and remote group keys without affecting playback',async()=>{
 const {ctx,app}=boot();await ready();
 await vm.runInContext("onAction('group-open',{dataset:{id:'g1'}})",ctx);
 assert(app.innerHTML.includes('Group Members'));assert(app.innerHTML.includes('data-action="group-settings"'));assert(!app.innerHTML.includes('data-field="group-persistent"'));
 const before=vm.runInContext('JSON.stringify(state.model)',ctx);
 await vm.runInContext("onAction('group-settings',{dataset:{id:'g1'}});onField('group-settings-persistent',{checked:false});onAction('close-modal',{dataset:{}})",ctx);
 assert.equal(vm.runInContext('JSON.stringify(state.model)',ctx),before);
 const sessions=vm.runInContext('JSON.stringify(state.model.sessions)',ctx);
 await vm.runInContext("onAction('group-settings',{dataset:{id:'g1'}});onField('group-settings-persistent',{checked:false});onField('group-settings-leader',{value:'d3'});onField('group-settings-receiver',{value:'d4'});onField('group-settings-key',{checked:true,dataset:{key:'thumbsUp'}});onAction('group-settings-save',{dataset:{}})",ctx);
 assert.equal(vm.runInContext('state.model.groups[0].persistent',ctx),false);assert.equal(vm.runInContext('state.model.groups[0].leaderDeviceId',ctx),'d3');
 assert.equal(vm.runInContext("entity(state.model,'d4').groupKeys.bindings.thumbsUp",ctx),'g1');assert.equal(vm.runInContext('JSON.stringify(state.model.sessions)',ctx),sessions);
 await vm.runInContext("onAction('device-rename',{dataset:{id:'g1'}});onField('device-name',{value:'Evening'});onAction('device-rename-save',{dataset:{}})",ctx);
 assert.equal(vm.runInContext('state.model.groups[0].name',ctx),'Evening');assert(app.innerHTML.includes('Temporary'));
});

test('update events create one linked toast per availability/version and never install on navigation',async()=>{
 const {ctx,app}=boot();await ready();
 await vm.runInContext("loadScenario('update-notifications',false,true)",ctx);await ready();
 assert.equal(vm.runInContext("state.toasts.filter(t=>t.kind==='update').length",ctx),1);
 assert(app.innerHTML.includes('Updates &amp; maintenance'));assert(app.innerHTML.includes('Office'));assert(app.innerHTML.includes('27.0.7'));assert(app.innerHTML.includes('1.6.3'));
 assert.equal(vm.runInContext("state.toasts.find(t=>t.kind==='update').duration",ctx),8000);
 await vm.runInContext("onAction('check-updates',{dataset:{}});onAction('check-updates',{dataset:{}});onAction('navigate',{dataset:{value:'listen'}})",ctx);
 assert.equal(vm.runInContext("state.toasts.filter(t=>t.kind==='update').length",ctx),1);
 await vm.runInContext("onAction('open-updates-notice',{dataset:{id:state.toasts.find(t=>t.kind==='update').id}})",ctx);
 assert.equal(vm.runInContext('state.view',ctx),'updates');assert(app.innerHTML.includes('aria-label="Update available"'));assert(app.innerHTML.includes('data-icon="release_alert"'));assert(app.innerHTML.includes(' · 1.6.3'));
 assert.equal(vm.runInContext('state.model.devices.some(d=>d.status===\'updating\')',ctx),false);
 assert.equal(vm.runInContext('state.model.ui.collapsed.system',ctx),false);
 assert.equal(vm.runInContext('state.model.appUpdate.version',ctx),'1.6.3');
 await vm.runInContext("mutate(s=>s.model.appUpdate.version='1.6.4')",ctx);
 assert.equal(vm.runInContext("state.toasts.filter(t=>t.kind==='update'&&!t.leaving).length",ctx),1);assert(app.innerHTML.includes('1.6.4'));
 await vm.runInContext("clearToast();onAction('check-updates',{dataset:{}})",ctx);assert.equal(vm.runInContext('state.toasts.length',ctx),0);
 await vm.runInContext("mutate(s=>s.model.appUpdate.available=false);mutate(s=>s.model.appUpdate.available=true)",ctx);assert.equal(vm.runInContext('state.toasts.length',ctx),1);
 await vm.runInContext("loadScenario('update-notifications',false,true)",ctx);assert.equal(vm.runInContext("state.toasts.filter(t=>t.kind==='update').length",ctx),1);
});

test('Add to existing group reviews playback, cancels safely and binds the selected item',async()=>{
 const {ctx,app}=boot();await ready();await vm.runInContext("onAction('device-open',{dataset:{id:'d4'}})",ctx);
 assert(app.innerHTML.includes('Add to existing group'));const before=vm.runInContext('JSON.stringify(state.model)',ctx);
 await vm.runInContext("onAction('add-to-group',{dataset:{id:'d4'}});onAction('membership-choice',{dataset:{id:'g1'}})",ctx);
 assert(app.innerHTML.includes('Replaces NDR Info'));assert.equal(vm.runInContext('JSON.stringify(state.model)',ctx),before);
 await vm.runInContext("onAction('close-modal',{dataset:{}})",ctx);assert.equal(vm.runInContext('JSON.stringify(state.model)',ctx),before);
 await vm.runInContext("onAction('add-to-group',{dataset:{id:'d4'}});onAction('membership-choice',{dataset:{id:'g1'}});state.detailDeviceId='d7';onAction('membership-save',{dataset:{}})",ctx);
 assert.equal(vm.runInContext('state.view',ctx),'group');assert.equal(vm.runInContext('state.detailOutputId',ctx),'g1');assert(vm.runInContext("entity(state.model,'g1').memberIds.includes('d4')",ctx));assert(!vm.runInContext("entity(state.model,'g1').memberIds.includes('d7')",ctx));
 await vm.runInContext("onAction('add-member',{dataset:{id:'g1'}});onAction('membership-choice',{dataset:{id:'d7'}});onAction('membership-save',{dataset:{}})",ctx);
 assert(vm.runInContext("entity(state.model,'g1').memberIds.includes('d7')",ctx));assert.equal(vm.runInContext('state.model.sessions.length',ctx),1);
});

test('transfer overwrite is explicit, cancellable and shows the cleared key in review and results',async()=>{
 const {ctx,app}=boot();await ready();
 await vm.runInContext("state.model.devices[0].presets=['flux'];state.model.devices[0].doublePresets=[];state.model.devices.find(d=>d.id==='d5').presets=['ndrinfo',null,'flux'];state.model.devices.find(d=>d.id==='d5').doublePresets=[];onAction('button-transfer-open',{dataset:{id:'d1'}});onField('button-transfer-target',{value:'d5',checked:true})",ctx);
 assert.equal(vm.runInContext('state.modal.overwrite',ctx),false);
 assert(app.innerHTML.includes('Whole-set transfer refused'));
 const before=vm.runInContext('JSON.stringify(state.model)',ctx);
 await vm.runInContext("onField('button-transfer-overwrite',{checked:true})",ctx);
 assert(app.innerHTML.includes('previous key will be cleared'));
 assert(app.innerHTML.includes('NDR Info → FluxFM'));
 assert.equal(vm.runInContext('JSON.stringify(state.model)',ctx),before);
 await vm.runInContext("onAction('close-modal',{dataset:{}});onAction('button-transfer-open',{dataset:{id:'d1'}})",ctx);
 assert.equal(vm.runInContext('state.modal.overwrite',ctx),false);
 assert.equal(vm.runInContext('JSON.stringify(state.model)',ctx),before);
 await vm.runInContext("onField('button-transfer-target',{value:'d5',checked:true});onField('button-transfer-overwrite',{checked:true});onAction('button-transfer-save',{dataset:{}})",ctx);
 assert(app.innerHTML.includes('previous key cleared'));
 assert.equal(vm.runInContext("state.model.devices.find(d=>d.id==='d5').presets[0]",ctx),'flux');
 assert.equal(vm.runInContext("state.model.devices.find(d=>d.id==='d5').presets[2]",ctx),null);
});

test('scenario selection restores fixtures and older Everyday snapshots refresh once on load',async()=>{
 const {ctx}=boot();await ready();
 await vm.runInContext("state.model.groups.push({id:'old-group',name:'Old nested room',memberIds:[]});delete state.model.fixtureRevision;localStorage.setItem('streborn-lab:home',JSON.stringify(state.model));loadScenario('home',true)",ctx);
 assert.equal(vm.runInContext('state.model.fixtureRevision',ctx),2);
 assert.equal(vm.runInContext('state.model.devices.length',ctx),9);
 assert.equal(vm.runInContext('state.model.groups.length',ctx),1);
 assert.equal(vm.runInContext("JSON.parse(localStorage.getItem('streborn-lab:home')).fixtureRevision",ctx),2);
 await vm.runInContext("state.model.devices[0].name='Session edit';save();loadScenario('home',true)",ctx);
 assert.equal(vm.runInContext('state.model.devices[0].name',ctx),'Session edit');
 await vm.runInContext("onField('scenario',{value:'home'})",ctx);
 assert.equal(vm.runInContext('state.model.devices[0].name',ctx),'Living Room L');
 await vm.runInContext("state.model.devices[0].name='Another edit';save();onAction('load-scenario',{dataset:{id:'home'}})",ctx);
 assert.equal(vm.runInContext('state.model.devices[0].name',ctx),'Living Room L');
});

test('library settings save drafts per scenario, cancel removals and survive reload',async()=>{
 const {ctx,app}=boot();await ready();
 const run=code=>vm.runInContext(code,ctx);
 await run("onAction('library-settings',{dataset:{}})");
 await run("onField('library-name',{value:'Office NAS'})");
 await run("onField('library-address',{value:'192.168.0.50:8200'})");
 await run("onAction('library-add',{dataset:{}})");
 assert.equal(run('state.modal.servers.length'),1);
 assert.equal(run('state.model.libraryServers?.length||0'),0);
 await run("onAction('close-modal',{dataset:{}})");
 await run("onAction('library-settings',{dataset:{}})");
 assert.equal(run('state.modal.servers.length'),0);
 await run("onField('library-name',{value:'Office NAS'})");
 await run("onField('library-address',{value:'192.168.0.50:8200'})");
 await run("onAction('library-add',{dataset:{}})");
 await run("onField('library-discovered',{checked:false})");
 await run("onAction('library-settings-save',{dataset:{}})");
 await run("loadScenario('home')");
 assert.equal(run('state.model.libraryServers[0].name'),'Office NAS');
 assert.equal(run('state.model.settings.showDiscoveredLibraries'),false);
 await run("onAction('navigate',{dataset:{value:'library'}})");
 assert(app.innerHTML.includes('Office NAS'));assert(!app.innerHTML.includes('data-id="nas1"'));
 await run("onAction('library-settings',{dataset:{}})");
 await run("onAction('library-remove',{dataset:{id:'manual-library-1'}})");
 await run("onAction('close-modal',{dataset:{}})");
 assert.equal(run('state.model.libraryServers.length'),1);
});

test('group alarm actions keep their member binding and validate capabilities again',async()=>{
 const {ctx,app}=boot();await ready();
 const run=code=>vm.runInContext(code,ctx);
 await run("onAction('group-open',{dataset:{id:'g1'}})");
 await run("onAction('group-tab',{dataset:{value:'functions'}})");
 assert.equal(run('state.model.ui.groupTab'),'functions');
 assert(app.innerHTML.includes('Manage alarms'));
 await run("onAction('alarms',{dataset:{id:'d3'}})");
 assert.equal(run('state.modal.title'),'Alarms · Kitchen');
 assert.equal(run('state.view'),'group');assert.equal(run('state.detailOutputId'),'g1');
 assert(app.innerHTML.includes('not connected in this UI Lab'));
 await run("onAction('close-modal',{dataset:{}});state.model.devices.find(d=>d.id==='d3').capabilities.alarms=false;onAction('alarms',{dataset:{id:'d3'}})");
 assert.equal(run('state.modal'),null);
 assert.equal(run('state.toasts.at(-1).kind'),'error');
});

test('desktop sidebar preference persists independently of scenario and mobile navigation',async()=>{
 const {ctx}=boot();await ready();const run=code=>vm.runInContext(code,ctx);
 const before=run('JSON.stringify(state.model.sessions)');
 await run("onAction('toggle-sidebar',{dataset:{}})");
 assert.equal(run('state.designTokens.sidebarCollapsed'),true);
 assert.equal(run("JSON.parse(localStorage.getItem('streborn-lab:design')).sidebarCollapsed"),true);
 assert.equal(run('JSON.stringify(state.model.sessions)'),before);
 await run("loadScenario('nested-groups',false,true)");
 assert.equal(run('state.designTokens.sidebarCollapsed'),true);
 await run("onAction('toggle-sidebar-mobile',{dataset:{}})");
 assert.equal(run('state.sidebarOpen'),true);
 assert.equal(run('state.designTokens.sidebarCollapsed'),true);
 await run('initialize()');
 assert.equal(run('state.designTokens.sidebarCollapsed'),true);
 await run("onAction('toggle-sidebar',{dataset:{}})");
 assert.equal(run('state.designTokens.sidebarCollapsed'),false);
});

test('Playing transport toggles an independent stream without selecting it or navigating',async()=>{
 const {ctx,app}=boot();await ready();const run=code=>vm.runInContext(code,ctx);
 const before=run('JSON.stringify({view:state.view,selected:state.model.selectedSessionId,other:state.model.sessions.find(s=>s.id==="s1")})');
 assert(app.innerHTML.includes('session-card__transport-icon'));
 assert(!app.innerHTML.includes('<button type="button" class="session-card '));
 await run("onAction('toggle-output-playback',{dataset:{id:'s2'}})");
 assert.equal(run("state.model.sessions.find(s=>s.id==='s2').status"),'paused');
 assert(app.innerHTML.includes('Resume NDR Info on Office'));
 assert.equal(run('JSON.stringify({view:state.view,selected:state.model.selectedSessionId,other:state.model.sessions.find(s=>s.id==="s1")})'),before);
 await run("onAction('toggle-output-playback',{dataset:{id:'s2'}})");
 assert.equal(run("state.model.sessions.find(s=>s.id==='s2').status"),'playing');
 await run("onAction('select-session',{dataset:{id:'s2'}})");
 assert.equal(run('state.view'),'device');assert.equal(run('state.detailDeviceId'),'d4');
});

test('Update all starts only ready online speakers and retains running progress and other state',async()=>{
 const {ctx,app}=boot();await ready();const run=code=>vm.runInContext(code,ctx);
 await run("state.model.devices.forEach(d=>{d.firmwareAvailable=false});state.model.devices[0].firmwareAvailable=true;state.model.devices[1].firmwareAvailable=true;state.model.devices[1].status='offline';state.model.devices[2].firmwareAvailable=true;state.model.devices[2].status='updating';state.model.devices[2].updateProgress=45;state.model.devices[3].firmwareAvailable=true;onAction('navigate',{dataset:{value:'updates'}})");
 assert(app.innerHTML.includes('Update all (2)'));
 const before=run('JSON.stringify(state.model.sessions)');
 await run("onAction('update-all',{dataset:{}})");
 assert.equal(run('state.model.devices[0].updateProgress'),5);
 assert.equal(run('state.model.devices[3].status'),'updating');
 assert.equal(run('state.model.devices[1].status'),'offline');
 assert.equal(run('state.model.devices[2].updateProgress'),45);
 assert.equal(run('JSON.stringify(state.model.sessions)'),before);
 await run("onAction('update-all',{dataset:{}})");
 assert.equal(run('state.model.devices[2].updateProgress'),45);
 for(let i=0;i<4;i++)await run("onAction('advance-updates',{dataset:{}})");
 assert.equal(run('state.model.devices[0].firmwareAvailable'),false);
 assert.equal(run('state.model.devices[0].firmware'),run('state.model.devices[0].firmwareLatest'));
 assert.equal(run('state.model.devices[1].firmwareAvailable'),true);
});

test('library search persists multiple queues, projects typed sources and isolates cancelled drafts',async()=>{
 const {ctx,app}=boot();await ready();const run=code=>vm.runInContext(code,ctx);
 await run("onAction('navigate',{dataset:{value:'library'}});onAction('library-search',{dataset:{}})");
 await run("onField('library-track',{value:'library-track-1',checked:true});onField('library-track',{value:'library-track-7',checked:true});onField('library-new-queue',{value:'Morning'});onAction('library-queue-draft-add',{dataset:{}});onField('library-new-queue',{value:'Evening'});onAction('library-queue-draft-add',{dataset:{}})");
 assert.equal(run('state.model.libraryQueues?.length||0'),0);
 await run("onField('library-query',{value:'No match'})");
 assert.equal(run('state.modal.trackIds.length'),2);
 await run("onAction('library-queue-append',{dataset:{}})");
 assert.equal(run('state.model.libraryQueues.length'),2);
 assert.equal(run('state.modal.kind'),'library-search');assert.equal(run('state.modal.trackIds.length'),0);assert.equal(run('state.modal.queueIds.length'),2);
 assert.equal(run("state.catalog.sources.filter(s=>s.origin==='saved-library-queue').length"),2);
 await run("onField('library-track',{value:'library-track-2',checked:true});onAction('library-queue-append',{dataset:{}})");
 assert.equal(run('state.model.libraryQueues[0].trackIds.length'),3);assert.equal(run('state.model.libraryQueues[1].trackIds.length'),3);
 await run("onAction('library-queue-open',{dataset:{id:'library-queue-1'}});onAction('library-queue-move',{dataset:{index:'0',value:'1'}});onField('library-queue-name',{value:'My mix'});onAction('library-queue-save',{dataset:{}})");
 assert.equal(run('state.model.libraryQueues[0].trackIds[0]'),'library-track-7');
 await run("onAction('preset-edit',{dataset:{id:'d4',gesture:'single'}});onAction('preset-slot',{dataset:{index:'2'}});onAction('preset-source-choose',{dataset:{id:'library-queue-1'}});onAction('preset-save',{dataset:{}})");
 assert.equal(run('state.model.devices[3].presets[2]'),'library-queue-1');
 await run("onAction('source-select',{dataset:{id:'library-queue-1'}});onAction('assign-output',{dataset:{id:'d7'}})");
 assert.equal(run("state.model.sessions.some(s=>s.targetId==='d7'&&s.sourceId==='library-queue-1')"),true);
 await run("loadScenario('home')");
 assert.equal(run('state.model.libraryQueues[0].name'),'My mix');
 assert.equal(run("state.catalog.sources.find(s=>s.id==='library-queue-1').name"),'My mix');
 await run("onAction('library-search',{dataset:{}});onField('library-new-queue',{value:'Cancelled'});onAction('library-queue-draft-add',{dataset:{}});onAction('close-modal',{dataset:{}})");
 assert.equal(run('state.model.libraryQueues.length'),2);
 await run("loadScenario('many',false,true)");
 assert.equal(run("state.catalog.sources.some(s=>s.origin==='saved-library-queue')"),false);
});

test('release notes bind firmware/application and version without installing an update',async()=>{
 const {ctx,app}=boot();await ready();const run=code=>vm.runInContext(code,ctx);
 await run("state.model.devices[0].firmware='1.0';state.model.devices[0].firmwareLatest='2.0';state.model.devices[0].firmwareReleaseNotes=[{version:'2.0',body:'<script>unsafe</script>',changes:['Latest change'],url:'javascript:alert(1)'},{version:'1.0',body:'Earlier release'}];onAction('release-notes',{dataset:{id:'d1'}})");
 assert.equal(run('state.modal.version'),'2.0');assert(app.innerHTML.includes('&lt;script&gt;unsafe'));assert(!app.innerHTML.includes('href="javascript:'));
 await run("onField('release-note-version',{value:'1.0'})");assert(app.innerHTML.includes('Earlier release'));
 assert.equal(run('state.model.devices[0].firmware'),'1.0');
 await run("state.model.appUpdate={currentVersion:'1.6.2',version:'1.6.3',releaseNotes:{version:'1.6.3',changes:['Application change']}};onAction('release-notes',{dataset:{id:'application'}})");
 assert(app.innerHTML.includes('Application change'));assert(app.innerHTML.includes('ST Reborn application'));
 await run("onField('release-note-version',{value:'1.6.2'})");assert(app.innerHTML.includes('No release notes supplied'));
});
