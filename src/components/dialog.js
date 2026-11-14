import {renderPresetEditor} from './preset-editor.js';
import {renderPresetTransfer,renderPresetTransferResult} from './preset-transfer.js';
import {esc,icon,action,statusBadge,targetIcon,subline,typeIcon} from './shared.js';
import {entity,kind,visibleOutputs,parentIds,source,targetStatus,buttonProfile,buttonPresets,leafDeviceIds,stereoFamily,validateGroupMembers} from '../app/model.js';

function outputPicker(s){const m=s.model,src=source(s.catalog,s.speakerPickerFor||m.selectedSourceId),targets=visibleOutputs(m);
 return `<div class="modal-heading"><h2>${src?'Play '+esc(src.name)+' on…':'Choose output'}</h2><p>${src?'Selecting an output will start this source. Existing sessions on unrelated devices keep playing.':'Choose a playback target or manage its configuration.'}</p></div>
  <div class="modal-list">${targets.length?targets.map(t=>{const status=targetStatus(m,t.id);return `<button class="modal-output" data-action="assign-output" data-id="${esc(t.id)}" ${status==='offline'||status==='needs_setup'?'disabled':''}>
   <span class="target-card__icon">${typeIcon(kind(m,t.id))}</span><span><strong>${esc(t.name)}</strong><small>${subline(m,t.id)}</small></span>${statusBadge(status)}${icon('play_circle')}</button>`}).join(''):`<p class="empty-line">No outputs configured.</p>`}</div>
  <div class="modal-footer">${action('close-modal','Cancel','btn-quiet')}${action('navigate','Manage all outputs','btn-soft','data-value="outputs"')}</div>`;
}
function renderCompositeDialog(s){
 const m=s.model,draft=s.modal,pair=draft.type==='pair',available=visibleOutputs(m).filter(t=>kind(m,t.id)!=='group');
 const members=pair?[draft.leftId||'',draft.rightId||'']:s.selectedForComposite;
 const error=validateGroupMembers(m,members,pair?'pair':'group');
 const stereoDevices=m.devices.filter(d=>!parentIds(m,d.id).length&&stereoFamily(d));
 const channel=(side,label,other)=>`<label class="composite-channel" for="composite-${side}"><span>${label}</span><select id="composite-${side}" class="small-select" data-field="composite-${side}"><option value="">Choose speaker</option>${stereoDevices.map(d=>`<option value="${esc(d.id)}" ${draft[side+'Id']===d.id?'selected':''} ${d.status!=='online'||d.id===other||other&&stereoFamily(entity(m,other))!==stereoFamily(d)?'disabled':''}>${esc(d.name)}${d.status!=='online'?' · '+esc(d.status):''}</option>`).join('')}</select></label>`;
 return `<div class="modal-heading"><h2>Create group</h2><p>Play the same source together, or assign left and right stereo channels.</p></div>
 <div class="composite-form">
 <label class="composite-name" for="composite-name">Name<input id="composite-name" data-field="composite-name" class="text-input" value="${esc(draft.nameDraft||'')}" placeholder="e.g. Living room" maxlength="120" /></label>
 <label class="composite-mode"><input type="checkbox" data-field="composite-stereo" ${pair?'checked':''}/><span><strong>Stereo</strong><small>Two compatible speakers, one channel each</small></span></label>
 ${pair?`<div class="composite-channels">${channel('left','Left · L',draft.rightId)}${channel('right','Right · R',draft.leftId)}</div><p class="composite-hint">Only free speakers with reported stereo compatibility can be paired.</p>`:`<fieldset class="composite-members"><legend>Speakers & pairs</legend><div class="modal-list modal-list--small">${available.length?available.map(t=>`<label class="choice-row"><input type="checkbox" name="compositeMember" data-field="member-select" value="${esc(t.id)}" ${s.selectedForComposite.includes(t.id)?'checked':''} ${targetStatus(m,t.id)!=='online'?'disabled':''}/>${typeIcon(kind(m,t.id))}<span><strong>${esc(t.name)}</strong><small>${subline(m,t.id)}${targetStatus(m,t.id)!=='online'?' · '+esc(targetStatus(m,t.id)):''}</small></span></label>`).join(''):'<p class="empty-line">No free speakers or pairs.</p>'}</div></fieldset><label class="composite-mode"><input id="composite-persistent" data-field="composite-persistent" type="checkbox" ${draft.persistent!==false?'checked':''}/><span><strong>Keep group together</strong><small>Restore members when playback resumes</small></span></label>`}
 <p class="composite-hint" role="status">${esc(error||(pair?'Left and right channels are ready.':`${members.length} outputs selected.`))}</p>
 </div><div class="modal-footer">${action('close-modal','Cancel','btn-quiet')}${action('composite-create',pair?'Create stereo pair':'Create group','primary-btn',error?'disabled':'')}</div>`;
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
 const inner=s.modal.kind==='button-transfer'?renderPresetTransfer(s):s.modal.kind==='button-transfer-result'?renderPresetTransferResult(s):s.modal.kind==='rename'?renameDialog(s):s.modal.kind==='picker'?outputPicker(s):s.modal.kind==='create'?renderCompositeDialog(s):s.modal.kind==='volume'?volumeDialog(s):s.modal.kind==='preset'?renderPresetEditor(s):s.modal.kind==='wifi'?wifiDialog(s):s.modal.kind==='maintenance'?deviceMaintenance(s):genericDialog(s);
 return `<div class="overlay" role="presentation"><div class="modal-window ${s.modal.kind==='button-transfer'?'modal-window--transfer':s.modal.kind==='create'?'modal-window--create':s.modal.kind==='preset'?'modal-window--preset':s.modal.kind==='volume'?'modal-window--volume':''}" role="dialog" aria-modal="true" aria-label="${esc(s.modal.title||s.modal.kind||'Dialog')}"><div class="modal-window__close">${action('close-modal',icon('close'),'icon-btn','aria-label="Close dialog"')}</div>${inner}</div><button class="overlay-backdrop" data-action="close-modal" aria-label="Close dialog"></button></div>`;
}
