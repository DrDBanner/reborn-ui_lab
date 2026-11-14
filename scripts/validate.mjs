import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {validateScenario,buttonProfile,buttonPresets} from '../src/app/model.js';
const root=path.dirname(fileURLToPath(import.meta.url));
const data=path.resolve(root,'../public/data');
const index=JSON.parse(fs.readFileSync(path.join(data,'scenario-index.json'),'utf8'));
const catalog=JSON.parse(fs.readFileSync(path.join(data,'catalog.json'),'utf8'));
let failures=0;
for(const item of index){
 const model=JSON.parse(fs.readFileSync(path.join(data,'scenarios',`${item.id}.json`),'utf8'));
 const errors=validateScenario(model);
 for(const s of model.sessions){
  if(!catalog.sources.some(x=>x.id===s.sourceId))errors.push(`Session ${s.id} references an unknown source`);
 }
 for(const d of model.devices){
  const profile=buttonProfile(d);
  for(const gesture of profile?.gestures||[]){
   const bank=d[gesture==='double'?'doublePresets':'presets'];
   if(!Array.isArray(bank)||bank.length!==profile.keyCount)errors.push(`${d.id}: ${gesture} assignments do not match key count`);
   for(const id of bank||[])if(id&&!catalog.sources.some(source=>source.id===id))errors.push(`${d.id}: unknown preset source ${id}`);
  }
 }
 console.log(`${errors.length?'FAIL':'OK'} ${item.id} — ${model.devices.length} devices, ${model.pairs.length} pairs, ${model.groups.length} groups, ${model.sessions.length} sessions`);
 errors.forEach(e=>console.error('   '+e));failures+=errors.length;
}
if(failures)process.exit(1);
console.log('All scenario fixtures validated.');
