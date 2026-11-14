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

export function visibleOutputs(model) {
  // A speaker within a pair, or a pair/speaker within a group, is represented by its parent.
  return getTargets(model).filter(t => !parentIds(model, t.id).length);
}

export function targetStatus(model, targetId) {
  const ids = leafDeviceIds(model, targetId);
  if (!ids.length) return 'unknown';
  const statuses = ids.map(id => entity(model, id)?.status);
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
  return model.sessions.find(x => x.id === model.selectedSessionId) ?? model.sessions[0] ?? null;
}

export function renameDevice(model,deviceId,name){
  const device=model.devices.find(item=>item.id===deviceId);
  if(!device)throw new Error('Device no longer available');
  const trimmed=String(name??'').trim();
  if(!trimmed)throw new Error('Enter a device name');
  if(trimmed.length>120)throw new Error('Use at most 120 characters');
  device.name=trimmed;
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

/** Mirrors STR's whole-set / chosen-key copy. Composite targets fan out once per device. */
export function planPresetTransfer(model,sourceId,targetIds,tokens=null){
  const device=model.devices.find(item=>item.id===sourceId);
  if(!buttonProfile(device))throw new Error('Source device has no button presets');
  if(device.status!=='online')throw new Error('Source device must be online');
  const available=presetAssignments(device),selected=available.filter(item=>!tokens||tokens.includes(item.token));
  if(!selected.length)throw new Error('Select at least one assigned key');
  const whole=selected.length===available.length;
  const ids=[...new Set(targetIds.flatMap(id=>leafDeviceIds(model,id)))].filter(id=>id!==sourceId);
  if(!ids.length)throw new Error('Choose another device or group');
  const results=ids.map(id=>{
    const target=entity(model,id),profile=buttonProfile(target),result={id,name:target.name,copied:[],skipped:[],error:null};
    if(!profile){result.error='No hardware button presets';return result;}
    if(target.status!=='online'){result.error=`Device is ${target.status}`;return result;}
    let pending=selected.filter(item=>{
      if(item.key<=profile.keyCount&&profile.gestures.includes(item.gesture))return true;
      result.skipped.push({...item,reason:'Key or gesture not supported'});return false;
    });
    const existing=presetAssignments(target);
    while(pending.length){
      const conflict=pending.map((item,index)=>({item,other:pending.slice(0,index).find(other=>other.sourceId===item.sourceId)||existing.find(other=>other.sourceId===item.sourceId&&other.token!==item.token&&!pending.some(write=>write.token===other.token))})).find(entry=>entry.other);
      if(!conflict)break;
      const reason=`Source already assigned to key ${conflict.other.key} (${conflict.other.gesture==='double'?'Twice':'Once'})`;
      if(whole){result.error=reason;result.skipped.push(...pending.map(item=>({...item,reason:'Whole-set transfer refused; target unchanged'})));pending=[];break;}
      result.skipped.push({...conflict.item,reason});pending=pending.filter(item=>item.token!==conflict.item.token);
    }
    result.copied=pending;
    return result;
  });
  return {sourceId,sourceName:device.name,whole,selectedKeys:selected.length,results};
}

export function transferButtonPresets(model,sourceId,targetIds,tokens=null){
  const report=planPresetTransfer(model,sourceId,targetIds,tokens);
  for(const result of report.results)for(const item of result.copied)setButtonPreset(model,result.id,item.key,item.gesture,item.sourceId);
  return report;
}

export function normalizeScenario(model,fixture=null) {
  for(const device of model.devices||[]){
    const original=fixture?.devices?.find(item=>item.id===device.id);
    // Migrate only known sample identities; unknown devices keep unknown capabilities.
    for(const key of ['brand','hardwareRevision','agentName','agentVersion','capabilities']){
      if(device[key]===undefined)device[key]=original?.[key]===undefined?(key==='capabilities'?{}:null):structuredClone(original[key]);
    }
    if(device.doublePresets===undefined)device.doublePresets=[];
  }
  return model;
}

export function source(catalog, sourceId) {
  return catalog?.sources?.find(x => x.id === sourceId) ?? null;
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
  if (targetStatus(model, targetId) === 'offline') throw new Error('Output is offline');
  if (targetStatus(model, targetId) === 'needs_setup') throw new Error('Complete setup first');
  if (targetStatus(model, targetId) === 'updating') throw new Error('Wait for the firmware update');
  const existing = new Set(conflictingSessionIds(model, targetId));
  model.sessions = model.sessions.filter(x => !existing.has(x.id));
  const id = `s${Date.now()}${Math.floor(Math.random() * 1000)}`;
  model.sessions.push({id, sourceId, targetId, status:'playing', volume:entity(model,targetId).volume ?? 25});
  model.selectedSessionId = id;
  model.selectedOutputId = targetId;
  model.selectedSourceId = sourceId;
  return id;
}

export function validateGroupMembers(model, memberIds, type = 'group') {
  const unique = [...new Set(memberIds)];
  if (unique.length !== memberIds.length) return 'Duplicate group members';
  if (type === 'pair' && unique.length !== 2) return 'A stereo pair requires exactly two speakers';
  if (type === 'group' && unique.length < 2) return 'Select at least two outputs';
  for (const id of unique) {
    if (!entity(model, id)) return `Output ${id} does not exist`;
    if (type === 'pair' && kind(model,id) !== 'device') return 'Stereo pairs can contain speakers only';
    if (type === 'group' && kind(model,id) === 'group') return 'Nested groups are reserved for a separate topology concept';
    if (parentIds(model,id).length) return `${entity(model,id).name} already belongs to a pair or group`;
  }
  return null;
}

export function createComposite(model, type, name, memberIds, persistent = true) {
  const error = validateGroupMembers(model, memberIds, type);
  if (error) throw new Error(error);
  const id = `${type === 'pair' ? 'p' : 'g'}${Date.now()}`;
  const record = {id,name: name.trim() || (type==='pair' ? 'Stereo Pair' : 'New Group'),memberIds:[...memberIds],persistent,volume:25};
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
  if(model.selectedOutputId===id) model.selectedOutputId=null;
}

export function removeDevice(model, deviceId) {
  if(!model.devices.some(d=>d.id===deviceId)) return;
  model.devices=model.devices.filter(d=>d.id!==deviceId);
  const destroyedPairs=new Set(model.pairs.filter(p=>p.memberIds.includes(deviceId)).map(p=>p.id));
  model.pairs=model.pairs.filter(p=>!destroyedPairs.has(p.id));
  model.groups.forEach(g=>{g.memberIds=g.memberIds.filter(x=>x!==deviceId&&!destroyedPairs.has(x))});
  model.groups=model.groups.filter(g=>g.memberIds.length>=2);
  const remainingIds=new Set([...model.devices,...model.pairs,...model.groups].map(x=>x.id));
  model.sessions=model.sessions.filter(x=>remainingIds.has(x.targetId));
  if(!model.sessions.some(x=>x.id===model.selectedSessionId))model.selectedSessionId=model.sessions[0]?.id||null;
  if(!remainingIds.has(model.selectedOutputId))model.selectedOutputId=null;
  if(model.selectedDeviceId===deviceId)model.selectedDeviceId=model.devices[0]?.id||null;
}

export function updateMembership(model,groupId,memberId,shouldAdd) {
  const group=model.groups.find(x=>x.id===groupId);
  if(!group) throw new Error('Group not found');
  if(shouldAdd) {
    if(parentIds(model,memberId).length) throw new Error('Output already belongs to a group');
    if(!entity(model,memberId)) throw new Error('Output not found');
    if(groupId===memberId||leafDeviceIds(model,memberId).some(id=>leafDeviceIds(model,groupId).includes(id))) throw new Error('Invalid or duplicate members');
    group.memberIds.push(memberId);
  } else {
    group.memberIds=group.memberIds.filter(x=>x!==memberId);
  }
}

export function validateScenario(m) {
  if(!m || !Array.isArray(m.devices) || !Array.isArray(m.pairs) || !Array.isArray(m.groups) || !Array.isArray(m.sessions)) return ['Missing arrays: devices, pairs, groups, sessions'];
  const errors=[];
  if(!m.settings || typeof m.settings!=='object') errors.push('Missing settings object');
  if(!m.ui || typeof m.ui!=='object') errors.push('Missing ui object');
  for(const key of ['favorites','history','setupCandidates'])if(!Array.isArray(m[key]))errors.push(`Missing ${key} array`);
  const ids=[...m.devices,...m.pairs,...m.groups].map(x=>x.id);
  if(new Set(ids).size!==ids.length) errors.push('Entity IDs must be unique');
  for(const comp of [...m.pairs,...m.groups]) {
    if(!Array.isArray(comp.memberIds)) {errors.push(`${comp.id}: memberIds must be an array`);continue}
    for(const id of comp.memberIds) if(!ids.includes(id))errors.push(`${comp.id}: missing member ${id}`);
    if(leafDeviceIds(m,comp.id).length === 0) errors.push(`${comp.id}: no physical devices`);
  }
  for(const s of m.sessions) if(!ids.includes(s.targetId))errors.push(`${s.id}: missing output ${s.targetId}`);
  for(const d of m.devices){
    const profile=d.capabilities?.buttonPresets;
    if(profile&&(!Number.isInteger(profile.keyCount)||profile.keyCount<1||profile.keyCount>64||!Array.isArray(profile.gestures)||!profile.gestures.includes('single')||profile.gestures.some(g=>!['single','double'].includes(g))))errors.push(`${d.id}: invalid button capabilities`);
    for(const key of ['presets','doublePresets'])if(d[key]!==undefined&&!Array.isArray(d[key]))errors.push(`${d.id}: ${key} must be an array`);
  }
  return errors;
}
