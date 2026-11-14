module.exports=async({page,log})=>{
 const fs=require('node:fs/promises'),path=require('node:path'),out=path.resolve(__dirname,'../../project/preset-overwrite/evidence'),results=[];
 const check=(ok,message)=>{if(!ok)throw new Error(message)};
 await page.waitForSelector('.workspace');
 const storeUrl=await page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>new URL(e.name).pathname==='/src/app/store.js').at(-1).name);
 const click=async selector=>{await page.$eval(selector,e=>e.scrollIntoView({block:'center'}));await page.click(selector)};
 for(const appearance of ['dark','light'])for(const width of [1440,390]){
  await page.setViewport({width,height:1000,deviceScaleFactor:1,isMobile:width<720,hasTouch:width<720});
  await page.evaluate(async(url,appearance)=>{const {state,loadScenario,applyDesign,notify}=await import(url);await loadScenario('home',false,true);state.designTokens.appearance=appearance;applyDesign();state.toasts=[];state.model.groups[0].memberIds=['p1','p2','d3','d4','d5','d6','d7'];state.modal={kind:'create',type:'group',persistent:true};state.selectedForComposite=[];notify()},storeUrl,appearance);
  const empty=await page.$eval('.composite-members .empty-line',e=>{const c=getComputedStyle(e),p=getComputedStyle(e.parentElement);return {padding:parseFloat(c.paddingTop),font:parseFloat(c.fontSize),border:parseFloat(p.borderTopWidth),height:e.getBoundingClientRect().height}});
  check(empty.padding===18&&empty.border===0&&empty.font===12&&empty.height>=54,'Empty state styling');
  await page.screenshot({path:path.join(out,`empty-${appearance}-${width}.png`)});
  await page.evaluate(async url=>{const {state,loadScenario,notify}=await import(url);await loadScenario('home',false,true);state.toasts=[];state.view='library';notify()},storeUrl);
  const gap=await page.$$eval('.server-list .list-card',els=>els[1].getBoundingClientRect().top-els[0].getBoundingClientRect().bottom);
  check(Math.abs(gap-6)<1,'Server entry gap');
  await page.hover('.server-list .list-card:last-child');await page.screenshot({path:path.join(out,`servers-${appearance}-${width}.png`)});
  await page.evaluate(async url=>{const {state,notify}=await import(url);state.view='group';state.detailOutputId='g1';state.model.devices[0].presets=['flux'];state.model.devices[0].doublePresets=[];const target=state.model.devices.find(d=>d.id==='d5');target.presets=['ndrinfo',null,'flux'];target.doublePresets=[];state.modal={kind:'button-transfer',deviceId:'d1',targetIds:['d5'],keys:['single:1'],overwrite:false};notify()},storeUrl);
  check(await page.$eval('[data-field="button-transfer-overwrite"]',e=>!e.checked),'Overwrite default');
  check(await page.$eval('[data-action="button-transfer-save"]',e=>e.disabled),'Conflicted copy enabled');
  const before=await page.evaluate(async url=>JSON.stringify((await import(url)).state.model),storeUrl);
  await click('[data-field="button-transfer-overwrite"]');
  check(await page.$eval('.transfer-review',e=>e.textContent.includes('Key 3 · Once → Key 1 · Once; previous key will be cleared')&&e.textContent.includes('NDR Info → FluxFM')),'Incomplete preview');
  check(await page.evaluate(async(url,before)=>JSON.stringify((await import(url)).state.model)===before,storeUrl,before),'Preview mutated model');
  const layout=await page.$eval('.modal-window',e=>{const r=e.getBoundingClientRect(),f=e.querySelector('.modal-footer').getBoundingClientRect();return {overflow:e.scrollWidth>e.clientWidth+1,within:r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1,footer:f.bottom<=innerHeight+1}});
  check(!layout.overflow&&layout.within&&layout.footer,'Transfer layout');
  await page.screenshot({path:path.join(out,`overwrite-${appearance}-${width}.png`)});
  await click('[data-action="button-transfer-save"]');
  check(await page.$eval('.transfer-results',e=>e.textContent.includes('previous key cleared')),'Result missing cleared key');
  check(await page.evaluate(async url=>{const {state}=await import(url);const d=state.model.devices.find(d=>d.id==='d5');return d.presets[0]==='flux'&&d.presets[2]===null},storeUrl),'Overwrite not applied');
  results.push({appearance,width,empty,serverGap:gap,previewUnchanged:true,overwrite:true,layout});
 }
 await fs.writeFile(path.join(out,'browser.json'),JSON.stringify({passed:true,results},null,2)+'\n');log(JSON.stringify({passed:true,cases:results.length}));
};
