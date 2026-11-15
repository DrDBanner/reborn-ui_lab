import {esc,icon,action,empty,sourceTypeLabel,sourceTypeIcon} from './shared.js';
import {entity,compatibleRadioSource} from '../app/model.js';

export function renderSourcePicker(s){
 const {targetId,sourceType='all',query=''}=s.modal,target=entity(s.model,targetId);
 if(!target)return empty('speaker','Output no longer available','Close this dialog and choose another output.');
 const available=s.catalog.sources.filter(item=>item.type!=='radio'||compatibleRadioSource(s.model,item,targetId));
 const domains=[['all','All'],['radio','Radio'],['library','Library'],['spotify','Spotify'],['native','Services']];
 const search=query.trim().toLowerCase(),items=available.filter(item=>(sourceType==='all'||item.type===sourceType)&&`${item.name} ${item.subtitle||''} ${sourceTypeLabel(item)}`.toLowerCase().includes(search));
 return `<div class="modal-heading"><h2>Play on ${esc(target.name)}</h2><p>Choose a source.</p></div>
 <div class="output-source-browser"><div class="preset-source-tabs" aria-label="Source types">${domains.filter(([type])=>type==='all'||available.some(item=>item.type===type)).map(([type,label])=>action('output-source-type',label,`tab-control ${type===sourceType?'active':''}`,`data-value="${type}" aria-pressed="${type===sourceType}"`)).join('')}</div>
 <label class="search-field preset-search">${icon('search')}<input id="output-source-search" type="search" data-field="output-source-search" value="${esc(query)}" placeholder="Find a source" aria-label="Find a source for ${esc(target.name)}" /></label>
 <div class="preset-source-results" aria-label="Available sources">${items.length?items.map(item=>action('output-source-choose',`${icon(sourceTypeIcon(item))}<span><strong>${esc(item.name)}</strong><small>${esc(sourceTypeLabel(item))}${item.subtitle?` · ${esc(item.subtitle)}`:''}</small></span>${icon('play_circle')}`,'preset-source-option',`data-id="${esc(item.id)}" data-target="${esc(targetId)}" aria-label="Play ${esc(item.name)} on ${esc(target.name)}"`)).join(''):empty('search_off','No matching sources','Try another source type or search.')}</div></div>
 <div class="modal-footer">${action('close-modal','Cancel','btn-quiet')}</div>`;
}
