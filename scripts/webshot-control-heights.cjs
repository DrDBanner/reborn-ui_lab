module.exports=async({page,log})=>{
 const fs=require('node:fs/promises'),path=require('node:path'),out=path.resolve(__dirname,'../../project/playback-membership/evidence'),results=[];
 const check=(ok,msg)=>{if(!ok)throw new Error(msg)};await page.waitForSelector('.workspace');
 const url=await page.evaluate(async()=>{const js=await fetch('/src/main.js').then(r=>r.text());return js.match(/from\s*['"]([^'"]*\/app\/store\.js[^'"]*)['"]/)?.[1]||'/src/app/store.js'});
 for(const width of [1440,834,390,320])for(const theme of ['dark','light'])for(const density of ['standard','compact','comfortable']){
  await page.setViewport({width,height:width<720?844:1000,deviceScaleFactor:1});
  await page.evaluate(async(url,theme,density)=>{const {state,loadScenario,notify,applyDesign}=await import(url);await loadScenario('home',false,true);state.toasts=[];state.designTokens.appearance=theme;state.designTokens.density=density;state.view='listen';applyDesign();notify()},url,theme,density);
  const inspect=selectors=>page.evaluate(selectors=>{const height=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--control-height'));return {expected:height,heights:selectors.map(selector=>({selector,height:document.querySelector(selector)?.getBoundingClientRect().height})),overflow:document.querySelector('.workspace').scrollWidth>document.querySelector('.workspace').clientWidth+1}},selectors);
  const radio=await inspect(['.radio-toolbar .search-field','.radio-toolbar .segmented','.radio-filter-trigger','.radio-pin']);
  check(!radio.overflow&&radio.heights.every(item=>Math.abs(item.height-radio.expected)<1),'Radio heights '+JSON.stringify({width,theme,density,radio}));
  if(density==='standard')await page.screenshot({path:path.join(out,`radio-controls-${theme}-${width}.png`)});
  await page.evaluate(async url=>{const {state,notify}=await import(url);state.view='group';state.detailOutputId='g1';state.expandedPresetTargetId='g1';notify()},url);
  const presets=await inspect(['#preset-device','.preset-settings-trigger','.preset-context-controls .segmented','.preset-expanded-tools .btn-soft','.preset-expanded-tools .btn-quiet']);
  check(!presets.overflow&&presets.heights.every(item=>Math.abs(item.height-presets.expected)<1),'Preset heights '+JSON.stringify({width,theme,density,presets}));
  if(density==='standard')await page.screenshot({path:path.join(out,`preset-controls-${theme}-${width}.png`)});
  results.push({width,theme,density,radio,presets});
 }
 await fs.writeFile(path.join(out,'control-heights.json'),JSON.stringify({passed:true,results},null,2)+'\n');log(JSON.stringify({passed:true,cases:results.length}));
};
