import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderListen} from '../src/views/listen.js';
import {renderOutputs,renderGroup} from '../src/views/outputs.js';
import {renderDevice,renderUpdates,renderSettings,renderSetup,renderHelp} from '../src/views/management.js';
import {renderLab} from '../src/views/lab.js';
import {sidebar,header,player} from '../src/components/shell.js';
import {renderDialog} from '../src/components/dialog.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public/data');
const scenarios=JSON.parse(fs.readFileSync(path.join(root,'scenario-index.json'),'utf8'));
const catalog=JSON.parse(fs.readFileSync(path.join(root,'catalog.json'),'utf8'));
const tokens=JSON.parse(fs.readFileSync(path.join(root,'design-tokens.json'),'utf8'));
const renderers={listen:renderListen,library:renderListen,history:renderListen,spotify:renderListen,outputs:renderOutputs,group:renderGroup,device:renderDevice,updates:renderUpdates,settings:renderSettings,setup:renderSetup,help:renderHelp,lab:renderLab};
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
  for(const modal of [{kind:'picker'},{kind:'create',type:'pair'},{kind:'create',type:'group'},{kind:'preset'},{kind:'wifi'},{kind:'maintenance'},{kind:'generic',title:'Hello'}]){
   s.modal=modal;const html=renderDialog(s);assert(html.length>120);
  }
 });
}
