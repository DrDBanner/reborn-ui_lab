module.exports=async({page,log})=>{
 const fs=require('node:fs/promises'),path=require('node:path'),out=path.resolve(__dirname,'../../project/group-nesting-guide/evidence'),results=[];
 const check=(ok,msg)=>{if(!ok)throw new Error(msg)};
 await page.waitForSelector('.workspace');
 const storeUrl=await page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>new URL(e.name).pathname==='/src/app/store.js').at(-1).name);
 const click=async selector=>{await page.$eval(selector,e=>e.scrollIntoView({block:'center'}));await page.click(selector)};
 const read=()=>page.evaluate(async url=>{const {state}=await import(url);return {view:state.view,detail:state.detailOutputId,model:state.model,scenario:state.scenarioId}},storeUrl);
 page.on('dialog',dialog=>dialog.accept());
 for(const appearance of ['dark','light'])for(const width of [1440,390]){
  await page.setViewport({width,height:1000,deviceScaleFactor:1,isMobile:width<720,hasTouch:width<720});
  await page.evaluate(async(url,appearance)=>{const {loadScenario,state,applyDesign}=await import(url);await loadScenario('home',false,true);state.designTokens.appearance=appearance;applyDesign()},storeUrl,appearance);
  await click(width<720?'.mobile-brand':'.brand-trigger');await page.select('#app-scenario','nested-groups');
  await page.waitForSelector('[data-action="group-open"][data-id="g3"]');check((await read()).scenario==='nested-groups','Logo scenario selection failed');
  // Start every run from its shipped fixture, as described by Reset in the guide.
  await page.evaluate(async url=>{const {loadScenario}=await import(url);await loadScenario('nested-groups',false,true)},storeUrl);
  check(await page.$$eval('.output-card',els=>els.length===3),'Expected three top-level outputs');
  await click('.output-card [data-action="group-open"][data-id="g3"]');
  check(await page.$eval('.item-membership',e=>e.textContent.includes('2 members')&&e.textContent.includes('Downstairs')&&e.textContent.includes('Upstairs')),'Missing logical groups');
  await page.screenshot({path:path.join(out,`whole-home-${appearance}-${width}.png`)});
  await click('.item-member[data-member-id="g1"] .item-member__open');
  check(await page.$eval('.item-parent-context',e=>e.textContent.includes('Whole home')),'Parent context missing');
  await page.screenshot({path:path.join(out,`downstairs-${appearance}-${width}.png`)});
  await click('.item-member[data-member-id="p1"] .item-member__open');
  check(await page.$eval('.item-membership',e=>e.textContent.includes('Left · L')&&e.textContent.includes('Right · R')),'Stereo structure lost');
  await click('[aria-label="Open parent group"]');await click('[aria-label="Open parent group"]');
  const before=await read(),terrace=JSON.stringify(before.model.sessions.find(s=>s.targetId==='d5'));
  await click('.item-member[data-member-id="g2"] .item-member__remove');
  check(!(await read()).model.groups.find(g=>g.id==='g3').memberIds.includes('g2'),'Remove subgroup failed');
  await click('.workspace [data-action="navigate"][data-value="outputs"]');await click('.output-card [data-action="group-open"][data-id="g2"]');
  check(await page.$eval('.workspace',e=>e.textContent.includes('Nothing playing')),'Detached group should be silent');
  await click('[data-action="add-to-group"]');await click('[data-action="membership-choice"][data-id="g3"]');
  check(await page.$eval('.membership-review',e=>e.textContent.includes('FluxFM')&&e.textContent.includes('Whole home')),'Missing root playback review');
  await page.screenshot({path:path.join(out,`rejoin-${appearance}-${width}.png`)});
  await click('[data-action="membership-save"]');
  const after=await read();check(after.model.groups.find(g=>g.id==='g3').memberIds.includes('g2'),'Rejoin failed');
  check(JSON.stringify(after.model.sessions.find(s=>s.targetId==='d5'))===terrace,'Independent playback changed');
  check(await page.$eval('.workspace',e=>e.scrollWidth<=e.clientWidth+1),'Workspace overflow');
  results.push({appearance,width,logoScenario:true,threeTargets:true,subgroupOpen:true,stereoOpen:true,parentLinks:true,detach:true,rejoin:true,independentStream:true});
 }
 await fs.writeFile(path.join(out,'browser.json'),JSON.stringify({passed:true,results},null,2)+'\n');log(JSON.stringify({passed:true,cases:results.length}));
};
