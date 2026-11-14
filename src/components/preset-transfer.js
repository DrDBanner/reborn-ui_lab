import {deviceProduct,esc,icon,action,typeIcon} from './shared.js';
import {entity,kind,visibleOutputs,parentIds,leafDeviceIds,buttonProfile,presetAssignments,planPresetTransfer,source} from '../app/model.js';
const keyName=item=>`Key ${item.key} · ${item.gesture==='double'?'Twice':'Once'}`;
export function transferResults(report,catalog){
 const name=id=>esc(source(catalog,id)?.name||id);
 return `<div class="transfer-results">${report.results.map(result=>`<section class="transfer-result"><strong>${esc(result.name)}</strong><p>${result.error?esc(result.error):`${result.copied.length} ${result.copied.length===1?'assignment':'assignments'} ${report.applied?'copied':'to copy'}`}</p>${result.replaced?.length||result.cleared?.length?`<ul class="transfer-changes">${(result.replaced||[]).map(item=>`<li>${esc(keyName(item))}: ${name(item.sourceId)} → ${name(item.replacementSourceId)}</li>`).join('')}${(result.cleared||[]).map(item=>{const [gesture,key]=item.movedTo.split(':');return `<li>${name(item.sourceId)}: ${esc(keyName(item))} → ${esc(keyName({key,gesture}))}; previous key ${report.applied?'cleared':'will be cleared'}</li>`}).join('')}</ul>`:''}${result.skipped.length?`<ul>${result.skipped.map(item=>`<li>${esc(keyName(item))}: ${esc(item.reason)}</li>`).join('')}</ul>`:''}</section>`).join('')}</div>`;
}
export function renderPresetTransfer(s){
 const m=s.model,modal=s.modal,device=entity(m,modal.deviceId),keys=presetAssignments(device),selected=modal.keys||[],targets=modal.targetIds||[];
 let report=null,error='';
 if(targets.length&&selected.length)try{report=planPresetTransfer(m,device.id,targets,selected,{overwrite:modal.overwrite})}catch(problem){error=problem.message}
 const copyCount=report?.results.reduce((total,result)=>total+result.copied.length,0)||0;
 const selectedIds=new Set(targets.flatMap(id=>leafDeviceIds(m,id)));
 const destinationRow=id=>{
  const target=entity(m,id),supported=!!buttonProfile(target),enabled=supported&&target.status==='online',parent=parentIds(m,id).map(id=>entity(m,id)).find(item=>kind(m,item.id)==='pair');
  return `<label class="transfer-device"><input type="checkbox" data-field="button-transfer-target" value="${esc(id)}" ${selectedIds.has(id)?'checked':''} ${!enabled?'disabled':''}/>${typeIcon('device')}<span><strong>${esc(target.name)}</strong><small>${!supported?'No button presets':target.status!=='online'?esc(target.status):parent?esc(parent.name):esc(deviceProduct(target))}</small></span></label>`;
 };
 const destinations=visibleOutputs(m).map(output=>{
  const ids=leafDeviceIds(m,output.id).filter(id=>id!==device.id);if(!ids.length)return '';
  if(kind(m,output.id)==='device')return destinationRow(output.id);
  const eligible=ids.filter(id=>buttonProfile(entity(m,id))&&entity(m,id).status==='online'),all=eligible.length>0&&eligible.every(id=>selectedIds.has(id)),some=eligible.some(id=>selectedIds.has(id));
  return `<section class="transfer-target-group"><label class="transfer-target-heading"><input type="checkbox" data-field="button-transfer-target" value="${esc(output.id)}" ${all?'checked':''} aria-checked="${some&&!all?'mixed':all}" ${!eligible.length?'disabled':''}/>${typeIcon(kind(m,output.id))}<span><strong>${esc(output.name)}</strong><small>${ids.length} ${ids.length===1?'destination':'destinations'}${leafDeviceIds(m,output.id).includes(device.id)?' · Source device excluded':''}</small></span></label><div>${ids.map(destinationRow).join('')}</div></section>`;
 }).join('');
 return `<div class="modal-heading"><h2>Transfer button assignments</h2><p>Copy from ${esc(device?.name)}. The source device is excluded from destinations.</p></div>
 <div class="transfer-body"><div class="transfer-workbench"><section class="transfer-keys" aria-label="Choose assigned keys"><header class="transfer-section-heading"><h3>Which assignments?</h3><div class="transfer-key-tools">${action('button-transfer-all','All','text-action','data-value="all"')}${action('button-transfer-all','None','text-action','data-value="none"')}</div></header>${['single','double'].map(gesture=>{const bank=keys.filter(item=>item.gesture===gesture);return bank.length?`<section class="transfer-key-bank"><h4>${gesture==='double'?'Twice':'Once'}</h4><div class="transfer-key-grid">${bank.map(item=>`<label><input type="checkbox" data-field="button-transfer-key" value="${esc(item.token)}" ${selected.includes(item.token)?'checked':''}/><span class="transfer-key-number">${item.key}</span><span><strong>${esc(source(s.catalog,item.sourceId)?.name||item.sourceId)}</strong></span></label>`).join('')}</div></section>`:''}).join('')}<p class="transfer-scope">Copies to the same key numbers. Existing assignments on those keys are replaced.</p></section>
 <section class="transfer-destinations" aria-label="Choose destination devices"><header class="transfer-section-heading"><h3>Copy to</h3></header><div class="transfer-targets">${destinations||'<p class="transfer-scope">No other devices available.</p>'}</div></section></div>
 <section class="transfer-review" aria-label="Transfer preview"><h3>Review</h3><label class="transfer-overwrite"><input type="checkbox" data-field="button-transfer-overwrite" ${modal.overwrite?'checked':''}/><span><strong>Overwrite conflicting assignments</strong><small>Move sources already assigned elsewhere to the selected keys. Their previous keys will be cleared, as listed below.</small></span></label>${report?transferResults(report,s.catalog):`<p class="transfer-scope">${esc(error||'Choose assignments and destinations to preview the changes.')}</p>`}</section></div>
 <div class="modal-footer">${action('close-modal','Cancel','btn-quiet')}${action('button-transfer-save',icon('add_link')+(copyCount?` Transfer ${copyCount} ${copyCount===1?'assignment':'assignments'}`:' Transfer'),'primary-btn',!copyCount?'disabled':'')}</div>`;

}
export function renderPresetTransferResult(s){
 const report={...s.modal.report,applied:true};
 return `<div class="modal-heading"><h2>Transfer results</h2><p>From ${esc(report.sourceName)} · ${report.whole?'All assigned keys':'Selected keys'}</p></div>${transferResults(report,s.catalog)}<div class="modal-footer">${action('close-modal','Done','primary-btn')}</div>`;
}
