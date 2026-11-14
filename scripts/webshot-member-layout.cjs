module.exports=async({page,log})=>{
 const fs=require('node:fs/promises'),path=require('node:path'),out=path.resolve(__dirname,'../../project/member-layout/evidence'),results=[];
 const check=(ok,msg)=>{if(!ok)throw new Error(msg)};
 await page.waitForSelector('.workspace');
 const storeUrl=await page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>new URL(e.name).pathname==='/src/app/store.js').at(-1).name);
 const click=async selector=>{await page.$eval(selector,e=>e.scrollIntoView({block:'center'}));await page.click(selector)};
 // The reported old snapshot must refresh without an explicit Reset action.
 await page.evaluate(async url=>{const {state,save}=await import(url);state.model.fixtureRevision=1;state.model.groups.push({id:'stale',name:'Stale nested room',memberIds:[]});save()},storeUrl);
 await page.reload({waitUntil:'load'});await page.waitForSelector('.workspace');
 const refreshedUrl=await page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>new URL(e.name).pathname==='/src/app/store.js').at(-1).name);
 check(await page.evaluate(async url=>{const {state}=await import(url);return state.model.fixtureRevision===2&&state.model.devices.length===9&&state.model.groups.length===1},refreshedUrl),'Old Everyday snapshot survived reload');
 // A deliberate selection should restore the fixture even at the current revision.
 await page.evaluate(async url=>{const {state,save}=await import(url);state.model.devices[0].name='Edited local speaker';save()},refreshedUrl);
 await click('.brand-trigger');await page.select('#app-scenario','nested-groups');await click('.brand-trigger');await page.select('#app-scenario','home');
 check(await page.evaluate(async url=>(await import(url)).state.model.devices[0].name==='Living Room L',refreshedUrl),'Menu reused edited state');
 for(const appearance of ['dark','light'])for(const width of [1600,1280,1024,390]){
  await page.setViewport({width,height:1000,deviceScaleFactor:1,isMobile:width<720,hasTouch:width<720});
  await page.evaluate(async(url,appearance)=>{const {state,loadScenario,applyDesign,notify}=await import(url);await loadScenario('home',false,true);state.designTokens.appearance=appearance;applyDesign();state.model.groups.push({id:'g2',name:'Bedroom + Terrace R',memberIds:['d4','d5','d6','d7'],leaderDeviceId:'d7',persistent:false,volume:25});state.model.groups[0].memberIds.push('g2');state.model.sessions=state.model.sessions.filter(s=>s.targetId==='g1');state.view='group';state.detailOutputId='g1';state.toasts=[];notify()},refreshedUrl,appearance);
  const tabs=[];
  for(const tab of ['overview','sound','functions','advanced']){
   await click('[data-action="group-tab"][data-value="'+tab+'"]');
   const geometry=await page.evaluate(()=>{const e=document.querySelector('.item-membership'),r=e.getBoundingClientRect(),rows=[...e.querySelectorAll('.item-member')];return {width:r.width,height:r.height,rows:rows.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,width:r.width,height:r.height,labelY:e.querySelector('strong').getBoundingClientRect().y-r.y}}),gutter:getComputedStyle(document.querySelector('.workspace')).scrollbarGutter,overflow:document.querySelector('.workspace').scrollWidth>document.querySelector('.workspace').clientWidth+1}});
   check(geometry.gutter==='stable'&&!geometry.overflow,'Gutter/overflow '+width);
   if(tabs.length)check(Math.abs(geometry.width-tabs[0].width)<1&&Math.abs(geometry.height-tabs[0].height)<1,'Membership changed size on '+tab+' '+width);
   check(geometry.rows.every(row=>Math.abs(row.labelY-geometry.rows[0].labelY)<1),'Member title baselines differ');
   tabs.push({tab,...geometry});
  }
  await page.$eval('.item-membership',e=>e.scrollIntoView({block:'center'}));
  await page.screenshot({path:path.join(out,`members-${appearance}-${width}.png`)});
  results.push({appearance,width,tabs});
 }
 await fs.writeFile(path.join(out,'browser.json'),JSON.stringify({passed:true,oldSnapshotRefresh:true,menuResets:true,results},null,2)+'\n');log(JSON.stringify({passed:true,cases:results.length,oldSnapshotRefresh:true,menuResets:true}));
};
