import {entity,kind,targetStatus,source,sessionFor,leafDeviceIds} from '../app/model.js';
import {materialIcons} from './material-icons.js';
export const esc=(x)=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
// Local Google Material Symbols SVGs work in every preview, including offline.
export const icon=(name,extra='')=>{
 const symbol=materialIcons[name]||materialIcons.help;
 return `<span class="material-symbols-rounded ${esc(extra)}" data-icon="${esc(name)}" aria-hidden="true"><svg viewBox="${esc(symbol.viewBox)}" fill="currentColor" focusable="false">${symbol.paths.map(d=>`<path d="${esc(d)}"/>`).join('')}</svg></span>`;
};
const daisyRole={
 'btn-soft':'btn btn-sm btn-ghost',
 'btn-quiet':'btn btn-sm btn-ghost',
 'primary-btn':'btn btn-sm btn-primary',
 'danger-btn':'btn btn-sm btn-error',
 'icon-btn':'btn btn-square btn-sm btn-ghost',
 'text-action':'btn btn-sm btn-link',
};
export const action=(name,label,cls='btn',props='')=>{
 const iconOnly=!label.replace(/<[^>]*>/g,'').trim();
 const accessibleLabel=iconOnly&&!props.includes('aria-label=')?`aria-label="${esc(props.match(/title="([^"]+)"/)?.[1]||name.replace(/-/g,' '))}"`:'';
 return `<button type="button" class="${daisyRole[cls.split(' ')[0]]||''} ${cls}" data-action="${esc(name)}" ${props} ${accessibleLabel}>${label}</button>`;
};
export const statusLabel=(status)=>({online:'Online',offline:'Offline',updating:'Updating',partial:'Partly offline',needs_setup:'Needs setup',unknown:'Unknown'})[status]||esc(status);
export const statusBadge=(status)=>`<span class="device-status device-status--${esc(status)}"><i></i>${statusLabel(status)}</span>`;
export function targetIcon(type){return type==='pair'?'speaker_group':type==='group'?'hub':'speaker'}
export const typeIcon=(type,extra='')=>`<span class="entity-type ${esc(extra)}" role="img" aria-label="${type==='pair'?'Stereo pair':type==='group'?'Speaker group':'Speaker'}" title="${type==='pair'?'Stereo pair':type==='group'?'Speaker group':'Speaker'}">${icon(targetIcon(type))}</span>`;
export function labelForTarget(model,id){return entity(model,id)?.name||'Choose output'}
export function subline(model,id){const k=kind(model,id);if(k==='device')return `${esc(entity(model,id)?.model||'Speaker')} · ${statusLabel(targetStatus(model,id))}`;return `${leafDeviceIds(model,id).length} speakers`}
export function outputItem(model,id,{compact=false,selected=false,extra=''}={}){
 const t=entity(model,id);if(!t)return '';
 const k=kind(model,id),status=targetStatus(model,id),s=sessionFor(model,id);
 return `<button type="button" class="output-item ${compact?'output-item--compact':''} ${selected?'is-selected':''}" data-action="select-output" data-id="${esc(id)}" title="${esc(t.name)}">
    <span class="output-item__symbol">${typeIcon(k)}</span>
    <span class="output-item__body"><strong>${esc(t.name)}</strong><small>${statusLabel(status)}${s?' · '+({playing:'Playing',paused:'Paused',stopped:'Stopped'}[s.status]||''):''}</small></span>
    <span class="output-item__trail">${s?icon('graphic_eq','eq-symbol'):icon('chevron_right')}</span>
 </button>${extra}`;
}
export function sourceTile(s,{active=false,actionName='source-select',cls=''}={}){
 return `<button type="button" class="source-tile ${active?'is-selected':''} ${cls}" data-action="${esc(actionName)}" data-id="${esc(s.id)}">
  <span class="source-art" style="--source-color:${esc(s.color||'#7289ae')}">${icon(s.type==='radio'?'radio':s.type==='spotify'?'music_note':'album')}</span>
  <span class="source-tile__content"><strong>${esc(s.name)}</strong><small>${esc(s.subtitle)}</small></span>${icon('play_arrow','source-tile__play')}
 </button>`;
}
export function sourceRow(s,{favorite=false}={}){
 return `<div class="source-row"><span class="source-art source-art--sm" style="--source-color:${esc(s.color)}">${icon(s.type==='radio'?'radio':s.type==='spotify'?'music_note':'album')}</span><div class="source-row__main"><strong>${esc(s.name)}</strong><small>${esc(s.subtitle)}</small></div><span class="source-row__genre">${esc(s.genre)}</span><div class="source-row__actions">
   ${action('source-select',icon('play_arrow'),'icon-btn',`data-id="${esc(s.id)}" title="Play on output" aria-label="Play ${esc(s.name)}"`)}
   ${action('toggle-favorite',icon(favorite?'favorite':'favorite_border'),'icon-btn',`data-id="${esc(s.id)}" title="Toggle favorite" aria-label="Favorite ${esc(s.name)}"`)}
   ${action('source-info',icon('more_horiz'),'icon-btn',`data-id="${esc(s.id)}" title="Station information" aria-label="Information about ${esc(s.name)}"`)}
 </div></div>`;
}
export function card(title,subtitle,body,extra=''){
 return `<section class="panel ${extra}"><header class="panel-head"><h2>${title}</h2>${subtitle?`<p>${subtitle}</p>`:''}</header><div class="panel-body">${body}</div></section>`;
}
export const empty=(symbol,title,description,button='')=>`<div class="empty-state">${icon(symbol,'empty-state__icon')}<h2>${title}</h2><p>${description}</p>${button}</div>`;
export const tab=(id,label,selected,actionName='switch-tab')=>action(actionName,esc(label),`tab-control ${selected?'active':''}`,`data-value="${esc(id)}"`);
export const field=(name,content,help='')=>`<div class="form-row"><label>${name}${help?`<small>${help}</small>`:''}</label><div class="form-row__control">${content}</div></div>`;
export const navHeader=(title,subtitle,tools='')=>`<div class="page-heading"><div><h1>${title}</h1><p>${subtitle||''}</p></div>${tools?`<div class="page-heading__tools">${tools}</div>`:''}</div>`;
