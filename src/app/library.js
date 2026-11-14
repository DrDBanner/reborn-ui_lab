// Manual sources belong to the saved scenario; discovered sources come from the catalog.
export function libraryServers(model,catalog){
 return [...(model.settings?.showDiscoveredLibraries===false?[]:catalog.servers||[]),...(model.libraryServers||[])];
}
export function normalizeLibraryAddress(value){
 const raw=String(value||'').trim();
 if(!raw||/\s/.test(raw))throw new Error('Enter a server address, for example http://192.168.0.20:8200');
 let url;try{url=new URL(raw.includes('://')?raw:'http://'+raw)}catch{throw new Error('Enter a valid server address')}
 if(!['http:','https:'].includes(url.protocol)||!url.hostname||url.username||url.password||url.hash)throw new Error('Use an HTTP or HTTPS address without login details or a fragment');
 return url.href;
}
export function addLibraryServer(servers,discovered,name,address){
 const label=String(name||'').trim();
 if(!label||label.length>120)throw new Error('Enter a source name of up to 120 characters');
 const normalized=normalizeLibraryAddress(address);
 if([...servers,...discovered].some(server=>normalizeLibraryAddress(server.address)===normalized))throw new Error('This server is already listed');
 let number=1;while([...servers,...discovered].some(server=>server.id==='manual-library-'+number))number++;
 return {id:'manual-library-'+number,name:label,address:normalized,folders:[],manual:true};
}

export function searchLibraryTracks(model,catalog,{query='',serverId='all'}={}){
 const servers=libraryServers(model,catalog),ids=new Set(servers.map(server=>server.id));
 const fold=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const words=fold(query).trim().split(/\s+/).filter(Boolean);
 return (catalog.tracks||[]).filter(track=>ids.has(track.serverId)&&(serverId==='all'||track.serverId===serverId)&&words.every(word=>fold(`${track.title} ${track.artist} ${track.album} ${track.genre||''}`).includes(word)));
}
export function libraryQueueErrors(queues){
 if(queues===undefined)return [];
 if(!Array.isArray(queues))return ['Library queues must be an array'];
 const errors=[],ids=new Set(),names=new Set();
 for(const queue of queues){
  if(!queue||typeof queue.id!=='string'||!queue.id.startsWith('library-queue-')||ids.has(queue.id))errors.push('Library queue IDs must be unique');
  ids.add(queue?.id);
  const name=queue?.name;
  if(typeof name!=='string'||!name.trim()||name.length>120||names.has(name.trim().toLowerCase()))errors.push('Library queue names must be unique and contain 1–120 characters');
  if(typeof name==='string')names.add(name.trim().toLowerCase());
  if(!Array.isArray(queue?.trackIds)||queue.trackIds.some(id=>typeof id!=='string'||!id)||new Set(queue.trackIds).size!==queue.trackIds.length)errors.push('Library queue tracks must be unique IDs');
 }
 return errors;
}
export function newLibraryQueue(model,catalog,name,extra=[]){
 const queues=[...(model.libraryQueues||[]),...extra];
 let index=1;while(queues.some(q=>q.id==='library-queue-'+index)||catalog.sources.some(s=>s.id==='library-queue-'+index))index++;
 const queue={id:'library-queue-'+index,name:String(name||'').trim(),trackIds:[]};
 const errors=libraryQueueErrors([...queues,queue]);if(errors.length)throw new Error(errors[0]);
 return queue;
}
export function addTracksToLibraryQueues(model,catalog,trackIds,queueIds,newQueues=[]){
 const ids=[...new Set(trackIds)],targets=[...new Set(queueIds)],available=new Set(searchLibraryTracks(model,catalog).map(t=>t.id));
 if(!ids.length)throw new Error('Select at least one title');
 if(!targets.length)throw new Error('Choose at least one destination queue');
 if(ids.some(id=>!available.has(id)))throw new Error('A selected title is no longer available; search again');
 const existing=model.libraryQueues||[];
 if(newQueues.some(q=>existing.some(item=>item.id===q.id)))throw new Error('A queue changed; review your destinations again');
 const queues=structuredClone([...existing,...newQueues.filter(q=>targets.includes(q.id))]);
 const errors=libraryQueueErrors(queues);if(errors.length)throw new Error(errors[0]);
 if(targets.some(id=>!queues.some(q=>q.id===id)))throw new Error('A selected queue no longer exists');
 let added=0,skipped=0;
 for(const queue of queues.filter(q=>targets.includes(q.id)))for(const id of ids){if(queue.trackIds.includes(id))skipped++;else{queue.trackIds.push(id);added++;}}
 model.libraryQueues=queues;
 return {added,skipped,queues:targets.length,titles:ids.length};
}
export function saveLibraryQueue(model,catalog,draft){
 const previous=(model.libraryQueues||[]).find(q=>q.id===draft.id);
 if(!previous)throw new Error('This queue no longer exists');
 const queues=structuredClone(model.libraryQueues),next={...draft,name:String(draft.name||'').trim()};
 if(!next.trackIds.length&&(model.sessions.some(s=>s.sourceId===draft.id&&['playing','paused'].includes(s.status))||model.devices.some(d=>[...(d.presets||[]),...(d.doublePresets||[])].includes(draft.id))))throw new Error('This queue is used in playback or button assignments; keep at least one title');
 const known=new Set((catalog.tracks||[]).map(t=>t.id));
 if(next.trackIds.some(id=>!known.has(id)&&!previous.trackIds.includes(id)))throw new Error('This title is no longer available');
 queues[queues.findIndex(q=>q.id===draft.id)]=next;
 const errors=libraryQueueErrors(queues);if(errors.length)throw new Error(errors[0]);
 model.libraryQueues=queues;
}
export function deleteLibraryQueue(model,id){
 if(!(model.libraryQueues||[]).some(q=>q.id===id))throw new Error('This queue no longer exists');
 if(model.sessions.some(s=>s.sourceId===id&&['playing','paused'].includes(s.status)))throw new Error('Stop this queue on its playing outputs before deleting it');
 if(model.devices.some(d=>[...(d.presets||[]),...(d.doublePresets||[])].includes(id)))throw new Error('Remove this queue from its button assignments before deleting it');
 model.libraryQueues=model.libraryQueues.filter(q=>q.id!==id);
 model.sessions=model.sessions.filter(s=>s.sourceId!==id);model.history=model.history.filter(sourceId=>sourceId!==id);model.favorites=model.favorites.filter(sourceId=>sourceId!==id);
 if(model.selectedSourceId===id)model.selectedSourceId=null;
}
export function libraryQueueSources(model){
 return (model.libraryQueues||[]).filter(queue=>queue.trackIds.length).map(queue=>({id:queue.id,name:queue.name,type:'library',kind:'queue',origin:'saved-library-queue',subtitle:`${queue.trackIds.length} titles · Saved queue`,color:'#708b9e',trackIds:[...queue.trackIds]}));
}
export function libraryDuration(seconds){const value=Math.max(0,Number(seconds)||0);return Math.floor(value/60)+':'+String(value%60).padStart(2,'0')}
