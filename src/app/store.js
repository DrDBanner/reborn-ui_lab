import {libraryQueueSources} from './library.js';
import { validateScenario,normalizeScenario,availableUpdates,identificationSignals,identificationDuration } from './model.js';

const listeners=new Set();
const reportedUpdateKeys=new Map();
export const state={catalog:null,scenarioIndex:[],uiLayout:null,variants:null,scenarioId:'home',model:null,
  view:'listen', detailDeviceId:null, detailOutputId:null, selectedSourceId:null,
  appSettings:{identificationSeconds:30}, identification:null, modal:null, toasts:[], sidebarOpen:false, speakerPickerFor:null, filter:'', historyQuery:'', historyType:'all', libraryQuery:'', librarySearchOpen:false, librarySearchServer:'all', libraryTrackIds:[], outputSearch:'', outputCardOrder:null, selectedForComposite:[],
  setupStep:0, setupSelection:null, designOpen:false, designTokens:null, scenarioEditorOpen:false,
  updateChecked:false, radioFiltersOpen:false, appMenuOpen:false, presetGesture:'single', presetDeviceId:null, expandedPresetTargetId:null, expandingOutputs:false, alert:null};

export function subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener)}
export function notify(){if(state.catalog&&state.model)state.catalog.sources=[...state.catalog.sources.filter(item=>item.origin!=='saved-library-queue'),...libraryQueueSources(state.model)];reportAvailableUpdates();for(const fn of listeners)fn(state)}
function reportAvailableUpdates(){
 if(!state.model)return;
 const updates=availableUpdates(state.model),seen=reportedUpdateKeys.get(state.scenarioId)||new Set(),fresh=updates.filter(update=>!seen.has(update.key));
 reportedUpdateKeys.set(state.scenarioId,new Set(updates.map(update=>update.key)));
 if(fresh.length){
  const description=fresh.slice(0,3).map(update=>`${update.name}${update.version?' · '+update.version:''}`).join(', ')+(fresh.length>3?` and ${fresh.length-3} more`:'');
  toast(`${fresh.length===1?'Update':'Updates'} available: ${description}`,{kind:'update',destination:'updates',announce:false});
 }
}
export function mutate(fn,persist=true){fn(state);if(persist)save();notify()}
export function save(){if(!state.model)return;try{localStorage.setItem(`streborn-lab:${state.scenarioId}`,JSON.stringify(state.model));localStorage.setItem('streborn-lab:design',JSON.stringify(state.designTokens));localStorage.setItem('streborn-lab:app-settings',JSON.stringify(state.appSettings));}catch{}}
let identificationTimer=null;
export function stopDeviceIdentification(announce=true){
 clearTimeout(identificationTimer);identificationTimer=null;state.identification=null;
 if(announce)notify();
}
export function startDeviceIdentification(deviceId,signal){
 const device=state.model?.devices.find(item=>item.id===deviceId);
 if(!device||device.status!=='online'||!identificationSignals(device).includes(signal))throw new Error('Identification signal unavailable on this device');
 stopDeviceIdentification(false);
 const seconds=identificationDuration(state.appSettings),duration=seconds*1000,startedAt=Date.now();
 const run={deviceId,signal,startedAt,endsAt:startedAt+duration,duration};
 state.identification=run;
 function tick(){
  if(state.identification!==run)return;
  const current=state.model?.devices.find(item=>item.id===deviceId);
  if(Date.now()>=run.endsAt||current?.status!=='online'||!identificationSignals(current).includes(signal)){stopDeviceIdentification();return;}
  notify();identificationTimer=setTimeout(tick,Math.min(1000,run.endsAt-Date.now()));identificationTimer?.unref?.();
 }
 identificationTimer=setTimeout(tick,1000);identificationTimer?.unref?.();
 toast(`${device.name}: ${signal==='sound'?'sound':'blinking light'} for ${seconds} seconds · simulated`);
}
export function resetUi(){stopDeviceIdentification(false);state.updateChecked=false;state.filter='';state.historyQuery='';state.historyType='all';state.libraryQuery='';state.librarySearchOpen=false;state.librarySearchServer='all';state.libraryTrackIds=[];state.outputSearch='';state.outputCardOrder=null;state.detailDeviceId=null;state.detailOutputId=null;state.selectedForComposite=[];state.setupStep=0;state.expandingOutputs=false;state.modal=null;clearToast(false);state.scenarioEditorOpen=false;state.appMenuOpen=false;state.radioFiltersOpen=false;state.presetGesture='single';state.presetDeviceId=null;state.expandedPresetTargetId=null;}
export async function initialize(){
  const [index,catalog,design,uiLayout,variants]=await Promise.all(['/data/scenario-index.json','/data/catalog.json','/data/design-tokens.json','/data/ui-layout.json','/data/variants.json'].map(url=>fetch(url).then(r=>{if(!r.ok)throw new Error(`Failed to load ${url}`);return r.json()})));
  state.catalog=catalog;state.scenarioIndex=index;state.uiLayout=uiLayout;state.variants=variants;state.designTokens=design;
  try{const saved=localStorage.getItem('streborn-lab:design');if(saved)state.designTokens={...design,...JSON.parse(saved)}}catch{}
  try{state.appSettings={identificationSeconds:identificationDuration(JSON.parse(localStorage.getItem('streborn-lab:app-settings')||'null'))}}catch{state.appSettings={identificationSeconds:30}}
  applyDesign();await loadScenario('home',true);
}
export async function loadScenario(id,initial=false,reset=false){
  if(!state.scenarioIndex.some(x=>x.id===id))throw new Error('Unknown scenario');
  const response=await fetch(`/data/scenarios/${id}.json`);if(!response.ok)throw new Error('Scenario file unavailable');
  const fixture=await response.json();let model=structuredClone(fixture),refreshed=false;
  if(!reset){try{const saved=localStorage.getItem(`streborn-lab:${id}`);if(saved){const candidate=JSON.parse(saved);if((candidate.fixtureRevision||0)===(fixture.fixtureRevision||0))model=candidate;else refreshed=true}}catch{}}
  normalizeScenario(model,fixture);
  const errors=validateScenario(model);if(errors.length)throw new Error(errors.join('; '));
  state.scenarioId=id;state.model=model;state.view=model.activeView || 'listen';
  if(reset)reportedUpdateKeys.delete(id);
  resetUi();if(reset||refreshed)save();if(!initial)toast(`${state.scenarioIndex.find(s=>s.id===id)?.name} loaded`);notify();
}
export function applyScenarioJson(json){
  const model=normalizeScenario(JSON.parse(json));const errors=validateScenario(model);if(errors.length)throw new Error(errors.join('; '));
  mutate(s=>{s.model=model;resetUi();s.view=model.activeView||'outputs';s.scenarioEditorOpen=false});toast('Custom JSON scenario applied');
}
export function applyDesign(){
  const d=state.designTokens||{};const root=document.documentElement;
  const accent=d.accent||'#79b8ff';
  root.style.setProperty('--accent',d.appearance==='light'?`color-mix(in srgb,${accent} 35%,#173d6a)`:accent);root.style.setProperty('--radius',`${Number(d.radius||12)}px`);
  root.style.setProperty('--sidebar-width',`${Number(d.sidebarWidth||270)}px`);
  root.style.setProperty('--font-size',`${Number(d.fontSize||14)}px`);
  root.dataset.density=d.density||'standard';root.dataset.appearance=d.appearance||'dark';
}
let toastSequence=0;
const toastTimers=new Map();
function noticeTimer(callback,delay){const timer=setTimeout(callback,delay);timer?.unref?.();return timer;}
export function dismissToast(id){
 const notice=state.toasts.find(item=>item.id===id);if(!notice||notice.leaving)return;
 const timers=toastTimers.get(id)||[];timers.forEach(clearTimeout);
 notice.leaving=true;notice.dismissedAt=Date.now();notify();
 toastTimers.set(id,[noticeTimer(()=>{state.toasts=state.toasts.filter(item=>item.id!==id);toastTimers.delete(id);notify()},240)]);
}
export function toast(message,{kind='info',duration=kind==='error'?0:8000,destination=null,announce=true}={}){
 const id=`notice-${++toastSequence}`;
 state.toasts.push({id,message:String(message),kind,destination:destination==='updates'?'updates':null,createdAt:Date.now(),duration,leaving:false});
 if(duration>0)toastTimers.set(id,[noticeTimer(()=>dismissToast(id),duration)]);
 if(announce)notify();return id;
}
export function clearToast(announce=true){for(const timers of toastTimers.values())timers.forEach(clearTimeout);toastTimers.clear();state.toasts=[];if(announce)notify()}
