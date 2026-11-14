import {state,initialize,subscribe,clearToast} from './app/store.js';
import {onAction,onField} from './app/controller.js';
import {sidebar,header,player} from './components/shell.js';
import {renderDialog} from './components/dialog.js';
import {renderListen} from './views/listen.js';
import {renderOutputs,renderGroup} from './views/outputs.js';
import {renderDevice,renderUpdates,renderSettings,renderSetup,renderHelp} from './views/management.js';
import {renderLab} from './views/lab.js';
import {icon,action} from './components/shared.js';

const app=document.getElementById('app');
const views={listen:renderListen,library:renderListen,history:renderListen,spotify:renderListen,outputs:renderOutputs,group:renderGroup,device:renderDevice,updates:renderUpdates,settings:renderSettings,setup:renderSetup,help:renderHelp,lab:renderLab};
function render(){
 if(!state.model)return;
 const view=views[state.view]||renderListen;
 // Preserve typing position across updates from search or form controls.
 const active=document.activeElement;const field=active?.dataset?.field;const selStart=field&&typeof active.selectionStart==='number'?active.selectionStart:null;
 const focusValue=field?active.value:null;
 app.innerHTML=`<div class="app-shell">${sidebar(state)}<div class="app-main">${header(state)}<main class="workspace" id="workspace">${view(state)}</main></div>${player(state)}</div>${renderDialog(state)}${state.toast?`<div class="toast-message" role="status">${state.toast}${action('dismiss-toast',icon('close'),'icon-btn')}</div>`:''}`;
 if(field){const match=[...document.querySelectorAll('[data-field]')].find(el=>el.dataset.field===field&&(el.value===focusValue||field==='radio-search'||field==='output-search'));
  if(match){match.focus({preventScroll:true});if(selStart!==null&&typeof match.setSelectionRange==='function')try{match.setSelectionRange(selStart,selStart)}catch{}}
 }
}
subscribe(render);
document.addEventListener('click',event=>{const button=event.target.closest('[data-action]');if(button&&!button.disabled){event.preventDefault();onAction(button.dataset.action,button)}});
document.addEventListener('change',event=>{const field=event.target.closest('[data-field]');if(field)onField(field.dataset.field,field)});
document.addEventListener('input',event=>{const field=event.target.closest('[data-field]');if(field&&['radio-search','output-search','accent'].includes(field.dataset.field))onField(field.dataset.field,field)});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&state.modal)onAction('close-modal',document.createElement('button'));if((event.metaKey||event.ctrlKey)&&event.key===','){event.preventDefault();const b=document.createElement('button');b.dataset.value='settings';onAction('navigate',b)}});
initialize().catch(err=>{app.innerHTML=`<main class="boot"><h1>Could not initialize UI Lab</h1><p>${err.message}</p><p>Run this project through Vite (<code>npm install && npm run dev</code>) rather than opening the HTML file directly.</p></main>`;console.error(err)});

// Google Material Symbols is loaded from Google Fonts. When offline, use a small
// Unicode fallback so the development preview is still readable (no font bundled).
document.fonts.ready.then(()=>{
 const loaded=[...document.fonts].some(f=>f.family.replace(/["']/g,'').includes('Material Symbols')&&f.status==='loaded');
 if(!loaded||new URLSearchParams(location.search).has('offlineIcons'))document.documentElement.classList.add('symbols-missing');
}).catch(()=>document.documentElement.classList.add('symbols-missing'));
