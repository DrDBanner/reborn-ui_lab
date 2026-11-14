import { validateScenario,normalizeScenario } from './model.js';

const listeners=new Set();
export const state={catalog:null,scenarioIndex:[],uiLayout:null,variants:null,scenarioId:'home',model:null,
  view:'listen', detailDeviceId:null, detailOutputId:null, selectedSourceId:null,
  modal:null, toast:null, sidebarOpen:false, speakerPickerFor:null, filter:'', outputSearch:'', selectedForComposite:[],
  setupStep:0, setupSelection:null, designOpen:false, designTokens:null, scenarioEditorOpen:false,
  radioFiltersOpen:false, appMenuOpen:false, presetGesture:'single', presetDeviceId:null, expandingOutputs:false, alert:null};

export function subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener)}
export function notify(){for(const fn of listeners)fn(state)}
export function mutate(fn,persist=true){fn(state);if(persist)save();notify()}
export function save(){if(!state.model)return;try{localStorage.setItem(`streborn-lab:${state.scenarioId}`,JSON.stringify(state.model));localStorage.setItem('streborn-lab:design',JSON.stringify(state.designTokens));}catch{}}
export function resetUi(){state.filter='';state.outputSearch='';state.detailDeviceId=null;state.detailOutputId=null;state.selectedForComposite=[];state.setupStep=0;state.expandingOutputs=false;state.modal=null;state.toast=null;state.scenarioEditorOpen=false;state.appMenuOpen=false;state.radioFiltersOpen=false;state.presetGesture='single';state.presetDeviceId=null;}
export async function initialize(){
  const [index,catalog,design,uiLayout,variants]=await Promise.all(['/data/scenario-index.json','/data/catalog.json','/data/design-tokens.json','/data/ui-layout.json','/data/variants.json'].map(url=>fetch(url).then(r=>{if(!r.ok)throw new Error(`Failed to load ${url}`);return r.json()})));
  state.catalog=catalog;state.scenarioIndex=index;state.uiLayout=uiLayout;state.variants=variants;state.designTokens=design;
  try{const saved=localStorage.getItem('streborn-lab:design');if(saved)state.designTokens={...design,...JSON.parse(saved)}}catch{}
  applyDesign();await loadScenario('home',true);
}
export async function loadScenario(id,initial=false,reset=false){
  if(!state.scenarioIndex.some(x=>x.id===id))throw new Error('Unknown scenario');
  const response=await fetch(`/data/scenarios/${id}.json`);if(!response.ok)throw new Error('Scenario file unavailable');
  const fixture=await response.json();let model=structuredClone(fixture);
  if(!reset){try{const saved=localStorage.getItem(`streborn-lab:${id}`);if(saved)model=JSON.parse(saved)}catch{}}
  normalizeScenario(model,fixture);
  const errors=validateScenario(model);if(errors.length)throw new Error(errors.join('; '));
  state.scenarioId=id;state.model=model;state.view=model.activeView || 'listen';
  resetUi();if(reset)save();if(!initial)toast(`${state.scenarioIndex.find(s=>s.id===id)?.name} loaded`);notify();
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
export function toast(message){state.toast=message;notify()}
export function clearToast(){state.toast=null;notify()}
