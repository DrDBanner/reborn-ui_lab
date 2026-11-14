import {esc,icon,action,typeIcon} from './shared.js';
import {entity,kind,getTargets,leafDeviceIds,buttonProfile,presetAssignments,planPresetTransfer,source} from '../app/model.js';
const keyName=item=>`Key ${item.key} · ${item.gesture==='double'?'Twice':'Once'}`;
export function transferResults(report){
 return `<div class="transfer-results">${report.results.map(result=>`<section class="transfer-result"><strong>${esc(result.name)}</strong><p>${result.error?esc(result.error):`${result.copied.length} ${result.copied.length===1?'assignment':'assignments'} ${report.applied?'copied':'to copy'}`}</p>${result.skipped.length?`<ul>${result.skipped.map(item=>`<li>${esc(keyName(item))}: ${esc(item.reason)}</li>`).join('')}</ul>`:''}</section>`).join('')}</div>`;
}
export function renderPresetTransfer(s){
 const m=s.model,modal=s.modal,device=entity(m,modal.deviceId),keys=presetAssignments(device),selected=modal.keys||[],targets=modal.targetIds||[];
 let report=null,error='';
 if(targets.length&&selected.length)try{report=planPresetTransfer(m,device.id,targets,selected)}catch(problem){error=problem.message}
 const copyCount=report?.results.reduce((total,result)=>total+result.copied.length,0)||0;
 return `<div class="modal-heading"><h2>Transfer button assignments</h2><p>From ${esc(device?.name)} to devices, pairs or group members.</p></div>
 <fieldset class="transfer-keys"><legend>Choose assigned keys</legend><div class="transfer-key-tools">${action('button-transfer-all','All','text-action','data-value="all"')}${action('button-transfer-all','None','text-action','data-value="none"')}</div><div class="transfer-key-grid">${keys.map(item=>`<label><input type="checkbox" data-field="button-transfer-key" value="${esc(item.token)}" ${selected.includes(item.token)?'checked':''}/><span><strong>${esc(keyName(item))}</strong><small>${esc(source(s.catalog,item.sourceId)?.name||item.sourceId)}</small></span></label>`).join('')}</div></fieldset>
 <p class="transfer-scope">${selected.length===keys.length?'All assigned keys are transferred.':'Only selected keys are transferred.'} Other target keys stay unchanged. Each physical device is processed once.</p>
 <div class="modal-list transfer-targets">${getTargets(m).filter(target=>target.id!==device?.id).map(target=>{
  const ids=leafDeviceIds(m,target.id).filter(id=>id!==device.id),eligible=ids.some(id=>buttonProfile(entity(m,id)));
  return `<label class="choice-row"><input type="checkbox" data-field="button-transfer-target" value="${esc(target.id)}" ${targets.includes(target.id)?'checked':''} ${!eligible?'disabled':''}/>${typeIcon(kind(m,target.id))}<span><strong>${esc(target.name)}</strong><small>${ids.length} ${ids.length===1?'device':'devices'}${!eligible?' · No transferable button presets':''}</small></span></label>`;
 }).join('')}</div>
 ${report?transferResults(report):`<p class="transfer-scope">${esc(error||'Select keys and target outputs to review the transfer.')}</p>`}
 <div class="modal-footer">${action('close-modal','Cancel','btn-quiet')}${action('button-transfer-save',icon('add_link')+` Transfer ${copyCount} assignments`,'primary-btn',!copyCount?'disabled':'')}</div>`;
}
export function renderPresetTransferResult(s){
 const report={...s.modal.report,applied:true};
 return `<div class="modal-heading"><h2>Transfer results</h2><p>From ${esc(report.sourceName)} · ${report.whole?'All assigned keys':'Selected keys'}</p></div>${transferResults(report)}<div class="modal-footer">${action('close-modal','Done','primary-btn')}</div>`;
}
