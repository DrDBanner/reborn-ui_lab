import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderListen} from '../src/views/listen.js';
import {renderOutputs,renderGroup} from '../src/views/outputs.js';
import {renderDevice,renderUpdates,renderSettings,renderSetup,renderHelp} from '../src/views/management.js';
import {renderLab} from '../src/views/lab.js';
import {renderSessions} from '../src/views/sessions.js';
import {sidebar,header,player} from '../src/components/shell.js';
import {renderDialog} from '../src/components/dialog.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public/data');
const scenarios=JSON.parse(fs.readFileSync(path.join(root,'scenario-index.json'),'utf8'));
const catalog=JSON.parse(fs.readFileSync(path.join(root,'catalog.json'),'utf8'));
const tokens=JSON.parse(fs.readFileSync(path.join(root,'design-tokens.json'),'utf8'));
const renderers={listen:renderListen,library:renderListen,history:renderListen,spotify:renderListen,outputs:renderOutputs,group:renderGroup,device:renderDevice,updates:renderUpdates,settings:renderSettings,setup:renderSetup,help:renderHelp,lab:renderLab,sessions:renderSessions};
test('player displays only available track metadata for the selected playback',()=>{
 const model=JSON.parse(fs.readFileSync(path.join(root,'scenarios/home.json'),'utf8'));
 const s={model,catalog};model.selectedSessionId='s1';delete model.sessions[0].nowPlaying;
 assert(!player(s).includes('class="player__now"'));
 model.sessions[0].nowPlaying={title:'A long title <live>',artist:'Artist & guests',album:'An album'};
 let html=player(s);assert(html.includes('player--metadata'));assert(html.includes('A long title &lt;live&gt;'));assert(html.includes('Artist &amp; guests · An album'));assert(html.includes('aria-label="Now playing"'));
 model.selectedSessionId='s2';assert(!player(s).includes('class="player__now"'));
 model.sessions[1].nowPlaying={artist:'Only artist',album:' '};html=player(s);assert(html.includes('Only artist'));assert(!html.includes('Only artist ·'));
 delete model.sessions[1].nowPlaying;model.sessions[1].sourceId='track-demo';html=player(s);assert(html.includes('Mira Lane'));assert(html.includes('Morning Light'));assert(html.includes('Notes from the Window Seat'));
 model.sessions[1].sourceId='album1';assert(!player(s).includes('class="player__now"'),'A queue must not pretend that its first track is playing');
});
test('station playlist button is offered only for a radio source with a supplied playlist',()=>{
 const model=JSON.parse(fs.readFileSync(path.join(root,'scenarios/home.json'),'utf8'));
 const s={model,catalog};model.selectedSessionId='s1';assert(player(s).includes('data-action="station-playlist"'));
 s.modal={kind:'station-playlist',sourceId:'flux',title:'FluxFM · Playlist'};
 const html=renderDialog(s);assert(html.includes('Sample playlist'));assert(html.includes('10:42'));assert(html.includes('The Long Way Home'));assert(html.includes('role="dialog"'));
 model.selectedSessionId='s2';assert(!player(s).includes('data-action="station-playlist"'));
});
test('radio rows show quiet metadata capabilities only when reported',()=>{
 const model=JSON.parse(fs.readFileSync(path.join(root,'scenarios/home.json'),'utf8'));
 const s={model,catalog,view:'listen',filter:''};
 const html=renderListen(s);assert(html.includes('data-icon="track_changes"'));assert(html.includes('Track information supported'));assert(html.includes('View station playlist for FluxFM'));
 const unknown=renderListen({...s,catalog:{...catalog,sources:[catalog.sources.find(item=>item.id==='ndrinfo')]}});
 assert(!unknown.includes('Track information supported'));assert(!unknown.includes('data-action="station-playlist"'));
});
test('output card order survives playback changes and filtering within the workspace',()=>{
 const model=JSON.parse(fs.readFileSync(path.join(root,'scenarios/home.json'),'utf8'));
 const s={model,catalog,outputSearch:''};
 const ids=()=>[...renderOutputs(s).matchAll(/data-output-id="([^"]+)"/g)].map(match=>match[1]);
 const before=ids();
 model.sessions.forEach(session=>session.status='stopped');
 model.sessions.push({id:'new-playback',targetId:'d7',sourceId:'fluxfm',status:'playing'});
 assert.deepEqual(ids(),before);
 s.outputSearch='Terrace';assert.deepEqual(ids(),before.filter(id=>['d5','d6'].includes(id)));
 s.outputSearch='';assert.deepEqual(ids(),before);
 s.outputCardOrder=null;assert.equal(ids()[0],'d7');
});
for(const scenario of scenarios){
 const model=JSON.parse(fs.readFileSync(path.join(root,'scenarios',`${scenario.id}.json`),'utf8'));
 test(`all views render under scenario ${scenario.id}`,()=>{
  const s={model,catalog,scenarioIndex:scenarios,scenarioId:scenario.id,detailDeviceId:model.devices[0]?.id,detailOutputId:model.groups[0]?.id||model.pairs[0]?.id,setupStep:0,setupSelection:null,designTokens:tokens,filter:'',outputSearch:'',selectedForComposite:[],sidebarOpen:false,expandingOutputs:false,speakerPickerFor:null,scenarioEditorOpen:false,modal:null,toast:null};
  for(const view of Object.keys(renderers)){
   s.view=view;const html=renderers[view](s);assert.equal(typeof html,'string');assert(html.length>20,`empty ${view}`);
   assert(!html.includes('undefined<'),`visible undefined in ${view}`);
  }
  assert(sidebar(s).length>300);
  assert(header(s).length>100);
  assert.equal(player(s).length>100,model.sessions.some(item=>item.status==='playing'||item.status==='paused'));
  for(const modal of [{kind:'picker'},{kind:'create',type:'pair'},{kind:'create',type:'group'},{kind:'preset',deviceId:model.devices[0]?.id,gesture:'single'},{kind:'wifi'},{kind:'maintenance'},{kind:'generic',title:'Hello'}]){
   s.modal=modal;const html=renderDialog(s);assert(html.length>120);
  }
 });
}

