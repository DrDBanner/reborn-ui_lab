import {esc,icon,action,card,empty} from '../components/shared.js';
import {buttonProfile,buttonPresets,presetPlaybackTarget,entity,source} from '../app/model.js';
export function renderDeviceFunctions(s,device){
 const profile=buttonProfile(device),gesture=profile?.gestures.includes(s.presetGesture)?s.presetGesture:'single';
 let result='';
 if(profile){
  const target=entity(s.model,presetPlaybackTarget(s.model,device.id));
  result+=card('Button presets',`Assignments on ${esc(device.name)}. Playback uses ${esc(target?.name||device.name)}.`,`
   <div class="preset-tools"><div class="segmented" aria-label="Hardware button gesture">${profile.gestures.map(g=>action('preset-gesture',g==='single'?'Once':'Twice',`tab-control ${gesture===g?'active':''}`,`data-value="${g}" aria-pressed="${gesture===g}"`)).join('')}</div>${action('preset-edit',icon('edit')+' Edit assignments','btn-soft',`data-id="${esc(device.id)}" data-gesture="${gesture}"`)}</div>
   <p class="preset-help">${gesture==='double'?'Press the same hardware key twice quickly to use its second assignment.':'Press a hardware key once to use its first assignment.'}</p>
   <div class="preset-grid">${buttonPresets(device,gesture).map((sourceId,index)=>{
    const item=source(s.catalog,sourceId),key=index+1;
    return `<article class="key-preset"><div class="key-preset__heading"><strong>Key ${key}</strong><span>${gesture==='double'?'2×':'1×'}</span></div><div class="key-preset__source">${icon(item?.type==='radio'?'radio':item?.type==='spotify'?'music_note':'album')}<span><strong>${esc(item?.name||'Unassigned')}</strong><small>${esc(item?.subtitle||'Choose a source in Edit assignments')}</small></span></div>${action('preset-play',icon('play_arrow')+' Play','btn-quiet',`data-id="${esc(device.id)}" data-key="${key}" data-gesture="${gesture}" aria-label="Play key ${key}, ${gesture==='double'?'double':'single'} press, on ${esc(target?.name||device.name)}" ${!sourceId||device.status!=='online'?'disabled':''}`)}</article>`;
   }).join('')}</div>`,'device-presets');
 }
 if(device.capabilities?.alarms)result+=card('Alarms','Scheduled actions for this device.',action('alarms',icon('alarm')+' Manage alarms','btn-soft',`data-id="${esc(device.id)}"`));
 return result||empty('settings','No additional functions','This device does not report additional configurable functions.');
}
