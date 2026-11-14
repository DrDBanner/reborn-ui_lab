import {esc,action,deviceProduct} from './shared.js';
import {entity} from '../app/model.js';
export function releaseNoteVersions(s,id){
 const target=id==='application'?s.model.appUpdate:entity(s.model,id);
 return [...new Set((id==='application'?[target?.version,target?.currentVersion]:[target?.firmwareLatest,target?.firmware]).filter(Boolean))];
}
export function renderReleaseNotes(s){
 const id=s.modal.targetId,application=id==='application',target=application?s.model.appUpdate:entity(s.model,id),versions=releaseNoteVersions(s,id),version=s.modal.version||versions[0]||'';
 const supplied=application?target?.releaseNotes:target?.firmwareReleaseNotes;
 const notes=(Array.isArray(supplied)?supplied:[supplied]).find(item=>item&&item.version===version);
 const url=notes?.url;let link='';try{const parsed=new URL(url);if(['http:','https:'].includes(parsed.protocol)&&!parsed.username&&!parsed.password)link=parsed.href}catch{}
 return `<div class="modal-heading"><h2>Release notes</h2><p>${application?'ST Reborn application':esc(target?.name||'Speaker')+' · '+esc(deviceProduct(target))}</p></div>
 <label class="release-note-version" for="release-note-version">${application?'Application version':'Firmware version'}${versions.length?`<select id="release-note-version" class="small-select" data-field="release-note-version">${versions.map(value=>`<option value="${esc(value)}" ${value===version?'selected':''}>${esc(value)}</option>`).join('')}</select>`:'<span>Version not reported</span>'}</label>
 <section class="release-note-content" aria-label="Release notes content">${notes?.publishedAt?`<p class="muted">${esc(notes.publishedAt)}</p>`:''}${notes?.body?`<p class="release-note-body">${esc(notes.body)}</p>`:''}${Array.isArray(notes?.changes)&&notes.changes.length?`<ul>${notes.changes.map(change=>`<li>${esc(change)}</li>`).join('')}</ul>`:''}${!notes?.body&&!notes?.changes?.length?'<p class="muted">No release notes supplied for this version.</p>':''}${link?`<a href="${esc(link)}" target="_blank" rel="noopener noreferrer">Open original release notes</a>`:''}</section>
 <div class="modal-footer">${action('close-modal','Close','btn-quiet')}</div>`;
}
