import {libraryQueueErrors} from './library.js';
/** Pure domain selectors and state transforms. No DOM, no Wails dependencies. */
export function entity(model, id) {
  if (!model || !id) return null;
  return [...model.devices, ...model.pairs, ...model.groups].find(item => item.id === id) ?? null;
}

export function kind(model, id) {
  if (model.devices.some(x => x.id === id)) return 'device';
  if (model.pairs.some(x => x.id === id)) return 'pair';
  if (model.groups.some(x => x.id === id)) return 'group';
  return null;
}

export function leafDeviceIds(model, targetId, visited = new Set()) {
  if (!targetId || visited.has(targetId)) return [];
  visited.add(targetId);
  const type = kind(model, targetId);
  if (type === 'device') return [targetId];
  const t = entity(model, targetId);
  return t ? [...new Set((t.memberIds || []).flatMap(id => leafDeviceIds(model, id, new Set(visited))))] : [];
}

export function getTargets(model) {
  return [
    ...model.groups.map(x => ({...x, type: 'group'})),
    ...model.pairs.map(x => ({...x, type: 'pair'})),
    ...model.devices.map(x => ({...x, type: 'device'})),
  ];
}

export function parentIds(model, targetId) {
  return [...model.pairs, ...model.groups].filter(x => x.memberIds?.includes(targetId)).map(x => x.id);
}

export function rootOutputId(model,id){
 const seen=new Set();let current=id;
 while(!seen.has(current)){seen.add(current);const parent=parentIds(model,current)[0];if(!parent)return current;current=parent;}
 return null;
}
function containsItem(model,root,id,seen=new Set()){
 if(root===id)return true;if(seen.has(root))return false;seen.add(root);
 return (entity(model,root)?.memberIds||[]).some(child=>containsItem(model,child,id,seen));
}
export function membershipError(model,groupId,memberId){
 const group=model.groups.find(item=>item.id===groupId),member=entity(model,memberId);
 if(!group||!member)return 'Group or item no longer available';
 if(containsItem(model,memberId,groupId))return 'A group cannot contain itself or one of its parents';
 if(parentIds(model,memberId).length)return 'This item already belongs to a group or stereo pair';
 const root=rootOutputId(model,groupId),ids=new Set(leafDeviceIds(model,root));
 if(leafDeviceIds(model,memberId).some(id=>ids.has(id)))return 'These speakers are already members';
 if(targetStatus(model,memberId)!=='online')return 'All added speakers must be online';
 if(!['online','partial'].includes(targetStatus(model,root)))return 'The destination group is unavailable';
 return null;
}

export function membershipPlan(model,groupId,memberId){
 const error=membershipError(model,groupId,memberId);if(error)return {error};
 const rootId=rootOutputId(model,groupId),active=session=>session&&['playing','paused'].includes(session.status);
 const rootDevices=leafDeviceIds(model,rootId),memberDevices=leafDeviceIds(model,memberId);
 const overlaps=(session,devices)=>leafDeviceIds(model,session.targetId).some(id=>devices.includes(id));
 const targetSession=model.sessions.find(session=>active(session)&&overlaps(session,rootDevices))||sessionFor(model,rootId),memberSession=model.sessions.find(session=>active(session)&&overlaps(session,memberDevices));
 const playback=active(targetSession)?targetSession:active(memberSession)?memberSession:targetSession||null;
 const replaced=model.sessions.filter(session=>active(session)&&session.id!==playback?.id&&(overlaps(session,rootDevices)||overlaps(session,memberDevices)));
 return {error:null,rootId,rootDevices,memberDevices,playback:playback?structuredClone(playback):null,replaced:replaced[0]?structuredClone(replaced[0]):null,replacedPlaybacks:structuredClone(replaced)};
}

export function addToGroup(model,groupId,memberId,expectedPlan=null){
 const plan=membershipPlan(model,groupId,memberId);if(plan.error)throw new Error(plan.error);
 if(expectedPlan&&JSON.stringify(plan)!==JSON.stringify(expectedPlan))throw new Error('Playback changed; review this membership again');
 const group=entity(model,groupId),root=entity(model,plan.rootId),affected=new Set([...leafDeviceIds(model,root.id),...leafDeviceIds(model,memberId)]);
 const conflicts=new Set(model.sessions.filter(session=>leafDeviceIds(model,session.targetId).some(id=>affected.has(id))).map(session=>session.id));
 group.memberIds.push(memberId);
 model.sessions=model.sessions.filter(session=>!conflicts.has(session.id));
 if(plan.playback){
  const playback={...plan.playback,targetId:root.id};model.sessions.push(playback);root.volume=playback.volume;
  if(conflicts.has(model.selectedSessionId))model.selectedSessionId=playback.id;
 }
 if(!model.sessions.some(session=>session.id===model.selectedSessionId))model.selectedSessionId=null;
 model.selectedOutputId=root.id;
 return plan;
}

