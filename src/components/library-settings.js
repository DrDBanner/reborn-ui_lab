import {esc,icon,action} from './shared.js';
export function renderLibrarySettings(s){
 const draft=s.modal;
 return `<div class="modal-heading"><h2>Music server settings</h2><p>Manual sources are saved in this scenario. Network discovery is simulated.</p></div>
 <label class="library-discovery-setting"><input type="checkbox" data-field="library-discovered" ${draft.showDiscovered?'checked':''}/><span>Show discovered servers</span></label>
 <section class="library-manual-sources" aria-label="Manual sources"><h3>Manual sources</h3>${draft.servers.length?`<div class="library-config-list">${draft.servers.map(server=>`<div class="setting-line"><div class="setting-line__body"><strong>${esc(server.name)}</strong><small>${esc(server.address)}</small></div>${action('library-remove',icon('delete_outline'),'icon-btn',`data-id="${esc(server.id)}" aria-label="Remove ${esc(server.name)}"`)}</div>`).join('')}</div>`:'<p class="muted">No manual sources added.</p>'}
 <div class="library-add-form"><label for="library-name">Name<input id="library-name" class="text-input" data-field="library-name" value="${esc(draft.name)}" maxlength="120" autocomplete="off"/></label><label for="library-address">Server address<input id="library-address" class="text-input" type="url" data-field="library-address" value="${esc(draft.address)}" placeholder="http://192.168.0.20:8200" autocomplete="off" aria-describedby="library-source-error"/></label>${action('library-add',icon('add')+' Add source','btn-soft')}</div><p id="library-source-error" class="danger-text" role="status">${esc(draft.error||'')}</p></section>
 <div class="modal-footer">${action('close-modal','Cancel','btn-quiet')}${action('library-settings-save','Save settings','primary-btn')}</div>`;
}
