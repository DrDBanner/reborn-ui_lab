import {esc,icon,action,navHeader,tab,typeIcon} from '../components/shared.js';
import {entity,kind,parentIds,leafDeviceIds} from '../app/model.js';
import {renderItemKeyFunctions} from './device-functions.js';

export function renderItemMembers(s,item){
 const m=s.model,type=kind(m,item.id),physical=type==='device',parents=parentIds(m,item.id);
 const ids=physical?parents:item.memberIds||[];
 const add=physical&&!parents.length?action('start-group-create',icon('group_add')+' Add members…','btn-soft',`data-id="${esc(item.id)}" ${item.status!=='online'?'disabled':''}`):type==='group'?action('add-member',icon('group_add')+' Add members…','btn-soft',`data-id="${esc(item.id)}"`):'';
 const join=!parents.length?action('add-to-group','Add to existing group…','btn-quiet',`data-id="${esc(item.id)}"`):'';
 const description=physical?(parents.length?'Part of a pair or group':'No additional members'):`${ids.length} ${ids.length===1?'member':'members'}${type==='pair'?' · Stereo':''}`;
 const rows=ids.map(id=>{
  const member=entity(m,id),memberType=kind(m,id),channel=type==='pair'?(id===(item.leftDeviceId||item.memberIds[0])?'Left · L':'Right · R'):null;
  const leads=type==='group'&&leafDeviceIds(m,id).includes(item.leaderDeviceId),leaderName=entity(m,item.leaderDeviceId)?.name||'',detail=channel||(memberType!=='device'?`${leafDeviceIds(m,id).length} speakers${leads?` <span class="item-member__leader" title="${esc(leaderName)}">Main: ${esc(leaderName)}</span>`:''}`:leads?'Main speaker':'');
  return `<div class="item-member" data-member-id="${esc(id)}">${typeIcon(memberType)}<span class="item-member__label"><strong>${esc(member?.name||id)}</strong>${detail?`<small>${detail}</small>`:''}</span>${action(memberType==='device'?'device-open':'group-open',icon('open_in_new'),'icon-btn item-member__open',`data-id="${esc(id)}" title="Open details for ${esc(member?.name||id)}" aria-label="Open details for ${esc(member?.name||id)}"`)}${type==='group'?action('remove-member',icon('remove_circle_outline'),'icon-btn item-member__remove',`data-id="${esc(id)}" aria-label="Remove ${esc(member?.name||id)} from ${esc(item.name)}"`):''}</div>`;
 }).join('');
 const settings=type==='group'?action('group-settings',icon('settings'),'icon-btn group-settings-trigger',`data-id="${esc(item.id)}" title="Group settings" aria-label="Group settings for ${esc(item.name)}"`):'';
 const parentContext=!physical&&parents.length?`<div class="item-parent-context"><span>Part of ${esc(entity(m,parents[0])?.name)}</span>${action('group-open',icon('open_in_new'),'icon-btn',`data-id="${esc(parents[0])}" aria-label="Open parent group"`)}</div>`:'';
 return `<section class="item-membership" aria-label="Group Members"><header class="item-membership__heading"><div><h2>Group Members</h2><p>${description}</p></div><div class="item-membership__actions">${add}${join}${settings}</div></header>${parentContext}<div class="item-member-list" ${rows?'':'aria-hidden="true"'}>${rows}</div></section>`;
}

// All item kinds share the same visual hierarchy; functions/tabs remain capability-specific.
export function renderItemDetail(s,{item,subtitle,tabs,tabId,tabAction,body}){
 const type=kind(s.model,item.id);
 const title=typeIcon(type)+`<span class="device-detail-name">${esc(item.name)}</span>`+action('device-rename',icon('edit'),'icon-btn title-edit',`data-id="${esc(item.id)}" title="Rename ${type==='device'?'device':type==='pair'?'pair':'group'}" aria-label="Rename ${esc(item.name)}"`);
 return `${navHeader(title,subtitle,action('navigate',icon('arrow_back')+' All outputs','btn-quiet','data-value="outputs"'))}
 ${renderItemKeyFunctions(s,item.id)}
 ${renderItemMembers(s,item)}
 <div class="detail-tabs">${tabs.map(([id,label])=>tab(id,label,tabId===id,tabAction)).join('')}</div><div class="detail-body">${body}</div>`;
}