// Prepare the entire change before committing membership, persistence or channel roles.
export function configureGroupMembership(model,groupId,memberId,options={},expectedPlan=null){
 const next=structuredClone(model);
 addToGroup(next,groupId,memberId,expectedPlan);
 const group=entity(next,groupId);
 if(options.stereo){
  const members=[options.leftId,options.rightId];
  if(group.memberIds.length!==2||members.length!==new Set(members).size||members.some(id=>!group.memberIds.includes(id)))throw new Error('Stereo requires exactly two member speakers with left and right channels');
  const detached=structuredClone(next);
  detached.groups=detached.groups.filter(item=>item.id!==groupId);
  const error=validateGroupMembers(detached,members,'pair');
  if(error)throw new Error(error);
  const {leaderDeviceId,...record}=group;
  next.groups=next.groups.filter(item=>item.id!==groupId);
  next.pairs.push({...record,memberIds:members,leftDeviceId:members[0],rightDeviceId:members[1],persistent:true});
 }else group.persistent=options.persistent??group.persistent;
 Object.assign(model,next);
}

export function visibleOutputs(model) {
  // A speaker within a pair, or a pair/speaker within a group, is represented by its parent.
  return getTargets(model).filter(t => !parentIds(model, t.id).length);
}

export function targetStatus(model, targetId) {
  const ids = leafDeviceIds(model, targetId);
  if (!ids.length) return 'unknown';
  const statuses = ids.map(id => entity(model, id)?.status);
  if (statuses.some(s => s === 'error')) return 'error';
  if (statuses.every(s => s === 'offline')) return 'offline';
  if (statuses.some(s => s === 'needs_setup')) return 'needs_setup';
  if (statuses.some(s => s === 'updating')) return 'updating';
  if (statuses.some(s => s === 'offline')) return 'partial';
  return 'online';
}

export function sessionFor(model, targetId) {
  return model.sessions.find(x => x.targetId === targetId) ?? null;
}

export function effectiveSessionFor(model, targetId) {
  const exact=sessionFor(model,targetId);
  if(exact)return exact;
  const deviceIds=new Set(leafDeviceIds(model,targetId));
  return model.sessions.find(session=>leafDeviceIds(model,session.targetId).some(id=>deviceIds.has(id)))||null;
}

export function currentSession(model) {
  const active=model.sessions.filter(item=>item.status==='playing'||item.status==='paused');
  return active.find(item=>item.id===model.selectedSessionId)??active[0]??null;
}

export function outputsByPlayback(model,targets,previousIds=[]){
 const rank=target=>({playing:0,paused:1})[effectiveSessionFor(model,target.id)?.status]??2;
 const positions=new Map(previousIds.map((id,index)=>[id,index]));
 return targets.map((target,index)=>({target,index,rank:rank(target),position:positions.get(target.id)??Infinity})).sort((a,b)=>(a.position===b.position?0:a.position-b.position)||a.rank-b.rank||a.index-b.index).map(item=>item.target);
}

export function availableUpdates(model){
 const updates=[];
 if(model?.appUpdate?.available)updates.push({key:`app:${model.appUpdate.version||'unknown'}`,name:'ST Reborn desktop',version:model.appUpdate.version||null,type:'app'});
 for(const device of model?.devices||[])if(device.firmwareAvailable&&device.status!=='updating')updates.push({key:`firmware:${device.id}:${device.firmwareLatest||'unknown'}`,name:device.name,version:device.firmwareLatest||null,type:'firmware'});
 return updates;
}

function volumeValue(value){
 const number=Number(value);
 if(!Number.isFinite(number)||number<0||number>100)throw new Error('Volume must be between 0 and 100');
 return Math.round(number);
}
export function setDeviceVolume(model,deviceId,value){
 const device=model.devices.find(item=>item.id===deviceId);
 if(!device||device.status!=='online')throw new Error('Device is not available for volume control');
 device.volume=volumeValue(value);
 const playback=sessionFor(model,deviceId);if(playback)playback.volume=device.volume;
}
export function setOutputVolume(model,targetId,value){
 const target=entity(model,targetId),status=targetStatus(model,targetId);
 if(!target||!['online','partial'].includes(status))throw new Error('Output is not available for volume control');
 const volume=volumeValue(value),playback=sessionFor(model,targetId),previous=playback?.volume??target.volume??25,delta=volume-previous;
 for(const id of leafDeviceIds(model,targetId)){
  const device=entity(model,id);if(device.status==='online')device.volume=kind(model,targetId)==='device'?volume:Math.max(0,Math.min(100,Math.round((device.volume??previous)+delta)));
 }
 target.volume=volume;if(playback)playback.volume=volume;
}

export function renameDevice(model,deviceId,name){
  const device=model.devices.find(item=>item.id===deviceId);
  if(!device)throw new Error('Device no longer available');
  renameItem(model,deviceId,name);
}

export function renameItem(model,itemId,name){
  const item=entity(model,itemId);
  if(!item)throw new Error('Item no longer available');
  const trimmed=String(name??'').trim();
  if(!trimmed)throw new Error('Enter a name');
  if(trimmed.length>120)throw new Error('Use at most 120 characters');
  item.name=trimmed;
}

