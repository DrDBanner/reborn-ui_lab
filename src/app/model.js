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

export function source(catalog, sourceId) {
  return catalog?.sources?.find(x => x.id === sourceId) ?? null;
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
  return errors;
}
