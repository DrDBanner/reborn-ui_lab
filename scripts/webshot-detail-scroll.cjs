module.exports=async({page,log})=>{
 const fs=require('node:fs/promises'),path=require('node:path'),out=path.resolve(__dirname,'../../project/member-layout/evidence'),results=[];
 const check=(ok,msg)=>{if(!ok)throw new Error(msg)};
 await page.waitForSelector('.workspace');
 const url=await page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>new URL(e.name).pathname==='/src/app/store.js').at(-1).name);
 for(const appearance of ['dark','light'])for(const width of [1280,390])for(const view of ['group','device']){
  await page.setViewport({width,height:700,deviceScaleFactor:1,isMobile:width<720,hasTouch:width<720});
  await page.evaluate(async(url,appearance,view)=>{const {state,loadScenario,applyDesign,notify}=await import(url);await loadScenario('home',false,true);state.designTokens.appearance=appearance;applyDesign();state.view=view;state.detailOutputId='g1';state.detailDeviceId='d1';state.model.ui.groupTab='overview';state.model.ui.deviceTab='overview';state.toasts=[];notify()},url,appearance,view);
  const action=view==='group'?'group-tab':'device-tab',positions=[];
  for(const tab of ['sound','functions','advanced','overview','advanced']){
   await page.$eval('[data-action="'+action+'"][data-value="'+tab+'"]',e=>e.click());
   const before=await page.$eval('.workspace',e=>{e.scrollTop=e.scrollHeight;return e.scrollTop});
   const next=tab==='advanced'?'sound':'advanced';
   await page.$eval('[data-action="'+action+'"][data-value="'+next+'"]',e=>e.click());
   await new Promise(r=>setTimeout(r,60));
   const after=await page.$eval('.workspace',e=>e.scrollTop);
   check(before>0&&Math.abs(before-after)<1,`${view} ${width}: ${tab} → ${next} moved ${before} → ${after}`);
   positions.push({from:tab,to:next,before,after});
  }
  await page.screenshot({path:path.join(out,`fixed-scroll-${view}-${appearance}-${width}.png`)});
  // A different item starts at the top and gets its own content-height measurement.
  await page.evaluate(async url=>{const {state,notify}=await import(url);state.view='device';state.detailDeviceId='d4';notify()},url);
  check(await page.$eval('.workspace',e=>e.scrollTop===0),'New item kept old scroll offset');
  results.push({appearance,width,view,positions,newItemAtTop:true});
 }
 await fs.writeFile(path.join(out,'scroll-browser.json'),JSON.stringify({passed:true,results},null,2)+'\n');log(JSON.stringify({passed:true,cases:results.length,transitions:results.length*5}));
};