// A stereo follower cannot independently lead its containing multiroom group.
export function groupLeaderCandidates(model,group,seen=new Set()){
 if(!group||seen.has(group.id))return [];seen.add(group.id);
 return (group?.memberIds||[]).flatMap(id=>{
  const item=entity(model,id),type=kind(model,id);
  if(type==='group')return groupLeaderCandidates(model,item,seen);
  const leader=type==='pair'?(item.leaderDeviceId||item.leftDeviceId||item.memberIds[0]):id;
  return [entity(model,leader)].filter(Boolean);
 });
}
export function remoteGroupKeyDevices(model){
 return model.devices.filter(device=>device.capabilities?.grouping?.remoteKeys?.some(key=>['thumbsUp','thumbsDown'].includes(key)));
}
export function groupSettingsDraft(model,groupId){
 const group=model.groups.find(item=>item.id===groupId);
 if(!group)throw new Error('Group no longer available');
 const bindings=Object.fromEntries(remoteGroupKeyDevices(model).map(device=>[device.id,Object.fromEntries(['thumbsUp','thumbsDown'].map(key=>[key,device.groupKeys?.bindings?.[key]===group.id]))]));
 return {groupId,memberIds:[...group.memberIds],persistent:!!group.persistent,leaderDeviceId:group.leaderDeviceId||'',bindings,originalBindings:Object.fromEntries(remoteGroupKeyDevices(model).map(device=>[device.id,structuredClone(device.groupKeys||{templates:[],bindings:{}})])),receiverId:remoteGroupKeyDevices(model).find(device=>leafDeviceIds(model,groupId).includes(device.id))?.id||remoteGroupKeyDevices(model)[0]?.id||''};
}
export function saveGroupSettings(model,draft){
 const group=model.groups.find(item=>item.id===draft.groupId);
 if(!group||JSON.stringify(group.memberIds)!==JSON.stringify(draft.memberIds))throw new Error('Group members changed; reopen group settings');
 const leader=groupLeaderCandidates(model,group).find(device=>device.id===draft.leaderDeviceId);
 if(!leader||leader.status!=='online')throw new Error('Choose an available main speaker');
 const writes=[];
 for(const [deviceId,selected] of Object.entries(draft.bindings||{})){
  const device=entity(model,deviceId),current=device?.groupKeys||{templates:[],bindings:{}},next=structuredClone(current);
  for(const key of ['thumbsUp','thumbsDown']){
   const assigned=current.bindings?.[key]===group.id;
   if(!!selected[key]===assigned)continue;
   if(device?.status!=='online'||!device.capabilities?.grouping?.remoteKeys?.includes(key))throw new Error('Remote button device is no longer available');
   next.bindings??={};
   if(selected[key])next.bindings[key]=group.id;
   else delete next.bindings[key];
  }
  if(Object.values(next.bindings||{}).includes(group.id)){
   const snapshot={id:group.id,name:group.name,leaderDeviceId:leader.id,deviceIds:leafDeviceIds(model,group.id),persistent:!!draft.persistent};
   next.templates=[...(next.templates||[]).filter(template=>template.id!==group.id),snapshot];
  }
  if(JSON.stringify(next)!==JSON.stringify(current)){
   if(device?.status!=='online')throw new Error('Remote button device is no longer available');
   if(JSON.stringify(current)!==JSON.stringify(draft.originalBindings?.[deviceId]))throw new Error('Remote assignments changed; reopen group settings');
   writes.push([device,next]);
  }
 }
 // Validate the complete draft before changing any group or receiver.
 group.persistent=!!draft.persistent;group.leaderDeviceId=leader.id;
 for(const [device,groupKeys] of writes)device.groupKeys=groupKeys;
}

/** Capabilities come from the adapter/fixture, never from a brand or model name. */
export function buttonProfile(device) {
  const profile=device?.capabilities?.buttonPresets;
  if(!profile||!Number.isInteger(profile.keyCount)||profile.keyCount<1)return null;
  const gestures=['single','double'].filter(gesture=>profile.gestures?.includes(gesture));
  return gestures.includes('single')?{keyCount:profile.keyCount,gestures}:null;
}

export function buttonPresets(device,gesture='single') {
  const profile=buttonProfile(device);
  if(!profile?.gestures.includes(gesture))return [];
  const bank=gesture==='double'?device.doublePresets:device.presets;
  return Array.from({length:profile.keyCount},(_,index)=>bank?.[index]||null);
}

export function canAssignPresetSource(device,item){
 const types=device?.capabilities?.buttonPresets?.sourceTypes;
 return !!buttonProfile(device)&&!!item&&(!Array.isArray(types)||types.includes(item.type));
}

export function setButtonPreset(model,deviceId,key,gesture,sourceId) {
  const device=model.devices.find(item=>item.id===deviceId),profile=buttonProfile(device);
  if(!profile?.gestures.includes(gesture))throw new Error('This device does not support that button gesture');
  if(!Number.isInteger(key)||key<1||key>profile.keyCount)throw new Error('Invalid hardware key');
  const bank=buttonPresets(device,gesture);bank[key-1]=sourceId||null;
  device[gesture==='double'?'doublePresets':'presets']=bank;
}

export function presetPlaybackTarget(model,deviceId) {
  return visibleOutputs(model).find(output=>leafDeviceIds(model,output.id).includes(deviceId))?.id||deviceId;
}

