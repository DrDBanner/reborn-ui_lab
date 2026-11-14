module.exports=async({page,log})=>{
 const fs=require('node:fs/promises'),path=require('node:path');
 const out=path.resolve(__dirname,'../../project/primary-functions/evidence'),results=[];
 const check=(ok,msg)=>{if(!ok)throw new Error(msg)};
 await page.waitForSelector('.workspace');
 const storeUrl=await page.evaluate(async()=>{const js=await fetch('/src/main.js').then(r=>r.text());return js.match(/from\s*['"]([^'"]*\/app\/store\.js[^'"]*)['"]/)?.[1]||'/src/app/store.js';});
 const route=async(view,id)=>page.evaluate(async(view,id,storeUrl)=>{const {state,notify}=await import(storeUrl);state.view=view;state.detailDeviceId=id;state.detailOutputId=id;state.modal=null;state.toast=null;state.model.ui.deviceTab='overview';notify();document.querySelector('.workspace').scrollTop=0;},view,id,storeUrl);
 const inspect=async()=>page.evaluate(()=>{
  const panel=document.querySelector('.item-key-functions'),tabs=document.querySelector('.detail-tabs'),workspace=document.querySelector('.workspace');
  const cards=[...panel.querySelectorAll('.key-preset')].map(el=>el.getBoundingClientRect());
  return {beforeTabs:!tabs||panel.compareDocumentPosition(tabs)&Node.DOCUMENT_POSITION_FOLLOWING,overflow:workspace.scrollWidth>workspace.clientWidth+1||panel.scrollWidth>panel.clientWidth+1,equal:cards.every(a=>cards.every(b=>Math.abs(a.top-b.top)>2||Math.abs(a.height-b.height)<2)),keys:cards.length};
 });
 for(const width of [1440,834,390,320]){
  await page.setViewport({width,height:width<720?844:1000,deviceScaleFactor:1});
  await page.evaluate(async storeUrl=>{const {loadScenario}=await import(storeUrl);await loadScenario('home',false,true)},storeUrl);
  await route('device','d1');let geometry=await inspect();
  check(geometry.beforeTabs&&!geometry.overflow&&geometry.equal&&geometry.keys===6,'Primary device panel layout failed at '+width);
  await page.screenshot({path:path.join(out,`device-primary-${width}.png`)});
  await page.$eval('[data-action="device-tab"][data-value="network"]',el=>el.scrollIntoView({block:'center'}));
  await page.click('[data-action="device-tab"][data-value="network"]');
  check(!!await page.$('.item-key-functions'),'Network tab hid key functions');
  await route('group','g1');await page.select('#preset-device','d3');
  await page.click('.item-key-functions [data-action="preset-gesture"][data-value="double"]');
  check(await page.$eval('[data-action="preset-edit"]',el=>el.dataset.id==='d3'&&el.dataset.gesture==='double'),'Group gesture did not bind Kitchen');
  await page.click('[data-action="preset-edit"]');await page.select('[data-preset-index="0"]','ndrinfo');await page.click('[data-action="preset-save"]');
  await page.$eval('[data-action="preset-play"][data-key="1"]',el=>el.scrollIntoView({block:'center'}));
  await page.click('[data-action="preset-play"][data-key="1"]');
  const state=await page.evaluate(async storeUrl=>{const {state}=await import(storeUrl);return {member:state.model.devices.find(d=>d.id==='d3').doublePresets[0],other:state.model.devices.find(d=>d.id==='d1').doublePresets[0],group:state.model.sessions.find(s=>s.targetId==='g1').sourceId,office:state.model.sessions.find(s=>s.targetId==='d4').sourceId};},storeUrl);
  check(state.member==='ndrinfo'&&state.other==='album1'&&state.group==='ndrinfo'&&state.office==='ndrinfo','Group panel affected wrong bank/device/session');
  await page.$eval('.workspace',el=>el.scrollTop=0);geometry=await inspect();check(!geometry.overflow&&geometry.equal,'Group panel layout failed');
  await page.screenshot({path:path.join(out,`group-primary-${width}.png`)});
  await page.click('[data-action="button-transfer-open"]');check(await page.$eval('.modal-heading p',el=>el.textContent.includes('Kitchen')),'Transfer source must be selected group member');await page.keyboard.press('Escape');
  await route('group','p1');check(await page.$eval('[data-action="preset-edit"]',el=>['d1','d2'].includes(el.dataset.id)),'Pair kept foreign member');
  await page.evaluate(async storeUrl=>{const {loadScenario}=await import(storeUrl);await loadScenario('capabilities',false,true)},storeUrl);
  await route('device','d11');check(!await page.$('.item-key-functions'),'Buttonless item acquired key functions');
  await route('device','d12');geometry=await inspect();check(geometry.keys===2&&!geometry.overflow,'Two-key device layout failed');
  check(!await page.$('.item-key-functions [data-value="double"]'),'Single-only device acquired Twice');
  results.push({width,...geometry,devicePanelAboveTabs:true,groupMemberBound:true,pairMembershipChecked:true,buttonlessHidden:true,transferSourceBound:true});
 }
 await fs.writeFile(path.join(out,'primary-functions.json'),JSON.stringify({passed:true,results},null,2)+'\n');log(JSON.stringify({passed:true,widths:results.map(x=>x.width)}));
};
