import {entity,kind,targetStatus,source,sessionFor,leafDeviceIds} from '../app/model.js';
export const esc=(x)=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const iconFallback={graphic_eq:'≋',radio:'♫',speaker:'▣',speaker_group:'▥',groups:'▤',library_music:'♫',history:'◷',settings:'⚙',help:'?',science:'◇',tune:'☷',grid_view:'▦',add_circle_outline:'⊕',add_circle:'⊕',system_update:'↻',expand_more:'⌄',chevron_right:'›',close:'×',menu:'☰',light_mode:'☀',dark_mode:'☾',search:'⌕',play_arrow:'▶',pause:'Ⅱ',stop:'■',skip_next:'⏭',skip_previous:'⏮',volume_up:'◖',group_add:'⊕',add:'+',arrow_forward:'→',arrow_back:'←',favorite:'♥',favorite_border:'♡',more_horiz:'•••',edit:'✎',album:'◉',folder:'▱',dns:'▤',speaker_group:'▥',info:'i',delete_outline:'×',remove_circle_outline:'⊖',network_check:'◎',wifi:'◉',build:'⚒',alarm:'◷',code:'⌘',backup:'↑',settings_backup_restore:'↻',restart_alt:'↻',bug_report:'!',fast_forward:'≫',sync:'↻',download:'↓',desktop_windows:'▣',task_alt:'✓',add:'+',warning:'!',experiment:'◇',vertical_split:'▯',dock_to_left:'▣',check_circle:'✓',search_off:'∅',phone_iphone:'▯',delete:'×',check:'✓'};
export const icon=(name,extra='')=>`<span class="material-symbols-rounded ${extra}" data-fallback="${esc(iconFallback[name]||'•')}" aria-hidden="true">${esc(name)}</span>`;
const daisyRole={
 'btn-soft':'btn btn-sm btn-ghost',
 'btn-quiet':'btn btn-sm btn-ghost',
 'primary-btn':'btn btn-sm btn-primary',
 'danger-btn':'btn btn-sm btn-error',
 'icon-btn':'btn btn-square btn-sm btn-ghost',
 'text-action':'btn btn-sm btn-link',
};
export const action=(name,label,cls='btn',props='')=>`<button type="button" class="${daisyRole[cls.split(' ')[0]]||''} ${cls}" data-action="${esc(name)}" ${props}>${label}</button>`;
export const statusLabel=(status)=>({online:'Online',offline:'Offline',updating:'Updating',partial:'Partly offline',needs_setup:'Needs setup',unknown:'Unknown'})[status]||esc(status);
export const statusBadge=(status)=>`<span class="status status--${esc(status)}"><i></i>${statusLabel(status)}</span>`;
export function targetIcon(type){return type==='pair'?'speaker_group':type==='group'?'groups':'speaker'}
export function labelForTarget(model,id){return entity(model,id)?.name||'Choose output'}
export function subline(model,id){const k=kind(model,id);if(k==='device')return `${esc(entity(model,id)?.model||'Speaker')} · ${statusLabel(targetStatus(model,id))}`;return `${k==='pair'?'Stereo pair':'Group'} · ${leafDeviceIds(model,id).length} speakers`}
export function outputItem(model,id,{compact=false,selected=false,extra=''}={}){
 const t=entity(model,id);if(!t)return '';
 const k=kind(model,id),status=targetStatus(model,id),s=sessionFor(model,id);
 return `<button type="button" class="output-item ${compact?'output-item--compact':''} ${selected?'is-selected':''}" data-action="select-output" data-id="${esc(id)}" title="${esc(t.name)}">
    <span class="output-item__symbol">${icon(targetIcon(k))}</span>
    <span class="output-item__body"><strong>${esc(t.name)}</strong><small>${statusLabel(status)}${s?' · Playing':''}</small></span>
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
