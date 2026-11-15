import {releaseNoteVersions} from '../components/release-notes.js';
import {state,mutate,loadScenario,applyScenarioJson,applyDesign,toast,save,dismissToast,startDeviceIdentification,stopDeviceIdentification} from './store.js';
import {entity,kind,source,visibleOutputs,assignSource,createComposite,dissolveComposite,updateMembership,removeMemberKeepingGroup,configureGroupMembership,removeDevice,currentSession,sessionFor,parentIds,leafDeviceIds,membershipPlan,addToGroup,renameItem,groupSettingsDraft,saveGroupSettings,buttonProfile,buttonPresets,setButtonPreset,recallButtonPreset,presetAssignments,planPresetTransfer,transferButtonPresets,canAssignPresetSource,effectiveSessionFor,setDeviceVolume,setOutputVolume,stereoFamily,playbackJoinError,joinPlayback,rootOutputId,targetStatus,compatibleRadioSource,deviceAddresses,appearanceZoom,sourcePlaylist} from './model.js';
import {esc,icon,sourceDestination} from '../components/shared.js';
import {addSpotifyPlaylist,addLibraryServer,libraryServers,newLibraryQueue,addTracksToLibraryQueues,saveLibraryQueue,deleteLibraryQueue,searchLibraryTracks} from './library.js';

