import {radioControls} from '../components/radio-filters.js';
import {libraryServers} from '../app/library.js';
import {esc,icon,action,sourceTile,sourceRow,empty} from '../components/shared.js';
import {entity,source,currentSession,filterRadioSources,targetStatus} from '../app/model.js';

function rowPlayback(s){
 const id=currentSession(s.model)?.targetId,playTarget=entity(s.model,id);
 return {playTarget,playable:!!playTarget&&['online','partial'].includes(targetStatus(s.model,id))};
}
function radio(s){
 const result=filterRadioSources(s.model,s.catalog,s.filter);
 return `<section class="radio-stations" aria-label="Radio stations">
 ${radioControls(s)}
 <div class="source-list">${result.length?result.map(item=>sourceRow(item,{favorite:s.model.favorites.includes(item.id),...rowPlayback(s)})).join(''):empty('search_off','No matching stations','Try another search or adjust filters.',action('reset-radio-filters','Reset filters','btn-soft'))}</div></section>`;
}
function library(s){
 const servers=libraryServers(s.model,s.catalog),chosen=s.model.ui.libraryServer||servers[0]?.id,server=servers.find(x=>x.id===chosen)||servers[0],sources=s.catalog.sources.filter(x=>x.type==='library');
 return ` <div class="two-col"><section class="panel"><header class="panel-head library-server-heading"><h2>Music servers</h2>${action('library-settings',icon('settings'),'icon-btn', 'title="Music server settings" aria-label="Music server settings"')}</header><div class="server-list">${servers.map(x=>action('library-server',icon('dns')+`<span><strong>${esc(x.name)}</strong><small>${esc(x.address)}</small></span>`,'list-card '+(x.id===server?.id?'active':''),`data-id="${esc(x.id)}"`)).join('')||'<p class="library-empty">Add a source in Music server settings.</p>'}</div></section>
 <section class="panel"><header class="panel-head"><h2>${esc(server?.name||'Library contents')}</h2></header><div class="folder-list">${server?.folders?.length?server.folders.map(name=>action('library-folder',icon('folder')+`<span>${esc(name)}</span>`+icon('chevron_right'),'folder-row',`data-value="${esc(name)}"`)).join(''):`<p class="library-empty">${server?'No contents loaded for this source.':'Select a music server.'}</p>`}</div></section></div>
 <section class="section-wrap"><div class="section-heading"><div><h2>Collections</h2></div></div><div class="tile-grid">${sources.map(x=>sourceTile(x)).join('')}</div></section>`;
}
function history(s){const sources=(s.model.history||[]).map(id=>source(s.catalog,id)).filter(Boolean);
 return ` <section class="panel panel--flush">${sources.length?sources.map(x=>sourceRow(x,{favorite:s.model.favorites.includes(x.id),...rowPlayback(s)})).join(''):empty('history','Nothing played yet','Sources you start will appear here.')}</section>`;
}
function spotify(s){const connected=s.model.spotifyConnected,sources=s.catalog.sources.filter(x=>x.type==='spotify');
 return ` <section class="panel spotify-header"><span class="spotify-symbol">${icon('music_cast')}</span><div><h2>${connected?'Spotify connected':'Spotify is not connected'}</h2><p>${connected?'Sample account':'Connect an account to access playlists and playback.'}</p></div>${action('spotify-connect',connected?'Disconnect':'Connect (simulate)','primary-btn')}</section>
 ${connected?`<section class="section-wrap"><div class="section-heading"><h2>Playlists</h2></div><div class="tile-grid">${sources.map(x=>sourceTile(x)).join('')}</div></section>`:''}`;
}
export function renderListen(s){if(s.view==='library')return library(s);if(s.view==='history')return history(s);if(s.view==='spotify')return spotify(s);return radio(s)}