export function recallButtonPreset(model,deviceId,key,gesture='single') {
  const device=model.devices.find(item=>item.id===deviceId),profile=buttonProfile(device);
  if(!profile?.gestures.includes(gesture)||!Number.isInteger(key)||key<1||key>profile.keyCount)throw new Error('Unsupported hardware key or gesture');
  if(device.status!=='online')throw new Error('Device must be online to recall a button');
  const sourceId=buttonPresets(device,gesture)[key-1];
  if(!sourceId)throw new Error('No source assigned to this key');
  return assignSource(model,sourceId,presetPlaybackTarget(model,deviceId));
}

export function presetAssignments(device){
  return (buttonProfile(device)?.gestures||[]).flatMap(gesture=>buttonPresets(device,gesture).flatMap((sourceId,index)=>sourceId?[{key:index+1,gesture,sourceId,token:`${gesture}:${index+1}`}]:[]));
}

/** Composite targets fan out once per device; explicit overwrite relocates conflicting sources. */
export function planPresetTransfer(model,sourceId,targetIds,tokens=null,{overwrite=false}={}){
  const device=model.devices.find(item=>item.id===sourceId);
  if(!buttonProfile(device))throw new Error('Source device has no button presets');
  if(device.status!=='online')throw new Error('Source device must be online');
  const available=presetAssignments(device),selected=available.filter(item=>!tokens||tokens.includes(item.token));
  if(!selected.length)throw new Error('Select at least one assigned key');
  const whole=selected.length===available.length;
  const ids=[...new Set(targetIds.flatMap(id=>leafDeviceIds(model,id)))].filter(id=>id!==sourceId);
  if(!ids.length)throw new Error('Choose another device or group');
  const results=ids.map(id=>{
    const target=entity(model,id),profile=buttonProfile(target),result={id,name:target.name,copied:[],cleared:[],replaced:[],skipped:[],error:null};
    if(!profile){result.error='No hardware button presets';return result;}
    if(target.status!=='online'){result.error=`Device is ${target.status}`;return result;}
    let pending=selected.filter(item=>{
      if(item.key<=profile.keyCount&&profile.gestures.includes(item.gesture))return true;
      result.skipped.push({...item,reason:'Key or gesture not supported'});return false;
    });
    const existing=presetAssignments(target);
    while(pending.length){
      const conflict=pending.map((item,index)=>({item,other:pending.slice(0,index).find(other=>other.sourceId===item.sourceId)||existing.find(other=>other.sourceId===item.sourceId&&other.token!==item.token&&!pending.some(write=>write.token===other.token)&&!result.cleared.some(clear=>clear.token===other.token))})).find(entry=>entry.other);
      if(!conflict)break;
      if(overwrite&&!pending.some(item=>item.token===conflict.other.token)){
        result.cleared.push({...conflict.other,movedTo:conflict.item.token});continue;
      }
      const reason=`Source already assigned to key ${conflict.other.key} (${conflict.other.gesture==='double'?'Twice':'Once'})`;
      if(whole){result.error=reason;result.skipped.push(...pending.map(item=>({...item,reason:'Whole-set transfer refused; target unchanged'})));pending=[];break;}
      result.skipped.push({...conflict.item,reason});pending=pending.filter(item=>item.token!==conflict.item.token);
    }
    result.cleared=result.cleared.filter(item=>pending.some(write=>write.token===item.movedTo));
    result.replaced=pending.flatMap(item=>{const old=existing.find(other=>other.token===item.token&&other.sourceId!==item.sourceId);return old?[{...old,replacementSourceId:item.sourceId}]:[]});
    result.copied=pending;
    return result;
  });
  return {sourceId,sourceName:device.name,whole,overwrite,selectedKeys:selected.length,results};
}

export function transferButtonPresets(model,sourceId,targetIds,tokens=null,options={}){
  const report=planPresetTransfer(model,sourceId,targetIds,tokens,options);
  for(const result of report.results){
    for(const item of result.cleared)setButtonPreset(model,result.id,item.key,item.gesture,null);
    for(const item of result.copied)setButtonPreset(model,result.id,item.key,item.gesture,item.sourceId);
  }
  return report;
}

// Keep all reported addresses; the existing ip field remains the endpoint fallback.
export function deviceAddresses(device,family){
 const values=device?.[family+'Addresses'];
 if(Array.isArray(values))return values.filter(value=>typeof value==='string'&&value.trim());
 const ip=device?.ip;
 return typeof ip==='string'&&ip.trim()&&(family==='ipv6'?ip.includes(':'):!ip.includes(':'))?[ip]:[];
}
export function identificationDuration(settings){
 const seconds=settings?.identificationSeconds;
 return Number.isInteger(seconds)&&seconds>=1&&seconds<=300?seconds:30;
}
export function identificationSignals(device){
 const signals=device?.capabilities?.identification;
 return Array.isArray(signals)?['sound','blink'].filter(signal=>signals.includes(signal)):[];
}