test('item identity and capabilities are independent of device brand',()=>{
 const model=JSON.parse(fs.readFileSync(path.join(root,'scenarios/capabilities.json'),'utf8'));
 const s={model,catalog,designTokens:tokens,detailDeviceId:'d11',presetGesture:'double'};
 model.ui.deviceTab='functions';
 const noButtons=renderDevice(s);
 assert(!noButtons.includes('data-action="preset-edit"'));
 assert(!noButtons.includes('data-value="functions"'));
 assert(noButtons.includes('Example Audio'));
 assert(noButtons.includes('Hardware revision'));
 s.detailDeviceId='d12';model.ui.deviceTab='functions';
 const compact=renderDevice(s);
 assert(compact.includes('data-key="2"'));
 assert(!compact.includes('data-key="3"'));
 assert(!compact.includes('data-value="double"'));
 s.detailDeviceId='d1';
 assert(renderDevice(s).includes('data-value="double"'));
});

test('System contains only updates and setup; app preferences stay in the logo menu',()=>{
 const model=JSON.parse(fs.readFileSync(path.join(root,'scenarios/home.json'),'utf8'));
 const uiLayout=JSON.parse(fs.readFileSync(path.join(root,'ui-layout.json'),'utf8'));
 model.ui.collapsed.system=false;
 for(const layout of [undefined,uiLayout]){
  const html=sidebar({model,catalog,uiLayout:layout,expandingOutputs:false,designTokens:tokens});
  assert(html.includes('data-value="updates"'));
  assert(html.includes('data-value="setup"'));
  assert(!html.includes('data-value="settings"'));
  assert(!html.includes('data-value="help"'));
  assert(!html.includes('data-value="lab"'));
 }
});


test('sidebar marks only the current route, never the unrelated player or stale detail',()=>{
 const model=JSON.parse(fs.readFileSync(path.join(root,'scenarios/home.json'),'utf8'));
 const s={model,catalog,designTokens:tokens,detailDeviceId:'d4',detailOutputId:'g1'};
 for(const variant of ['sidebar','panel'])for(const collapsed of [true,false])for(const view of Object.keys(renderers)){
  model.ui.speakerVariant=variant;model.ui.collapsed={listen:collapsed,outputs:collapsed,system:collapsed,playbacks:collapsed};s.view=view;
  for(const scope of ['all','active']){
   model.ui.outputScope=scope;const html=sidebar(s);
   assert.equal((html.match(/aria-current="page"/g)||[]).length,1,`${variant} ${collapsed} ${view} ${scope}`);
   assert(!html.includes('session-card is-selected'));
  }
 }
});

test('button presets remain above device tabs across all configuration sections',()=>{
 const model=JSON.parse(fs.readFileSync(path.join(root,'scenarios/home.json'),'utf8'));
 const s={model,catalog,detailDeviceId:'d1',presetGesture:'double',expandedPresetTargetId:'d1'};
 for(const tab of ['overview','sound','network','functions','advanced']){
  model.ui.deviceTab=tab;const html=renderDevice(s);
  assert(html.indexOf('item-key-functions')<html.indexOf('class="detail-tabs"'));
  assert.equal((html.match(/<h2>Button presets<\/h2>/g)||[]).length,1);
  assert(html.includes('data-action="preset-edit" data-id="d1" data-gesture="double"'));
 }
 s.detailOutputId='g1';s.presetDeviceId='d3';s.expandedPresetTargetId='g1';
 const group=renderGroup(s);
 assert(group.indexOf('item-key-functions')<group.indexOf('<h2>Group Members</h2>'));
 assert(group.includes('data-field="preset-device" data-id="g1"'));
 assert(group.includes('value="d3" selected'));
 s.detailOutputId='p1';s.presetDeviceId='d4';s.expandedPresetTargetId='p1';
 const pair=renderGroup(s);
 assert(pair.includes('Living Room L')&&pair.includes('Plays on Downstairs'));
 assert(!pair.includes('Assignments on Office.'));
});

