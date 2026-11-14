import {renderPresetEditor} from './preset-editor.js';
import {renderPresetTransfer,renderPresetTransferResult} from './preset-transfer.js';
import {esc,icon,action,statusBadge,targetIcon,subline,typeIcon} from './shared.js';
import {entity,kind,visibleOutputs,parentIds,source,targetStatus,buttonProfile,buttonPresets,leafDeviceIds,stereoFamily,validateGroupMembers,playbackJoinError,effectiveSessionFor,groupLeaderCandidates,remoteGroupKeyDevices} from '../app/model.js';

function renderGroupSettings(s){
 const draft=s.modal.draft,group=entity(s.model,draft.groupId),candidates=groupLeaderCandidates(s.model,group),receivers=remoteGroupKeyDevices(s.model),receiver=entity(s.model,draft.receiverId);
 if(!group)return '<div class="modal-heading"><h2>Group no longer available</h2></div>';
 const keys=[['thumbsUp','Thumbs up'],['thumbsDown','Thumbs down']];
 return `<div class="modal-heading"><h2>Group settings</h2><p>${esc(group.name)}</p></div><div class="group-settings-body">
 <label class="group-settings-field" for="group-leader"><strong>Main speaker</strong><select id="group-leader" class="small-select" data-field="group-settings-leader"><option value="">Choose speaker</option>${candidates.map(device=>`<option value="${esc(device.id)}" ${draft.leaderDeviceId===device.id?'selected':''} ${device.status!=='online'?'disabled':''}>${esc(device.name)}${device.status!=='online'?' · '+esc(device.status):''}</option>`).join('')}</select><small>Leads playback for this group.</small></label>
 <label class="group-persistence-setting"><span><strong>Keep group together</strong><small>Restore this group when its main speaker starts music, including after standby or restart.</small></span><input type="checkbox" role="switch" data-field="group-settings-persistent" ${draft.persistent?'checked':''}/></label>
 <section class="remote-group-settings"><h3>Remote group buttons</h3><p>Press once to form this group, again to dissolve it. Separate from presets 1–6.</p>
 ${receivers.length?`<label class="group-settings-field" for="group-remote"><span>Remote received by</span><select id="group-remote" class="small-select" data-field="group-settings-receiver">${receivers.map(device=>`<option value="${esc(device.id)}" ${draft.receiverId===device.id?'selected':''}>${esc(device.name)}${device.status!=='online'?' · '+esc(device.status):''}</option>`).join('')}</select></label>
 <div class="remote-group-key-list">${keys.filter(([key])=>receiver?.capabilities?.grouping?.remoteKeys?.includes(key)).map(([key,label])=>{
  const binding=receiver.groupKeys?.bindings?.[key],existing=receiver.groupKeys?.templates?.find(template=>template.id===binding),replacing=binding&&binding!==group.id;
  return `<label class="remote-group-key"><input type="checkbox" data-field="group-settings-key" data-key="${key}" ${draft.bindings[receiver.id]?.[key]?'checked':''} ${receiver.status!=='online'?'disabled':''}/><span><strong>${label}</strong><small>${replacing?`Replaces ${esc(existing?.name||'another group')}`:`Form / dissolve ${esc(group.name)}`}</small></span></label>`;
 }).join('')}</div><p class="group-settings-help">Saves a group template on the receiving speaker. Playback does not change when you save.</p>`:'<p>No device reports support for remote group buttons.</p>'}</section>
 </div><div class="modal-footer">${action('close-modal','Cancel','btn-quiet')}${action('group-settings-save','Save settings','primary-btn',draft.leaderDeviceId?'':'disabled')}</div>`;
}