export function normalizeScenario(model,fixture=null) {
  for(const session of model.sessions||[]){
   const original=fixture?.sessions?.find(item=>item.id===session.id&&item.sourceId===session.sourceId);
   if(session.nowPlaying===undefined&&original?.nowPlaying)session.nowPlaying=structuredClone(original.nowPlaying);
  }
  for(const collection of ['devices','setupCandidates'])for(const device of model[collection]||[]){
    const original=fixture?.[collection]?.find(item=>item.id===device.id);
    // Migrate only known sample identities; unknown devices keep unknown capabilities.
    for(const key of ['brand','hardwareRevision','macAddress','agentName','agentVersion','capabilities']){
      if(device[key]===undefined)device[key]=original?.[key]===undefined?(key==='capabilities'?{}:null):structuredClone(original[key]);
    }
    for(const family of ['ipv4','ipv6']){
      const key=family+'Addresses';
      if(device[key]===undefined)device[key]=structuredClone((device.ip===original?.ip?original?.[key]:undefined)??deviceAddresses(device,family));
    }
    if(device.capabilities&&device.capabilities.identification===undefined&&original?.capabilities?.identification)device.capabilities.identification=structuredClone(original.capabilities.identification);
    if(device.capabilities&&device.capabilities.grouping===undefined&&original?.capabilities?.grouping)device.capabilities.grouping=structuredClone(original.capabilities.grouping);
    if(device.capabilities?.grouping&&device.capabilities.grouping.remoteKeys===undefined&&original?.capabilities?.grouping?.remoteKeys)device.capabilities.grouping.remoteKeys=structuredClone(original.capabilities.grouping.remoteKeys);
    if(collection==='devices'&&device.doublePresets===undefined)device.doublePresets=[];
  }
  for(const group of model.groups||[]){
   const original=fixture?.groups?.find(item=>item.id===group.id);
   if(group.leaderDeviceId===undefined&&original?.leaderDeviceId&&groupLeaderCandidates(model,group).some(device=>device.id===original.leaderDeviceId))group.leaderDeviceId=original.leaderDeviceId;
  }
  return model;
}

export function source(catalog, sourceId) {
  return catalog?.sources?.find(x => x.id === sourceId) ?? null;
}

export function playbackMetadata(catalog,session){
 const item=source(catalog,session?.sourceId),reported=session?.nowPlaying;
 const trackId=reported?.trackId||session?.trackId||(item?.kind==='track'?item.trackId:null);
 const track=trackId?catalog?.tracks?.find(track=>track.id===trackId):null;
 const data=(reported?{...track,...reported}:null)??track??(item?.kind==='track'?{title:item.name,artist:item.artist,album:item.album}:null);
 if(!data)return null;
 const metadata=Object.fromEntries(['title','artist','album'].map(key=>[key,typeof data[key]==='string'?data[key].trim():'']));
 return Object.values(metadata).some(Boolean)?metadata:null;
}

export function stationPlaylist(catalog,sourceId){
 const item=source(catalog,sourceId),playlist=item?.stationPlaylist;
 return item?.type==='radio'&&Array.isArray(playlist?.tracks)&&playlist.tracks.length?playlist:null;
}

export function sourcePlaylist(catalog,sourceId,session=null){
 const station=stationPlaylist(catalog,sourceId);if(station)return station;
 const item=source(catalog,sourceId);
 const tracks=Array.isArray(item?.trackIds)?item.trackIds.map(id=>catalog.tracks?.find(track=>track.id===id)||{id,title:'Title currently unavailable'}):item?.type==='library'?(catalog.tracks||[]).filter(track=>track.collectionId===sourceId):[];
 if(!tracks.length)return null;
 const ordered=session?.queueTrackIds;if(!Array.isArray(ordered))return {tracks};
 const byId=new Map(tracks.map(track=>[track.id,track]));
 return {tracks:[...new Set([...ordered,...tracks.map(track=>track.id)])].map(id=>byId.get(id)).filter(Boolean)};
}
export function rememberPlayingTracks(model,catalog){
 if(!model||!catalog)return;
 for(const session of model.sessions||[]){
  if(session.status!=='playing')continue;
  const metadata=playbackMetadata(catalog,session);if(!metadata?.title)continue;
  const previous=model.listeningHistory?.find(entry=>entry.sessionId===session.id);
  if(previous&&['title','artist','album'].every(key=>previous[key]===metadata[key]))continue;
  model.listeningHistory=[{...metadata,sourceId:session.sourceId,targetId:session.targetId,sessionId:session.id,playedAt:new Date().toISOString()},...(model.listeningHistory||[])];
  if(!model.history.includes(session.sourceId))model.history.unshift(session.sourceId);
 }
}

export function historySources(model,catalog,query='',type='all'){
 const fold=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const words=fold(query).trim().split(/\s+/).filter(Boolean),byId=new Map((catalog?.sources||[]).map(item=>[item.id,item]));
 return (model.history||[]).map(id=>byId.get(id)).filter(Boolean).filter(item=>{
  const server=catalog?.servers?.find(server=>server.id===item.serverId);
  const titles=(model.listeningHistory||[]).filter(entry=>entry.sourceId===item.id).flatMap(entry=>[entry.title,entry.artist,entry.album]);
  const text=fold([item.name,item.subtitle,item.type,item.kind,item.genre,item.artist,item.album,item.service,server?.name,...titles].filter(Boolean).join(' '));
  return (type==='all'||item.type===type)&&words.every(word=>text.includes(word));
 });
}

export function radioOptions(model){
  const settings=model.settings||{};
  return {country:settings.searchCountry||'All',language:settings.searchLanguage||'All',genre:settings.radioGenre||'All',order:settings.radioOrder||'votes',minBitrate:Number(settings.radioMinBitrate)||0,onlyWorking:settings.radioOnlyWorking!==false,onlyCompatible:settings.radioOnlyCompatible!==false,outputId:settings.radioOutputId||model.selectedOutputId||visibleOutputs(model)[0]?.id||''};
}

