module.exports=async({page,log})=>{
 const fs=require('node:fs/promises'),path=require('node:path'),out=path.resolve(__dirname,'../../project/grouping-navigation/evidence'),results=[],errors=[];
 const check=(ok,msg)=>{if(!ok)throw new Error(msg)};page.on('pageerror',e=>errors.push(e.message));
 await page.waitForSelector('.workspace');
 const url=await page.evaluate(async()=>{const js=await fetch('/src/main.js').then(r=>r.text());return js.match(/from\s*['"]([^'"]*\/app\/store\.js[^'"]*)['"]/)?.[1]||'/src/app/store.js'});
 const route=async(id,theme)=>page.evaluate(async(url,id,theme)=>{const {state,loadScenario,notify,applyDesign}=await import(url);await loadScenario('home',false,true);state.view=id==='d1'?'device':'group';state.detailDeviceId=id;state.detailOutputId=id;state.model.ui.deviceTab='overview';state.model.ui.groupTab='overview';state.expandedPresetTargetId=null;state.toasts=[];state.designTokens.appearance=theme;applyDesign();notify();},url,id,theme);
 const geometry=()=>page.evaluate(()=>{const preset=document.querySelector('.item-key-functions'),members=document.querySelector('.item-membership'),tabs=document.querySelector('.detail-tabs');const keys=[...document.querySelectorAll('.preset-compact-grid button')].map(el=>el.getBoundingClientRect());return {maxPerRow:Math.max(...keys.map(a=>keys.filter(b=>Math.abs(a.top-b.top)<2).length)),order:!!(preset.compareDocumentPosition(members)&Node.DOCUMENT_POSITION_FOLLOWING)&&!!(members.compareDocumentPosition(tabs)&Node.DOCUMENT_POSITION_FOLLOWING),overflow:[...document.querySelectorAll('.workspace,.panel,.item-membership,.preset-compact-grid,.item-member,.preset-expanded-tools')].filter(el=>el.scrollWidth>el.clientWidth+2).map(el=>el.className),sameRowHeights:[...document.querySelectorAll('.preset-compact-grid button')].map(el=>el.getBoundingClientRect()).every((a,i,all)=>all.every(b=>Math.abs(a.top-b.top)>2||Math.abs(a.height-b.height)<2))}});
 const click=async selector=>{await page.$eval(selector,el=>el.scrollIntoView({block:'center'}));await page.click(selector)};
 for(const width of [1440,834,390,320])for(const theme of ['dark','light']){
  await page.setViewport({width,height:width<720?844:1000,deviceScaleFactor:1,isMobile:width<720,hasTouch:width<720});
  for(const id of ['d1','g1','p1']){
   await route(id,theme);const geo=await geometry();check(geo.order&&!geo.overflow.length&&geo.sameRowHeights&&geo.maxPerRow<=3,'Detail geometry '+JSON.stringify({id,width,theme,geo}));
   check(!await page.$('[data-action="preset-edit"]')&&!await page.$('[data-action="button-transfer-open"]'),'Configuration exposed before interaction');
   const gear=await page.$eval('.preset-settings-trigger',el=>{const prev=el.previousElementSibling,a=prev.getBoundingClientRect(),b=el.getBoundingClientRect();return {icon:el.querySelector('[data-icon]')?.dataset.icon,afterOwner:prev.matches('.preset-device-choice,.preset-device-static')&&a.right<=b.left+1}});
   check(gear.icon==='settings'&&gear.afterOwner,'Settings gear not after owner');
   await page.mouse.move(1,1);
   const keySelector='.preset-key-compact:not(:disabled)',symbolSelector=keySelector+' > .material-symbols-rounded';
   const neutral=await page.$eval(symbolSelector,el=>getComputedStyle(el).color);
   await page.hover(keySelector);const hover=await page.$eval(symbolSelector,el=>getComputedStyle(el).color);
   check(neutral!==hover,'Preset play icon should gain accent only on hover');await page.mouse.move(1,1);
   const before=await page.evaluate(async url=>JSON.stringify((await import(url)).state.model.sessions),url);
   await click('[data-action="preset-gesture"][data-value="double"]');
   check(await page.$eval('[data-action="preset-gesture"][data-value="double"]',el=>el.getAttribute('aria-pressed')==='true'),'Twice inaccessible');
   check(before===await page.evaluate(async url=>JSON.stringify((await import(url)).state.model.sessions),url),'Layer selection changed playback');
   await page.$eval('.workspace',el=>el.scrollTop=0);await page.screenshot({path:path.join(out,`${id}-compact-${theme}-${width}.png`)});
   if(id==='g1'){check(!!await page.$('#preset-device'),'Group context selector hidden');await page.select('#preset-device','d3');check(before===await page.evaluate(async url=>JSON.stringify((await import(url)).state.model.sessions),url),'Device context changed streams');}
   await click('[data-action="toggle-preset-details"]');check(!!await page.$('[data-action="preset-edit"]')&&!!await page.$('[data-action="button-transfer-open"]'),'Preset tools not revealed');
   if(id==='g1')await page.select('#preset-device','d3');
   await click('[data-action="preset-edit"]');check(!!await page.$('.preset-workbench'),'Assignment editor unavailable');
   await page.select('#preset-playback','s2');check(await page.$eval('[data-action="preset-use-current"]',el=>el.textContent.includes('NDR Info')&&el.textContent.includes('key 1')),'Capture action must name the chosen source and key');
   await click('[data-action="preset-use-current"]');check(before===await page.evaluate(async url=>JSON.stringify((await import(url)).state.model.sessions),url),'Capturing a source changed streams');
   if(id==='g1')await page.screenshot({path:path.join(out,`capture-playback-${theme}-${width}.png`)});
   await page.keyboard.press('Escape');
   await click('[data-action="button-transfer-open"]');check(!!await page.$('.transfer-keys'),'Transfer unavailable');
   check(await page.$$eval('[data-field="button-transfer-target"]',els=>new Set(els.map(el=>el.value)).size===els.length),'Duplicate transfer targets');
   await click('[data-action="button-transfer-all"][data-value="none"]');await click('[data-field="button-transfer-key"]');await click('.transfer-target-heading input');
   const transfer=await page.evaluate(()=>{const el=document.querySelector('.modal-window'),rect=el.getBoundingClientRect();return {overflow:el.scrollWidth>el.clientWidth+2,footer:rect.bottom<=innerHeight&&!!document.querySelector('[data-action="button-transfer-save"]:not(:disabled)')}});
   check(!transfer.overflow&&transfer.footer,'Transfer layout or preview invalid '+JSON.stringify(transfer));
   if(id==='g1')await page.screenshot({path:path.join(out,`transfer-review-${theme}-${width}.png`)});
   await page.keyboard.press('Escape');
   const expanded=await geometry();check(!expanded.overflow.length,'Expanded presets overflow '+JSON.stringify(expanded));
   await page.$eval('.workspace',el=>el.scrollTop=0);await page.screenshot({path:path.join(out,`${id}-expanded-${theme}-${width}.png`)});
   await click('[data-action="toggle-preset-details"]');check(!await page.$('[data-action="preset-edit"]'),'Collapse failed');
   if(id!=='d1'){
    await click('[data-action="group-tab"][data-value="sound"]');check(!!await page.$('#group-volume'),'Group Sound missing');
    await click('[data-action="group-tab"][data-value="advanced"]');check(!!await page.$('[data-action="dissolve-group"]'),'Group Advanced missing');
   }
   const current=await page.evaluate(async url=>{const {state}=await import(url);return JSON.stringify([state.view,state.detailDeviceId,state.detailOutputId])},url);
   await click('.item-member__label');
   check(current===await page.evaluate(async url=>{const {state}=await import(url);return JSON.stringify([state.view,state.detailDeviceId,state.detailOutputId])},url),'Clicking member text navigated');
   await page.mouse.move(1,1);await new Promise(r=>setTimeout(r,180));
   const reveal=await page.$eval('.item-member__open',el=>({opacity:Number(getComputedStyle(el).opacity),touch:matchMedia('(hover:none),(pointer:coarse)').matches}));
   check(reveal.touch?reveal.opacity===1:reveal.opacity===0,'Member opener visibility wrong');
   await page.hover('.item-member');await new Promise(r=>setTimeout(r,180));
   check(await page.$eval('.item-member__open',el=>Number(getComputedStyle(el).opacity))===1,'Hover failed to reveal opener');
   const openId=await page.$eval('.item-member__open',el=>el.dataset.id);
   await click('.item-member__open');
   check(await page.evaluate(async(url,openId)=>{const {state}=await import(url);return state.view==='device'?state.detailDeviceId===openId:state.detailOutputId===openId},url,openId),'Explicit member details did not open');
   results.push({id,width,theme,geo,expanded,onceTwiceImmediate:true,configurationOnRequest:true,memberTextDoesNotNavigate:true,explicitMemberOpen:true,touchOpener:reveal.touch});
  }
 }
 check(!errors.length,'Browser errors: '+errors.join('; '));await fs.writeFile(path.join(out,'detail-layout.json'),JSON.stringify({passed:true,results,errors},null,2)+'\n');log(JSON.stringify({passed:true,cases:results.length}));
};
