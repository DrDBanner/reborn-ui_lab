module.exports=async({page,log})=>{
 const fs=require('node:fs/promises'),path=require('node:path'),out=path.resolve(__dirname,'../../project/page-hierarchy/evidence'),results=[];
 const check=(ok,msg)=>{if(!ok)throw new Error(msg)};
 await page.waitForSelector('.workspace');
 let url=await page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>new URL(e.name).pathname==='/src/app/store.js').at(-1).name);
 const click=async selector=>{await page.$eval(selector,e=>e.scrollIntoView({block:'center'}));await page.click(selector)};
 for(const appearance of ['dark','light'])for(const width of [1440,390]){
  await page.setViewport({width,height:900,deviceScaleFactor:1,isMobile:width<720,hasTouch:width<720});
  await page.evaluate(async(url,appearance)=>{const {state,loadScenario,applyDesign}=await import(url);await loadScenario('home',false,true);state.designTokens.appearance=appearance;applyDesign()},url,appearance);
  for(const view of ['listen','library','history','spotify','outputs','device','group','updates','setup','settings','help','lab']){
   await page.evaluate(async(url,view)=>{const {state,notify}=await import(url);state.view=view;state.detailDeviceId='d1';state.detailOutputId='g1';state.model.ui.deviceTab='overview';state.model.ui.groupTab='overview';state.toasts=[];notify()},url,view);
   const data=await page.evaluate(()=>({header:document.querySelector('.app-header h1').textContent,headerCount:document.querySelectorAll('.app-header h1').length,workspaceTitles:[...document.querySelectorAll('.workspace h1')].map(e=>e.textContent),overflow:document.querySelector('.workspace').scrollWidth>document.querySelector('.workspace').clientWidth+1,text:document.querySelector('.workspace').innerText}));
   check(data.headerCount===1&&!data.overflow,`${appearance} ${width} ${view}: layout overflow`);
   check(['device','group'].includes(view)?data.workspaceTitles.length===1:data.workspaceTitles.length===0,'Repeated route title '+view);
   check(!data.text.includes('Find, preview and assign')&&!data.text.includes('Browse network media without'),'Redundant explanation');
   if(['listen','library','history'].includes(view))await page.screenshot({path:path.join(out,`${view}-${appearance}-${width}.png`)});
   results.push({appearance,width,view,...data,text:undefined});
  }
 }
 // Member function stays bound to Kitchen while the group is selected.
 await page.evaluate(async url=>{const {state,notify}=await import(url);state.view='group';state.detailOutputId='g1';state.model.ui.groupTab='functions';notify()},url);
 await click('[data-action="alarms"][data-id="d3"]');
 check(await page.$eval('.modal-heading h2',e=>e.textContent==='Alarms · Kitchen'),'Wrong alarm device');
 await page.screenshot({path:path.resolve(out,'../../group-functions/evidence/member-alarms.png')});
 await click('[data-action="close-modal"]');
 // Adding a server changes only the draft until Save.
 await page.evaluate(async url=>{const {state,notify}=await import(url);state.view='library';notify()},url);
 await click('[data-action="library-settings"]');
 await page.type('#library-name','Office NAS');await page.type('#library-address','192.168.0.50:8200');await click('[data-action="library-add"]');
 check(await page.evaluate(async url=>(await import(url)).state.modal.servers.length===1&&(await import(url)).state.model.libraryServers===undefined,url),'Draft leaked to model');
 await page.screenshot({path:path.resolve(out,'../../library-settings/evidence/settings-mobile.png')});
 await click('[data-action="close-modal"]');await click('[data-action="library-settings"]');
 check(await page.evaluate(async url=>(await import(url)).state.modal.servers.length===0,url),'Cancel retained draft');
 await page.type('#library-name','Office NAS');await page.type('#library-address','javascript://example.org');await click('[data-action="library-add"]');
 check(await page.$eval('#library-source-error',e=>e.textContent.includes('HTTP')),'Invalid URL accepted');
 await page.$eval('#library-address',e=>{e.value='192.168.0.50:8200';e.dispatchEvent(new Event('input',{bubbles:true}))});await click('[data-action="library-add"]');
 await click('[data-field="library-discovered"]');await click('[data-action="library-settings-save"]');
 check(await page.$$eval('.server-list [data-action="library-server"]',e=>e.length===1&&e[0].innerText.includes('Office NAS')),'Saved sources not shown');
 await page.reload({waitUntil:'load'});await page.waitForSelector('.workspace');
 url=await page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>new URL(e.name).pathname==='/src/app/store.js').at(-1).name);
 check(await page.evaluate(async url=>(await import(url)).state.model.libraryServers[0].name==='Office NAS',url),'Source did not persist');
 await fs.writeFile(path.join(out,'browser.json'),JSON.stringify({passed:true,routes:results,memberAlarmBinding:true,libraryDraftCancelSaveReload:true},null,2)+'\n');
 log(JSON.stringify({passed:true,routeCases:results.length,memberAlarmBinding:true,libraryDraftCancelSaveReload:true}));
};
