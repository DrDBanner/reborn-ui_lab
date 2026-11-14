import {esc,icon,action} from './shared.js';
import {radioOptions,visibleOutputs,entity,filterRadioSources} from '../app/model.js';
const selectField=(id,label,field,values,selected,disabled=false)=>`<label class="radio-filter-field" for="${id}"><span>${label}</span><select id="${id}" class="small-select" data-field="${field}" ${disabled?'disabled':''}>${values.map(([value,text])=>`<option value="${esc(value)}" ${String(value)===String(selected)?'selected':''}>${esc(text)}</option>`).join('')}</select></label>`;
export function radioControls(s){
 const m=s.model,options=radioOptions(m),stations=s.catalog.sources.filter(item=>item.type==='radio'),pinned=!!m.ui.radioFiltersPinned;
 const unique=key=>[...new Set(stations.map(item=>item[key]).filter(Boolean))].sort();
 const summary=[options.country!=='All'?options.country:'',options.language!=='All'?options.language:'',options.genre!=='All'?options.genre:'',options.minBitrate?`≥ ${options.minBitrate} kbit/s`:'',options.onlyWorking?'Working only':'',options.onlyCompatible?`Compatible with ${entity(m,options.outputId)?.name||'output'}`:''].filter(Boolean);
 const shown=filterRadioSources(m,s.catalog,s.filter).length,total=stations.filter(item=>m.ui.radioTab!=='favorites'||m.favorites.includes(item.id)).length;
 return `<div class="radio-controls ${pinned?'is-pinned':''}" aria-label="Station search and filters"><div class="toolbar radio-toolbar"><label class="search-field">${icon('search')}<input type="search" data-field="radio-search" placeholder="Station, city or genre" value="${esc(s.filter)}" aria-label="Search radio" /></label>
 <div class="segmented">${[['discover','Discover'],['favorites','Favorites']].map(([id,label])=>action('radio-tab',label,`tab-control ${m.ui.radioTab===id||!m.ui.radioTab&&id==='discover'?'active':''}`,`data-value="${id}"`)).join('')}</div>
 ${action('radio-filter',icon('tune')+`<span>Filters</span>${summary.length?`<span class="filter-count">${summary.length}</span>`:''}`,'btn-soft radio-filter-trigger',`aria-expanded="${!!s.radioFiltersOpen}" aria-controls="radio-filter-fields" title="${esc(summary.join(' · ')||'All stations')}"`)}
 ${action('pin-radio-filters',icon('push_pin'),`icon-btn radio-pin ${pinned?'is-active':''}`,`aria-label="${pinned?'Unpin filters':'Pin filters'}" title="${pinned?'Unpin filters':'Pin filters'}" aria-pressed="${pinned}"`)}</div>
 ${s.radioFiltersOpen?`<div class="radio-filter-panel" id="radio-filter-fields"><div class="radio-filter-grid">
 ${selectField('radio-country','Country','radio-country',[['All','All countries'],...unique('country').map(value=>[value,value])],options.country)}
 ${selectField('radio-language','Language','radio-language',[['All','All languages'],...unique('language').map(value=>[value,value])],options.language)}
 ${selectField('radio-order','Sort by','radio-order',[['votes','Votes'],['clicks','Popularity'],['name','Name'],['bitrate','Bitrate']],options.order)}
 ${selectField('radio-bitrate','Minimum bitrate','radio-bitrate',[[0,'Any bitrate'],...[64,96,128,192,256,320].map(value=>[value,`≥ ${value} kbit/s`])],options.minBitrate)}
 ${selectField('radio-output','Compatibility output','radio-output',visibleOutputs(m).map(output=>[output.id,output.name]),options.outputId,!options.onlyCompatible)}
 </div><div class="radio-filter-checks"><label><input type="checkbox" data-field="radio-working" ${options.onlyWorking?'checked':''}/> Only working stations</label><label><input type="checkbox" data-field="radio-compatible" ${options.onlyCompatible?'checked':''}/> Only compatible stations</label></div>
 <div class="radio-filter-actions">${action('reset-radio-filters','Reset filters','btn-quiet')}${action('apply-radio-filter','Done','btn-soft')}</div></div>`:''}
 <div class="genre-chips" role="group" aria-label="Genre">${['All',...unique('genre')].map(genre=>action('radio-genre',esc(genre),`genre-chip ${options.genre===genre?'is-active':''}`,`data-value="${esc(genre)}" aria-pressed="${options.genre===genre}"`)).join('')}</div>
 <p class="radio-result-count" aria-live="polite">${shown} ${shown===1?'station':'stations'}${total>shown?` · ${total-shown} hidden by search or filters`:''}</p></div>`;
}
