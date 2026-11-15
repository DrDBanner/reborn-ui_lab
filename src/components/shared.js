import {entity,kind,targetStatus,source,sessionFor,leafDeviceIds,deviceAddresses} from '../app/model.js';
import {serviceBrandIcons} from './service-brands.js';
import {materialIcons} from './material-icons.js';
export const esc=(x)=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
// Local Google Material Symbols SVGs work in every preview, including offline.
export const icon=(name,extra='')=>{
 const brand=serviceBrandIcons[name];
 if(brand)return `<span class="brand-symbol brand-symbol--${esc(name)} ${esc(extra)}" data-brand="${esc(name)}" aria-hidden="true"><svg viewBox="${esc(brand.viewBox)}" fill="currentColor" focusable="false">${brand.paths.map(d=>`<path d="${esc(d)}"/>`).join('')}</svg></span>`;
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
export const statusLabel=(status)=>({online:'Online',offline:'Offline',updating:'Updating',error:'Device error',partial:'Partly offline',needs_setup:'Needs setup',unknown:'Unknown'})[status]||esc(status);
export const statusBadge=(status)=>`<span class="device-status device-status--${esc(status)}"><i></i>${statusLabel(status)}</span>`;
export function targetIcon(type){return type==='pair'?'speaker_group':type==='group'?'lan':'speaker'}
export const typeIcon=(type,extra='')=>`<span class="entity-type ${esc(extra)}" role="img" aria-label="${type==='pair'?'Stereo pair':type==='group'?'Speaker group':'Speaker'}" title="${type==='pair'?'Stereo pair':type==='group'?'Speaker group':'Speaker'}">${icon(targetIcon(type))}</span>`;
export function labelForTarget(model,id){return entity(model,id)?.name||'Choose output'}
export const deviceProduct=device=>[device?.brand,device?.model].filter(Boolean).join(' · ')||'Speaker';
export function subline(model,id){const k=kind(model,id);if(k==='device')return `${esc(deviceProduct(entity(model,id)))} · ${statusLabel(targetStatus(model,id))}`;return `${leafDeviceIds(model,id).length} speakers`}
export function deviceAddressRows(device){
 return ['ipv4','ipv6'].map(family=>`<div class="device-address-row device-address-row--${family}"><span>${family==='ipv4'?'IPv4':'IPv6'}</span><strong>${deviceAddresses(device,family).map(address=>`<span class="device-address">${esc(address)}</span>`).join('')||'Not reported'}</strong></div>`).join('');
}
export function outputItem(model,id,{compact=false,selected=false,extra=''}={}){
 const t=entity(model,id);if(!t)return '';
 const k=kind(model,id),status=targetStatus(model,id),s=sessionFor(model,id);
 return `<button type="button" class="output-item ${compact?'output-item--compact':''} ${selected?'is-selected':''}" data-action="select-output" data-id="${esc(id)}" title="${esc(t.name)}" ${selected?'aria-current="page"':''}>
    <span class="output-item__symbol">${typeIcon(k)}</span>
    <span class="output-item__body"><strong>${esc(t.name)}</strong><small>${statusLabel(status)}${s&&s.status!=='stopped'?' · '+({playing:'Playing',paused:'Paused'}[s.status]||''):''}</small></span>
    <span class="output-item__trail">${s&&s.status!=='stopped'?icon('music_cast',s.status==='playing'?'stream-symbol':'stream-symbol--paused'):icon('chevron_right')}</span>
 </button>${extra}`;
}
export function sourceMediumLabel(item){return ({radio:'Radio',library:'Library',spotify:'Spotify'})[item?.type]||item?.service||'Service'}
export function sourceTypeLabel(item){
 if(!item)return 'Unassigned';
 if(item.type==='radio')return 'Radio station';
 if(item.type==='spotify')return item.kind==='album'?'Spotify album':'Spotify playlist';
 if(item.type==='library')return ({track:'Library track',folder:'Library folder',queue:'Library queue',album:'Library album'})[item.kind]||'Library collection';
 return item.service||'Native service';
}
export function sourceTypeIcon(item){
 if(item?.type==='radio')return 'radio';
 if(item?.type==='spotify')return 'spotify';
 if(item?.type==='library')return item.kind==='folder'?'folder':item.kind==='track'?'music_note':item.kind==='queue'?'library_music':'album';
 return 'music_cast';
}
export function sourceDestination(item){
 return ({radio:{view:'listen',label:'Radio'},library:{view:'library',label:'Library'},spotify:{view:'spotify',label:'Spotify'}})[item?.type]||null;
}
export function sourceArtAttributes(item){
 return `data-source-type="${esc(item?.type||'')}" style="--source-color:${esc(item?.type==='radio'?'var(--muted)':item?.type==='spotify'?'var(--spotify)':item?.color||'#7289ae')}"`;
}
export function sourceTile(s,{active=false,playing=false,actionName='source-select',cls=''}={}){
 return `<button type="button" class="source-tile ${active?'is-selected':''} ${playing?'is-playing':''} ${cls}" data-action="${esc(actionName)}" data-id="${esc(s.id)}" title="Choose output for ${esc(s.name)}">
  <span class="source-art" ${sourceArtAttributes(s)}>${icon(sourceTypeIcon(s))}</span>
  <span class="source-tile__content"><strong>${esc(s.name)}</strong><small>${esc(s.subtitle)}</small></span>${icon('music_cast','source-tile__cast')}
 </button>`;
}
export function sourceRow(s,{favorite=false,playTarget=null,playable=false}={}){
 const artwork=icon(sourceTypeIcon(s));
 const playLabel=playTarget?`Play ${s.name} on ${playTarget.name}`:`Choose an output before playing ${s.name}`;
 const art=playTarget?action('source-play',`<span class="source-art__identity">${artwork}</span>${icon('play_circle','source-art__play')}`,'source-art source-art--sm source-art--play',`${sourceArtAttributes(s)} data-id="${esc(s.id)}" data-target="${esc(playTarget.id)}" title="${esc(playLabel)}" aria-label="${esc(playLabel)}" ${playable?'':'disabled'}`):`<span class="source-art source-art--sm" ${sourceArtAttributes(s)}>${artwork}</span>`;
 return `<div class="source-row">${art}<div class="source-row__main"><strong>${esc(s.name)}</strong><small>${esc(s.subtitle)}</small></div><span class="source-row__genre">${esc(s.genre)}</span><div class="source-row__actions">
   ${action('source-select',icon('music_cast'),'icon-btn',`data-id="${esc(s.id)}" title="Choose output" aria-label="Choose output for ${esc(s.name)}"`)}
   ${action('toggle-favorite',icon(favorite?'favorite':'favorite_border'),'icon-btn',`data-id="${esc(s.id)}" title="Toggle favorite" aria-label="Favorite ${esc(s.name)}" aria-pressed="${favorite}"`)}
   ${action('source-info',icon(s.type==='radio'?'search_insights':'info'),'icon-btn',`data-id="${esc(s.id)}" title="${s.type==='radio'?'Station':'Source'} information" aria-label="Information about ${esc(s.name)}"`)}
 </div></div>`;
}
export function card(title,subtitle,body,extra=''){
 return `<section class="panel ${extra}"><header class="panel-head"><h2>${title}</h2>${subtitle?`<p>${subtitle}</p>`:''}</header><div class="panel-body">${body}</div></section>`;
}
export const empty=(symbol,title,description,button='')=>`<div class="empty-state">${icon(symbol,'empty-state__icon')}<h2>${title}</h2><p>${description}</p>${button}</div>`;
export const tab=(id,label,selected,actionName='switch-tab')=>action(actionName,esc(label),`tab-control ${selected?'active':''}`,`data-value="${esc(id)}"`);
export const field=(name,content,help='')=>`<div class="form-row"><label>${name}${help?`<small>${help}</small>`:''}</label><div class="form-row__control">${content}</div></div>`;
export const pageTools=tools=>`<div class="page-tools">${tools}</div>`;
export const navHeader=(title,subtitle,tools='')=>`<div class="page-heading"><div><h1>${title}</h1><p>${subtitle||''}</p></div>${tools?`<div class="page-heading__tools">${tools}</div>`:''}</div>`;

export function notificationStack(s){
 return `<aside class="toast-stack" aria-label="Notifications">${(s.toasts||[]).map(notice=>{
  const elapsed=Math.max(0,Date.now()-(notice.leaving?notice.dismissedAt:notice.createdAt)),delay=Math.min(elapsed,notice.leaving?220:280);
  return `<div class="toast-message toast-message--${esc(notice.kind)} ${notice.leaving?'is-leaving':''}" data-toast-id="${esc(notice.id)}" role="${notice.kind==='error'?'alert':'status'}" style="animation-delay:-${delay}ms;--toast-age:-${Math.max(0,Date.now()-notice.createdAt)}ms;--toast-duration:${notice.duration}ms" ${notice.duration?'data-auto-dismiss="true"':''}>${icon(notice.kind==='error'?'warning':notice.kind==='update'?'system_update':'check_circle','toast-symbol')}<span>${esc(notice.message)}${notice.destination==='updates'?`<a href="#updates" class="toast-action" data-action="open-updates-notice" data-id="${esc(notice.id)}">Updates &amp; maintenance ${icon('arrow_forward')}</a>`:''}</span>${action('dismiss-toast',icon('close'),'icon-btn',`data-id="${esc(notice.id)}" aria-label="Dismiss notification"`)}</div>`;
 }).join('')}</aside>`;
}
