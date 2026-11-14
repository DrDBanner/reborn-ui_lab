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
