module.exports=async({page,log})=>{
 const fs=require('node:fs/promises'),path=require('node:path'),base=path.resolve(__dirname,'../../project'),results=[];
 const check=(ok,message)=>{if(!ok)throw new Error(message)};
 await page.waitForSelector('.workspace');const url=await page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>new URL(e.name).pathname==='/src/app/store.js').at(-1).name);
 const click=async selector=>{await page.$eval(selector,e=>e.scrollIntoView({block:'center'}));await page.click(selector)};
 for(const appearance of ['dark','light'])for(const width of [1440,800,390]){
  await page.setViewport({width,height:1000,deviceScaleFactor:1,isMobile:width<720,hasTouch:width<720});
  await page.evaluate(async(url,appearance)=>{const {state,loadScenario,applyDesign,notify}=await import(url);await loadScenario('home',false,true);state.view='updates';state.designTokens.appearance=appearance;state.designTokens.sidebarCollapsed=false;applyDesign();state.toasts=[];const devices=state.model.devices;devices[0].firmwareAvailable=true;devices[0].firmware='26.0.0';devices[0].firmwareReleaseNotes={version:devices[0].firmwareLatest,body:'Fixture notes for browser verification.'};devices[1].status='offline';devices[1].firmwareAvailable=true;devices[2].status='updating';devices[2].updateProgress=45;devices[2].firmwareAvailable=true;state.model.appUpdate={currentVersion:'1.6.2',version:'1.6.3',available:true,releaseNotes:{version:'1.6.3',changes:['Application notes supplied by fixture.']}};notify()},url,appearance);
  check(await page.$eval('.workspace',e=>e.scrollWidth<=e.clientWidth+1),'Update page overflow '+width);
  check(await page.$eval('.firmware-row__label small',e=>e.textContent==='Bose · SoundTouch 10'),'Brand/model label missing');
  check(await page.$eval('.firmware-row .firmware-update',e=>e.title==='Update available'&&!!e.querySelector('[data-icon=release_alert]')),'Update alert icon missing');
  check(await page.$eval('.firmware-current',e=>e.title==='Up to date'&&!!e.querySelector('[data-icon=check_circle]')),'Up-to-date check missing');
  await page.screenshot({path:path.join(base,'update-all/evidence',`updates-${appearance}-${width}.png`)});
  await click('[data-action="release-notes"][data-id="d1"][data-version="27.0.6"]');
  check(await page.$eval('[role=dialog]',e=>e.innerText.includes('Living Room L')&&e.innerText.includes('Fixture notes')),'Firmware release notes binding failed');
  await page.screenshot({path:path.join(base,'release-notes/evidence',`firmware-${appearance}-${width}.png`)});await click('[data-action=close-modal]');
  await click('[data-action="release-notes"][data-id="application"]');check(await page.$eval('[role=dialog]',e=>e.innerText.includes('ST Reborn application')&&e.innerText.includes('Application notes supplied')),'App notes binding failed');await click('[data-action=close-modal]');
  await click('[data-action=update-all]');check(await page.evaluate(async url=>{const {state}=await import(url);return state.model.devices[0].status==='updating'&&state.model.devices[1].status==='offline'&&state.model.devices[2].updateProgress===45},url),'Bulk update eligibility failed');
  // Compare six-key detail bands across standalone speaker, pair and group at identical widths.
  const bands=[];
  for(const [view,id] of [['device','d4'],['group','p2'],['group','g1']]){
   await page.evaluate(async(url,view,id)=>{const {state,notify}=await import(url);state.view=view;state.detailDeviceId=view==='device'?id:null;state.detailOutputId=view==='group'?id:null;state.model.ui.deviceTab='overview';state.model.ui.groupTab='overview';state.presetDeviceId=null;state.toasts=[];notify()},url,view,id);
   bands.push(await page.evaluate(()=>({preset:document.querySelector('.item-key-functions').getBoundingClientRect().height,membership:document.querySelector('.item-membership').getBoundingClientRect().height,tabs:document.querySelector('.detail-tabs').getBoundingClientRect().top,overflow:document.querySelector('.workspace').scrollWidth>document.querySelector('.workspace').clientWidth+1})));
  }
  check(bands.every(b=>!b.overflow),'Details overflow');
  if(width===1440)check(bands.every(b=>Math.abs(b.preset-bands[0].preset)<1&&Math.abs(b.membership-bands[0].membership)<1&&Math.abs(b.tabs-bands[0].tabs)<1),'Detail bands differ '+JSON.stringify(bands));
  results.push({appearance,width,updateAll:true,releaseNotes:true,brand:true,bands});
 }
 await fs.writeFile(path.join(base,'update-all/evidence/browser.json'),JSON.stringify({passed:true,results},null,2)+'\n');log(JSON.stringify({passed:true,cases:results.length}));
};
