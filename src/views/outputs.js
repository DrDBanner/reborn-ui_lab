import {esc,icon,action,card,empty,navHeader,statusBadge,subline,targetIcon} from '../components/shared.js';
import {getTargets,kind,entity,parentIds,targetStatus,leafDeviceIds,sessionFor,effectiveSessionFor,source,visibleOutputs} from '../app/model.js';

const filters=[['all','All outputs'],['device','Speakers'],['pair','Stereo pairs'],['group','Groups']];
function outputCard(s,t){
 const m=s.model,type=kind(m,t.id),status=targetStatus(m,t.id),session=effectiveSessionFor(m,t.id),parents=parentIds(m,t.id);
 const selected=s.selectedForComposite.includes(t.id),sourceData=source(s.catalog,session?.sourceId);
 return `<article class="target-card ${selected?'target-card--checked':''}">
 <header class="target-card__header"><span class="target-card__icon">${icon(targetIcon(type))}</span>
 <div class="target-card__title"><strong>${esc(t.name)}</strong><small>${esc(type==='device'?t.model:type==='pair'?'Stereo pair':'Speaker group')}</small></div>
 <input type="checkbox" data-field="member-select" value="${esc(t.id)}" ${selected?'checked':''} title="Select to create a group or pair" aria-label="Select ${esc(t.name)} for grouping" /></header>
 <div class="target-card__status">${statusBadge(status)}${parents.length?`<span class="micro">In ${esc(entity(m,parents[0])?.name)}</span>`:''}</div>
 <div class="target-card__stream">${sourceData?`<span>${icon('graphic_eq')} ${esc(sourceData.name)}${session?.targetId!==t.id?' · via group':''}</span>`:`<span class="muted">${type==='device'?esc(t.ip):`${leafDeviceIds(m,t.id).length} speaker(s)`}</span>`}</div>
 <footer class="target-card__actions">${action('select-output',icon('speaker')+' Use output','btn-soft',`data-id="${t.id}"`)}${action(type==='device'?'device-open':'group-open','Manage '+icon('arrow_forward'),'btn-quiet',`data-id="${t.id}"`)}</footer></article>`;
}
export function renderOutputs(s){
 const m=s.model,filter=m.ui.outputFilter||'all',q=s.outputSearch.toLowerCase();
 const targets=getTargets(m).filter(x=>(filter==='all'||kind(m,x.id)===filter)&&x.name.toLowerCase().includes(q));
 const outputCount=visibleOutputs(m).length;
 return `${navHeader('Outputs & groups', 'A speaker, a stereo pair and a group can all be addressed as playback targets.', `${action('start-group-create',icon('group_add')+' Create group','btn-soft')}${action('start-pair-create',icon('speaker_group')+' Stereo pair','primary-btn')}`)}
 <section class="summary-strip"><div><strong>${m.devices.length}</strong><span>physical speakers</span></div><div><strong>${m.pairs.length}</strong><span>stereo pairs</span></div><div><strong>${m.groups.length}</strong><span>groups</span></div><div><strong>${m.sessions.length}</strong><span>playback sessions</span></div></section>
 <div class="toolbar"><div class="segmented">${filters.map(([id,name])=>action('filter-outputs',name,`tab-control ${filter===id?'active':''}`,`data-value="${id}"`)).join('')}</div><label class="search-field search-field--small">${icon('search')}<input type="search" data-field="output-search" value="${esc(s.outputSearch)}" placeholder="Find any output" aria-label="Search devices and groups" /></label></div>
 ${s.selectedForComposite.length?`<div class="selection-bar"><span>${s.selectedForComposite.length} selected</span>${action('start-group-create','Create group','btn-soft')}${action('start-pair-create','Make stereo pair','btn-soft')}${action('clear-selected','Clear','text-action')}</div>`:''}
 <section class="targets-grid">${targets.length?targets.map(t=>outputCard(s,t)).join(''):empty('speaker_group','No matching outputs','Clear search or change the filter.')}</section>
 <p class="explain-note">Pairs appear as one output in everyday navigation. This full workspace still exposes the physical speakers and their relationships for configuration and maintenance.</p>`;
}
export function renderGroup(s){const m=s.model,group=entity(m,s.detailOutputId),type=kind(m,s.detailOutputId);
 if(!group||type==='device')return empty('speaker_group','Group not found','Choose a group from Outputs & groups.',action('navigate','All outputs','btn-soft','data-value="outputs"'));
 const session=sessionFor(m,group.id);
 return `${navHeader(esc(group.name),`${type==='pair'?'Stereo pair':'Speaker group'} · ${group.persistent?'Persistent':'Temporary'}`,`${action('navigate',icon('arrow_back')+' All outputs','btn-quiet','data-value="outputs"')}`)}
 <div class="two-col two-col--wide">${card('Members','Manage membership independently of playback',`<div class="settings-list">${group.memberIds.map(id=>{const item=entity(m,id);return `<div class="setting-line"><span class="setting-line__icon">${icon(targetIcon(kind(m,id)))}</span><div class="setting-line__body"><strong>${esc(item?.name||id)}</strong><small>${subline(m,id)}</small></div>${type==='group'?action('remove-member',icon('remove_circle_outline'),'icon-btn',`data-id="${id}" title="Remove member"`):''}</div>`}).join('')}</div>${type==='group'?action('add-member',icon('add')+' Add speaker or pair','btn-soft mt-4'):''}`)}
 ${card('Playback & settings','One logical output; detailed controls remain available',`<div class="setting-line"><div class="setting-line__body"><strong>Current stream</strong><small>${esc(source(s.catalog,session?.sourceId)?.name||'Nothing playing')}</small></div>${action('navigate','Browse sources','btn-soft','data-value="listen"')}</div><div class="form-row"><label for="group-volume">Group volume</label><div class="range-row"><input id="group-volume" type="range" data-field="composite-volume" min="0" max="100" value="${group.volume??25}" /><strong>${group.volume??25}</strong></div></div><div class="setting-line"><div class="setting-line__body"><strong>Persistent</strong><small>Restore group when supported by the backend</small></div><input data-field="group-persistent" type="checkbox" role="switch" aria-label="Persistent group" ${group.persistent?'checked':''}/></div>`)}
 </div>
 ${card('Individual speaker levels','Device-specific levels remain accessible when supported by the backend.',`<div class="member-levels">${leafDeviceIds(m,group.id).map(id=>{const d=entity(m,id),enabled=d?.status==='online';return `<div class="member-level"><span class="member-level__name">${esc(d?.name||id)}<small>${esc(d?.status||'Unknown')}</small></span><input type="range" min="0" max="100" value="${d?.volume??25}" data-field="member-volume" data-id="${id}" aria-label="Volume for ${esc(d?.name||id)}" ${enabled?'':'disabled'}/><strong>${d?.volume??25}</strong></div>`}).join('')}</div>`)}
 <div class="danger-footer">${action('dissolve-group',icon('delete_outline')+` Dissolve ${type==='pair'?'pair':'group'}`,'danger-btn')}</div>`;
}
