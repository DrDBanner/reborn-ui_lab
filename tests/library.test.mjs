import test from 'node:test';
import assert from 'node:assert/strict';
import {addLibraryServer,libraryServers,normalizeLibraryAddress} from '../src/app/library.js';
import {renderLibrarySettings} from '../src/components/library-settings.js';

test('manual library sources validate addresses, avoid duplicates and leave catalog unchanged',()=>{
 const catalog={servers:[{id:'nas',name:'NAS',address:'192.168.0.20'}]},servers=[];
 assert.equal(normalizeLibraryAddress(' 192.168.0.21:8200 '),'http://192.168.0.21:8200/');
 for(const address of ['', 'bad address','ftp://example.org','javascript://example.org','https://user:secret@example.org','https://example.org/#token'])assert.throws(()=>normalizeLibraryAddress(address));
 assert.throws(()=>addLibraryServer(servers,catalog.servers,'','example.org'));
 assert.throws(()=>addLibraryServer(servers,catalog.servers,'Duplicate','http://192.168.0.20/'));
 const added=addLibraryServer(servers,catalog.servers,'Music','https://music.local/library');
 assert.equal(servers.length,0);assert.equal(catalog.servers.length,1);
 servers.push(added);
 assert.throws(()=>addLibraryServer(servers,catalog.servers,'Again',added.address));
 const model={libraryServers:servers,settings:{showDiscoveredLibraries:false}};
 assert.deepEqual(libraryServers(model,catalog),[added]);
 model.settings.showDiscoveredLibraries=true;
 assert.equal(libraryServers(model,catalog).length,2);
 const html=renderLibrarySettings({modal:{servers:[{...added,name:'<script>unsafe</script>'}],name:'',address:'',showDiscovered:true}});
 assert(!html.includes('<script>unsafe'));assert(html.includes('&lt;script&gt;unsafe'));
});

import fs from 'node:fs';
import {searchLibraryTracks,newLibraryQueue,addTracksToLibraryQueues,saveLibraryQueue,deleteLibraryQueue,libraryQueueSources,libraryQueueErrors} from '../src/app/library.js';
import {renderLibrarySearch} from '../src/components/library-search.js';
const queueCatalog=JSON.parse(fs.readFileSync(new URL('../public/data/catalog.json',import.meta.url)));
const queueModel=()=>({settings:{},libraryQueues:[],devices:[],sessions:[],history:[],favorites:[]});

test('library search combines words and folds accents within visible server scope',()=>{
 const model=queueModel();
 assert.equal(searchLibraryTracks(model,queueCatalog,{query:'morning'}).length,2);
 assert.equal(searchLibraryTracks(model,queueCatalog,{query:'MÍRA quiet',serverId:'nas'}).length,6);
 assert.equal(searchLibraryTracks(model,queueCatalog,{serverId:'plex'}).length,8);
 assert.equal(searchLibraryTracks(model,queueCatalog,{query:'morning',serverId:'missing'}).length,0);
 model.settings.showDiscoveredLibraries=false;
 assert.equal(searchLibraryTracks(model,queueCatalog).length,0);
});
test('multi-queue additions are atomic, ordered and deduplicate per destination',()=>{
 const model=queueModel(),a=newLibraryQueue(model,queueCatalog,'Morning'),b=newLibraryQueue(model,queueCatalog,'Evening',[a]);
 const report=addTracksToLibraryQueues(model,queueCatalog,['library-track-7','library-track-1','library-track-7'],[a.id,b.id],[a,b]);
 assert.deepEqual(report,{added:4,skipped:0,queues:2,titles:2});
 assert.deepEqual(model.libraryQueues.map(q=>q.trackIds),[['library-track-7','library-track-1'],['library-track-7','library-track-1']]);
 const before=JSON.stringify(model);
 assert.throws(()=>addTracksToLibraryQueues(model,queueCatalog,['library-track-2'],[a.id,'missing']));
 assert.equal(JSON.stringify(model),before);
 assert.throws(()=>addTracksToLibraryQueues(model,queueCatalog,['missing'],[a.id]));
 assert.equal(JSON.stringify(model),before);
 assert.equal(addTracksToLibraryQueues(model,queueCatalog,['library-track-1'],[a.id]).skipped,1);
 assert.throws(()=>newLibraryQueue(model,queueCatalog,' morning '));
 assert(libraryQueueErrors([{id:'bad',name:'',trackIds:['one','one']}]).length);
});
test('queue edits preserve drafts and references prevent deleting or emptying used sources',()=>{
 const model=queueModel(),queue=newLibraryQueue(model,queueCatalog,'Original');
 addTracksToLibraryQueues(model,queueCatalog,['library-track-1','library-track-7'],[queue.id],[queue]);
 const draft=structuredClone(model.libraryQueues[0]);draft.name='Changed';draft.trackIds.reverse();
 assert.equal(model.libraryQueues[0].name,'Original');
 saveLibraryQueue(model,queueCatalog,draft);
 assert.deepEqual(model.libraryQueues[0].trackIds,['library-track-7','library-track-1']);
 assert.equal(libraryQueueSources(model)[0].name,'Changed');
 model.sessions=[{sourceId:queue.id,status:'paused'}];
 assert.throws(()=>deleteLibraryQueue(model,queue.id),/Stop this queue/);
 assert.throws(()=>saveLibraryQueue(model,queueCatalog,{...draft,trackIds:[]}),/keep at least one/);
 model.sessions=[];model.devices=[{doublePresets:[queue.id]}];
 assert.throws(()=>deleteLibraryQueue(model,queue.id),/button assignments/);
 model.devices=[];model.history=[queue.id];model.favorites=[queue.id];
 deleteLibraryQueue(model,queue.id);assert.equal(model.libraryQueues.length,0);assert.equal(model.history.length,0);assert.equal(libraryQueueSources(model).length,0);
});
test('library search escapes draft names and keeps hidden selected titles across filters',()=>{
 const model=queueModel();const html=renderLibrarySearch({model,catalog:queueCatalog,modal:{query:'no match',serverId:'all',trackIds:['library-track-1'],queueIds:[],newQueues:[],newName:'"><script>bad</script>',error:''}});
 assert(!html.includes('<script>bad'));assert(html.includes('1 selected'));assert(html.includes('No matching titles'));
});
