import {esc,icon,action,navHeader,empty} from '../components/shared.js';
import {sessionCard} from '../components/shell.js';
export function renderSessions(s){
 return `${navHeader('Playbacks','Each output can play its own source. Select a playback to control it in the player.',action('navigate',icon('add')+' Choose music','btn-soft','data-value="listen"'))}
 <div class="playbacks-grid">${s.model.sessions.length?s.model.sessions.map(session=>`<article class="panel playback-panel">${sessionCard(s,session)}<div class="playback-panel__actions">${action('select-output',icon('settings')+' Output details','btn-quiet',`data-id="${esc(session.targetId)}"`)}<span>${session.volume} / 100</span></div></article>`).join(''):empty('graphic_eq','Nothing playing','Choose a source and an output to start a playback.',action('navigate','Browse music','primary-btn','data-value="listen"'))}</div>`;
}
