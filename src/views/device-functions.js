import {esc,icon,action,card,empty,sourceTypeLabel,sourceTypeIcon,deviceProduct} from '../components/shared.js';
import {buttonProfile,buttonPresets,presetAssignments,presetPlaybackTarget,entity,source,leafDeviceIds,kind} from '../app/model.js';
export function renderItemKeyFunctions(s,targetId){
 const devices=leafDeviceIds(s.model,targetId).map(id=>entity(s.model,id)).filter(device=>buttonProfile(device));
 const device=(kind(s.model,targetId)!=='device'&&devices.find(item=>item.id===s.presetDeviceId))||devices[0];
 if(!device)return '';
 const profile=buttonProfile(device),gesture=profile?.gestures.includes(s.presetGesture)?s.presetGesture:'single';
 const target=entity(s.model,presetPlaybackTarget(s.model,device.id)),expanded=s.expandedPresetTargetId===targetId;
 const layers=`<div class="segmented" aria-label="Hardware button gesture">${profile.gestures.map(g=>action('preset-gesture',g==='single'?'Once':'Twice',`tab-control ${gesture===g?'active':''}`,`data-id="${esc(device.id)}" data-value="${g}" aria-pressed="${gesture===g}"`)).join('')}</div>`;
 const keys=buttonPresets(device,gesture).map((sourceId,index)=>{
  const item=source(s.catalog,sourceId),key=index+1,props=`data-preset-hold data-id="${esc(device.id)}" data-key="${key}" data-gesture="${gesture}" title="${esc(item?.name||'Unassigned')} · Hold to assign key ${key}" aria-description="Hold to edit this button assignment" aria-label="${sourceId?'Play '+esc(item?.name):'Assign'}, key ${key}, ${gesture==='double'?'double':'single'} press, on ${esc(target?.name||device.name)}" ${device.status!=='online'?'disabled':''}`,keyAction=sourceId?'preset-play':'preset-edit';
  if(!expanded)return action(keyAction,`<span class="preset-key-number">${key}</span><span class="preset-key-name">${esc(item?.name||'Unassigned')}</span>${sourceId?icon('play_circle'):''}`,`preset-key-compact ${sourceId?'':'is-unassigned'}`,props);
  return `<article class="key-preset"><div class="key-preset__heading"><strong>Key ${key}</strong><span>${gesture==='double'?'2×':'1×'}</span></div><div class="key-preset__source">${icon(sourceTypeIcon(item))}<span><strong>${esc(item?.name||'Unassigned')}</strong><small>${esc(item?.subtitle||'Choose a source in Edit assignments')}</small><span class="key-preset__type">${esc(sourceTypeLabel(item))}</span></span></div>${action(keyAction,icon(sourceId?'play_circle':'edit')+(sourceId?' Play':' Assign'),'btn-quiet',props)}</article>`;
 }).join('');
 const settings=action('toggle-preset-details',icon('settings'),`icon-btn preset-settings-trigger ${expanded?'is-active':''}`,`data-id="${esc(targetId)}" aria-label="${expanded?'Hide preset settings':'Manage presets'}" title="${expanded?'Hide preset settings':'Manage presets'}" aria-expanded="${expanded}" aria-controls="preset-details-${esc(targetId)}"`);
 const owner=devices.length>1?`<div class="preset-owner-controls"><label class="preset-device-choice" for="preset-device"><span class="sr-only">Buttons on</span><select id="preset-device" class="small-select" data-field="preset-device" data-id="${esc(targetId)}">${devices.map(item=>`<option value="${esc(item.id)}" ${item.id===device.id?'selected':''}>${esc(item.name)}</option>`).join('')}</select></label></div>`:'';
 return `<section class="panel device-presets item-key-functions ${expanded?'is-expanded':''}" aria-label="Button presets"><header class="preset-panel-heading"><div><h2>Button presets</h2>${target?.id!==targetId?`<p>Plays on ${esc(target?.name)}</p>`:''}</div><div class="preset-heading-tools">${owner}${layers}${settings}</div></header>
 <div class="preset-panel-content">${expanded?`<div class="preset-context-controls">
 ${expanded?`<div class="preset-expanded-tools" id="preset-details-${esc(targetId)}"><div class="button-row">${action('preset-edit',icon('edit')+' Edit assignments','btn-soft',`data-id="${esc(device.id)}" data-gesture="${gesture}"`)}${action('button-transfer-open',icon('add_link')+' Transfer buttons','btn-quiet',`data-id="${esc(device.id)}" ${device.status!=='online'||!presetAssignments(device).length?'disabled':''}`)}</div></div>`:''}</div>`:''}${expanded?'':`<div id="preset-details-${esc(targetId)}" hidden></div>`}
 <div class="${expanded?'preset-grid':'preset-compact-grid'}">${keys}</div></div></section>`;
}

export function renderDeviceFunctions(s,device){
 let result='';
 if(device.capabilities?.alarms)result+=card('Alarms','',action('alarms',icon('alarm')+' Manage alarms','btn-soft',`data-id="${esc(device.id)}"`));
 return result||empty('settings','No additional functions','This device does not report additional configurable functions.');
}

export function groupFunctionDevices(s,targetId){
 return leafDeviceIds(s.model,targetId).map(id=>entity(s.model,id)).filter(device=>device?.capabilities?.alarms);
}

export function renderGroupFunctions(s,targetId){
 const devices=groupFunctionDevices(s,targetId);
 return card('Alarms','Configure alarms on a member device.',`<div class="function-device-list">${devices.map(device=>`<div class="setting-line">${icon('speaker')}<div class="setting-line__body"><strong>${esc(device.name)}</strong><small>${esc(deviceProduct(device))}</small></div>${action('alarms','Manage alarms','btn-quiet',`data-id="${esc(device.id)}" aria-label="Manage alarms on ${esc(device.name)}"`)}</div>`).join('')}</div>`);
}