export function compatibleRadioSource(model,item,outputId){
  const codec=String(item.codec||'').toUpperCase();
  return leafDeviceIds(model,outputId).every(id=>{
    const profile=entity(model,id)?.capabilities?.radio;
    if(!profile)return true;
    if(item.hls){if(profile.hls===true)return true;if(profile.hls===false)return false;}
    if(!codec||codec==='UNKNOWN'||!Array.isArray(profile.codecs))return true;
    return profile.codecs.map(value=>value.toUpperCase()).includes(codec);
  });
}

export function filterRadioSources(model,catalog,query=''){
  const options=radioOptions(model),q=query.trim().toLowerCase();
  let items=catalog.sources.filter(item=>item.type==='radio'&&(model.ui.radioTab!=='favorites'||model.favorites.includes(item.id)));
  items=items.filter(item=>{
    if(q&&!`${item.name} ${item.genre} ${item.subtitle} ${item.country}`.toLowerCase().includes(q))return false;
    if(options.country!=='All'&&item.country!==options.country)return false;
    if(options.language!=='All'&&item.language!==options.language)return false;
    if(options.genre!=='All'&&item.genre!==options.genre)return false;
    const bitrate=Number.parseInt(item.bitrate,10)||0;
    if(bitrate&&bitrate<options.minBitrate)return false;
    if(options.onlyWorking&&item.lastCheckOk!==true)return false;
    return !options.onlyCompatible||compatibleRadioSource(model,item,options.outputId);
  });
  return items.sort((a,b)=>options.order==='name'?a.name.localeCompare(b.name,'en'):options.order==='bitrate'?(Number.parseInt(b.bitrate,10)||0)-(Number.parseInt(a.bitrate,10)||0):options.order==='clicks'?(b.clickCount||0)-(a.clickCount||0):(b.votes||0)-(a.votes||0));
}

export function conflictingSessionIds(model, targetId) {
  const ids = new Set(leafDeviceIds(model, targetId));
  return model.sessions.filter(session => leafDeviceIds(model, session.targetId).some(id => ids.has(id))).map(session => session.id);
}

export function assignSource(model, sourceId, targetId) {
  if (!entity(model, targetId)) throw new Error('Output not found');
  targetId=rootOutputId(model,targetId)||targetId;
  if (targetStatus(model, targetId) === 'offline') throw new Error('Output is offline');
  if (targetStatus(model, targetId) === 'needs_setup') throw new Error('Complete setup first');
  if (targetStatus(model, targetId) === 'updating') throw new Error('Wait for the firmware update');
  if (targetStatus(model, targetId) === 'error') throw new Error('Output reports a device error');
  const existing = new Set(conflictingSessionIds(model, targetId));
  model.sessions = model.sessions.filter(x => !existing.has(x.id));
  const id = `s${Date.now()}${Math.floor(Math.random() * 1000)}`;
  model.sessions.push({id, sourceId, targetId, status:'playing', volume:entity(model,targetId).volume ?? 25});
  model.selectedSessionId = id;
  model.selectedOutputId = targetId;
  model.selectedSourceId = sourceId;
  return id;
}

/** Validate a deliberate addition to a bound playback; never split or steal members. */
export function playbackJoinError(model,context,destinationId=null){
 const session=model.sessions.find(item=>item.id===context?.sessionId);
 if(!session||!['playing','paused'].includes(session.status)||session.targetId!==context.targetId||session.sourceId!==context.sourceId)return 'Playback changed. Reopen the output picker.';
 const origin=entity(model,session.targetId);
 if(!origin||parentIds(model,origin.id).length)return 'Playback target changed. Reopen the output picker.';
 if(!(kind(model,origin.id)==='group'?['online','partial']:['online']).includes(targetStatus(model,origin.id)))return 'The current output is unavailable.';
 if(!destinationId)return null;
 const destination=entity(model,destinationId);
 if(!destination)return 'Destination no longer available.';
 const members=new Set(leafDeviceIds(model,origin.id));
 if(leafDeviceIds(model,destinationId).some(id=>members.has(id)))return 'Already part of this playback.';
 if(kind(model,destinationId)==='group')return 'For nested groups, use Add to existing group in its details.';
 if(parentIds(model,destinationId).length)return 'This output already belongs to a group or pair.';
 if(targetStatus(model,destinationId)!=='online')return 'Destination must be online.';
 return null;
}

export function joinPlayback(model,context,destinationId,sourceId=context?.sourceId){
 const error=playbackJoinError(model,context,destinationId);if(error)throw new Error(error);
 if(typeof sourceId!=='string'||!sourceId)throw new Error('Choose a source to play');
 const session=model.sessions.find(item=>item.id===context.sessionId),origin=entity(model,session.targetId),destination=entity(model,destinationId);
 const replaced=new Set(conflictingSessionIds(model,destinationId));
 let outputId=origin.id;
 if(kind(model,origin.id)==='group')origin.memberIds.push(destinationId);
 else{
  outputId=createComposite(model,'group',`${origin.name} + ${destination.name}`,[origin.id,destinationId],false);
  entity(model,outputId).volume=session.volume??origin.volume??25;
 }
 session.targetId=outputId;
 if(session.sourceId!==sourceId){session.sourceId=sourceId;session.status='playing';}
 model.sessions=model.sessions.filter(item=>item.id===session.id||!replaced.has(item.id));
 model.selectedSessionId=session.id;model.selectedOutputId=outputId;model.selectedSourceId=session.sourceId;
 return outputId;
}

