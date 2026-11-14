import {esc,icon,action,statusLabel,outputItem,typeIcon} from './shared.js';
import {entity,visibleOutputs,kind,source,currentSession,leafDeviceIds} from '../app/model.js';

const navSections=[
 {id:'listen',name:'LISTEN',landing:'listen',items:[['listen','Radio','radio'],['library','Library','library_music'],['history','Recently played','history'],['spotify','Spotify','graphic_eq']]},
 {id:'outputs',name:'OUTPUTS',landing:'outputs',items:[]},
 {id:'system',name:'SYSTEM',landing:'updates',items:[['updates','Updates & maintenance','system_update'],['setup','Set up speaker','add_circle']]}
];
export function sessionCard(s,session,compact=false){
 const m=s.model,target=entity(m,session.targetId),playing=session.status==='playing',selected=currentSession(m)?.id===session.id;
 return action('select-session',`${typeIcon(kind(m,session.targetId),'session-card__type')}<span class="session-card__body"><strong>${esc(target?.name||'Unknown output')}</strong><small>${esc(source(s.catalog,session.sourceId)?.name||'Unknown source')}</small></span><span class="session-card__state">${icon(playing?'graphic_eq':session.status==='paused'?'pause':'stop')}<span class="${compact?'sr-only':''}">${playing?'Playing':session.status==='paused'?'Paused':'Stopped'}</span></span>`,`session-card ${compact?'session-card--compact':''} ${selected?'is-selected':''}`,`data-id="${esc(session.id)}" aria-pressed="${selected}"`);
}
export function sidebar(s){
 const m=s.model,collapsed=m.ui.collapsed||{},sections=s.uiLayout?.sections||navSections;
 const sessions=m.sessions.filter(session=>session.status!=='stopped'),outputs=visibleOutputs(m);
 const limit=s.expandingOutputs?999:Number(m.ui.sidebarLimit||6),count=outputs.length;
 return `<aside class="sidebar ${s.sidebarOpen?'sidebar--open':''}" aria-label="Main navigation">
  <div class="brand"><button class="brand-trigger" data-action="toggle-app-menu" aria-label="ST Reborn menu" aria-haspopup="dialog" aria-expanded="${!!s.appMenuOpen}" aria-controls="app-menu"><span class="brand-icon">${icon('graphic_eq')}</span><span><strong>ST <em>Reborn</em></strong><small>UI Lab</small></span>${icon('expand_more','brand-chevron')}</button>${action('toggle-sidebar-mobile',icon('close'),'icon-btn sidebar-close','aria-label="Close navigation"')}</div>
  <div class="sidebar-scroll">
   ${sessions.length?`<section class="pinned-block" aria-label="Playback sessions"><div class="section-eyebrow">PLAYBACKS <span>${sessions.length}</span></div>${sessions.slice(0,3).map(session=>sessionCard(s,session,true)).join('')}${action('navigate',`All playbacks${sessions.length>3?` (${sessions.length})`:''} ${icon('arrow_forward')}`,'sidebar-more','data-value="sessions"')}</section>`:''}
   ${sections.map(sec=>`<section class="nav-section" data-section="${sec.id}">
    <div class="nav-section__heading"><button data-action="navigate" data-value="${sec.landing}" class="nav-section__title" title="Open ${sec.name.toLowerCase()}">${sec.name}</button>${action('toggle-section',icon(collapsed[sec.id]?'chevron_right':'expand_more'),'section-chevron',`data-value="${sec.id}" title="${collapsed[sec.id]?'Expand':'Collapse'} ${sec.name}" aria-expanded="${!collapsed[sec.id]}"`)}</div>
    ${!collapsed[sec.id]?`<div class="nav-section__content">${sec.items.map(item=>{const [v,name,i]=Array.isArray(item)?item:[item.view,item.label,item.icon];return action('navigate',icon(i)+`<span>${esc(name)}</span>`,`nav-item ${s.view===v?'active':''}`,`data-value="${v}"`)}).join('')}
     ${sec.id==='outputs'&&m.ui.speakerVariant!=='panel'?`${outputs.slice(0,limit).map(t=>`<div class="sidebar-output-line">${outputItem(m,t.id,{compact:true,selected:s.detailOutputId===t.id||s.detailDeviceId===t.id})}${action('target-actions',icon('more_horiz'),'sidebar-output-menu',`data-id="${t.id}" aria-label="Actions for ${esc(t.name)}"`)}</div>`).join('')}${count>limit?action('expand-outputs',`+ ${count-limit} more outputs`,'sidebar-more'):''}`:''}
     ${sec.id==='outputs'?`${action('navigate',icon('grid_view')+'<span>Manage all outputs</span>','nav-item nav-item--outline','data-value="outputs"')}${action('navigate',icon('add_circle_outline')+'<span>Create group or pair</span>','nav-item nav-item--outline','data-value="outputs"')}`:''}
    </div>`:''}</section>`).join('')}
  </div>
 </aside>`;
}
export function appMenu(s){
 if(!s.appMenuOpen)return '';
 const online=s.model.devices.filter(d=>d.status==='online').length;
 return `<div class="app-menu-layer"><button class="app-menu-backdrop" data-action="close-app-menu" aria-label="Close app menu"></button><section class="app-menu" id="app-menu" role="dialog" aria-labelledby="app-menu-heading"><header><h2 id="app-menu-heading">ST Reborn</h2>${action('close-app-menu',icon('close'),'icon-btn','aria-label="Close app menu"')}</header><p class="app-menu-status">${online}/${s.model.devices.length} online</p>
 ${action('navigate',icon('network_check')+'<span>Connections & devices</span>','menu-row','data-value="outputs"')}
 ${action('navigate',icon('settings')+'<span>App settings</span>','menu-row','data-value="settings"')}
 ${action('toggle-appearance',icon(s.designTokens.appearance==='light'?'dark_mode':'light_mode')+`<span>Switch to ${s.designTokens.appearance==='light'?'dark':'light'} appearance</span>`,'menu-row')}
 ${action('navigate',icon('help')+'<span>Help & info</span>','menu-row','data-value="help"')}
 <div class="app-menu-lab"><div class="section-eyebrow">UI LAB</div><label for="app-scenario">Scenario</label><select id="app-scenario" class="small-select" data-field="scenario">${s.scenarioIndex.map(x=>`<option value="${x.id}" ${s.scenarioId===x.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select>${action('navigate',icon('science')+'<span>Design Lab</span>','menu-row','data-value="lab"')}<small>Mock data only</small></div></section></div>`;
}
export function header(s){
 const views={listen:['Radio','Choose music, then choose where it plays'],library:['Library','Local media and network sources'],history:['Recently played','Resume past listening'],spotify:['Spotify','Streams and playlists'],outputs:['Outputs & groups','Speakers, stereo pairs and grouped outputs'],device:['Device details','Identity and available device functions'],group:['Group details','Membership and persistent grouping'],sessions:['Playbacks','Independent streams and their outputs'],updates:['Updates & maintenance','Firmware, backups and device diagnostics'],setup:['Set up speaker','Guided discovery and configuration'],settings:['App settings','General preferences and appearance'],help:['Help & info','Documentation, support and project links'],lab:['Design Lab','Scenarios, variants and visual tokens']};
 const [name,sub]=(s.uiLayout?.views||views)[s.view]||views[s.view]||['ST Reborn',''];
 return `<header class="app-header"><div class="header-left">${action('toggle-sidebar-mobile',icon('menu'),'icon-btn mobile-menu','aria-label="Open menu"')}<div class="header-title"><h1>${name}</h1><p>${sub}</p></div></div>${action('toggle-app-menu',icon('graphic_eq'),'icon-btn mobile-brand','aria-label="ST Reborn menu" aria-haspopup="dialog" aria-controls="app-menu" aria-expanded="'+!!s.appMenuOpen+'"')}</header>`;
}
export function player(s){
 const m=s.model,session=currentSession(m),now=source(s.catalog,session?.sourceId),selectedTarget=session?.targetId?entity(m,session.targetId):null;
 return `<footer class="player" aria-label="Playback controls"><div class="player__content"><span class="player__art" style="--source-color:${esc(now?.color||'#435064')}">${icon(now?.type==='library'?'album':'radio')}</span><div class="player__label"><strong>${esc(now?.name||'Nothing playing')}</strong><small>${esc(now?.subtitle||'Select music and an output')}</small></div></div>
  <div class="player__transport">${action('player-toggle',icon(session?.status==='playing'?'pause':'play_arrow'),'transport-play',`aria-label="${session?.status==='playing'?'Pause':'Play'}" ${!session?'disabled':''}`)}${action('player-stop',icon('stop'),'icon-btn transport-extra',`${!session?'disabled':''} aria-label="Stop"`)}</div>
  <div class="player__outputs">${m.sessions.length>1?`<select class="session-select" data-field="session" aria-label="Active playback session">${m.sessions.map(x=>`<option value="${x.id}" ${session?.id===x.id?'selected':''}>${esc(entity(m,x.targetId)?.name||'Unknown')} · ${esc(source(s.catalog,x.sourceId)?.name||'')}</option>`).join('')}</select>`:''}
   ${action('open-output-picker',typeIcon(kind(m,selectedTarget?.id))+`<span>${esc(selectedTarget?.name||'Choose output')}</span>`+icon('expand_less'),'output-trigger','title="Choose output"')}${icon('volume_up','player__volume-icon')}
   <input type="range" class="volume-range" min="0" max="100" value="${esc(session?.volume??25)}" data-field="volume" ${!session?'disabled':''} aria-label="Output volume" /><span class="volume-value">${session?.volume??'–'}</span></div></footer>`;
}
