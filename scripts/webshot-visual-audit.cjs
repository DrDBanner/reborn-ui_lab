/* Run from the repository root:
 * webshot http://127.0.0.1:5173 --execute=reborn-ui_lab/scripts/webshot-visual-audit.cjs --no-final-capture
 * Browser and Puppeteer are supplied by Webshot; no app dependencies required.
 */
module.exports = async ({page, log}) => {
 const fs=require('node:fs/promises');
 const path=require('node:path');
 const out=path.resolve(__dirname,process.env.REBORN_EVIDENCE_DIR||'../../project/visual-audit/evidence');
 await fs.mkdir(out,{recursive:true});
 const results=[],errors=[],externalRequests=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.setRequestInterception(true);
 page.on('request',request=>{
  if(/^https?:/.test(request.url())&&new URL(request.url()).origin!==new URL(page.url()).origin){externalRequests.push(request.url());request.abort();}
  else request.continue();
 });
 await page.waitForSelector('.workspace');
 await page.evaluate(()=>document.fonts.ready);
 // Follow Vite's current module URL, including any HMR timestamp.
 const storeUrl=await page.evaluate(async()=>{
  const source=await fetch('/src/main.js').then(response=>response.text());
  return source.match(/from\s*['"]([^'"]*\/app\/store\.js[^'"]*)['"]/)?.[1]||'/src/app/store.js';
 });
 const route=async(view,options={})=>{
  await page.evaluate(async(view,options,storeUrl)=>{
   const {state,notify,applyDesign}=await import(storeUrl);
   state.view=view;state.detailDeviceId=options.deviceId||state.model.devices[0]?.id;state.detailOutputId=state.model.groups[0]?.id||state.model.pairs[0]?.id;
   state.model.ui.deviceTab=options.tab||'overview';state.model.ui.settingsTab=options.tab||'general';
   state.presetGesture=options.gesture||'single';state.appMenuOpen=!!options.appMenu;state.modal=options.modal?{...options.modal,deviceId:state.detailDeviceId,gesture:options.gesture||'single'}:null;state.toast=null;state.sidebarOpen=false;state.scenarioEditorOpen=!!options.editor;
   state.designTokens.appearance=options.appearance||'dark';applyDesign();notify();
   document.querySelector('.workspace').scrollTop=0;
  },view,options,storeUrl);
 };
 const inspect=async(label,screenshot=false)=>{
  const result=await page.evaluate(async()=>{
   const {materialIcons}=await import('/src/components/material-icons.js');
   const failures=[];
   const describe=element=>element.className?.baseVal||element.className||element.tagName;
   for(const element of document.querySelectorAll('.workspace,.app-header,.player,.panel,.target-card,.modal-window,.app-menu,.key-preset')){
    if(element.scrollWidth>element.clientWidth+2)failures.push(`Horizontal overflow: ${describe(element)} (${element.scrollWidth}/${element.clientWidth})`);
   }
   for(const element of document.querySelectorAll('.key-values .device-status')){
    const rect=element.getBoundingClientRect(),parent=element.parentElement.getBoundingClientRect();
    if(rect.right>parent.right+1||rect.width<element.scrollWidth-1)failures.push('Clipped device status');
   }
   for(const element of document.querySelectorAll('.material-symbols-rounded')){
    if(!element.querySelector('svg path')||!materialIcons[element.dataset.icon])failures.push(`Missing SVG: ${element.dataset.icon}`);
   }
   const player=document.querySelector('.player').getBoundingClientRect();
   const workspace=document.querySelector('.workspace').getBoundingClientRect();
   if(workspace.bottom>player.top+1)failures.push('Player overlaps workspace');
   const controls=[...document.querySelectorAll('.player__content,.player__transport,.output-trigger,.session-select,.volume-range,.volume-value')].filter(element=>element.getClientRects().length);
   for(let i=0;i<controls.length;i++){
    const a=controls[i].getBoundingClientRect();
    if(a.right>innerWidth+1||a.left<0)failures.push(`Player control outside viewport: ${describe(controls[i])}`);
    for(const other of controls.slice(i+1)){
     const b=other.getBoundingClientRect();
     if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>2&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>2)failures.push(`Player controls overlap: ${describe(controls[i])} / ${describe(other)}`);
    }
   }
   if(!getComputedStyle(document.body).fontFamily.startsWith('Inter')||!document.fonts.check('400 14px Inter'))failures.push('Local Inter font unavailable');
   return {failures,icons:document.querySelectorAll('.material-symbols-rounded svg').length,width:innerWidth};
  });
  results.push({label,...result});
  if(screenshot)await page.screenshot({path:path.join(out,`after-${label}.png`)});
 };
 const views=['listen','library','history','spotify','outputs','group','device','updates','settings','setup','help','lab','sessions'];
 for(const [device,width,height] of [['desktop',1440,1000],['tablet',834,1112],['mobile',390,844],['small-mobile',320,740]]){
  await page.setViewport({width,height,deviceScaleFactor:1});
  for(const view of views){await route(view);await inspect(`${view}-${device}`,device!=='small-mobile');}
  for(const tab of ['sound','network','functions','advanced']){await route('device',{tab});await inspect(`device-${tab}-${device}`,device==='desktop'||device==='mobile');}
  for(const tab of ['appearance','advanced']){await route('settings',{tab});await inspect(`settings-${tab}-${device}`);}
  for(const modal of [{kind:'picker'},{kind:'create',type:'group'},{kind:'create',type:'pair'},{kind:'preset'},{kind:'wifi'},{kind:'maintenance'}]){
   await route('device',{modal});await inspect(`dialog-${modal.kind}-${modal.type||'default'}-${device}`,device==='mobile');
  }
  await route('device',{tab:'functions',gesture:'double'});await inspect(`device-double-${device}`,true);
  await route('listen',{appMenu:true});await inspect(`app-menu-${device}`,true);
  await route('lab',{editor:true});await inspect(`lab-editor-${device}`);
  for(const view of ['outputs','device','group','lab']){await route(view,{appearance:'light'});await inspect(`${view}-light-${device}`,device==='desktop'||device==='mobile');}
 }
 for(const scenario of ['many','maintenance','multistream','capabilities','first-run']){
  await page.evaluate(async(id,storeUrl)=>{const {loadScenario}=await import(storeUrl);await loadScenario(id,false,true);},scenario,storeUrl);
  for(const [device,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
   await page.setViewport({width,height,deviceScaleFactor:1});
   for(const view of views){await route(view);await inspect(`${scenario}-${view}-${device}`,['outputs','updates'].includes(view));}
  }
 }
 // Check capability-specific detail layouts before moving back to the home scenario.
 await page.evaluate(async storeUrl=>{const {loadScenario}=await import(storeUrl);await loadScenario('capabilities',false,true);},storeUrl);
 for(const width of [320,390,834,1440]){
  await page.setViewport({width,height:900,deviceScaleFactor:1});
  for(const deviceId of ['d1','d11','d12']){await route('device',{deviceId,tab:'functions',gesture:'double'});await inspect(`capabilities-${deviceId}-${width}`,true);}
 }
 await fs.writeFile(path.join(out,'webshot-audit.json'),JSON.stringify({checks:results.length,failed:results.filter(result=>result.failures.length),pageErrors:errors,externalRequests,results},null,2)+'\n');
 // Exercise the actual controls after the geometry sweep.
 await page.evaluate(async storeUrl=>{const {loadScenario}=await import(storeUrl);await loadScenario('home',false,true);},storeUrl);
 await page.setViewport({width:390,height:844,deviceScaleFactor:1});
 await page.waitForFunction(()=>{const rect=document.querySelector('.mobile-menu').getBoundingClientRect();return !!document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2)?.closest('.mobile-menu');});
 await page.click('.mobile-menu');
 await page.waitForSelector('.sidebar--open');
 if(!await page.$('.sidebar--open'))throw new Error('Mobile navigation did not open');
 await page.screenshot({path:path.join(out,'after-mobile-navigation.png')});
 await page.click('.sidebar [data-action="navigate"][data-value="outputs"]');
 if(await page.$('.sidebar--open'))throw new Error('Mobile navigation did not close after navigation');
 await page.select('[data-field="session"]','s2');
 await page.click('[data-action="open-output-picker"]');
 await page.waitForSelector('[role="dialog"]');
 await page.keyboard.press('Escape');
 await route('group');
 const scroll=await page.evaluate(()=>{const workspace=document.querySelector('.workspace');workspace.scrollTop=workspace.scrollHeight;return workspace.scrollTop;});
 await page.$eval('[data-field="member-volume"][data-id="d2"]',element=>{
  element.focus();element.value='42';element.dispatchEvent(new Event('change',{bubbles:true}));
 });
 const preserved=await page.evaluate(()=>({scroll:document.querySelector('.workspace').scrollTop,focusedId:document.activeElement.dataset.id,value:document.querySelector('[data-field="member-volume"][data-id="d2"]').value}));
 if(Math.abs(preserved.scroll-scroll)>1||preserved.focusedId!=='d2'||preserved.value!=='42')throw new Error(`Slider rerender lost context: ${JSON.stringify(preserved)}`);
 // Device-bound double-press editing must preserve the other bank and stream.
 await page.setViewport({width:390,height:844,deviceScaleFactor:1});
 await route('device',{deviceId:'d1',tab:'functions',gesture:'double'});
 await page.click('[data-action="preset-edit"]');
 await page.select('[data-preset-index="0"]','ndr2');
 await page.click('[data-action="preset-save"]');
 await page.click('[data-action="preset-play"][data-key="1"]');
 const doubleResult=await page.evaluate(async storeUrl=>{
  const {state}=await import(storeUrl);
  return {single:state.model.devices[0].presets[0],double:state.model.devices[0].doublePresets[0],group:state.model.sessions.find(s=>s.targetId==='g1')?.sourceId,office:state.model.sessions.find(s=>s.targetId==='d4')?.sourceId};
 },storeUrl);
 if(doubleResult.single!=='1live'||doubleResult.double!=='ndr2'||doubleResult.group!=='ndr2'||doubleResult.office!=='ndrinfo')throw new Error('Double-press assignment affected another bank or stream: '+JSON.stringify(doubleResult));
 await page.click('.mobile-brand');
 await page.waitForSelector('#app-menu');
 await page.screenshot({path:path.join(out,'after-app-menu-interaction.png')});
 await page.keyboard.press('Escape');
 if(await page.$('#app-menu'))throw new Error('App menu did not close with Escape');
 await page.reload({waitUntil:'networkidle0'});
 await page.waitForSelector('.workspace');
 await page.evaluate(()=>document.fonts.ready);
 await route('device',{deviceId:'d1',tab:'functions',gesture:'double'});
 const persisted=await page.$eval('.key-preset__source strong',element=>element.textContent);
 if(persisted!=='NDR 2')throw new Error('Double-press assignment did not survive reload');
 await page.screenshot({path:path.join(out,'after-double-preset-persisted-mobile.png')});
 const report={timestamp:new Date().toISOString(),checks:results.length,failed:results.filter(result=>result.failures.length),pageErrors:errors,externalRequests,interactionChecks:'mobile navigation, session selection, output picker, Escape, slider focus/value/scroll, double-press editing/recall/persistence, logo menu/Escape',results};
 await fs.writeFile(path.join(out,'webshot-audit.json'),JSON.stringify(report,null,2)+'\n');
 log(JSON.stringify({checks:report.checks,failures:report.failed,pageErrors:errors,externalRequests}));
 if(report.failed.length||errors.length||externalRequests.length)throw new Error('Visual audit failed; see project/visual-audit/evidence/webshot-audit.json');
};
