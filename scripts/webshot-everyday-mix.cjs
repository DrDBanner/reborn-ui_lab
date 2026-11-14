module.exports=async({page,log})=>{
 const fs=require('node:fs/promises'),path=require('node:path'),out=path.resolve(__dirname,'../../project/everyday-mix/evidence'),results=[];
 const check=(ok,msg)=>{if(!ok)throw new Error(msg)};
 await page.waitForSelector('.workspace');
 const storeUrl=await page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>new URL(e.name).pathname==='/src/app/store.js').at(-1).name);
 const click=async selector=>{await page.$eval(selector,e=>e.scrollIntoView({block:'center'}));await page.click(selector)};
 for(const appearance of ['dark','light'])for(const width of [1440,390]){
  await page.setViewport({width,height:1000,deviceScaleFactor:1,isMobile:width<720,hasTouch:width<720});
  await page.evaluate(async(url,appearance)=>{const {state,loadScenario,applyDesign,notify}=await import(url);await loadScenario('home',false,true);state.designTokens.appearance=appearance;applyDesign();state.view='outputs';state.toasts=[];notify()},storeUrl,appearance);
  check(await page.$$eval('.output-card',els=>els.length===6),'Expected six playback targets');
  check(await page.$eval('.output-cards',e=>e.textContent.includes('Downstairs')&&e.textContent.includes('Dining Room')&&e.textContent.includes('Office')),'Missing mixed item kinds');
  await page.screenshot({path:path.join(out,`everyday-${appearance}-${width}.png`)});
  await click('.output-card [data-action="group-open"][data-id="p2"]');
  check(await page.$eval('.item-membership',e=>e.textContent.includes('Left · L')&&e.textContent.includes('Right · R')),'Standalone stereo channels missing');
  await click('.workspace [data-action="navigate"][data-value="outputs"]');
  await click('[data-action="output-view"][data-value="devices"]');
  check(await page.$$eval('.output-card',els=>els.length===9),'Expected nine physical devices');
  check(await page.$eval('.workspace',e=>e.scrollWidth<=e.clientWidth+1),'Workspace overflow');
  results.push({appearance,width,targets:6,devices:9,mixedKinds:true,stereoChannels:true});
 }
 await fs.writeFile(path.join(out,'browser.json'),JSON.stringify({passed:true,results},null,2)+'\n');log(JSON.stringify({passed:true,cases:results.length}));
};
