import {esc,icon,action,statusLabel,outputItem} from './shared.js';
import {entity,visibleOutputs,kind,source,currentSession,targetStatus,sessionFor} from '../app/model.js';

const navSections=[
 {id:'listen',name:'LISTEN',landing:'listen',items:[['listen','Radio','radio'],['library','Library','library_music'],['history','Recently played','history'],['spotify','Spotify','graphic_eq']]},
 {id:'outputs',name:'OUTPUTS',landing:'outputs',items:[]},
 {id:'system',name:'SYSTEM',landing:'updates',items:[['updates','Updates & maintenance','system_update'],['setup','Set up speaker','add_circle'],['settings','App settings','settings'],['help','Help & info','help']]}
];
export function sidebar(s){
 const m=s.model,collapsed=m.ui.collapsed||{};const sections=s.uiLayout?.sections||navSections;
 const session=currentSession(m),pinned=session?.status==='stopped'?null:session?.targetId;
 const outputs=visibleOutputs(m).filter(t=>t.id!==pinned);
 const limit=s.expandingOutputs?999:Number(m.ui.sidebarLimit||6);
 const count=outputs.length;
 return `<aside class="sidebar ${s.sidebarOpen?'sidebar--open':''}" aria-label="Main navigation">
  <div class="brand"><span class="brand-icon">${icon('graphic_eq')}</span><div><strong>ST <em>Reborn</em></strong><small>UI concept · functional lab</small></div>${action('toggle-sidebar-mobile',icon('close'),'icon-btn sidebar-close','aria-label="Close navigation"')}</div>
  <div class="sidebar-scroll">
   ${pinned&&m.ui.speakerVariant!=='panel'?`<div class="pinned-block"><div class="section-eyebrow">NOW PLAYING</div><button class="pinned-target" data-action="select-output" data-id="${esc(pinned)}">${icon('graphic_eq')}<span><strong>${esc(entity(m,pinned)?.name)}</strong><small>${esc(source(s.catalog,session.sourceId)?.name||'Stream')} · ${esc(session.status)}</small></span>${icon('chevron_right')}</button></div>`:''}
   ${sections.map(sec=>`<section class="nav-section" data-section="${sec.id}">
    <div class="nav-section__heading"><button data-action="navigate" data-value="${sec.landing}" class="nav-section__title" title="Open ${sec.name.toLowerCase()}">${sec.name}</button>${action('toggle-section',icon(collapsed[sec.id]?'chevron_right':'expand_more'),'section-chevron',`data-value="${sec.id}" title="${collapsed[sec.id]?'Expand':'Collapse'} ${sec.name}" aria-expanded="${!collapsed[sec.id]}"`)}</div>
    ${!collapsed[sec.id]?`<div class="nav-section__content">${sec.items.map(item=>{const [v,name,i]=Array.isArray(item)?item:[item.view,item.label,item.icon];return action('navigate',icon(i)+`<span>${esc(name)}</span>`,`nav-item ${s.view===v?'active':''}`,`data-value="${v}"`)}).join('')}
     ${sec.id==='outputs'?`${outputs.slice(0,limit).map(t=>`<div class="sidebar-output-line">${outputItem(m,t.id,{compact:true,selected:s.detailOutputId===t.id})}${action('target-actions',icon('more_horiz'),'sidebar-output-menu',`data-id="${t.id}" aria-label="Actions for ${esc(t.name)}"`)}</div>`).join('')}
      ${count>limit?action('expand-outputs',`+ ${count-limit} more outputs`,'sidebar-more'):''}
      ${action('navigate',icon('grid_view')+'<span>Manage all outputs</span>','nav-item nav-item--outline',`data-value="outputs"`)}
      ${action('navigate',icon('add_circle_outline')+'<span>Create group or pair</span>','nav-item nav-item--outline',`data-value="outputs"`)}
     `:''}</div>`:''}
    </section>`).join('')}
  </div>
  <footer class="sidebar-footer">${action('navigate',icon('science')+'<span>Design Lab</span>','nav-item nav-item--lab',`data-value="lab"`)}<div class="sidebar-build">UI Lab · Mock data only</div></footer>
 </aside>`;
}
export function header(s){
 const views={listen:['Radio','Choose music, then choose where it plays'],library:['Library','Local media and network sources'],history:['Recently played','Resume past listening'],spotify:['Spotify','Streams and playlists'],outputs:['Outputs & groups','Speakers, stereo pairs and grouped outputs'],device:['Device settings','Information, sound, network and advanced controls'],group:['Group details','Membership and persistent grouping'],updates:['Updates & maintenance','Firmware, backups and device diagnostics'],setup:['Set up speaker','Guided discovery and configuration'],settings:['App settings','General preferences and appearance'],help:['Help & info','Documentation, support and project links'],lab:['Design Lab','Scenarios, variants and visual tokens']};
 const [name,sub]=(s.uiLayout?.views||views)[s.view]||['ST Reborn',''];
 const count=s.model.devices.filter(d=>d.status!=='offline').length;
 return `<header class="app-header"><div class="header-left">${action('toggle-sidebar-mobile',icon('menu'),'icon-btn mobile-menu','aria-label="Open menu"')}<div class="header-title"><h1>${name}</h1><p>${sub}</p></div></div><div class="header-right"><span class="header-status"><i></i> ${count}/${s.model.devices.length} connected</span>
   <select class="small-select" data-field="scenario" aria-label="Scenario">${s.scenarioIndex.map(x=>`<option value="${x.id}" ${s.scenarioId===x.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select>
   ${action('navigate',icon('tune'),'icon-btn header-lab',`data-value="lab" title="Design Lab" aria-label="Design Lab"`)}
   ${action('toggle-appearance',icon(s.designTokens.appearance==='light'?'dark_mode':'light_mode'),'icon-btn',`title="Toggle appearance" aria-label="Toggle appearance"`)}
  </div></header>`;
}
export function player(s){
 const m=s.model,session=currentSession(m),now=source(s.catalog,session?.sourceId),selectedTarget=session?.targetId?entity(m,session.targetId):null;
 const sessions=m.sessions;
 return `<footer class="player" aria-label="Playback controls">
  <div class="player__content"><span class="player__art" style="--source-color:${esc(now?.color||'#435064')}">${icon(now?.type==='library'?'album':'radio')}</span><div class="player__label"><strong>${esc(now?.name||'Nothing playing')}</strong><small>${esc(now?.subtitle||'Select music and an output')}</small></div></div>
  <div class="player__transport">${action('session-prev',icon('skip_previous'),'icon-btn transport-extra','aria-label="Previous"')}${action('player-toggle',icon(session?.status==='playing'?'pause':'play_arrow'),'transport-play',`aria-label="${session?.status==='playing'?'Pause':'Play'}" ${!session?'disabled':''}`)}${action('session-next',icon('skip_next'),'icon-btn transport-extra','aria-label="Next"')}${action('player-stop',icon('stop'),'icon-btn transport-extra',`${!session?'disabled':''} aria-label="Stop"`)}</div>
  <div class="player__outputs">${sessions.length>1?`<select class="session-select" data-field="session" aria-label="Active playback session">${sessions.map(x=>`<option value="${x.id}" ${session?.id===x.id?'selected':''}>${esc(entity(m,x.targetId)?.name||'Unknown')} · ${esc(source(s.catalog,x.sourceId)?.name||'')}</option>`).join('')}</select>`:''}
   ${action('open-output-picker',icon('speaker_group')+`<span>${esc(selectedTarget?.name||'Choose output')}</span>`+icon('expand_less'),'output-trigger',`title="Choose output"`)}
   ${icon('volume_up','player__volume-icon')}
   <input type="range" class="volume-range" min="0" max="100" value="${esc(session?.volume??25)}" data-field="volume" ${!session?'disabled':''} aria-label="Output volume" />
   <span class="volume-value">${session?.volume??'–'}</span>
  </div>
 </footer>`;
}
