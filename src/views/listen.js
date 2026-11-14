import {esc,icon,action,sourceTile,sourceRow,card,empty,navHeader,tab} from '../components/shared.js';
import {entity,kind,source,sessionFor,currentSession,visibleOutputs} from '../app/model.js';

function sourceList(s){const m=s.model;let result=s.catalog.sources.filter(x=>x.type==='radio');
 if(m.ui.radioTab==='favorites')result=result.filter(x=>m.favorites.includes(x.id));
 const query=s.filter.trim().toLowerCase();if(query)result=result.filter(x=>`${x.name} ${x.genre} ${x.subtitle} ${x.country}`.toLowerCase().includes(query));
 const genre=m.settings.radioGenre;if(genre&&genre!=='All')result=result.filter(x=>x.genre===genre);
 return result;
}
function radio(s){
 const m=s.model;
 const tabName=m.ui.radioTab||'discover';
 return `${navHeader('Radio', 'Pick something to listen to. Choose an output when you start playback.', `${action('radio-filter',icon('tune')+'<span>Filters</span>','btn-soft')}`)}
  <section class="section-wrap"><div class="section-heading"><div><h2>Discover stations</h2><p>Find, preview and assign a source to any output.</p></div></div>
   <div class="toolbar"><label class="search-field">${icon('search')}<input type="search" data-field="radio-search" placeholder="Station, city or genre" value="${esc(s.filter)}" aria-label="Search radio" /></label>
    <div class="segmented">${tab('discover','Discover',tabName==='discover','radio-tab')}${tab('favorites','Favorites',tabName==='favorites','radio-tab')}</div><span class="meta-note">Germany · ${esc(m.settings.radioGenre||'All genres')}</span></div>
   <div class="source-list">${sourceList(s).length?sourceList(s).map(x=>sourceRow(x,{favorite:m.favorites.includes(x.id)})).join(''):empty('search_off','No matching stations','Try another search or adjust filters.')}</div>
  </section>`;
}
function library(s){
 const servers=s.catalog.servers,chosen=s.model.ui.libraryServer||servers[0].id,server=servers.find(x=>x.id===chosen)||servers[0],sources=s.catalog.sources.filter(x=>x.type==='library');
 return `${navHeader('Media library','Browse network media without repeating player or output controls.')}
 <div class="two-col"><section class="panel"><header class="panel-head"><h2>Music servers</h2><p>Available network libraries</p></header><div class="server-list">${servers.map(x=>action('library-server',icon('dns')+`<span><strong>${esc(x.name)}</strong><small>${esc(x.address)}</small></span>`,'list-card '+(x.id===chosen?'active':''),`data-id="${x.id}"`)).join('')}</div></section>
 <section class="panel"><header class="panel-head"><h2>${esc(server.name)}</h2><p>Folders and saved queues</p></header><div class="folder-list">${server.folders.map(name=>action('library-folder',icon('folder')+`<span>${esc(name)}</span>`+icon('chevron_right'),'folder-row',`data-value="${esc(name)}"`)).join('')}</div></section></div>
 <section class="section-wrap"><div class="section-heading"><div><h2>Collections</h2><p>Sample titles from the selected server</p></div></div><div class="tile-grid">${sources.map(x=>sourceTile(x)).join('')}</div></section>`;
}
function history(s){const sources=(s.model.history||[]).map(id=>source(s.catalog,id)).filter(Boolean);
 return `${navHeader('Recently played','Resume a source or play it somewhere else.')}
 <section class="panel panel--flush">${sources.length?sources.map(x=>sourceRow(x,{favorite:s.model.favorites.includes(x.id)})).join(''):empty('history','Nothing played yet','Sources you start will appear here.')}</section>`;
}
function spotify(s){const connected=s.model.spotifyConnected,sources=s.catalog.sources.filter(x=>x.type==='spotify');
 return `${navHeader('Spotify','Playback and playlists use the same output selection as radio and library.')}
 <section class="panel spotify-header"><span class="spotify-symbol">${icon('graphic_eq')}</span><div><h2>${connected?'Spotify connected':'Spotify is not connected'}</h2><p>${connected?'Sample connected account · Prototyped state':'Connect an account to access playlists and playback.'}</p></div>${action('spotify-connect',connected?'Disconnect':'Connect (simulate)','primary-btn')}</section>
 ${connected?`<section class="section-wrap"><div class="section-heading"><h2>Playlists</h2></div><div class="tile-grid">${sources.map(x=>sourceTile(x)).join('')}</div></section>`:card('How this works','A simulated sign-in state',`<p>Real authorization is deliberately not implemented here. The frontend can still exercise navigation, linked-state UI and source assignment.</p>${action('spotify-connect','Simulate connection','btn-soft mt-3')}`)}`;
}
export function renderListen(s){if(s.view==='library')return library(s);if(s.view==='history')return history(s);if(s.view==='spotify')return spotify(s);return radio(s)}
