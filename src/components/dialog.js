import {renderPresetEditor} from './preset-editor.js';
import {renderPresetTransfer,renderPresetTransferResult} from './preset-transfer.js';
import {esc,icon,action,statusBadge,targetIcon,subline,typeIcon} from './shared.js';
import {entity,kind,visibleOutputs,parentIds,source,targetStatus,buttonProfile,buttonPresets,leafDeviceIds} from '../app/model.js';

function outputPicker(s){const m=s.model,src=source(s.catalog,s.speakerPickerFor||m.selectedSourceId),targets=visibleOutputs(m);
 return `<div class="modal-heading"><h2>${src?'Play '+esc(src.name)+' on…':'Choose output'}</h2><p>${src?'Selecting an output will start this source. Existing sessions on unrelated devices keep playing.':'Choose a playback target or manage its configuration.'}</p></div>
  <div class="modal-list">${targets.length?targets.map(t=>{const status=targetStatus(m,t.id);return `<button class="modal-output" data-action="assign-output" data-id="${esc(t.id)}" ${status==='offline'||status==='needs_setup'?'disabled':''}>
   <span class="target-card__icon">${typeIcon(kind(m,t.id))}</span><span><strong>${esc(t.name)}</strong><small>${subline(m,t.id)}</small></span>${statusBadge(status)}${icon('play_circle')}</button>`}).join(''):`<p class="empty-line">No outputs configured.</p>`}</div>
  <div class="modal-footer">${action('close-modal','Cancel','btn-quiet')}${action('navigate','Manage all outputs','btn-soft','data-value="outputs"')}</div>`;
}
function createComposite(s){const m=s.model,pair=s.modal.type==='pair',candidates=pair?m.devices.filter(d=>!parentIds(m,d.id).length):visibleOutputs(m).filter(t=>kind(m,t.id)!=='group');
 return `<div class="modal-heading"><h2>${pair?'Create stereo pair':'Create speaker group'}</h2><p>${pair?'Select two available physical speakers.':'Select two or more outputs to play the same source together.'}</p></div>
 <div class="form-row"><label>Name</label><input id="composite-name" class="text-input" value="${pair?'New stereo pair':'New group'}" /></div>
 <div class="form-row"><label>Members</label><div class="modal-list modal-list--small">${candidates.map(t=>`<label class="choice-row"><input type="checkbox" name="compositeMember" value="${esc(t.id)}" ${s.selectedForComposite.includes(t.id)?'checked':''}/>${typeIcon(kind(m,t.id))}<span><strong>${esc(t.name)}</strong><small>${subline(m,t.id)}</small></span></label>`).join('')}</div></div>
 ${!pair?`<div class="form-row"><label>Persistent</label><input id="composite-persistent" type="checkbox" checked /></div>`:''}
 <div class="modal-footer">${action('close-modal','Cancel','btn-quiet')}${action('composite-create',`Create ${pair?'pair':'group'}`,'primary-btn')}</div>`;
}
function volumeDialog(s){
 const modal=s.modal,playback=s.model.sessions.find(item=>item.id===modal.sessionId&&item.targetId===modal.targetId),target=entity(s.model,modal.targetId);
 if(!playback||!target)return `<div class="modal-heading"><h2>Playback no longer available</h2><p>Close this panel and choose another output.</p></div>`;
 const ids=leafDeviceIds(s.model,target.id),enabled=['online','partial'].includes(targetStatus(s.model,target.id)),now=source(s.catalog,playback.sourceId),volume=playback.volume??25;
 const deviceRow=id=>{
  const device=entity(s.model,id),online=device.status==='online',level=device.volume??25;
  return `<div class="volume-device-row ${online?'':'is-unavailable'}"><label for="device-volume-${esc(id)}"><strong>${esc(device.name)}</strong>${online?'':`<small>${esc(device.status)}</small>`}</label><output for="device-volume-${esc(id)}">${level} %</output><input class="volume-slider" style="--range-fill:${level}%" id="device-volume-${esc(id)}" type="range" min="0" max="100" value="${level}" aria-valuetext="${level} percent" data-field="dialog-device-volume" data-id="${esc(id)}" aria-label="Volume for ${esc(device.name)}" ${online?'':'disabled'}/></div>`;
 };
 const units=kind(s.model,target.id)==='group'?target.memberIds:[target.id];
 return `<div class="modal-heading volume-heading"><h2>Volume · ${esc(target.name)}</h2>${now?`<p>${esc(now.name)}</p>`:''}</div>
 <section class="volume-master"><label for="dialog-overall-volume">${ids.length>1?'Overall volume':'Volume'}</label><output for="dialog-overall-volume">${volume} %</output><input class="volume-slider" style="--range-fill:${volume}%" id="dialog-overall-volume" type="range" min="0" max="100" value="${volume}" aria-valuetext="${volume} percent" data-field="dialog-volume" data-id="${esc(playback.id)}" aria-label="Overall volume for ${esc(target.name)}" ${enabled?'':'disabled'}/></section>
 ${ids.length>1?`<div class="volume-device-list">${units.map(id=>kind(s.model,id)==='pair'?`<section class="volume-pair"><header>${typeIcon('pair')}<strong>${esc(entity(s.model,id).name)}</strong></header>${leafDeviceIds(s.model,id).map(deviceRow).join('')}</section>`:`<section class="volume-single">${leafDeviceIds(s.model,id).map(deviceRow).join('')}</section>`).join('')}</div>`:''}
 <div class="modal-footer volume-footer">${action('close-modal','Done','primary-btn')}</div>`;
}
function wifiDialog(s){const d=entity(s.model,s.detailDeviceId||s.model.selectedDeviceId);
 return `<div class="modal-heading"><h2>Change Wi-Fi</h2><p>${esc(d?.name||'Speaker')} may temporarily disconnect. Completion requires rediscovery.</p></div>
 <div class="key-values"><div><span>Current network</span><strong>${esc(d?.network||'')}</strong></div></div><div class="form-row"><label>New network</label><select id="wifi-network" class="small-select"><option>Guest Network</option><option>Home Network</option><option>Office Wi-Fi</option></select></div><div class="form-row"><label>Password</label><input id="wifi-password" class="text-input" type="password" placeholder="Password" autocomplete="off" /></div>
 <div class="subtle-alert">${icon('warning')} Passwords are not retained in saved scenarios or diagnostic exports.</div>
 <div class="modal-footer">${action('close-modal','Cancel','btn-quiet')}${action('wifi-save','Change Wi-Fi (simulate)','primary-btn')}</div>`;
}
function deviceMaintenance(s){const d=entity(s.model,s.detailDeviceId||s.model.selectedDeviceId);
 return `<div class="modal-heading"><h2>Maintenance actions</h2><p>${esc(d?.name||'Device')} · Confirm disruptive actions before proceeding.</p></div><div class="menu-list">${action('device-restart',icon('restart_alt')+' Restart device','menu-row')}${action('device-remove',icon('delete')+' Remove from application','menu-row danger-text')}${action('device-reset',icon('settings_backup_restore')+' Factory reset (simulation)','menu-row danger-text')}</div><div class="modal-footer">${action('close-modal','Close','btn-quiet')}</div>`;
}
function renameDialog(s){
 const device=entity(s.model,s.modal.deviceId);
 return `<div class="modal-heading"><h2>Rename device</h2><p>${esc(device?.brand||'')} ${esc(device?.model||'')} · ${esc(device?.ip||'')}</p></div>
 <label class="rename-label" for="device-name">Device name</label><input id="device-name" class="text-input rename-input" data-field="device-name" value="${esc(s.modal.nameDraft??device?.name??'')}" maxlength="120" autocomplete="off" />
 <div class="modal-footer">${action('close-modal','Cancel','btn-quiet')}${action('device-rename-save','Save name','primary-btn')}</div>`;
}
function genericDialog(s){const t=s.modal||{};return `<div class="modal-heading"><h2>${esc(t.title||'Information')}</h2><p>${esc(t.description||'')}</p></div>${t.body?`<div class="modal-generic">${t.body}</div>`:''}<div class="modal-footer">${action('close-modal','Close','primary-btn')}</div>`}
export function renderDialog(s){if(!s.modal)return '';
 const inner=s.modal.kind==='button-transfer'?renderPresetTransfer(s):s.modal.kind==='button-transfer-result'?renderPresetTransferResult(s):s.modal.kind==='rename'?renameDialog(s):s.modal.kind==='picker'?outputPicker(s):s.modal.kind==='create'?createComposite(s):s.modal.kind==='volume'?volumeDialog(s):s.modal.kind==='preset'?renderPresetEditor(s):s.modal.kind==='wifi'?wifiDialog(s):s.modal.kind==='maintenance'?deviceMaintenance(s):genericDialog(s);
 return `<div class="overlay" role="presentation"><div class="modal-window ${s.modal.kind==='preset'?'modal-window--preset':s.modal.kind==='volume'?'modal-window--volume':''}" role="dialog" aria-modal="true" aria-label="${esc(s.modal.title||s.modal.kind||'Dialog')}"><div class="modal-window__close">${action('close-modal',icon('close'),'icon-btn','aria-label="Close dialog"')}</div>${inner}</div><button class="overlay-backdrop" data-action="close-modal" aria-label="Close dialog"></button></div>`;
}