function outputPicker(s){
 const m=s.model,modal=s.modal,src=source(s.catalog,modal.sourceId||s.speakerPickerFor||m.selectedSourceId),targets=visibleOutputs(m),context=modal.joinContext,joining=!!modal.asMember;
 const origin=entity(m,context?.targetId),contextError=context?playbackJoinError(m,context):'Start or select a playback to join.';
 const changesSource=context&&src?.id!==context.sourceId;
 return `<div class="modal-heading"><h2>${joining?`Add members to ${esc(origin?.name||'playback')}`:src?'Play '+esc(src.name)+' on…':'Choose output'}</h2><p>${joining?'Join the same playback and share its controls.':'Start a separate playback on the selected output.'}</p></div>
 ${`<label class="picker-membership"><input type="checkbox" data-field="picker-as-member" ${joining?'checked':''} ${contextError&&!joining?'disabled':''}/><span><strong>As member</strong><small>${contextError?esc(contextError):`Play ${esc(src?.name||'this source')} together with ${esc(origin?.name)}.`}</small></span></label>`}
 ${joining&&changesSource?`<p class="picker-source-change">${esc(source(s.catalog,context.sourceId)?.name||'The current source')} on ${esc(origin?.name)} will be replaced by ${esc(src?.name)} for the whole output.</p>`:''}
 <div class="modal-list">${targets.length?targets.map(target=>{
  const status=targetStatus(m,target.id),joinError=joining?playbackJoinError(m,context,target.id):null,playback=effectiveSessionFor(m,target.id),replacing=playback&&playback.id!==context?.sessionId&&playback.status!=='stopped';
  const unavailable=['offline','needs_setup','updating'].includes(status),hint=joinError?esc(joinError):replacing?esc(`Replaces ${source(s.catalog,playback.sourceId)?.name||'existing playback'} on ${target.name}`):subline(m,target.id);
  return `<button class="modal-output" data-action="assign-output" data-id="${esc(target.id)}" ${unavailable||joinError?'disabled':''}><span class="target-card__icon">${typeIcon(kind(m,target.id))}</span><span class="picker-output-label"><strong>${esc(target.name)}</strong><small>${hint}</small></span>${statusBadge(status)}${icon(joining?'group_add':'play_circle')}</button>`;
 }).join(''):'<p class="empty-line">No outputs configured.</p>'}</div>
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
 const label=kind(s.model,s.modal.deviceId)==='device'?'device':kind(s.model,s.modal.deviceId)==='pair'?'stereo pair':'group';
 return `<div class="modal-heading"><h2>Rename ${label}</h2><p>${esc(device?.name||'')}</p></div>
 <label class="rename-label" for="device-name">Name</label><input id="device-name" class="text-input rename-input" data-field="device-name" value="${esc(s.modal.nameDraft??device?.name??'')}" maxlength="120" autocomplete="off" />
 <div class="modal-footer">${action('close-modal','Cancel','btn-quiet')}${action('device-rename-save','Save name','primary-btn')}</div>`;
}
function genericDialog(s){const t=s.modal||{};return `<div class="modal-heading"><h2>${esc(t.title||'Information')}</h2><p>${esc(t.description||'')}</p></div>${t.body?`<div class="modal-generic">${t.body}</div>`:''}<div class="modal-footer">${action('close-modal','Close','primary-btn')}</div>`}
export function renderDialog(s){if(!s.modal)return '';
 const inner=s.modal.kind==='group-settings'?renderGroupSettings(s):s.modal.kind==='button-transfer'?renderPresetTransfer(s):s.modal.kind==='button-transfer-result'?renderPresetTransferResult(s):s.modal.kind==='rename'?renameDialog(s):s.modal.kind==='picker'?outputPicker(s):s.modal.kind==='create'?renderCompositeDialog(s):s.modal.kind==='volume'?volumeDialog(s):s.modal.kind==='preset'?renderPresetEditor(s):s.modal.kind==='wifi'?wifiDialog(s):s.modal.kind==='maintenance'?deviceMaintenance(s):genericDialog(s);
 return `<div class="overlay" role="presentation"><div class="modal-window ${s.modal.kind==='group-settings'?'modal-window--group-settings':s.modal.kind==='button-transfer'?'modal-window--transfer':s.modal.kind==='create'?'modal-window--create':s.modal.kind==='preset'?'modal-window--preset':s.modal.kind==='volume'?'modal-window--volume':''}" role="dialog" aria-modal="true" aria-label="${esc(s.modal.title||s.modal.kind||'Dialog')}"><div class="modal-window__close">${action('close-modal',icon('close'),'icon-btn','aria-label="Close dialog"')}</div>${inner}</div><button class="overlay-backdrop" data-action="close-modal" aria-label="Close dialog"></button></div>`;
}
