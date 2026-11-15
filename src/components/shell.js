import {brandMark} from './brand.js';
import {esc,icon,action,statusLabel,outputItem,typeIcon,sourceDestination,sourceArtAttributes} from './shared.js';
import {entity,visibleOutputs,kind,source,currentSession,leafDeviceIds,targetStatus} from '../app/model.js';

const navSections=[
 {id:'listen',name:'MEDIA',landing:'listen',items:[['listen','Radio','radio'],['library','Library','library_music'],['history','Recently played','history'],['spotify','Spotify','music_cast']]},
 {id:'outputs',name:'OUTPUTS',landing:'outputs',items:[]},
 {id:'system',name:'SYSTEM',landing:'updates',items:[['updates','Updates & maintenance','system_update'],['setup','Set up speaker','add_circle']]}
];
function sectionHeading(id,name,landing,collapsed,count=null,current=false){
 const overviewLabel=id==='outputs'?'Manage all outputs':id==='playbacks'?'All playbacks':null;
 return `<div class="nav-section__heading"><div class="nav-section__label"><button data-action="navigate" data-value="${landing}" data-scope="${id==='playbacks'?'active':'all'}" class="nav-section__title ${current?'is-current':''}" ${current?'aria-current="page"':''} title="Open ${name.toLowerCase()}">${name}</button>${count!==null?`<span class="nav-section__count">${count}</span>`:''}</div><div class="nav-section__tools">${overviewLabel?action('navigate',icon('grid_view'),'section-workspace-link',`data-value="${landing}" data-scope="${id==='playbacks'?'active':'all'}" title="${overviewLabel}" aria-label="${overviewLabel}"`):''}${action('toggle-section',icon(collapsed?'chevron_right':'expand_more'),'section-chevron',`data-value="${id}" title="${collapsed?'Expand':'Collapse'} ${name}" aria-label="${collapsed?'Expand':'Collapse'} ${name.toLowerCase()}" aria-expanded="${!collapsed}"`)}</div></div>`;
}
export function sessionCard(s,session,compact=false){
 const m=s.model,target=entity(m,session.targetId),playing=session.status==='playing';
 const label=`${playing?'Pause':'Resume'} ${source(s.catalog,session.sourceId)?.name||'source'} on ${target?.name||'output'}`;
 return `<div class="session-card ${compact?'session-card--compact':''}">${action('select-session',`${typeIcon(kind(m,session.targetId),'session-card__type')}<span class="session-card__body"><strong>${esc(target?.name||'Unknown output')}</strong><small>${esc(source(s.catalog,session.sourceId)?.name||'Unknown source')}${!playing?' · Paused':''}</small></span>`,'session-card__open',`data-id="${esc(session.id)}" aria-label="Open playback details for ${esc(target?.name||'output')}"`)}${action('toggle-output-playback',icon(playing?'music_cast':'pause_circle','session-card__status-icon')+icon(playing?'pause_circle':'play_circle','session-card__transport-icon'),'icon-btn session-card__state',`data-id="${esc(session.id)}" data-status="${esc(session.status)}" title="${esc(label)}" aria-label="${esc(label)}"`)}</div>`;
}
export function sidebar(s){
 const m=s.model,collapsed=m.ui.collapsed||{},sections=s.uiLayout?.sections||navSections;
 const sessions=m.sessions.filter(session=>session.status!=='stopped'),outputs=visibleOutputs(m);
 const limit=s.expandingOutputs?999:Number(m.ui.sidebarLimit||6),count=outputs.length;
 const detailId=s.view==='device'?(s.detailDeviceId||m.selectedDeviceId):s.view==='group'?s.detailOutputId:null;
 const shortcuts=outputs.slice(0,limit),currentOutput=outputs.find(output=>output.id===detailId);
 if(currentOutput&&!shortcuts.some(output=>output.id===detailId))shortcuts.splice(Math.max(0,shortcuts.length-1),1,currentOutput);
 const detailVisible=m.ui.speakerVariant!=='panel'&&!collapsed.outputs&&shortcuts.some(output=>output.id===detailId);
 const sectionCurrent=id=>id==='playbacks'?(sessions.length>0&&(s.view==='outputs'||s.view==='sessions')&&m.ui.outputScope==='active'):id==='outputs'?((s.view==='outputs'||s.view==='sessions')&&(m.ui.outputScope!=='active'||!sessions.length)||['device','group'].includes(s.view)&&!detailVisible):!!collapsed[id]&&(sections.find(section=>section.id===id)?.items||[]).some(item=>(Array.isArray(item)?item[0]:item.view)===s.view);
 const appContext=['settings','help','lab'].includes(s.view);
 return `<aside id="main-navigation" class="sidebar ${s.sidebarOpen?'sidebar--open':''}" aria-label="Main navigation">
  <div class="brand"><button class="brand-trigger ${appContext?'is-current':''}" ${appContext?'aria-current="page"':''} data-action="toggle-app-menu" aria-label="ST Reborn menu" aria-haspopup="dialog" aria-expanded="${!!s.appMenuOpen}" aria-controls="app-menu"><span class="brand-icon">${brandMark()}</span><span><strong>ST <em>Reborn</em></strong><small>UI Lab</small></span>${icon('expand_more','brand-chevron')}</button>${action('toggle-sidebar',icon('dock_to_left'),'icon-btn sidebar-collapse','aria-label="Collapse sidebar" title="Collapse sidebar" aria-expanded="true" aria-controls="main-navigation"')}${action('toggle-sidebar-mobile',icon('close'),'icon-btn sidebar-close','aria-label="Close navigation"')}</div>
  <div class="sidebar-scroll">
   ${sessions.length?`<section class="pinned-block" data-section="playbacks" aria-label="Playback sessions">${sectionHeading('playbacks','PLAYING','outputs',!!collapsed.playbacks,sessions.length||null,sectionCurrent('playbacks'))}${!collapsed.playbacks?`<div class="nav-section__content">${sessions.length?sessions.slice(0,3).map(session=>sessionCard(s,session,true)).join(''):'<p class="sidebar-empty">Nothing playing</p>'}</div>`:''}</section>`:''}
   ${sections.map(sec=>`<section class="nav-section" data-section="${sec.id}">
    ${sectionHeading(sec.id,sec.name,sec.landing,!!collapsed[sec.id],null,sectionCurrent(sec.id))}
    ${!collapsed[sec.id]?`<div class="nav-section__content">${sec.items.map(item=>{const [v,name,i]=Array.isArray(item)?item:[item.view,item.label,item.icon];return action('navigate',icon(i)+`<span>${esc(name)}</span>`,`nav-item ${s.view===v?'active':''}`,`data-value="${v}" ${s.view===v?'aria-current="page"':''}`)}).join('')}
     ${sec.id==='outputs'&&m.ui.speakerVariant!=='panel'?`${shortcuts.map(t=>`<div class="sidebar-output-line">${outputItem(m,t.id,{compact:true,selected:detailId===t.id})}${action('target-actions',icon('more_horiz'),'sidebar-output-menu',`data-id="${t.id}" aria-label="Actions for ${esc(t.name)}"`)}</div>`).join('')}${count>limit?action('expand-outputs',`+ ${count-limit} more outputs`,'sidebar-more'):''}`:''}
     ${sec.id==='outputs'?`${action('start-group-create',icon('add_circle_outline')+'<span>Create group</span>','nav-item nav-item--outline')}`:''}
    </div>`:''}</section>`).join('')}
  </div>
 </aside>`;
}
export function appMenu(s){
 if(!s.appMenuOpen)return '';
 const online=s.model.devices.filter(d=>d.status==='online').length;
 return `<div class="app-menu-layer"><button class="app-menu-backdrop" data-action="close-app-menu" aria-label="Close app menu"></button><section class="app-menu" id="app-menu" role="dialog" aria-labelledby="app-menu-heading"><header><h2 id="app-menu-heading">ST Reborn</h2>${action('close-app-menu',icon('close'),'icon-btn','aria-label="Close app menu"')}</header><p class="app-menu-status">${online}/${s.model.devices.length} online</p>
 ${action('navigate',icon('settings')+'<span>App settings</span>','menu-row','data-value="settings"')}
 ${action('toggle-appearance',icon(s.designTokens.appearance==='light'?'dark_mode':'light_mode')+`<span>Switch to ${s.designTokens.appearance==='light'?'dark':'light'} appearance</span>`,'menu-row')}
 ${action('navigate',icon('help')+'<span>Help & info</span>','menu-row','data-value="help"')}
 <div class="app-menu-lab"><div class="section-eyebrow">UI LAB</div><label for="app-scenario">Scenario</label><select id="app-scenario" class="small-select" data-field="scenario">${s.scenarioIndex.map(x=>`<option value="${x.id}" ${s.scenarioId===x.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select>${action('navigate',icon('science')+'<span>Design Lab</span>','menu-row','data-value="lab"')}<small>Mock data only</small></div></section></div>`;
}
export function header(s){
 const views={listen:['Radio','Choose music, then choose where it plays'],library:['Library','Local media and network sources'],history:['Recently played','Resume past listening'],spotify:['Spotify','Streams and playlists'],outputs:['Outputs & playbacks','Sources, playback and available functions'],device:['Device details','Identity and available device functions'],group:['Group details','Membership and persistent grouping'],sessions:['Outputs & playbacks','Sources, playback and available functions'],updates:['Updates & maintenance','Firmware, backups and device diagnostics'],setup:['Set up speaker','Guided discovery and configuration'],settings:['App settings','General preferences and appearance'],help:['Help & info','Documentation, support and project links'],lab:['Design Lab','Scenarios, variants and visual tokens']};
 const [name]=(s.uiLayout?.views||views)[s.view]||views[s.view]||['ST Reborn',''];
 return `<header class="app-header"><div class="header-left">${action('toggle-sidebar',icon('dock_to_left'),'icon-btn sidebar-toggle',`title="${s.designTokens?.sidebarCollapsed?'Expand':'Collapse'} sidebar" aria-label="${s.designTokens?.sidebarCollapsed?'Expand':'Collapse'} sidebar" aria-expanded="${!s.designTokens?.sidebarCollapsed}" aria-controls="main-navigation"`)}${action('toggle-sidebar-mobile',icon('menu'),'icon-btn mobile-menu','aria-label="Open menu"')}<div class="header-title"><h1>${esc(name)}</h1></div></div>${action('toggle-app-menu',brandMark(),'icon-btn mobile-brand','aria-label="ST Reborn menu" aria-haspopup="dialog" aria-controls="app-menu" aria-expanded="'+!!s.appMenuOpen+'"')}</header>`;
}
export function player(s){
 const m=s.model,session=currentSession(m);
 if(!session)return '';
 const sessions=m.sessions.filter(item=>item.status==='playing'||item.status==='paused'),now=source(s.catalog,session.sourceId),target=entity(m,session.targetId),destination=sourceDestination(now);
 return `<footer class="player" aria-label="Playback controls"><div class="player__content"><span class="player__art" ${sourceArtAttributes(now)}>${icon(now?.type==='library'?'album':'radio')}</span><div class="player__label"><strong>${esc(now?.name||'Unknown source')}</strong><small>${session.status==='paused'?'Paused · ':''}${esc(now?.subtitle||'')}</small></div>${destination?action('player-source',icon('read_more'),'icon-btn player-source-link',`data-id="${esc(now.id)}" data-session="${esc(session.id)}" title="Open ${destination.label} · ${esc(now.name)}" aria-label="Open ${destination.label} for ${esc(now.name)}"`):''}</div>
 <div class="player__transport">${action('player-toggle',icon(session.status==='playing'?'pause_circle':'play_circle'),'transport-play',`title="${session.status==='playing'?'Pause':'Play'}" aria-label="${session.status==='playing'?'Pause':'Resume'} ${esc(now?.name)}"`)}${action('player-stop',icon('stop'),'icon-btn transport-extra','title="Stop" aria-label="Stop playback"')}</div>
 <div class="player__outputs">${sessions.length>1?`<select class="session-select" data-field="session" aria-label="Playback target">${sessions.map(item=>`<option value="${esc(item.id)}" ${session.id===item.id?'selected':''}>${esc(entity(m,item.targetId)?.name||'Unknown target')}${item.status==='paused'?' · Paused':''}</option>`).join('')}</select>`:`<span class="player-target">${typeIcon(kind(m,target?.id))}<span>${esc(target?.name)}</span></span>`}
 ${action('open-output-picker',icon('music_cast'),'icon-btn output-trigger output-trigger--cast',`title="Play this source elsewhere" aria-label="Play ${esc(now?.name)} on another output"`)}${action('open-volume-controls',icon('volume_up'),'icon-btn volume-details-trigger',`aria-label="Individual volumes for ${esc(target?.name)}" title="Individual device volumes"`)}
 <input type="range" class="volume-range" min="0" max="100" value="${session.volume??25}" data-field="volume" ${!['online','partial'].includes(targetStatus(m,session.targetId))?'disabled':''} aria-label="Overall volume for ${esc(target?.name)}" aria-valuetext="${session.volume??25} percent"/><span class="volume-value">${session.volume??25} %</span></div></footer>`;
}
