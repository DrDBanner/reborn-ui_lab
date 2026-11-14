import {esc,icon,action,statusBadge,targetIcon,subline} from './shared.js';
import {entity,kind,visibleOutputs,parentIds,source,targetStatus} from '../app/model.js';

function outputPicker(s){const m=s.model,src=source(s.catalog,s.speakerPickerFor||m.selectedSourceId),targets=visibleOutputs(m);
 return `<div class="modal-heading"><h2>${src?'Play '+esc(src.name)+' on…':'Choose output'}</h2><p>${src?'Selecting an output will start this source. Existing sessions on unrelated devices keep playing.':'Choose a playback target or manage its configuration.'}</p></div>
  <div class="modal-list">${targets.length?targets.map(t=>{const status=targetStatus(m,t.id);return `<button class="modal-output" data-action="assign-output" data-id="${esc(t.id)}" ${status==='offline'||status==='needs_setup'?'disabled':''}>
   <span class="target-card__icon">${icon(targetIcon(kind(m,t.id)))}</span><span><strong>${esc(t.name)}</strong><small>${subline(m,t.id)}</small></span>${statusBadge(status)}${icon('arrow_forward')}</button>`}).join(''):`<p class="empty-line">No outputs configured.</p>`}</div>
  <div class="modal-footer">${action('close-modal','Cancel','btn-quiet')}${action('navigate','Manage all outputs','btn-soft','data-value="outputs"')}</div>`;
}
function createComposite(s){const m=s.model,pair=s.modal.type==='pair',candidates=pair?m.devices.filter(d=>!parentIds(m,d.id).length):visibleOutputs(m).filter(t=>kind(m,t.id)!=='group');
 return `<div class="modal-heading"><h2>${pair?'Create stereo pair':'Create speaker group'}</h2><p>${pair?'Select two available physical speakers.':'Select two or more outputs to play the same source together.'}</p></div>
 <div class="form-row"><label>Name</label><input id="composite-name" class="text-input" value="${pair?'New stereo pair':'New group'}" /></div>
 <div class="form-row"><label>Members</label><div class="modal-list modal-list--small">${candidates.map(t=>`<label class="choice-row"><input type="checkbox" name="compositeMember" value="${esc(t.id)}" ${s.selectedForComposite.includes(t.id)?'checked':''}/>${icon(targetIcon(kind(m,t.id)))}<span><strong>${esc(t.name)}</strong><small>${subline(m,t.id)}</small></span></label>`).join('')}</div></div>
 ${!pair?`<div class="form-row"><label>Persistent</label><input id="composite-persistent" type="checkbox" checked /></div>`:''}
 <div class="modal-footer">${action('close-modal','Cancel','btn-quiet')}${action('composite-create',`Create ${pair?'pair':'group'}`,'primary-btn')}</div>`;
}
function presetDialog(s){const m=s.model,target=m.devices.find(x=>x.id===m.selectedDeviceId)||m.devices[0];const presets=target?.presets??[];
 return `<div class="modal-heading"><h2>Edit quick presets</h2><p>The six hardware keys belong to a physical speaker. Select a speaker before applying changes.</p></div>
 <div class="form-row"><label>Speaker</label><select id="preset-device" class="small-select">${m.devices.map(d=>`<option value="${d.id}" ${d.id===target?.id?'selected':''}>${esc(d.name)}</option>`).join('')}</select></div>
 <div class="preset-editor">${Array.from({length:6},(_,i)=>`<div class="preset-line"><span class="preset-line__num">${i+1}</span><select class="small-select" data-preset-index="${i}"><option value="">Unassigned</option>${s.catalog.sources.map(x=>`<option value="${x.id}" ${presets[i]===x.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select></div>`).join('')}</div><div class="modal-footer">${action('close-modal','Cancel','btn-quiet')}${action('preset-save','Save presets','primary-btn')}</div>`;
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
function genericDialog(s){const t=s.modal||{};return `<div class="modal-heading"><h2>${esc(t.title||'Information')}</h2><p>${esc(t.description||'')}</p></div>${t.body?`<div class="modal-generic">${t.body}</div>`:''}<div class="modal-footer">${action('close-modal','Close','primary-btn')}</div>`}
export function renderDialog(s){if(!s.modal)return '';
 const inner=s.modal.kind==='picker'?outputPicker(s):s.modal.kind==='create'?createComposite(s):s.modal.kind==='preset'?presetDialog(s):s.modal.kind==='wifi'?wifiDialog(s):s.modal.kind==='maintenance'?deviceMaintenance(s):genericDialog(s);
 return `<div class="overlay" role="presentation"><div class="modal-window" role="dialog" aria-modal="true" aria-label="${esc(s.modal.title||s.modal.kind||'Dialog')}"><div class="modal-window__close">${action('close-modal',icon('close'),'icon-btn','aria-label="Close dialog"')}</div>${inner}</div><button class="overlay-backdrop" data-action="close-modal" aria-label="Close dialog"></button></div>`;
}