function navigate(view){mutate(s=>{s.view=view;s.sidebarOpen=false;s.appMenuOpen=false;s.filter='';s.historyQuery='';s.historyType='all';s.libraryQuery='';s.librarySearchOpen=false;s.librarySearchServer='all';s.libraryTrackIds=[];s.modal=null;s.selectedForComposite=[];});}
function openModal(kind,extras={}){mutate(s=>s.modal={kind,...extras},false)}
function closeModal(){mutate(s=>s.modal=s.modal?.kind==='member-change'?s.modal.previousModal||null:null,false)}
function memberChangeSnapshot(model,parentId){
 const ids=leafDeviceIds(model,parentId);
 return JSON.stringify({item:entity(model,parentId),parents:parentIds(model,parentId),playbacks:model.sessions.filter(session=>leafDeviceIds(model,session.targetId).some(id=>ids.includes(id)))});
}
function openMemberChange(parentId,memberId=null){
 const parent=entity(state.model,parentId),member=entity(state.model,memberId);
 if(!parent||!['pair','group'].includes(kind(state.model,parentId))||memberId&&(!member||!parent.memberIds.includes(memberId)))throw new Error('Membership changed; open the members again');
 openModal('member-change',{parentId,memberId,title:member?`Remove ${member.name}?`:`Dissolve ${parent.name}?`,scenarioId:state.scenarioId,snapshot:memberChangeSnapshot(state.model,parentId),previousModal:state.modal,error:''});
}
function confirmAction(title,description,callback){if(window.confirm(`${title}\n\n${description}`))callback()}
function exported(name,obj){const blob=new Blob([JSON.stringify(obj,null,2)+'\n'],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.download=name;a.href=url;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function notifySafe(task){try{task()}catch(err){toast(err?.message||String(err),{kind:'error'})}}
function currentDevice(){return entity(state.model,state.detailDeviceId||state.model.selectedDeviceId)}
function selectOutputContext(s,id){
 s.model.selectedOutputId=id;
 const playback=effectiveSessionFor(s.model,id);
 if(playback?.status==='playing'||playback?.status==='paused')s.model.selectedSessionId=playback.id;
}
function playbackNotice(sourceId,targetId){return `Playing ${source(state.catalog,sourceId)?.name||'selected source'} on ${entity(state.model,targetId)?.name||'selected output'}`;}
function generic(title,description,body=''){openModal('generic',{title,description,body})}

let rangeWheel={key:'',delta:0,time:0};
export function onRangeWheel(event){
 const target=event.target.closest('input[type="range"][data-field]');
 if(!target||target.disabled||event.ctrlKey||event.metaKey)return;
 const horizontal=Math.abs(event.deltaX)>Math.abs(event.deltaY);
 // Safari reports when natural scrolling inverted the physical device direction.
 const raw=(horizontal?-event.deltaX:event.deltaY)*(event.webkitDirectionInvertedFromDevice===true?-1:1);
 if(!Number.isFinite(raw)||!raw)return;
 event.preventDefault();
 const key=[target.dataset.field,target.dataset.id,currentSession(state.model)?.id,state.detailDeviceId,state.detailOutputId,state.modal?.kind].join(':'),time=Date.now();
 const delta=Math.sign(raw)*Math.min(40,Math.abs(raw)*(event.deltaMode===1?16:event.deltaMode===2?40:1));
 if(key!==rangeWheel.key||time-rangeWheel.time>250||Math.sign(delta)!==Math.sign(rangeWheel.delta))rangeWheel={key,delta:0,time};
 rangeWheel.delta+=delta;rangeWheel.time=time;
 const steps=Math.trunc(rangeWheel.delta/40);
 if(!steps)return;
 rangeWheel.delta-=steps*40;
 const value=Number(target.value),step=Number(target.step)>0?Number(target.step):1,min=target.min===''?0:Number(target.min),max=target.max===''?100:Number(target.max);
 const next=Math.max(min,Math.min(max,Number((value-steps*step).toFixed(8))));
 if(!Number.isFinite(next)||next===value)return;
 target.value=String(next);target.focus({preventScroll:true});
 onField(target.dataset.field,target);
}

export async function onAction(action,element){
 const m=state.model,id=element.dataset.id,val=element.dataset.value;
 try{switch(action){
 case 'navigate':if(val==='outputs'&&element.dataset.scope){state.model.ui.outputScope=element.dataset.scope;state.model.ui.outputView='outputs';state.model.ui.outputFilter='all';state.outputSearch='';}if(val==='sessions')state.model.ui.outputScope='active';navigate(val==='sessions'?'outputs':val);break;
 case 'toggle-app-menu':mutate(s=>{s.appMenuOpen=!s.appMenuOpen},false);break;
 case 'close-app-menu':mutate(s=>s.appMenuOpen=false,false);break;
 case 'select-session':{
  const playback=m.sessions.find(session=>session.id===id&&session.status!=='stopped');
  if(!playback||!entity(m,playback.targetId))throw new Error('Playback no longer available');
  mutate(s=>{s.model.selectedSessionId=id;s.model.selectedOutputId=playback.targetId;s.detailOutputId=playback.targetId;s.sidebarOpen=false;s.appMenuOpen=false;s.modal=null;s.model.ui.collapsed.outputs=false;
   if(kind(m,playback.targetId)==='device'){s.model.selectedDeviceId=playback.targetId;s.detailDeviceId=playback.targetId;s.model.ui.deviceTab='overview';s.view='device'}else{s.model.ui.groupTab='overview';s.view='group'}
  });break;
 }
 case 'toggle-preset-details':mutate(s=>s.expandedPresetTargetId=s.expandedPresetTargetId===id?null:id,false);break;
 case 'preset-gesture':if(!buttonProfile(entity(m,id)||currentDevice())?.gestures.includes(val))throw new Error('Unsupported button gesture');mutate(s=>s.presetGesture=val,false);break;
 case 'toggle-section':mutate(s=>{s.model.ui.collapsed[val]=!s.model.ui.collapsed[val]});break;
 case 'toggle-sidebar':mutate(s=>s.designTokens.sidebarCollapsed=!s.designTokens.sidebarCollapsed);break;
 case 'toggle-sidebar-mobile':mutate(s=>{s.sidebarOpen=!s.sidebarOpen},false);break;
 case 'expand-outputs':mutate(s=>s.expandingOutputs=true,false);break;
 case 'toggle-appearance':mutate(s=>{s.designTokens.appearance=s.designTokens.appearance==='dark'?'light':'dark';applyDesign()});break;
 case 'select-output':mutate(s=>{selectOutputContext(s,id);s.sidebarOpen=false;s.detailOutputId=id;if(kind(m,id)==='device'){s.detailDeviceId=id;s.model.selectedDeviceId=id;s.view='device'}else{s.view='group'}});break;
 case 'device-rename':{const device=entity(m,id);if(!device)throw new Error('Device no longer available');openModal('rename',{deviceId:id,nameDraft:device.name});break;}
 case 'device-rename-save':{if(state.modal?.kind!=='rename')break;mutate(s=>{renameItem(s.model,s.modal.deviceId,s.modal.nameDraft);s.modal=null});toast('Name saved (mock data)');break;}
 case 'device-open':mutate(s=>{selectOutputContext(s,id);s.detailDeviceId=id;s.model.selectedDeviceId=id;s.view='device';s.model.ui.deviceTab=element.dataset.tab||'overview';s.modal=null;});break;
 case 'group-open':mutate(s=>{s.detailOutputId=id;selectOutputContext(s,id);s.view='group';s.model.ui.groupTab='overview';s.modal=null});break;
 case 'target-actions':{
  const target=entity(m,id),type=kind(m,id);generic(target.name,'Quick actions for this output',`<div class="button-row"><button class="btn-soft" data-action="target-play" data-id="${esc(id)}">${icon('play_circle')} Play selected source</button><button class="btn-soft" data-action="${type==='device'?'device-open':'group-open'}" data-id="${esc(id)}">${icon('tune')} Manage</button></div>`);break;
 }
 case 'target-play':{const src=m.selectedSourceId||currentSession(m)?.sourceId||'flux';mutate(s=>{assignSource(s.model,src,id);s.modal=null;});break}
 case 'open-volume-controls':{const playback=currentSession(m);if(!playback)throw new Error('Choose a playback first');openModal('volume',{sessionId:playback.id,targetId:playback.targetId});break;}
 case 'output-source-open':{
  const targetId=rootOutputId(m,id)||id;
  if(!entity(m,targetId)||!['online','partial'].includes(targetStatus(m,targetId)))throw new Error('This output is unavailable');
  openModal('source-picker',{targetId,sourceType:'all',query:''});break;
 }
 case 'output-source-type':if(state.modal?.kind==='source-picker'&&['all','radio','library','spotify','native'].includes(val))mutate(s=>{s.modal.sourceType=val;s.modal.query=''},false);break;
 case 'output-source-choose':{
  const modal=state.modal;if(modal?.kind!=='source-picker')break;
  const targetId=modal.targetId,item=source(state.catalog,id);
  if(!item||element.dataset.target!==targetId||rootOutputId(m,targetId)!==targetId)throw new Error('Source or output changed; reopen the source selection');
  if(item.type==='radio'&&!compatibleRadioSource(m,item,targetId))throw new Error('This station is incompatible with the output');
  mutate(s=>{assignSource(s.model,id,targetId);s.model.history=[id,...s.model.history.filter(value=>value!==id)];s.modal=null});toast(playbackNotice(id,targetId));break;
 }
 case 'open-output-picker':{const playback=currentSession(m);mutate(s=>{s.speakerPickerFor=playback?.sourceId||m.selectedSourceId||'flux';s.modal={kind:'picker',sourceId:s.speakerPickerFor,asMember:false,joinContext:playback?{sessionId:playback.id,targetId:playback.targetId,sourceId:playback.sourceId}:null}},false);break;}
 case 'source-play':{if(!source(state.catalog,id))throw new Error('Source no longer available');const targetId=currentSession(m)?.targetId;if(!targetId||element.dataset.target!==targetId)throw new Error('Playback output changed; choose the current output again');mutate(s=>{assignSource(s.model,id,targetId);s.model.history=[id,...s.model.history.filter(item=>item!==id)]});toast(playbackNotice(id,targetId));break;}
 case 'source-select':{const playback=currentSession(m);mutate(s=>{s.model.selectedSourceId=id;s.speakerPickerFor=id;s.modal={kind:'picker',sourceId:id,asMember:false,joinContext:playback?{sessionId:playback.id,targetId:playback.targetId,sourceId:playback.sourceId}:null}},false);break;}
 case 'picker-toggle-search':if(state.modal?.kind==='picker')mutate(s=>{s.modal.searchOpen=!s.modal.searchOpen;if(!s.modal.searchOpen)s.modal.query=''},false);break;
 case 'assign-output':{
  const modal=state.modal,src=modal?.sourceId||state.speakerPickerFor||m.selectedSourceId||currentSession(m)?.sourceId||'flux';
  if(modal?.kind==='picker'&&modal.asMember){
   let outputId;mutate(s=>{if(!source(state.catalog,src))throw new Error('Source no longer available');if(modal.joinContext)outputId=joinPlayback(s.model,modal.joinContext,id,src);else{assignSource(s.model,src,id);outputId=currentSession(s.model).targetId;}const playback=currentSession(s.model);modal.joinContext={sessionId:playback.id,targetId:playback.targetId,sourceId:playback.sourceId};modal.joinedTargetIds=[...new Set([...(modal.joinedTargetIds||[]),id])];s.model.history=[src,...s.model.history.filter(item=>item!==src)];});toast(`${source(state.catalog,src)?.name} on ${entity(m,outputId)?.name} · ${entity(m,id)?.name} joined`);
  }else{mutate(s=>{assignSource(s.model,src,id);s.model.history=[src,...s.model.history.filter(x=>x!==src)];s.modal=null;s.speakerPickerFor=null});toast(playbackNotice(src,id))}break;
 }
 case 'station-playlist':if(sourcePlaylist(state.catalog,id))openModal('station-playlist',{sourceId:id,sessionId:element.dataset.session||null,title:`${source(state.catalog,id).name} · Playlist`});else throw new Error('Station playlist is no longer available');break;
 case 'source-info':{const d=source(state.catalog,id);generic(d?.name||'Source',`${d?.type||''} · ${d?.country||''} · ${d?.bitrate||''}`,`<div class="key-values"><div><span>Genre</span><strong>${esc(d?.genre)}</strong></div><div><span>Station</span><strong>${esc(d?.subtitle)}</strong></div></div>`);break}
 case 'reset-media-search':{
  const key=val==='library'?'libraryQuery':val==='history'?'historyQuery':'filter';
  mutate(s=>s[key]='',false);document.getElementById(val==='library'?'library-page-search':val==='history'?'history-search':'radio-search')?.focus?.({preventScroll:true});break;
 }
 case 'library-page-mode':if(['browse','titles'].includes(val))mutate(s=>{if(val==='titles'&&!s.librarySearchOpen)s.librarySearchServer=s.model.ui.libraryServer||libraryServers(s.model,s.catalog)[0]?.id||'all';s.librarySearchOpen=val==='titles';if(val==='browse')s.libraryQuery=''},false);break;
 case 'library-page-queues':{
  const available=new Set(searchLibraryTracks(m,state.catalog).map(track=>track.id)),ids=state.libraryTrackIds;
  if(!ids.length||ids.some(id=>!available.has(id)))throw new Error('Select available library titles first');
  openModal('library-search',{query:state.libraryQuery,serverId:state.librarySearchServer||'all',trackIds:[...ids],queueIds:[],newQueues:[],newName:'',error:'',fromPage:true});break;
 }
 case 'reset-history-search':mutate(s=>{s.historyQuery='';s.historyType='all'},false);document.getElementById('history-search')?.focus?.({preventScroll:true});break;
 case 'toggle-favorite':mutate(s=>{s.model.favorites=s.model.favorites.includes(id)?s.model.favorites.filter(x=>x!==id):[...s.model.favorites,id]});break;
 case 'radio-tab':mutate(s=>{s.model.ui.radioTab=val;s.filter=''});break;
 case 'radio-filter':mutate(s=>s.radioFiltersOpen=!s.radioFiltersOpen,false);break;
 case 'apply-radio-filter':mutate(s=>s.radioFiltersOpen=false,false);break;
 case 'pin-radio-filters':mutate(s=>s.model.ui.radioFiltersPinned=!s.model.ui.radioFiltersPinned);break;
 case 'radio-genre':mutate(s=>s.model.settings.radioGenre=val);break;
 case 'reset-radio-filters':mutate(s=>{Object.assign(s.model.settings,{searchCountry:'All',searchLanguage:'All',radioGenre:'All',radioOrder:'votes',radioMinBitrate:0,radioOnlyWorking:false,radioOnlyCompatible:false});s.filter=''});break;
 case 'button-transfer-open':{const device=entity(m,id);if(!buttonProfile(device))throw new Error('No button presets');openModal('button-transfer',{deviceId:id,targetIds:[],overwrite:false,keys:presetAssignments(device).map(item=>item.token)});break;}
 case 'button-transfer-all':mutate(s=>s.modal.keys=val==='none'?[]:presetAssignments(entity(s.model,s.modal.deviceId)).map(item=>item.token),false);break;
 case 'button-transfer-save':{const modal=state.modal;if(modal?.kind!=='button-transfer')break;mutate(s=>{const report=transferButtonPresets(s.model,modal.deviceId,modal.targetIds,modal.keys,{overwrite:modal.overwrite});s.modal={kind:'button-transfer-result',report}});break;}
 case 'preset-play':{const deviceId=id||currentDevice()?.id;mutate(s=>{recallButtonPreset(s.model,deviceId,Number(element.dataset.key),element.dataset.gesture||'single')});break}
 case 'preset-edit':{
  const device=entity(m,id||currentDevice()?.id),gesture=element.dataset.gesture||state.presetGesture||'single';
  if(!buttonProfile(device)?.gestures.includes(gesture))throw new Error('This device does not support that button gesture');
  const playback=effectiveSessionFor(m,device.id),draft=buttonPresets(device,gesture),key=Number(element.dataset.key||1);
  if(!Number.isInteger(key)||key<1||key>draft.length)throw new Error('This button is no longer available');
  openModal('preset',{deviceId:device.id,gesture,draft,keyIndex:key-1,sourceType:'all',query:'',captureSessionId:playback?.status!=='stopped'&&canAssignPresetSource(device,source(state.catalog,playback?.sourceId))?playback.id:null});break;
 }
 case 'preset-slot':if(state.modal?.kind==='preset')mutate(s=>{s.modal.keyIndex=Math.max(0,Math.min(s.modal.draft.length-1,Number(element.dataset.index)||0))},false);break;
 case 'preset-source-type':if(state.modal?.kind==='preset'&&['all','radio','library','spotify','native'].includes(val))mutate(s=>{s.modal.sourceType=val;s.modal.query=''},false);break;
 case 'preset-source-choose':case 'preset-use-current':{
  const modal=state.modal;if(modal?.kind!=='preset')break;
  const playbacks=m.sessions.filter(session=>session.status!=='stopped'&&canAssignPresetSource(entity(m,modal.deviceId),source(state.catalog,session.sourceId)));
  const playing=playbacks.length===1?playbacks[0]:playbacks.find(session=>session.id===modal.captureSessionId),sourceId=action==='preset-use-current'?playing?.sourceId:action==='preset-source-choose'?id:null;
  if(action==='preset-use-current'&&(!playing||element.dataset.session&&element.dataset.session!==playing.id||element.dataset.source&&element.dataset.source!==playing.sourceId))throw new Error('Playback changed; choose the source again');
  if(!canAssignPresetSource(entity(m,modal.deviceId),source(state.catalog,sourceId)))throw new Error('This source cannot be assigned to the selected device');
  mutate(s=>s.modal.draft[s.modal.keyIndex]=sourceId,false);break;
 }
 case 'preset-clear':if(state.modal?.kind==='preset'){const index=Number(element.dataset.index);if(Number.isInteger(index)&&index>=0&&index<state.modal.draft.length)mutate(s=>{s.modal.draft[index]=null;s.modal.keyIndex=index},false)}break;
 case 'preset-save':{
  const {deviceId,gesture}=state.modal||{},profile=buttonProfile(entity(m,deviceId));
  if(!profile?.gestures.includes(gesture))throw new Error('Preset capability no longer available');
  const values=state.modal.draft;
  if(!Array.isArray(values))throw new Error('No assignment draft available');
  if(values.length!==profile.keyCount||values.some((value,index)=>value!==buttonPresets(entity(m,deviceId),gesture)[index]&&value&&!canAssignPresetSource(entity(m,deviceId),source(state.catalog,value))))throw new Error('Invalid preset assignments');
  mutate(s=>{values.forEach((value,index)=>setButtonPreset(s.model,deviceId,index+1,gesture,value));s.modal=null});toast('Button assignments saved (mock data)');break;
 }
 case 'library-server':mutate(s=>s.model.ui.libraryServer=id);break;
 case 'library-settings':openModal('library-settings',{servers:structuredClone(m.libraryServers||[]),showDiscovered:m.settings.showDiscoveredLibraries!==false,name:'',address:'',sourceKind:'server',error:''});break;
 case 'library-add':if(state.modal?.kind==='library-settings'){
  try{const server=addLibraryServer(state.modal.servers,state.catalog.servers,state.modal.name,state.modal.address,state.modal.sourceKind);mutate(s=>{s.modal.servers.push(server);s.modal.name='';s.modal.address='';s.modal.error=''},false)}catch(error){mutate(s=>s.modal.error=error.message,false)}break;
 }
 case 'library-remove':if(state.modal?.kind==='library-settings'){if(m.sessions.some(session=>session.sourceId===id&&['playing','paused'].includes(session.status))||m.devices.some(device=>[...(device.presets||[]),...(device.doublePresets||[])].includes(id))){mutate(s=>s.modal.error='Stop playback and remove button assignments before removing this playlist link.',false);break;}mutate(s=>s.modal.servers=s.modal.servers.filter(server=>server.id!==id),false);}break;
 case 'library-settings-save':if(state.modal?.kind==='library-settings'){mutate(s=>{s.model.libraryServers=structuredClone(s.modal.servers);s.model.settings.showDiscoveredLibraries=s.modal.showDiscovered;const servers=libraryServers(s.model,s.catalog);if(s.model.ui.libraryServer!=='all'&&!servers.some(server=>server.id===s.model.ui.libraryServer))s.model.ui.libraryServer=servers[0]?.id||null;s.modal=null});toast('Music server settings saved');}break;
 case 'library-search':openModal('library-search',{query:'',serverId:'all',trackIds:[],queueIds:(m.libraryQueues||[]).some(q=>q.id===id)?[id]:[],newQueues:[],newName:'',error:''});break;
 case 'library-collection-open':{const collection=source(state.catalog,id);if(!collection?.serverId)throw new Error('Collection no longer available');openModal('library-search',{query:collection.name,serverId:collection.serverId,trackIds:[],queueIds:[],newQueues:[],newName:'',error:''});break;}
 case 'library-folder':if(val==='Saved Queues'){document.getElementById('saved-library-queues')?.scrollIntoView({block:'start'});break;}openModal('library-search',{query:['Albums','Artists','Playlists'].includes(val)?'':val,serverId:id||'all',trackIds:[],queueIds:[],newQueues:[],newName:'',error:''});break;
 case 'library-queue-draft-add':if(state.modal?.kind==='library-search'){const queue=newLibraryQueue(m,state.catalog,state.modal.newName,state.modal.newQueues);mutate(s=>{s.modal.newQueues.push(queue);s.modal.queueIds.push(queue.id);s.modal.newName='';s.modal.error=''},false);}break;
 case 'library-queue-append':if(state.modal?.kind==='library-search'){mutate(s=>{const draft=s.modal,appliedIds=[...draft.trackIds],report=addTracksToLibraryQueues(s.model,s.catalog,draft.trackIds,draft.queueIds,draft.newQueues);draft.newQueues=draft.newQueues.filter(queue=>!s.model.libraryQueues.some(saved=>saved.id===queue.id));draft.trackIds=[];if(draft.fromPage)s.libraryTrackIds=s.libraryTrackIds.filter(id=>!appliedIds.includes(id));draft.error='';draft.hasApplied=true;draft.searchRevision=(draft.searchRevision||0)+1;draft.notice=`${report.added} queue entries added to ${report.queues} ${report.queues===1?'queue':'queues'}${report.skipped?' · '+report.skipped+' already present':''}`;});}break;
 case 'library-queue-open':{const queue=(m.libraryQueues||[]).find(q=>q.id===id);if(!queue)throw new Error('Queue no longer available');openModal('library-queue',{draft:structuredClone(queue),baseline:JSON.stringify(queue),error:''});break;}
 case 'library-queue-move':if(state.modal?.kind==='library-queue'){const index=Number(element.dataset.index),delta=Number(val),ids=state.modal.draft.trackIds;if(Number.isInteger(index)&&[-1,1].includes(delta)&&index>=0&&index<ids.length&&index+delta>=0&&index+delta<ids.length)mutate(s=>{const tracks=s.modal.draft.trackIds;[tracks[index],tracks[index+delta]]=[tracks[index+delta],tracks[index]]},false);}break;
 case 'library-queue-track-remove':if(state.modal?.kind==='library-queue')mutate(s=>s.modal.draft.trackIds=s.modal.draft.trackIds.filter(trackId=>trackId!==id),false);break;
 case 'library-queue-save':if(state.modal?.kind==='library-queue'){if(JSON.stringify((m.libraryQueues||[]).find(q=>q.id===state.modal.draft.id))!==state.modal.baseline)throw new Error('Queue changed; reopen it before saving');mutate(s=>{saveLibraryQueue(s.model,state.catalog,s.modal.draft);s.modal=null});toast('Queue saved');}break;
 case 'library-queue-delete':if(state.modal?.kind==='library-queue'){const queue=(m.libraryQueues||[]).find(q=>q.id===id);confirmAction(`Delete queue “${queue?.name}”?`,'Removes the saved queue. Music files remain on their servers.',()=>{deleteLibraryQueue(m,id);mutate(s=>s.modal=null);toast('Queue deleted')}); }break;
 case 'player-previous':case 'player-next':{const session=currentSession(m);if(!session||element.dataset.session!==session.id)throw new Error('Playback changed; choose a title again');const item=source(state.catalog,session.sourceId),tracks=item?.type==='library'?sourcePlaylist(state.catalog,item.id,session)?.tracks:null,current=session.nowPlaying?.trackId||session.trackId,index=tracks?.findIndex(track=>track.id===current),next=tracks?.[index+(action==='player-next'?1:-1)];if(index<0||!next)break;mutate(s=>{session.trackId=next.id;session.nowPlaying={trackId:next.id,title:next.title,artist:next.artist,album:next.album}});break;}
 case 'playback-queue-move':{const session=m.sessions.find(item=>item.id===element.dataset.session),item=source(state.catalog,session?.sourceId);if(state.modal?.kind!=='station-playlist'||session?.id!==state.modal.sessionId||item?.id!==state.modal.sourceId||item.type!=='library')throw new Error('Queue changed; open its playlist again');const tracks=sourcePlaylist(state.catalog,item.id,session)?.tracks||[],ids=tracks.map(track=>track.id),index=ids.indexOf(id),step=Number(val),to=index+step;if(![-1,1].includes(step)||index<0||to<0||to>=ids.length)break;[ids[index],ids[to]]=[ids[to],ids[index]];mutate(()=>session.queueTrackIds=ids);break;}
 case 'simulate-track-change':{if(state.scenarioId!=='now-playing')break;const playback=currentSession(m),tracks=sourcePlaylist(state.catalog,playback?.sourceId)?.tracks;if(!tracks?.length)throw new Error('Select a playback with a playlist');const current=playback.nowPlaying?.title||state.catalog.tracks?.find(track=>track.id===playback.trackId)?.title,index=tracks.findIndex(track=>track.title===current),track=tracks[(index+1)%tracks.length];mutate(s=>{const session=s.model.sessions.find(item=>item.id===playback.id);session.nowPlaying={title:track.title,artist:track.artist,album:track.album,trackId:track.id};session.trackId=track.id});toast(`Now playing: ${track.title}`);break;}
 case 'spotify-playlist-link':openModal('playlist-link',{title:'Add Spotify playlist',name:'',address:'',error:''});break;
 case 'spotify-playlist-save':if(state.modal?.kind==='playlist-link'){try{const item=addSpotifyPlaylist(state.catalog.sources,state.modal.name,state.modal.address);mutate(s=>{s.model.spotifyPlaylists=[...(s.model.spotifyPlaylists||[]),item];s.modal=null});toast(`${item.name} added to Spotify`)}catch(error){mutate(s=>s.modal.error=error.message,false)}}break;
 case 'spotify-connect':mutate(s=>s.model.spotifyConnected=!s.model.spotifyConnected);break;
 case 'output-view':if(['outputs','devices'].includes(val))mutate(s=>{s.model.ui.outputView=val;s.model.ui.outputFilter='all'});break;
 case 'filter-output-scope':mutate(s=>s.model.ui.outputScope=s.model.ui.outputScope==='active'?'all':'active');break;
 case 'filter-outputs':mutate(s=>s.model.ui.outputFilter=val);break;
 case 'clear-selected':mutate(s=>s.selectedForComposite=[],false);break;
 case 'start-group-create':case 'start-pair-create':{
  const seed=id&&entity(m,id)&&!parentIds(m,id).length?id:null;
  mutate(s=>{s.sidebarOpen=false;s.appMenuOpen=false;s.selectedForComposite=seed?[seed]:[];s.modal={kind:'create',type:action==='start-pair-create'?'pair':'group',nameDraft:'',persistent:true,leftId:seed||'',rightId:''}},false);break;
 }
 case 'composite-create':{
   const draft=state.modal;if(draft?.kind!=='create')break;
   const type=draft.type,members=type==='pair'?[draft.leftId,draft.rightId]:state.selectedForComposite;
   mutate(s=>{const outputId=createComposite(s.model,type,draft.nameDraft,members,type==='pair'||draft.persistent);s.detailOutputId=outputId;s.view='group';s.model.ui.groupTab='overview';s.sidebarOpen=false;s.modal=null;s.selectedForComposite=[]});toast(type==='pair'?'Stereo pair created':'Group created');break;
 }
 case 'group-settings':openModal('group-settings',{draft:groupSettingsDraft(m,id||state.detailOutputId)});break;
 case 'group-settings-save':if(state.modal?.kind==='group-settings'){mutate(s=>{saveGroupSettings(s.model,s.modal.draft);s.modal=null});toast('Group settings saved (mock data)')}break;
 case 'add-member':case 'add-to-group':{const anchorId=id||state.detailOutputId;openModal('membership',{direction:action==='add-to-group'?'parent':'members',anchorId,selectedId:null,plan:null,stereo:false,persistent:entity(m,anchorId)?.persistent!==false,leftId:'',rightId:''});break;}
 case 'membership-choice':if(state.modal?.kind==='membership')mutate(s=>{const modal=s.modal,groupId=modal.direction==='parent'?id:modal.anchorId,memberId=modal.direction==='parent'?modal.anchorId:id;const plan=membershipPlan(m,groupId,memberId);if(plan.error)throw new Error(plan.error);modal.selectedId=id;modal.plan=plan;if(modal.direction==='members'){const members=[...entity(m,modal.anchorId).memberIds,id];modal.leftId=members[0]||'';modal.rightId=members[1]||''}},false);break;
 case 'membership-save':{
  const modal=state.modal;if(modal?.kind!=='membership'||!modal.selectedId||!modal.plan)throw new Error('Choose a group member first');
  const groupId=modal.direction==='parent'?modal.selectedId:modal.anchorId,memberId=modal.direction==='parent'?modal.anchorId:modal.selectedId;
  mutate(s=>{if(modal.direction==='members')configureGroupMembership(s.model,groupId,memberId,modal,modal.plan);else addToGroup(s.model,groupId,memberId,modal.plan);s.detailOutputId=groupId;s.model.selectedOutputId=groupId;s.view='group';s.model.ui.groupTab='overview';s.modal=null});toast(`${entity(m,memberId)?.name} added to ${entity(m,groupId)?.name}`);break;
 }
 case 'remove-member':openMemberChange(element.dataset.parent||state.detailOutputId,id);break;
 case 'dissolve-group':openMemberChange(id||state.detailOutputId);break;
 case 'member-change-keep':case 'member-change-dissolve':{
  const modal=state.modal;if(modal?.kind!=='member-change')break;
  if(modal.scenarioId!==state.scenarioId||modal.snapshot!==memberChangeSnapshot(m,modal.parentId)){mutate(s=>s.modal.error='Membership or playback changed. Close this dialog and review the members again.',false);break;}
  const dissolve=action==='member-change-dissolve';
  if(!dissolve&&!modal.memberId)throw new Error('Choose a member to remove');
  mutate(s=>{if(dissolve){dissolveComposite(s.model,modal.parentId);s.detailOutputId=null;s.modal=null;s.view='outputs'}else{removeMemberKeepingGroup(s.model,modal.parentId,modal.memberId);s.modal=null}});break;
 }
 case 'toggle-output-playback':mutate(s=>{const session=s.model.sessions.find(item=>item.id===id);if(session)session.status=session.status==='playing'?'paused':'playing'});break;
 case 'player-source':{
  const playback=currentSession(m),item=source(state.catalog,id),destination=sourceDestination(item);
  if(!playback||playback.id!==element.dataset.session||playback.sourceId!==id)throw new Error('Playback changed; open the current source again');
  if(!destination)throw new Error('No media view available for this source');
  if(item.type==='library'&&libraryServers(m,state.catalog).some(server=>server.id===item.serverId))m.ui.libraryServer=item.serverId;
  navigate(destination.view);break;
 }
 case 'player-toggle':mutate(s=>{const session=currentSession(s.model);if(session)session.status=session.status==='playing'?'paused':'playing'});break;
 case 'player-stop':mutate(s=>{const session=currentSession(s.model);if(session)session.status='stopped'});break;
 case 'session-prev':case 'session-next':mutate(s=>{const list=s.model.sessions;if(!list.length)return;const ix=list.findIndex(x=>x.id===s.model.selectedSessionId);const next=action==='session-next'?ix+1:ix-1;s.model.selectedSessionId=list[(next+list.length)%list.length].id});break;
 case 'group-tab':if(['overview','sound','functions','advanced'].includes(val))mutate(s=>s.model.ui.groupTab=val);break;
 case 'device-tab':mutate(s=>s.model.ui.deviceTab=val);break;
 case 'settings-tab':mutate(s=>s.model.ui.settingsTab=val);break;
 case 'device-identify':{
  if(state.identification?.deviceId===id&&state.identification.signal===element.dataset.signal)stopDeviceIdentification();
  else startDeviceIdentification(id,element.dataset.signal);
  break;
 }
 case 'remote-preview':generic('Phone remote','This would use the real remote endpoint in the integrated application.','<p>A mocked remote is not a second source of truth. The production frontend should reuse the device endpoint returned by the backend.</p>');break;
 case 'remote-qr':generic('Remote QR','QR codes should be generated from a verified backend endpoint.','<p>Not generated in the offline UI demo: no real device address was verified.</p>');break;
 case 'wifi-change':if(currentDevice()?.status==='offline')throw new Error('Device is offline');openModal('wifi');break;
 case 'wifi-save':{const net=document.getElementById('wifi-network')?.value;mutate(s=>{entity(s.model,s.detailDeviceId||m.selectedDeviceId).network=net;s.modal=null});toast('Network change simulated; verify rediscovery in production');break}
 case 'device-ping':toast(`${currentDevice()?.name}: ${currentDevice()?.status==='offline'?'No response':'Device responded (mock)'}`);break;
 case 'device-maintenance':openModal('maintenance');break;
 case 'device-restart':{const d=currentDevice();confirmAction('Restart device?',`This simulates restarting ${d?.name}.`,()=>{closeModal();toast('Restart simulated')});break}
 case 'device-remove':{const d=currentDevice();confirmAction('Remove device?',`Remove ${d?.name} from the local scenario?`,()=>mutate(s=>{removeDevice(s.model,d.id);s.view='outputs';s.modal=null}));break}
 case 'device-reset':confirmAction('Factory reset?',`This is a simulation only. No command will be sent.`,()=>{closeModal();toast('Reset simulation completed')});break;
 case 'alarms':{const device=entity(m,id);if(!device?.capabilities?.alarms)throw new Error('Alarm functions are no longer available on this device');generic('Alarms · '+device.name,'Device function',`<p>${device.alarms?.length||0} saved alarms.</p><p>Alarm editing and scheduling are not connected in this UI Lab.</p>`);break;}
 case 'button-actions':mutate(s=>s.model.ui.deviceTab='functions');break;
 case 'release-notes':if(id!=='application'&&!entity(m,id))throw new Error('Update target no longer available');openModal('release-notes',{targetId:id,version:releaseNoteVersions(state,id).includes(element.dataset.version)?element.dataset.version:releaseNoteVersions(state,id)[0]||''});break;
 case 'check-updates':mutate(s=>s.updateChecked=true,false);break;
 case 'update-start':mutate(s=>{const d=entity(s.model,id);if(d&&d.status==='online'){d.status='updating';d.updateProgress=5}});break;
 case 'update-all':{const ready=m.devices.filter(d=>d.status==='online'&&d.firmwareAvailable);if(!ready.length){toast('No speaker updates ready to install');break;}mutate(s=>{for(const device of ready){device.status='updating';device.updateProgress=5}});toast(`Started updates on ${ready.length} ${ready.length===1?'speaker':'speakers'}: ${ready.slice(0,3).map(d=>d.name).join(', ')}${ready.length>3?'…':''}`);break;}
 case 'advance-updates':mutate(s=>s.model.devices.forEach(d=>{if(d.status==='updating'){d.updateProgress=Math.min(100,(d.updateProgress||0)+25);if(d.updateProgress===100){d.status='online';d.firmware=d.firmwareLatest;d.firmwareAvailable=false}}}));break;
 case 'diagnostics':generic('Diagnostics','Simulated diagnostic summary',`<div class="key-values"><div><span>Known speakers</span><strong>${m.devices.length}</strong></div><div><span>Unavailable</span><strong>${m.devices.filter(x=>x.status==='offline').length}</strong></div><div><span>Firmware operations</span><strong>${m.devices.filter(x=>x.status==='updating').length}</strong></div></div>`);break;
 case 'backup':exported('streborn-ui-settings-backup.json',{devices:m.devices.map(d=>({id:d.id,name:d.name,presets:d.presets,doublePresets:d.doublePresets,brand:d.brand,model:d.model,hardwareRevision:d.hardwareRevision,macAddress:d.macAddress,ipv4Addresses:d.ipv4Addresses,ipv6Addresses:d.ipv6Addresses,firmware:d.firmware,agentName:d.agentName,agentVersion:d.agentVersion,capabilities:d.capabilities,alarms:d.alarms,buttonActions:d.buttonActions})),settings:m.settings,appSettings:state.appSettings,libraryQueues:m.libraryQueues||[],libraryServers:m.libraryServers||[],spotifyPlaylists:m.spotifyPlaylists||[]});toast('Downloaded sample settings backup');break;
 case 'restore':generic('Restore settings','Choose a backup in the production implementation.','<p>Restoring requires validation against actual speakers and their capabilities. UI Lab does not apply a backup automatically.</p>');break;
 case 'setup-next':if(state.setupStep===0){if(!state.setupSelection)throw new Error('Select a speaker');mutate(s=>s.setupStep=1,false)}else if(state.setupStep===1){const name=document.getElementById('setup-name')?.value.trim()||'New Speaker';const network=document.getElementById('setup-network')?.value||'Home Network';const cand=m.setupCandidates.find(x=>x.id===state.setupSelection);mutate(s=>{const id=`d${Math.max(0,...s.model.devices.map(d=>Number(d.id.replace(/\D/g,''))||0))+1}`;s.model.devices.push({id,name,brand:cand?.brand||null,model:cand?.model||null,hardwareRevision:cand?.hardwareRevision||null,macAddress:cand?.macAddress||null,ipv4Addresses:structuredClone(deviceAddresses(cand,'ipv4')),ipv6Addresses:structuredClone(deviceAddresses(cand,'ipv6')),agentName:cand?.agentName||null,agentVersion:cand?.agentVersion||null,capabilities:structuredClone(cand?.capabilities||{}),doublePresets:[],ip:cand?.ip||'192.168.0.221',status:'online',firmware:cand?.firmware||null,firmwareLatest:'27.0.6',firmwareAvailable:false,updateProgress:0,volume:25,bass:0,startVolumeEnabled:false,startVolume:20,language:'English',network,presets:Array(buttonProfile(cand)?.keyCount||0).fill(null),alarms:[],buttonActions:[]});s.model.selectedDeviceId=id;s.model.selectedOutputId=id;s.setupStep=2})}break;
 case 'setup-back':mutate(s=>s.setupStep=Math.max(0,s.setupStep-1),false);break;
 case 'help-open':generic(val==='guide'?'User guide':val==='feedback'?'Report a problem':'Wishes & voting', 'External project resources are not opened automatically.', '<p>Use the links and contribution process in the ST Reborn repository.</p>');break;
 case 'toggle-json-editor':mutate(s=>s.scenarioEditorOpen=!s.scenarioEditorOpen,false);break;
 case 'apply-json':applyScenarioJson(document.getElementById('scenario-json-editor')?.value||'');break;
 case 'export-scenario':exported(`streborn-${state.scenarioId}.json`,m);break;
 case 'export-tokens':exported('streborn-design-tokens.json',state.designTokens);break;
 case 'reset-scenario':await loadScenario(state.scenarioId,false,true);break;
 case 'load-scenario':await loadScenario(id,false,true);break;
 case 'close-modal':closeModal();break;
 case 'dismiss-toast':dismissToast(id);break;
 case 'open-updates-notice':dismissToast(id);navigate('updates');mutate(s=>s.model.ui.collapsed.system=false);break;
 default:console.warn('Unhandled action:',action);
 }}catch(err){if(['library-search','library-queue'].includes(state.modal?.kind))mutate(s=>s.modal.error=err?.message||String(err),false);else toast(err?.message||String(err),{kind:'error'})}
}

export async function onField(field,target){
 const m=state.model,val=target.value;
 try{switch(field){
 case 'picker-query':if(state.modal?.kind==='picker')mutate(s=>s.modal.query=val,false);break;
 case 'output-source-search':if(state.modal?.kind==='source-picker')mutate(s=>s.modal.query=val,false);break;
 case 'release-note-version':if(state.modal?.kind==='release-notes'&&releaseNoteVersions(state,state.modal.targetId).includes(val))mutate(s=>s.modal.version=val,false);break;
 case 'playlist-name':case 'playlist-address':if(state.modal?.kind==='playlist-link')mutate(s=>s.modal[field==='playlist-name'?'name':'address']=val,false);break;
 case 'library-kind':if(state.modal?.kind==='library-settings'&&['server','playlist'].includes(val))mutate(s=>s.modal.sourceKind=val,false);break;
 case 'library-name':case 'library-address':if(state.modal?.kind==='library-settings')mutate(s=>s.modal[field==='library-name'?'name':'address']=val,false);break;
 case 'library-page-search':mutate(s=>{if(!s.librarySearchOpen)s.librarySearchServer=s.model.ui.libraryServer||libraryServers(s.model,s.catalog)[0]?.id||'all';s.libraryQuery=val;s.librarySearchOpen=true},false);break;
 case 'library-page-server':if(val!=='all'&&!libraryServers(m,state.catalog).some(server=>server.id===val))throw new Error('Music server unavailable');mutate(s=>{s.librarySearchServer=val;s.model.ui.libraryServer=val});break;
 case 'library-page-track':if(!searchLibraryTracks(m,state.catalog).some(track=>track.id===val))throw new Error('Title unavailable');mutate(s=>s.libraryTrackIds=target.checked?[...new Set([...s.libraryTrackIds,val])]:s.libraryTrackIds.filter(id=>id!==val),false);break;
 case 'history-type':if(['all','radio','library','spotify','native'].includes(val))mutate(s=>s.historyType=val,false);break;
 case 'library-query':case 'library-new-queue':if(state.modal?.kind==='library-search')mutate(s=>s.modal[field==='library-query'?'query':'newName']=val,false);break;
 case 'library-search-server':if(state.modal?.kind==='library-search')mutate(s=>s.modal.serverId=val,false);break;
 case 'library-track':case 'library-queue-target':if(state.modal?.kind==='library-search')mutate(s=>{const key=field==='library-track'?'trackIds':'queueIds';s.modal[key]=target.checked?[...new Set([...s.modal[key],val])]:s.modal[key].filter(id=>id!==val)},false);break;
 case 'library-queue-name':if(state.modal?.kind==='library-queue')mutate(s=>s.modal.draft.name=val,false);break;
 case 'library-discovered':if(state.modal?.kind==='library-settings')mutate(s=>s.modal.showDiscovered=target.checked,false);break;
 case 'scenario':await loadScenario(val,false,true);break;
 case 'picker-mode':if(state.modal?.kind==='picker'&&['member','separate'].includes(val)&&target.checked!==false){const joining=val==='member',error=state.modal.joinContext?playbackJoinError(m,state.modal.joinContext):null;if(joining&&error)throw new Error(error);mutate(s=>{s.modal.asMember=joining;if(joining)s.modal.candidateIds=visibleOutputs(s.model).map(target=>target.id)},false)}break;
 case 'button-transfer-overwrite':if(state.modal?.kind==='button-transfer')mutate(s=>s.modal.overwrite=target.checked,false);break;
 case 'button-transfer-key':if(state.modal?.kind==='button-transfer')mutate(s=>s.modal.keys=target.checked?[...new Set([...s.modal.keys,val])]:s.modal.keys.filter(item=>item!==val),false);break;
 case 'button-transfer-target':if(state.modal?.kind==='button-transfer')mutate(s=>{const selected=new Set(s.modal.targetIds.flatMap(id=>leafDeviceIds(m,id))),ids=leafDeviceIds(m,val).filter(id=>id!==s.modal.deviceId&&buttonProfile(entity(m,id))&&entity(m,id).status==='online');for(const id of ids)target.checked?selected.add(id):selected.delete(id);s.modal.targetIds=[...selected]},false);break;
 case 'group-settings-persistent':case 'group-settings-leader':case 'group-settings-receiver':case 'group-settings-key':{
  if(state.modal?.kind!=='group-settings')break;
  mutate(s=>{const draft=s.modal.draft;if(field==='group-settings-persistent')draft.persistent=target.checked;else if(field==='group-settings-leader')draft.leaderDeviceId=val;else if(field==='group-settings-receiver')draft.receiverId=val;else if(['thumbsUp','thumbsDown'].includes(target.dataset.key)&&draft.bindings[draft.receiverId])draft.bindings[draft.receiverId][target.dataset.key]=target.checked},false);break;
 }
 case 'device-name':if(state.modal?.kind==='rename')state.modal.nameDraft=val;break;
 case 'preset-playback':if(state.modal?.kind==='preset'){const playback=m.sessions.find(session=>session.id===val&&session.status!=='stopped');if(val&&(!playback||!canAssignPresetSource(entity(m,state.modal.deviceId),source(state.catalog,playback.sourceId))))throw new Error('Playback source is no longer available');mutate(s=>s.modal.captureSessionId=val||null,false)}break;
 case 'preset-search':if(state.modal?.kind==='preset')mutate(s=>s.modal.query=val,false);break;
 case 'preset-device':if(!leafDeviceIds(m,target.dataset.id).includes(val)||!buttonProfile(entity(m,val)))throw new Error('Button device is not part of this output');mutate(s=>s.presetDeviceId=val,false);break;
 case 'speaker-variant':mutate(s=>s.model.ui.speakerVariant=val);break;
 case 'radio-country':case 'radio-language':case 'radio-order':case 'radio-bitrate':case 'radio-genre':case 'radio-output':case 'radio-working':case 'radio-compatible':{
  const keys={'radio-country':'searchCountry','radio-language':'searchLanguage','radio-order':'radioOrder','radio-bitrate':'radioMinBitrate','radio-genre':'radioGenre','radio-output':'radioOutputId','radio-working':'radioOnlyWorking','radio-compatible':'radioOnlyCompatible'};
  mutate(s=>s.model.settings[keys[field]]=target.type==='checkbox'?target.checked:field==='radio-bitrate'?Number(val):val);break;
 }
 case 'history-search':mutate(s=>s.historyQuery=val,false);break;
 case 'radio-search':mutate(s=>s.filter=val,false);break;
 case 'output-type':if(['all','device','pair','group'].includes(val))mutate(s=>s.model.ui.outputFilter=val);break;
 case 'output-search':mutate(s=>s.outputSearch=val,false);break;
 case 'membership-stereo':if(state.modal?.kind==='membership'&&state.modal.direction==='members')mutate(s=>{s.modal.stereo=target.checked;const existing=entity(m,s.modal.anchorId).memberIds,selected=entity(m,s.modal.selectedId);if(target.checked&&selected&&(kind(m,selected.id)!=='device'||stereoFamily(selected)!==stereoFamily(entity(m,existing[0])))){s.modal.selectedId=null;s.modal.plan=null}const members=[...existing,s.modal.selectedId].filter(Boolean);s.modal.leftId=members[0]||'';s.modal.rightId=members[1]||''},false);break;
 case 'membership-persistent':if(state.modal?.kind==='membership'&&state.modal.direction==='members')mutate(s=>s.modal.persistent=target.checked,false);break;
 case 'membership-left':case 'membership-right':if(state.modal?.kind==='membership'&&state.modal.direction==='members')mutate(s=>s.modal[field==='membership-left'?'leftId':'rightId']=val,false);break;
 case 'composite-name':if(state.modal?.kind==='create')state.modal.nameDraft=val;break;
 case 'composite-persistent':if(state.modal?.kind==='create')state.modal.persistent=target.checked;break;
 case 'composite-stereo':if(state.modal?.kind==='create')mutate(s=>{s.modal.type=target.checked?'pair':'group';if(target.checked){const ids=s.selectedForComposite.filter(id=>stereoFamily(entity(m,id)));s.modal.leftId=ids[0]||'';s.modal.rightId=ids[1]||''}else{s.selectedForComposite=[...new Set([...s.selectedForComposite,s.modal.leftId,s.modal.rightId].filter(Boolean))]}},false);break;
 case 'composite-left':case 'composite-right':if(state.modal?.kind==='create')mutate(s=>s.modal[field==='composite-left'?'leftId':'rightId']=val,false);break;
 case 'member-select':if(state.modal?.kind==='create')mutate(s=>{s.selectedForComposite=target.checked?[...new Set([...s.selectedForComposite,val])]:s.selectedForComposite.filter(x=>x!==val)},false);break;
 case 'session':mutate(s=>s.model.selectedSessionId=val);break;
 case 'volume':mutate(s=>{const session=currentSession(s.model);if(session)setOutputVolume(s.model,session.targetId,val)});break;
 case 'dialog-volume':case 'dialog-device-volume':{const modal=state.modal,session=m.sessions.find(item=>item.id===modal?.sessionId&&item.targetId===modal.targetId);if(modal?.kind!=='volume'||!session)throw new Error('Playback no longer available');if(field==='dialog-device-volume'&&!leafDeviceIds(m,modal.targetId).includes(target.dataset.id))throw new Error('Device is not in this output');mutate(s=>field==='dialog-volume'?setOutputVolume(s.model,modal.targetId,val):setDeviceVolume(s.model,target.dataset.id,val));break;}
 case 'composite-volume':mutate(s=>setOutputVolume(s.model,s.detailOutputId,val));break;
 case 'member-volume':mutate(s=>setDeviceVolume(s.model,target.dataset.id,val));break;
 case 'bass':mutate(s=>currentDevice().bass=Number(val));break;
 case 'start-volume-enabled':mutate(s=>currentDevice().startVolumeEnabled=target.checked);break;
 case 'start-volume':mutate(s=>currentDevice().startVolume=Number(val));break;
 case 'identification-duration':{const seconds=Number(val);if(!Number.isInteger(seconds)||seconds<1||seconds>300){target.value=String(state.appSettings.identificationSeconds);throw new Error('Choose an identification duration from 1 to 300 seconds');}mutate(s=>s.appSettings.identificationSeconds=seconds);break;}
 case 'language':mutate(s=>s.model.settings.language=val);break;
 case 'restore-session':mutate(s=>s.model.settings.restoreSession=target.checked);break;
 case 'auto-update':mutate(s=>s.model.settings.autoUpdate=target.checked);break;
 case 'telemetry':mutate(s=>s.model.settings.telemetry=target.checked);break;
 case 'setup-candidate':mutate(s=>s.setupSelection=val,false);break;
 case 'accent':mutate(s=>{s.designTokens.accent=val;applyDesign()});break;
 case 'appearance':mutate(s=>{s.designTokens.appearance=val;applyDesign()});break;
 case 'density':mutate(s=>{s.designTokens.density=val;applyDesign()});break;
 case 'radius':mutate(s=>{s.designTokens.radius=Number(val);applyDesign()});break;
 case 'sidebar-width':mutate(s=>{s.designTokens.sidebarWidth=Number(val);applyDesign()});break;
 case 'appearance-zoom':{const zoom=Number(val);if(!Number.isInteger(zoom)||zoom<100||zoom>200)throw new Error('Choose an app zoom from 100% to 200%');mutate(s=>{s.appSettings.appearanceZoom=appearanceZoom({appearanceZoom:zoom});applyDesign()});break;}
 default:console.warn('Unhandled field:',field)
 }}catch(err){if(['library-search','library-queue'].includes(state.modal?.kind))mutate(s=>s.modal.error=err?.message||String(err),false);else toast(err?.message||String(err),{kind:'error'})}
}
