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
  assert(player(s).length>100);
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
 assert(compact.includes('Key 2'));
 assert(!compact.includes('Key 3'));
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
 const s={model,catalog,detailDeviceId:'d1',presetGesture:'double'};
 for(const tab of ['overview','sound','network','functions','advanced']){
  model.ui.deviceTab=tab;const html=renderDevice(s);
  assert(html.indexOf('item-key-functions')<html.indexOf('class="detail-tabs"'));
  assert.equal((html.match(/<h2>Button presets<\/h2>/g)||[]).length,1);
  assert(html.includes('data-action="preset-edit" data-id="d1" data-gesture="double"'));
 }
 s.detailOutputId='g1';s.presetDeviceId='d3';
 const group=renderGroup(s);
 assert(group.indexOf('item-key-functions')<group.indexOf('<h2>Members</h2>'));
 assert(group.includes('data-field="preset-device" data-id="g1"'));
 assert(group.includes('Assignments on Kitchen. Playback uses Downstairs.'));
 s.detailOutputId='p1';s.presetDeviceId='d4';
 const pair=renderGroup(s);
 assert(pair.includes('Assignments on Living Room L. Playback uses Downstairs.'));
 assert(!pair.includes('Assignments on Office.'));
});
