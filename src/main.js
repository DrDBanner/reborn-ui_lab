import {state,initialize,subscribe,clearToast} from './app/store.js';
import {onAction,onField} from './app/controller.js';
import {sidebar,header,player,appMenu} from './components/shell.js';
import {renderDialog} from './components/dialog.js';
import {renderListen} from './views/listen.js';
import {renderOutputs,renderGroup} from './views/outputs.js';
import {renderDevice,renderUpdates,renderSettings,renderSetup,renderHelp} from './views/management.js';
import {renderSessions} from './views/sessions.js';
import {renderLab} from './views/lab.js';
import {icon,action,esc,notificationStack} from './components/shared.js';

const app=document.getElementById('app');
const views={listen:renderListen,library:renderListen,history:renderListen,spotify:renderListen,outputs:renderOutputs,group:renderGroup,device:renderDevice,updates:renderUpdates,settings:renderSettings,setup:renderSetup,help:renderHelp,lab:renderLab,sessions:renderOutputs};
let renderedViewKey='';
let renderedMenuOpen=false;
let renderedRenameId=null;
let renderedVolumeId=null;
let renderedCreateOpen=false;
function render(){
 if(!state.model)return;
 const view=views[state.view]||renderListen;
 const playerContent=player(state);
 // Preserve typing position across updates from search or form controls.
 // Tab changes keep the current item's workspace position. A different item/route resets it.
 const viewKey=[state.view,state.detailDeviceId,state.detailOutputId].join(':');
 const scrollPositions=['.workspace','.sidebar-scroll','.modal-window','.radio-filter-panel','.transfer-body','.transfer-targets','.preset-workbench','.preset-source-results','.group-settings-body'].map(selector=>({selector,top:app.querySelector?.(selector)?.scrollTop||0}));
 const active=document.activeElement;const field=active?.dataset?.field;const fieldId=active?.dataset?.id;const selStart=field&&typeof active.selectionStart==='number'?active.selectionStart:null;
 const focusValue=field?active.value:null;
 app.innerHTML=`<div class="app-shell ${playerContent?'has-player':''}">${sidebar(state)}<div class="app-main">${header(state)}<main class="workspace" id="workspace">${view(state)}</main></div>${playerContent}</div>${appMenu(state)}${renderDialog(state)}${notificationStack(state)}`;
 for(const {selector,top} of scrollPositions){const element=app.querySelector?.(selector);if(element&&(selector!=='.workspace'||viewKey===renderedViewKey))element.scrollTop=top;}
 renderedViewKey=viewKey;
 for(const checkbox of app.querySelectorAll?.('.transfer-target-heading input[aria-checked="mixed"]')||[])checkbox.indeterminate=true;
 const renameId=state.modal?.kind==='rename'?state.modal.deviceId:null;
 if(renameId&&renameId!==renderedRenameId){const input=app.querySelector?.('#device-name');input?.focus();input?.select();}
 if(!renameId&&renderedRenameId&&['device','group'].includes(state.view))app.querySelector?.('.title-edit')?.focus({preventScroll:true});
 renderedRenameId=renameId;
 const volumeId=state.modal?.kind==='volume'?state.modal.sessionId:null;
 if(volumeId&&volumeId!==renderedVolumeId)app.querySelector?.('#dialog-overall-volume')?.focus({preventScroll:true});
 if(!volumeId&&renderedVolumeId)app.querySelector?.('.volume-details-trigger')?.focus({preventScroll:true});
 renderedVolumeId=volumeId;
 const createOpen=state.modal?.kind==='create';
 if(createOpen&&!renderedCreateOpen)app.querySelector?.('#composite-name')?.focus({preventScroll:true});
 renderedCreateOpen=createOpen;
 if(state.appMenuOpen&&!renderedMenuOpen)app.querySelector?.('.app-menu .icon-btn')?.focus({preventScroll:true});
 if(!state.appMenuOpen&&renderedMenuOpen)app.querySelector?.(state.sidebarOpen||globalThis.innerWidth>720?'.brand-trigger':'.mobile-brand')?.focus({preventScroll:true});
 renderedMenuOpen=state.appMenuOpen;
 if(field){const match=[...document.querySelectorAll('[data-field]')].find(el=>el.dataset.field===field&&el.dataset.id===fieldId&&(el.value===focusValue||field==='radio-search'||field==='output-search'));
  if(match){match.focus({preventScroll:true});if(selStart!==null&&typeof match.setSelectionRange==='function')try{match.setSelectionRange(selStart,selStart)}catch{}}
 }
}
subscribe(render);
document.addEventListener('click',event=>{const button=event.target.closest('[data-action]');if(button&&!button.disabled){event.preventDefault();onAction(button.dataset.action,button)}});
document.addEventListener('change',event=>{const field=event.target.closest('[data-field]');if(field)onField(field.dataset.field,field)});
document.addEventListener('input',event=>{const field=event.target.closest('[data-field]');if(field&&['radio-search','output-search','accent','device-name','composite-name','preset-search'].includes(field.dataset.field))onField(field.dataset.field,field)});
document.addEventListener('keydown',event=>{
 if(event.key==='Enter'&&state.modal?.kind==='rename'&&event.target.dataset?.field==='device-name'){event.preventDefault();onAction('device-rename-save',document.createElement('button'));}
 if(event.key==='Tab'&&state.appMenuOpen){
  const controls=[...document.querySelectorAll('.app-menu button:not(:disabled),.app-menu select')];
  const first=controls[0],last=controls.at(-1);
  if(controls.length&&(event.shiftKey&&document.activeElement===first||!event.shiftKey&&document.activeElement===last)){event.preventDefault();(event.shiftKey?last:first).focus();}
 }
 if(event.key==='Escape'){if(state.modal)onAction('close-modal',document.createElement('button'));else if(state.appMenuOpen)onAction('close-app-menu',document.createElement('button'));}if((event.metaKey||event.ctrlKey)&&event.key===','){event.preventDefault();const b=document.createElement('button');b.dataset.value='settings';onAction('navigate',b)}});
initialize().catch(err=>{app.innerHTML=`<main class="boot"><h1>Could not initialize UI Lab</h1><p>${err.message}</p><p>Run this project through Vite (<code>npm install && npm run dev</code>) rather than opening the HTML file directly.</p></main>`;console.error(err)});
