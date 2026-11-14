module.exports=async({page,log})=>{
 const fs=require('node:fs/promises'),path=require('node:path'),out=path.resolve(__dirname,'../../project/interaction-review/evidence'),results=[];
 const check=(ok,msg)=>{if(!ok)throw new Error(msg)};
 await page.waitForSelector('.workspace');
 const storeUrl=await page.evaluate(async()=>{const js=await fetch('/src/main.js').then(r=>r.text());return js.match(/from\s*['"]([^'"]*\/app\/store\.js[^'"]*)['"]/)?.[1]||'/src/app/store.js';});
 for(const width of [1440,834,390,320]){
  await page.setViewport({width,height:width<720?844:1000,deviceScaleFactor:1});
  await page.evaluate(async storeUrl=>{const {loadScenario,state,notify,applyDesign,clearToast}=await import(storeUrl);await loadScenario('home',false,true);state.model.sessions.forEach(s=>s.status='stopped');state.view='listen';state.radioFiltersOpen=true;state.model.ui.radioFiltersPinned=true;state.designTokens.appearance='light';applyDesign();clearToast(false);notify()},storeUrl);
  const appearance=await page.evaluate(()=>{
   const controls=document.querySelector('.radio-controls'),row=document.querySelector('.source-row'),workspace=document.querySelector('.workspace');
   return {player:!!document.querySelector('.player'),playing:!!document.querySelector('[data-section="playbacks"]'),inset:getComputedStyle(controls).paddingLeft,rowInset:getComputedStyle(row).paddingLeft,shadows:[controls,document.querySelector('.radio-filter-panel')].map(el=>getComputedStyle(el).boxShadow),colors:[...new Set([...document.querySelectorAll('.source-art')].map(el=>getComputedStyle(el).color))],overflow:workspace.scrollWidth>workspace.clientWidth+1,workspaceBottom:workspace.getBoundingClientRect().bottom,viewport:innerHeight,stoppedStreamIcons:document.querySelectorAll('.sidebar-output-line .stream-symbol').length};
  });
  check(!appearance.player&&!appearance.playing&&appearance.inset===appearance.rowInset&&appearance.shadows.every(value=>value==='none')&&appearance.colors.length===1&&!appearance.overflow&&appearance.stoppedStreamIcons===0,'Light theme or idle layout failed at '+width+': '+JSON.stringify(appearance));
  check(Math.abs(appearance.workspaceBottom-appearance.viewport)<2,'Idle player space was not reclaimed');
  await page.screenshot({path:path.join(out,`light-radio-filters-${width}.png`)});
  await page.evaluate(async storeUrl=>{const {state,notify}=await import(storeUrl);state.model.sessions[0].status='playing';state.model.selectedSessionId='s1';state.radioFiltersOpen=false;notify()},storeUrl);
  await page.click('[data-action="open-volume-controls"]');await page.waitForSelector('.volume-master');
  check(await page.$$eval('.volume-device-row',els=>els.length===3),'Group volume members missing');
  check(await page.$$eval('.modal-window output',els=>els.every(el=>el.textContent.trim().endsWith('%'))),'Volume values must use percent');
  check(await page.$eval('.modal-window',el=>getComputedStyle(el).boxShadow==='none'),'Volume shadow remains');
  await page.screenshot({path:path.join(out,`light-volume-group-${width}.png`)});
  await page.keyboard.press('Escape');
  await page.evaluate(async storeUrl=>{const {state,notify}=await import(storeUrl);state.model.sessions[0].status='stopped';state.model.sessions[1].status='paused';state.model.selectedSessionId='s2';notify()},storeUrl);
  check((await page.$eval('.player__label small',el=>el.textContent)).includes('Paused'),'Paused playback not explicit');
  await page.click('[data-action="open-volume-controls"]');await page.waitForSelector('.volume-master');
  check(await page.$$eval('.modal-window input[type="range"]',els=>els.length===1),'Single speaker volume is duplicated');
  await page.screenshot({path:path.join(out,`light-volume-single-${width}.png`)});
  await page.keyboard.press('Escape');
  await page.click('[data-action="player-stop"]');
  check(!await page.$('.player'),'Player did not disappear after final stop');
  results.push({width,...appearance,groupVolumePercent:true,singleVolumeOneSlider:true,pausedExplicit:true,lastStopHidesBar:true});
 }
 await fs.writeFile(path.join(out,'light-review.json'),JSON.stringify({passed:true,results},null,2)+'\n');log(JSON.stringify({passed:true,widths:results.map(r=>r.width)}));
};
