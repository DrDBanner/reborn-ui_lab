import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {leafDeviceIds,visibleOutputs,assignSource,createComposite,updateMembership,dissolveComposite,removeDevice,validateScenario,buttonProfile,buttonPresets,setButtonPreset,recallButtonPreset,normalizeScenario,renameDevice,filterRadioSources,compatibleRadioSource,planPresetTransfer,transferButtonPresets,canAssignPresetSource,setDeviceVolume,setOutputVolume,joinPlayback,playbackJoinError,targetStatus,deviceAddresses,identificationSignals} from '../src/app/model.js';
const base=JSON.parse(fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public/data/scenarios/home.json'),'utf8'));
const fresh=()=>structuredClone(base);
test('pair and group resolve to physical speakers',()=>{const m=fresh();assert.deepEqual(leafDeviceIds(m,'p1'),['d1','d2']);assert.deepEqual(leafDeviceIds(m,'g1'),['d1','d2','d3'])});
test('sidebar avoids redundant child output entries',()=>{const m=fresh();const ids=visibleOutputs(m).map(x=>x.id);assert(ids.includes('g1'));assert(!ids.includes('p1'));assert(!ids.includes('d1'));assert(ids.includes('d4'))});
test('assigning source affects overlapping sessions only',()=>{const m=fresh();assignSource(m,'1live','g1');assert.equal(m.sessions.length,2);assert(m.sessions.some(x=>x.targetId==='d4'));assert(m.sessions.some(x=>x.targetId==='g1'&&x.sourceId==='1live'))});
test('building pair fails if device already belongs to pair',()=>{const m=fresh();assert.throws(()=>createComposite(m,'pair','Double',['d1','d4']))});
test('temporary group from ungrouped devices can be created and dissolved',()=>{const m=fresh();const id=createComposite(m,'group','New',['d4','d5']);assert.deepEqual(leafDeviceIds(m,id),['d4','d5']);dissolveComposite(m,id);assert(!m.groups.some(x=>x.id===id))});
test('scenario shapes validated',()=>assert.deepEqual(validateScenario(fresh()),[]));

test('removing a device cleans up orphan pairs, groups and sessions',()=>{const m=fresh();const otherPair=structuredClone(m.pairs.find(p=>p.id==='p2'));removeDevice(m,'d1');assert(!m.pairs.some(p=>p.id==='p1'));assert.deepEqual(m.pairs.find(p=>p.id==='p2'),otherPair);assert.equal(m.groups.length,0);assert.equal(m.sessions.length,1);assert.deepEqual(validateScenario(m),[])})

test('button banks remain independent and reject unsupported keys or gestures',()=>{
 const m=fresh(),d=m.devices[0],before=[...d.presets];
 setButtonPreset(m,d.id,1,'double','ndr2');
 assert.deepEqual(d.presets,before);
 assert.equal(buttonPresets(d,'double')[0],'ndr2');
 assert.throws(()=>setButtonPreset(m,d.id,0,'single','flux'));
 assert.throws(()=>setButtonPreset(m,d.id,7,'double','flux'));
 const single=m.devices.find(d=>d.id==='d4');
 assert.throws(()=>setButtonPreset(m,single.id,1,'double','flux'));
 const buttonless={id:'none',brand:'Bose',model:'SoundTouch 10',capabilities:{}};
 m.devices.push(buttonless);
 assert.equal(buttonProfile(buttonless),null);
 assert.throws(()=>setButtonPreset(m,'none',1,'single','flux'));
});
test('device preset recall uses its composite output and preserves other streams',()=>{
 const m=fresh();setButtonPreset(m,'d1',1,'double','album1');
 recallButtonPreset(m,'d1',1,'double');
 assert.equal(m.sessions.find(s=>s.targetId==='g1').sourceId,'album1');
 assert.equal(m.sessions.find(s=>s.targetId==='d4').sourceId,'ndrinfo');
 m.devices[0].status='offline';
 assert.throws(()=>recallButtonPreset(m,'d1',1,'double'));
});
test('legacy migration preserves existing assignments and unknown devices',()=>{
 const m=fresh();delete m.devices[0].capabilities;delete m.devices[0].brand;delete m.devices[0].doublePresets;
 m.devices[0].presets[0]='wdr5';m.devices.push({id:'external',name:'External',presets:[]});
 normalizeScenario(m,base);
 assert.equal(m.devices[0].presets[0],'wdr5');
 assert.equal(m.devices[0].brand,'Bose');
 assert(buttonProfile(m.devices[0]).gestures.includes('double'));
 assert.equal(buttonProfile(m.devices.at(-1)),null);
 assert.equal(m.devices.at(-1).brand,null);
});
test('scenario validation rejects malformed capability data',()=>{
 const m=fresh();m.devices[0].capabilities.buttonPresets={keyCount:0,gestures:['triple']};
 assert(validateScenario(m).some(error=>error.includes('invalid button capabilities')));
});

const radioCatalog=JSON.parse(fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public/data/catalog.json'),'utf8'));
test('radio filters combine country, language, genre and minimum bitrate',()=>{
 const m=fresh();Object.assign(m.settings,{searchCountry:'France',searchLanguage:'French',radioGenre:'Jazz',radioMinBitrate:128});
 assert.deepEqual(filterRadioSources(m,radioCatalog).map(item=>item.id),['demo-fr']);
 m.settings.radioMinBitrate=320;assert.equal(filterRadioSources(m,radioCatalog).length,0);
 m.settings.radioMinBitrate=0;m.settings.searchLanguage='German';assert.equal(filterRadioSources(m,radioCatalog).length,0);
});
test('working and compatibility filters respect output capabilities and HLS',()=>{
 const m=fresh();Object.assign(m.settings,{searchCountry:'All',radioOnlyWorking:false,radioOnlyCompatible:false});
 assert(filterRadioSources(m,radioCatalog).some(item=>item.id==='demo-offline'));
 m.settings.radioOnlyWorking=true;assert(!filterRadioSources(m,radioCatalog).some(item=>item.id==='demo-offline'));
 m.settings.radioOnlyCompatible=true;
 assert(!filterRadioSources(m,radioCatalog).some(item=>item.id==='demo-opus'));
 assert(filterRadioSources(m,radioCatalog).some(item=>item.id==='demo-uk'));
 const d=m.devices.find(item=>item.id==='d4');d.capabilities.radio={codecs:['OPUS'],hls:false};m.settings.radioOutputId='d4';
 assert(filterRadioSources(m,radioCatalog).some(item=>item.id==='demo-opus'));
 assert(!filterRadioSources(m,radioCatalog).some(item=>item.id==='demo-uk'));
 assert(compatibleRadioSource(m,{codec:'UNKNOWN'},'d4'));
});
test('radio sorting, query and favorites work with the full filter model',()=>{
 const m=fresh();Object.assign(m.settings,{searchCountry:'All',radioOnlyWorking:false,radioOnlyCompatible:false,radioOrder:'name'});
 const byName=filterRadioSources(m,radioCatalog);assert.deepEqual(byName.map(item=>item.name),[...byName].sort((a,b)=>a.name.localeCompare(b.name,'en')).map(item=>item.name));
 m.settings.radioOrder='bitrate';const bitrates=filterRadioSources(m,radioCatalog).map(item=>parseInt(item.bitrate));assert(bitrates.every((value,index)=>!index||value<=bitrates[index-1]));
 assert.deepEqual(filterRadioSources(m,radioCatalog,'Paris').map(item=>item.id),['demo-fr']);
 m.ui.radioTab='favorites';assert(filterRadioSources(m,radioCatalog).every(item=>m.favorites.includes(item.id)));
});

test('renaming a physical device preserves identity, groups and playbacks',()=>{
 const m=fresh(),beforeSessions=JSON.stringify(m.sessions),beforeGroups=JSON.stringify([m.pairs,m.groups]);
 renameDevice(m,'d1','  New Living Room  ');
 assert.equal(m.devices[0].name,'New Living Room');
 assert.equal(m.devices[0].brand,'Bose');
 assert.equal(m.devices[0].id,'d1');
 assert.equal(JSON.stringify(m.sessions),beforeSessions);
 assert.equal(JSON.stringify([m.pairs,m.groups]),beforeGroups);
 assert.throws(()=>renameDevice(m,'d1','   '));
 assert.throws(()=>renameDevice(m,'d1','x'.repeat(121)));
 assert.throws(()=>renameDevice(m,'p1','Invalid target'));
 assert.equal(m.devices[0].name,'New Living Room');
});


test('button transfer fans out groups and pairs, de-duplicates devices and preserves sessions',()=>{
 const m=fresh(),before=JSON.stringify(m.sessions),sourceBefore=JSON.stringify(m.devices[0]);
 const report=transferButtonPresets(m,'d1',['g1','p1','d2','d4']);
 assert.deepEqual(report.results.map(result=>result.id),['d2','d3','d4']);
 assert.equal(report.results.find(result=>result.id==='d4').skipped.length,3);
 assert.equal(report.results.find(result=>result.id==='d2').copied.length,9);
 assert.deepEqual(m.devices.find(device=>device.id==='d4').presets,m.devices[0].presets);
 assert.equal(JSON.stringify(m.sessions),before);
 assert.equal(JSON.stringify(m.devices[0]),sourceBefore);
});
test('whole-set transfer refuses collisions without changing the target',()=>{
 const m=fresh(),target=m.devices.find(device=>device.id==='d5');
 m.devices[0].presets=['flux'];m.devices[0].doublePresets=[];
 target.presets=['ndrinfo',null,'flux'];target.doublePresets=[];
 const before=JSON.stringify(target),report=transferButtonPresets(m,'d1',['d5']);
 assert(report.results[0].error.includes('key 3'));
 assert.equal(report.results[0].copied.length,0);
 assert.equal(JSON.stringify(target),before);
});
test('selected-key transfer skips collisions while copying accepted keys and keeping untouched keys',()=>{
 const m=fresh(),source=m.devices[0],target=m.devices.find(device=>device.id==='d5');
 source.presets=['flux','ndr2','1live'];source.doublePresets=[];
 target.presets=['dl','ffn','flux','sw'];target.doublePresets=[];
 const report=transferButtonPresets(m,'d1',['d5'],['single:1','single:2']);
 assert.equal(report.whole,false);assert.equal(report.results[0].skipped[0].key,1);
 assert.deepEqual(target.presets.slice(0,4),['dl','ndr2','flux','sw']);
});
test('batch transfer supports swaps and rechecks collisions after a refused key',()=>{
 const m=fresh(),source=m.devices[0],target=m.devices.find(device=>device.id==='d5');
 source.presets=['flux','ndr2','1live'];source.doublePresets=[];
 target.presets=['ndr2','flux','dl'];target.doublePresets=[];
 let report=transferButtonPresets(m,'d1',['d5'],['single:1','single:2']);
 assert.equal(report.results[0].copied.length,2);assert.deepEqual(target.presets.slice(0,3),['flux','ndr2','dl']);
 source.presets=['flux','ndr2','1live','sw'];target.presets=['dl','flux','ndr2'];
 report=planPresetTransfer(m,'d1',['d5'],['single:1','single:2']);
 assert.equal(report.results[0].copied.length,0);assert.equal(report.results[0].skipped.length,2);
});
test('transfer reports offline and unsupported targets without altering them',()=>{
 const m=fresh(),target=m.devices.find(device=>device.id==='d5');target.status='offline';
 const before=JSON.stringify(target);assert(planPresetTransfer(m,'d1',['d5']).results[0].error.includes('offline'));
 transferButtonPresets(m,'d1',['d5']);assert.equal(JSON.stringify(target),before);
 target.status='online';target.capabilities={};assert(planPresetTransfer(m,'d1',['d5']).results[0].error.includes('No hardware'));
 assert.throws(()=>planPresetTransfer(m,'d1',['d1']));assert.throws(()=>planPresetTransfer(m,'d1',['d4'],[]));
 m.devices[0].status='offline';assert.throws(()=>planPresetTransfer(m,'d1',['d4']));
});


test('preset source types follow reported capabilities, including library and service sources',()=>{
 const m=fresh(),device=m.devices[0];
 for(const type of ['radio','library','spotify','native'])assert(canAssignPresetSource(device,{type}));
 device.capabilities.buttonPresets.sourceTypes=['radio','library'];
 assert(!canAssignPresetSource(device,{type:'spotify'}));assert(canAssignPresetSource(device,{type:'library'}));
 assert(!canAssignPresetSource({capabilities:{}},{type:'radio'}));
});
test('overall volume preserves member offsets and unrelated outputs; device trim keeps master unchanged',()=>{
 const m=fresh(),before=structuredClone(m.devices.find(d=>d.id==='d4'));
 setDeviceVolume(m,'d2',40);assert.equal(m.sessions.find(s=>s.targetId==='g1').volume,25);
 setOutputVolume(m,'g1',30);assert.equal(m.devices.find(d=>d.id==='d2').volume,45);
 assert.equal(m.sessions.find(s=>s.targetId==='g1').volume,30);
 assert.deepEqual(m.devices.find(d=>d.id==='d4'),before);
 const offline=m.devices.find(d=>d.id==='d3');offline.status='offline';const volume=offline.volume;
 setOutputVolume(m,'g1',100);assert.equal(m.devices.find(d=>d.id==='d2').volume,100);assert.equal(offline.volume,volume);
 assert.throws(()=>setDeviceVolume(m,'d3',50));assert.throws(()=>setOutputVolume(m,'g1',101));
 setDeviceVolume(m,'d4',12);assert.equal(m.sessions.find(s=>s.targetId==='d4').volume,12);
});

test('stereo creation preserves explicit L/R and rejects unknown, incompatible or unavailable devices',()=>{
 const m=fresh();m.sessions=[];
 const id=createComposite(m,'pair','Desk',['d5','d4']);
 const pair=m.pairs.find(item=>item.id===id);
 assert.deepEqual(pair.memberIds,['d5','d4']);assert.equal(pair.leftDeviceId,'d5');assert.equal(pair.rightDeviceId,'d4');
 const unknown=fresh();delete unknown.devices.find(d=>d.id==='d4').capabilities.grouping;
 assert.throws(()=>createComposite(unknown,'pair','Bad',['d4','d5']),/compatible/);
 assert.throws(()=>createComposite(fresh(),'pair','Bad',['d4','d6']),/compatible/);
 const offline=fresh();offline.devices.find(d=>d.id==='d5').status='offline';
 assert.throws(()=>createComposite(offline,'group','Bad',['d4','d5']),/online/);
 assert.equal(offline.groups.length,1);
});

test('joining playback extends its group without replacing the origin session or independent streams',()=>{
 const m=fresh(),origin=structuredClone(m.sessions.find(s=>s.id==='s1')),other=JSON.stringify(m.sessions.find(s=>s.id==='s2'));
 const output=joinPlayback(m,{sessionId:'s1',targetId:'g1',sourceId:'flux'},'d5');
 assert.equal(output,'g1');assert(m.groups[0].memberIds.includes('d5'));assert.equal(m.groups.length,1);
 assert.deepEqual(m.sessions.find(s=>s.id==='s1'),origin);assert.equal(JSON.stringify(m.sessions.find(s=>s.id==='s2')),other);
 assert.equal(m.selectedSessionId,'s1');assert.deepEqual(validateScenario(m),[]);
});
test('joining a standalone stereo pair creates a temporary group and replaces only the chosen destination playback',()=>{
 const m=fresh();dissolveComposite(m,'g1');const id=assignSource(m,'flux','p1');m.sessions.find(s=>s.id===id).status='paused';
 const independent=assignSource(m,'ndr2','d7'),unrelated=JSON.stringify(m.sessions.find(s=>s.id===independent));
 const output=joinPlayback(m,{sessionId:id,targetId:'p1',sourceId:'flux'},'d4'),group=entityForTest(m,output);
 assert.equal(group.persistent,false);assert.deepEqual(group.memberIds,['p1','d4']);assert.equal(m.pairs.length,2);
 assert.equal(m.sessions.find(s=>s.id===id).status,'paused');assert.equal(m.sessions.find(s=>s.id===id).targetId,output);
 assert(!m.sessions.some(s=>s.targetId==='d4'));assert.equal(JSON.stringify(m.sessions.find(s=>s.id===independent)),unrelated);
 assert.deepEqual(validateScenario(m),[]);
});
function entityForTest(model,id){return [...model.devices,...model.pairs,...model.groups].find(item=>item.id===id);}
test('join rejects stale playback, self, unavailable destinations and nested groups before mutation',()=>{
 const m=fresh(),context={sessionId:'s1',targetId:'g1',sourceId:'flux'};
 assert(playbackJoinError(m,context,'g1').includes('Already'));
 assert(playbackJoinError(m,context,'d1').includes('Already'));
 const group=createComposite(m,'group','Elsewhere',['d5','d6']);
 let before=JSON.stringify(m);assert.throws(()=>joinPlayback(m,context,group),/nested/);assert.equal(JSON.stringify(m),before);
 m.devices.find(d=>d.id==='d7').status='offline';before=JSON.stringify(m);
 assert.throws(()=>joinPlayback(m,context,'d7'),/online/);assert.equal(JSON.stringify(m),before);
 m.sessions.find(s=>s.id==='s1').sourceId='1live';before=JSON.stringify(m);
 assert.throws(()=>joinPlayback(m,context,'d4'),/Playback changed/);assert.equal(JSON.stringify(m),before);
});

test('joining with an explicitly chosen new source switches the whole joined output and preserves independent streams',()=>{
 const m=fresh();m.sessions.find(s=>s.id==='s1').status='paused';const other=structuredClone(m.sessions.find(s=>s.id==='s2'));
 joinPlayback(m,{sessionId:'s1',targetId:'g1',sourceId:'flux'},'d5','ndr2');
 assert.equal(m.sessions.find(s=>s.id==='s1').sourceId,'ndr2');assert.equal(m.sessions.find(s=>s.id==='s1').status,'playing');
 assert.deepEqual(m.sessions.find(s=>s.id==='s2'),other);
});

test('explicit transfer overwrite previews replacements and relocates cross-layer duplicates',()=>{
 const m=fresh(),target=m.devices.find(d=>d.id==='d5');
 m.devices[0].presets=['flux'];m.devices[0].doublePresets=[];
 target.presets=['ndrinfo',null,'sw'];target.doublePresets=[null,'flux','dl'];
 const before=JSON.stringify(m),plan=planPresetTransfer(m,'d1',['d5'],null,{overwrite:true});
 assert.equal(JSON.stringify(m),before);
 assert.equal(plan.results[0].error,null);
 assert.deepEqual(plan.results[0].cleared.map(item=>[item.token,item.movedTo]),[['double:2','single:1']]);
 assert.equal(plan.results[0].replaced[0].sourceId,'ndrinfo');
 const sessions=JSON.stringify(m.sessions),sourceBefore=JSON.stringify(m.devices[0]);
 transferButtonPresets(m,'d1',['d5'],null,{overwrite:true});
 assert.deepEqual(target.presets.slice(0,3),['flux',null,'sw']);
 assert.deepEqual(target.doublePresets.slice(0,3),[null,null,'dl']);
 assert.equal(JSON.stringify(m.sessions),sessions);assert.equal(JSON.stringify(m.devices[0]),sourceBefore);
});
test('overwrite keeps swaps intact and still rejects duplicate incoming assignments',()=>{
 const m=fresh(),target=m.devices.find(d=>d.id==='d5');
 m.devices[0].presets=['flux','ndr2'];m.devices[0].doublePresets=[];
 target.presets=['ndr2','flux','dl'];target.doublePresets=[];
 let report=transferButtonPresets(m,'d1',['d5'],null,{overwrite:true});
 assert.equal(report.results[0].cleared.length,0);assert.deepEqual(target.presets.slice(0,3),['flux','ndr2','dl']);
 m.devices[0].presets=['flux','flux'];target.presets=['sw','dl','flux'];
 const before=JSON.stringify(target);report=transferButtonPresets(m,'d1',['d5'],null,{overwrite:true});
 assert(report.results[0].error);assert.equal(report.results[0].cleared.length,0);assert.equal(JSON.stringify(target),before);
});
test('overwrite retains offline devices and unsupported gesture assignments',()=>{
 const m=fresh(),target=m.devices.find(d=>d.id==='d4');
 m.devices[0].presets=[];m.devices[0].doublePresets=['flux'];
 target.presets=['flux'];target.doublePresets=[];
 const before=JSON.stringify(target),report=transferButtonPresets(m,'d1',['d4'],null,{overwrite:true});
 assert.equal(report.results[0].skipped.length,1);assert.equal(report.results[0].cleared.length,0);assert.equal(JSON.stringify(target),before);
 target.status='offline';const offline=JSON.stringify(target);
 assert(transferButtonPresets(m,'d1',['d4'],null,{overwrite:true}).results[0].error.includes('offline'));
 assert.equal(JSON.stringify(target),offline);
});


test('reported device errors remain visible on the output and prevent playback',()=>{
 const m=fresh(),before=structuredClone(m.sessions);
 m.devices.find(d=>d.id==='d1').status='error';
 assert.equal(targetStatus(m,'d1'),'error');
 assert.equal(targetStatus(m,'p1'),'error');
 assert.equal(targetStatus(m,'g1'),'error');
 assert.throws(()=>assignSource(m,'flux','g1'),/device error/);
 assert.deepEqual(m.sessions,before);
 assert.equal(targetStatus(m,'d4'),'online');
});

test('reported identity survives migration; unknown addresses remain unknown',()=>{
 const m=fresh(),d=m.devices[0];
 delete d.macAddress;delete d.ipv4Addresses;delete d.ipv6Addresses;delete d.capabilities.identification;
 const explicit=m.devices[1];explicit.macAddress=null;explicit.ipv4Addresses=[];explicit.ipv6Addresses=['fe80::1234%wlan0'];explicit.capabilities.identification=[];
 m.devices.push({id:'external',ip:'2001:db8::99',presets:[]});
 const topology=JSON.stringify([m.pairs,m.groups,m.sessions]);
 delete m.setupCandidates[0].macAddress;delete m.setupCandidates[0].ipv6Addresses;
 normalizeScenario(m,base);
 assert.equal(m.setupCandidates[0].macAddress,base.setupCandidates[0].macAddress);assert.deepEqual(m.setupCandidates[0].ipv6Addresses,base.setupCandidates[0].ipv6Addresses);
 assert.equal(d.macAddress,base.devices[0].macAddress);
 assert.deepEqual(deviceAddresses(d,'ipv4'),[d.ip]);
 assert.deepEqual(deviceAddresses(d,'ipv6'),base.devices[0].ipv6Addresses);
 assert.deepEqual(identificationSignals(d),['sound','blink']);
 assert.equal(explicit.macAddress,null);assert.deepEqual(deviceAddresses(explicit,'ipv4'),[]);
 assert.deepEqual(deviceAddresses(explicit,'ipv6'),['fe80::1234%wlan0']);
 assert.deepEqual(identificationSignals(explicit),[]);
 const external=m.devices.at(-1);assert.equal(external.macAddress,null);
 assert.deepEqual(deviceAddresses(external,'ipv4'),[]);assert.deepEqual(deviceAddresses(external,'ipv6'),['2001:db8::99']);
 assert.deepEqual(identificationSignals(external),[]);
 assert.equal(JSON.stringify([m.pairs,m.groups,m.sessions]),topology);
 const changed=fresh();changed.devices[0].ip='192.0.2.50';delete changed.devices[0].ipv4Addresses;delete changed.devices[0].ipv6Addresses;
 normalizeScenario(changed,base);assert.deepEqual(deviceAddresses(changed.devices[0],'ipv4'),['192.0.2.50']);assert.deepEqual(deviceAddresses(changed.devices[0],'ipv6'),[]);
});
test('identity validation rejects malformed addresses and identification capabilities',()=>{
 const m=fresh(),d=m.devices[0];d.macAddress=42;d.ipv6Addresses='fe80::1';d.capabilities.identification=['flash-all'];
 const errors=validateScenario(m);assert(errors.some(e=>e.includes('invalid MAC address')));assert(errors.some(e=>e.includes('invalid ipv6 addresses')));assert(errors.some(e=>e.includes('invalid identification capabilities')));
});
test('sample device identities have unique MAC addresses within every scenario',()=>{
 const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public/data/scenarios');
 for(const name of fs.readdirSync(dir).filter(name=>name.endsWith('.json'))){
  const m=JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
  const macs=[...m.devices,...m.setupCandidates].map(d=>d.macAddress).filter(Boolean);
  assert.equal(new Set(macs).size,macs.length,name);
 }
});