// Reported compatibility family; never inferred from brand/model strings.
export function stereoFamily(device){return device?.capabilities?.grouping?.stereoFamily||null;}

export function validateGroupMembers(model, memberIds, type = 'group') {
  if(type==='pair'&&memberIds.some(id=>!id))return 'Choose a left and a right speaker';
  const unique = [...new Set(memberIds)];
  if (unique.length !== memberIds.length) return 'Duplicate group members';
  if (type === 'pair' && unique.length !== 2) return 'A stereo pair requires exactly two speakers';
  if (!['group','pair'].includes(type)) return 'Unknown grouping mode';
  if (type === 'pair' && (!stereoFamily(entity(model,unique[0])) || stereoFamily(entity(model,unique[0])) !== stereoFamily(entity(model,unique[1])))) return 'Select two speakers with compatible stereo capabilities';
  if (type === 'group' && unique.length < 2) return 'Select at least two outputs';
  for (const id of unique) {
    if (!entity(model, id)) return `Output ${id} does not exist`;
    if (targetStatus(model,id)!=='online') return `${entity(model,id).name} is not online`;
    if (type === 'pair' && kind(model,id) !== 'device') return 'Stereo pairs can contain speakers only';
    if (type === 'group' && kind(model,id) === 'group') return 'Use Add to existing group to keep an existing group as a subgroup';
    if (parentIds(model,id).length) return `${entity(model,id).name} already belongs to a pair or group`;
  }
  return null;
}

export function createComposite(model, type, name, memberIds, persistent = true) {
  const error = validateGroupMembers(model, memberIds, type);
  if (error) throw new Error(error);
  const id = `${type === 'pair' ? 'p' : 'g'}${Date.now()}`;
  const record = {id,name: name.trim() || (type==='pair' ? 'Stereo Pair' : 'New Group'),memberIds:[...memberIds],persistent,volume:25};
  if(type==='pair'){record.leftDeviceId=memberIds[0];record.rightDeviceId=memberIds[1];}
  if(type==='group')record.leaderDeviceId=groupLeaderCandidates(model,record)[0]?.id||null;
  (type==='pair' ? model.pairs : model.groups).push(record);
  model.selectedOutputId=id;
  return id;
}

export function dissolveComposite(model,id) {
  const type=kind(model,id);
  if (type==='pair') model.pairs=model.pairs.filter(x=>x.id!==id);
  if (type==='group') model.groups=model.groups.filter(x=>x.id!==id);
  model.sessions=model.sessions.filter(x=>x.targetId!==id);
  model.groups.forEach(g=>g.memberIds=g.memberIds.filter(x=>x!==id));
  model.groups.forEach(g=>{if(!leafDeviceIds(model,g.id).includes(g.leaderDeviceId))g.leaderDeviceId=null});
  if(model.selectedOutputId===id) model.selectedOutputId=null;
}

export function removeDevice(model, deviceId) {
  if(!model.devices.some(d=>d.id===deviceId)) return;
  model.devices=model.devices.filter(d=>d.id!==deviceId);
  const destroyedPairs=new Set(model.pairs.filter(p=>p.memberIds.includes(deviceId)).map(p=>p.id));
  model.pairs=model.pairs.filter(p=>!destroyedPairs.has(p.id));
  model.groups.forEach(g=>{g.memberIds=g.memberIds.filter(x=>x!==deviceId&&!destroyedPairs.has(x))});
  model.groups.forEach(g=>{if(!leafDeviceIds(model,g.id).includes(g.leaderDeviceId))g.leaderDeviceId=null});
  let undersized=model.groups.filter(g=>g.memberIds.length<2);
  while(undersized.length){const deleted=new Set(undersized.map(g=>g.id));model.groups=model.groups.filter(g=>!deleted.has(g.id));model.groups.forEach(g=>g.memberIds=g.memberIds.filter(id=>!deleted.has(id)));undersized=model.groups.filter(g=>g.memberIds.length<2);}
  const remainingIds=new Set([...model.devices,...model.pairs,...model.groups].map(x=>x.id));
  model.sessions=model.sessions.filter(x=>remainingIds.has(x.targetId));
  if(!model.sessions.some(x=>x.id===model.selectedSessionId))model.selectedSessionId=model.sessions[0]?.id||null;
  if(!remainingIds.has(model.selectedOutputId))model.selectedOutputId=null;
  if(model.selectedDeviceId===deviceId)model.selectedDeviceId=model.devices[0]?.id||null;
}

