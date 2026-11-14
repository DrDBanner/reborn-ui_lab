module.exports=async({page,log})=>{
 const fs=require('node:fs/promises'),path=require('node:path');
 const out=path.resolve(__dirname,'../../project/group-controls/evidence'),results=[];
 const check=(ok,msg)=>{if(!ok)throw new Error(msg)};
 await page.waitForSelector('.workspace');
 const storeUrl=await page.evaluate(async()=>{const js=await fetch('/src/main.js').then(r=>r.text());return js.match(/from\s*['"]([^'"]*\/app\/store\.js[^'"]*)['"]/)?.[1]||'/src/app/store.js'});
 const click=async selector=>{await page.$eval(selector,el=>el.scrollIntoView({block:'center'}));await page.click(selector)};
 const read=()=>page.evaluate(async url=>{const {state}=await import(url);return {group:state.model.groups[0],receiver:state.model.devices.find(d=>d.id==='d4').groupKeys,sessions:JSON.stringify(state.model.sessions),banks:JSON.stringify(state.model.devices.map(d=>[d.presets,d.doublePresets])),modal:state.modal}},storeUrl);
 for(const appearance of ['dark','light'])for(const width of [1440,834,390,320]){
  await page.setViewport({width,height:width<=720?844:1000,deviceScaleFactor:1});
  await page.evaluate(async(url,appearance)=>{const {state,loadScenario,applyDesign,notify}=await import(url);await loadScenario('home',false,true);state.designTokens.appearance=appearance;applyDesign();state.view='group';state.detailOutputId='g1';state.model.selectedOutputId='g1';state.model.groups[0].persistent=false;state.toasts=[];notify()},storeUrl,appearance);
  const before=await read();
  check(await page.$eval('.item-membership h2',e=>e.textContent==='Group Members'),'Wrong membership title');
  check(!await page.$('[data-field="group-persistent"]'),'Duplicate switch in overview');
  await click('.title-edit');await page.$eval('#device-name',e=>{e.value='Evening';e.dispatchEvent(new Event('input',{bubbles:true}))});await click('[data-action="device-rename-save"]');
  check((await read()).group.name==='Evening','Temporary group rename failed');
  await click('.group-settings-trigger');
  check(await page.$eval('[data-field="group-settings-persistent"]',e=>!e.checked),'Persistence wrong');
  await click('[data-field="group-settings-persistent"]');await click('[data-action="close-modal"]');
  check(!(await read()).group.persistent,'Cancel saved draft');
  await click('.group-settings-trigger');await click('[data-field="group-settings-persistent"]');
  await page.select('#group-leader','d3');await page.select('#group-remote','d4');
  await click('[data-field="group-settings-key"][data-key="thumbsUp"]');
  const layout=await page.evaluate(()=>{const el=document.querySelector('.modal-window'),r=el.getBoundingClientRect(),footer=el.querySelector('.modal-footer').getBoundingClientRect();return {within:r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1,overflow:el.scrollWidth>el.clientWidth+1,footerVisible:footer.bottom<=innerHeight+1}});
  check(layout.within&&!layout.overflow&&layout.footerVisible,'Modal layout '+appearance+width);
  await page.screenshot({path:path.join(out,`group-settings-${appearance}-${width}.png`)});
  await click('[data-action="group-settings-save"]');const after=await read();
  check(after.group.persistent&&after.group.leaderDeviceId==='d3'&&after.receiver.bindings.thumbsUp==='g1','Settings save failed');
  check(after.sessions===before.sessions&&after.banks===before.banks,'Settings changed playback or presets');
  await click('.group-settings-trigger');await page.select('#group-remote','d4');
  check(await page.$eval('[data-key="thumbsUp"]',e=>e.checked),'Remote binding lost');await click('[data-action="close-modal"]');
  check(await page.$eval('.workspace',e=>e.scrollWidth<=e.clientWidth+1),'Workspace overflow');
  await page.screenshot({path:path.join(out,`group-detail-${appearance}-${width}.png`)});
  results.push({appearance,width,layout,rename:true,cancel:true,persistence:true,mainSpeaker:true,remoteGroupKey:true,presetsAndPlaybackUnchanged:true});
 }
 await fs.writeFile(path.join(out,'browser.json'),JSON.stringify({passed:true,results},null,2)+'\n');log(JSON.stringify({passed:true,cases:results.length}));
};