test('output overview separates logical outputs from physical devices without repeated page headings',()=>{
 const model=JSON.parse(fs.readFileSync(path.join(root,'scenarios/home.json'),'utf8'));
 const s={model,catalog,outputSearch:'',selectedForComposite:[]};
 let html=renderOutputs(s);
 assert(!html.includes('<h1>'));assert(!html.includes('Use output'));assert(!html.includes('summary-strip'));
 assert.equal((html.match(/<article class="target-card output-card"/g)||[]).length,6);
 assert(!html.includes('Details for Living Room L'));
 model.ui.outputView='devices';html=renderOutputs(s);
 assert.equal((html.match(/<article class="target-card output-card"/g)||[]).length,9);
 assert(html.includes('Details for Living Room L'));assert(!html.includes('Details for Downstairs'));
});

test('Playing section is hidden when there is no playback',()=>{
 const model=JSON.parse(fs.readFileSync(path.join(root,'scenarios/home.json'),'utf8'));model.sessions=[];
 const html=sidebar({model,catalog,view:'listen',designTokens:tokens});
 assert(!html.includes('data-section="playbacks"'));assert(!html.includes('Nothing playing'));
 assert(html.includes('MEDIA'));
 model.ui.outputScope='active';
 const active=sidebar({model,catalog,view:'outputs',designTokens:tokens});
 assert.equal((active.match(/aria-current="page"/g)||[]).length,1);
});

test('group Functions resolves supported physical members once and hides unavailable functions',()=>{
 const model=JSON.parse(fs.readFileSync(path.join(root,'scenarios/nested-groups.json'),'utf8'));
 const s={model,catalog,detailOutputId:'g3'};
 model.ui.groupTab='functions';
 const html=renderGroup(s);
 assert(html.includes('data-value="functions"'));
 for(const id of ['d1','d2','d3','d4','d7'])assert.equal((html.match(new RegExp('data-action="alarms" data-id="'+id+'"','g'))||[]).length,1);
 assert(!html.includes('data-action="alarms" data-id="d5"'));
 for(const device of model.devices)device.capabilities.alarms=false;
 assert(!renderGroup(s).includes('data-value="functions"'));
 s.detailOutputId='p1';model.devices[0].capabilities.alarms=true;
 assert(renderGroup(s).includes('data-action="alarms" data-id="d1"'));
 assert(!renderGroup(s).includes('data-action="alarms" data-id="d2"'));
});

test('device identity keeps MAC and location controls; network owns both address families',()=>{
 const model=JSON.parse(fs.readFileSync(path.join(root,'scenarios/home.json'),'utf8')),d=model.devices[0];
 model.ui.deviceTab='overview';
 const s={model,catalog,detailDeviceId:d.id,designTokens:tokens};
 let html=renderDevice(s);
 assert(html.includes(d.macAddress));assert(!html.includes('IPv4'));assert(!html.includes('IPv6'));
 model.ui.deviceTab='network';html=renderDevice(s);assert(html.includes('IPv4'));assert(html.includes('IPv6'));
 for(const address of [...d.ipv4Addresses,...d.ipv6Addresses])assert(html.includes(address));
 model.ui.deviceTab='overview';html=renderDevice(s);
 assert(!html.includes('data-action="device-info"'));assert(!html.includes('More details'));
 assert(html.includes('data-signal="sound"'));assert(html.includes('data-signal="blink"'));
 d.macAddress=null;d.ipv4Addresses=[];d.ipv6Addresses=[];d.capabilities.identification=['blink'];
 html=renderDevice(s);assert(html.includes('Not reported'));assert(!html.includes('data-signal="sound"'));
 d.ipv6Addresses=['fe80::1%<unsafe>'];model.ui.deviceTab='network';html=renderDevice(s);assert(html.includes('fe80::1%&lt;unsafe&gt;'));assert(!html.includes('%<unsafe>'));
 model.ui.deviceTab='overview';s.identification={deviceId:d.id,signal:'blink',startedAt:Date.now(),endsAt:Date.now()+10000};
 html=renderDevice(s);assert(html.includes('Stop · 10 s'));assert(html.includes('is-identifying'));
 d.status='offline';html=renderDevice(s);assert.match(html,/data-signal="blink"[^>]*disabled/);
});