// Keeping the named output after unpairing turns it into an ordinary group.
export function removeMemberKeepingGroup(model,parentId,memberId){
 const parent=entity(model,parentId),type=kind(model,parentId);
 if(!parent||!['pair','group'].includes(type)||!parent.memberIds.includes(memberId))throw new Error('Membership changed; open the members again');
 const remaining=parent.memberIds.filter(id=>id!==memberId);
 if(!remaining.length)throw new Error('Add another member first, or dissolve the group');
 if(type==='pair'){
  const {leftDeviceId,rightDeviceId,...record}=parent;
  model.pairs=model.pairs.filter(item=>item.id!==parentId);
  model.groups.push({...record,memberIds:remaining,leaderDeviceId:leafDeviceIds(model,remaining[0])[0]||null});
 }else parent.memberIds=remaining;
 for(const group of model.groups)if(group.leaderDeviceId&&!leafDeviceIds(model,group.id).includes(group.leaderDeviceId))group.leaderDeviceId=groupLeaderCandidates(model,group)[0]?.id||null;
}

export function updateMembership(model,groupId,memberId,shouldAdd) {
  const group=model.groups.find(x=>x.id===groupId);
  if(!group) throw new Error('Group not found');
  if(shouldAdd) {
    addToGroup(model,groupId,memberId);
  } else {
    group.memberIds=group.memberIds.filter(x=>x!==memberId);
    if(!leafDeviceIds(model,groupId).includes(group.leaderDeviceId))group.leaderDeviceId=null;
  }
}

export function validateScenario(m) {
  if(!m || !Array.isArray(m.devices) || !Array.isArray(m.pairs) || !Array.isArray(m.groups) || !Array.isArray(m.sessions)) return ['Missing arrays: devices, pairs, groups, sessions'];
  const errors=libraryQueueErrors(m.libraryQueues);
  if(!m.settings || typeof m.settings!=='object') errors.push('Missing settings object');
  if(!m.ui || typeof m.ui!=='object') errors.push('Missing ui object');
  for(const key of ['favorites','history','setupCandidates'])if(!Array.isArray(m[key]))errors.push(`Missing ${key} array`);
  const ids=[...m.devices,...m.pairs,...m.groups].map(x=>x.id);
  if(new Set(ids).size!==ids.length) errors.push('Entity IDs must be unique');
  for(const comp of [...m.pairs,...m.groups]) {
    if(!Array.isArray(comp.memberIds)) {errors.push(`${comp.id}: memberIds must be an array`);continue}
    for(const id of comp.memberIds) if(!ids.includes(id))errors.push(`${comp.id}: missing member ${id}`);
    if(new Set(comp.memberIds).size!==comp.memberIds.length)errors.push(`${comp.id}: duplicate members`);
    if(comp.memberIds.some(id=>containsItem(m,id,comp.id)))errors.push(`${comp.id}: cyclic membership`);
    if(comp.memberIds.some(id=>parentIds(m,id).length>1))errors.push(`${comp.id}: member has multiple parents`);
    if(m.pairs.includes(comp)&&comp.memberIds.some(id=>kind(m,id)!=='device'))errors.push(`${comp.id}: stereo pairs require physical devices`);
    if(leafDeviceIds(m,comp.id).length === 0) errors.push(`${comp.id}: no physical devices`);
  }
  for(const s of m.sessions) if(!ids.includes(s.targetId))errors.push(`${s.id}: missing output ${s.targetId}`);
  for(const d of m.devices){
    if(d.macAddress!=null&&(typeof d.macAddress!=='string'||!/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i.test(d.macAddress)))errors.push(`${d.id}: invalid MAC address`);
    for(const family of ['ipv4','ipv6']){const addresses=d[family+'Addresses'];if(addresses!=null&&(!Array.isArray(addresses)||addresses.some(address=>typeof address!=='string'||!address.trim()||(family==='ipv6'?!address.includes(':'):address.includes(':')))))errors.push(`${d.id}: invalid ${family} addresses`);}
    if(d.capabilities?.identification!==undefined&&(!Array.isArray(d.capabilities.identification)||d.capabilities.identification.some(signal=>!['sound','blink'].includes(signal))))errors.push(`${d.id}: invalid identification capabilities`);
    const remoteKeys=d.capabilities?.grouping?.remoteKeys;
    if(remoteKeys!==undefined&&(!Array.isArray(remoteKeys)||remoteKeys.some(key=>!['thumbsUp','thumbsDown'].includes(key))))errors.push(`${d.id}: invalid remote group keys`);
    const family=d.capabilities?.grouping?.stereoFamily;
    if(family!==undefined&&(typeof family!=='string'||!family.trim()))errors.push(`${d.id}: invalid stereo family`);
    const profile=d.capabilities?.buttonPresets;
    if(profile&&(!Number.isInteger(profile.keyCount)||profile.keyCount<1||profile.keyCount>64||!Array.isArray(profile.gestures)||!profile.gestures.includes('single')||profile.gestures.some(g=>!['single','double'].includes(g))))errors.push(`${d.id}: invalid button capabilities`);
    for(const key of ['presets','doublePresets'])if(d[key]!==undefined&&!Array.isArray(d[key]))errors.push(`${d.id}: ${key} must be an array`);
  }
  return errors;
}


// App scaling is an explicit multiplier of the browser's inherited base size.
export function appearanceZoom(settings){
 const zoom=Number(settings?.appearanceZoom??100);
 return Number.isInteger(zoom)&&zoom>=100&&zoom<=200?zoom:100;
}
