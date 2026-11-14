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
