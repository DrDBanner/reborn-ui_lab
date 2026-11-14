/* Run from the repository root:
 * webshot http://127.0.0.1:5173 --execute=reborn-ui_lab/scripts/webshot-visual-audit.cjs --no-final-capture
 * Browser and Puppeteer are supplied by Webshot; no app dependencies required.
 */
module.exports = async ({page, log}) => {
 const fs=require('node:fs/promises');
 const path=require('node:path');
 const out=path.resolve(__dirname,'../../project/visual-audit/evidence');
 await fs.mkdir(out,{recursive:true});
 const results=[],errors=[],externalRequests=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.setRequestInterception(true);
 page.on('request',request=>{
  if(/^https?:/.test(request.url())&&new URL(request.url()).origin!==new URL(page.url()).origin){externalRequests.push(request.url());request.abort();}
  else request.continue();
 });
 await page.waitForSelector('.workspace');
 // Follow Vite's current module URL, including any HMR timestamp.
 const storeUrl=await page.evaluate(async()=>{
  const source=await fetch('/src/main.js').then(response=>response.text());
  return source.match(/from\s*['"]([^'"]*\/app\/store\.js[^'"]*)['"]/)?.[1]||'/src/app/store.js';
 });
 const route=async(view,options={})=>{
  await page.evaluate(async(view,options,storeUrl)=>{
   const {state,notify,applyDesign}=await import(storeUrl);
   state.view=view;state.detailDeviceId=state.model.devices[0]?.id;state.detailOutputId=state.model.groups[0]?.id||state.model.pairs[0]?.id;
   state.model.ui.deviceTab=options.tab||'overview';state.model.ui.settingsTab=options.tab||'general';
   state.modal=options.modal||null;state.toast=null;state.sidebarOpen=false;state.scenarioEditorOpen=!!options.editor;
   state.designTokens.appearance=options.appearance||'dark';applyDesign();notify();
   document.querySelector('.workspace').scrollTop=0;
  },view,options,storeUrl);
 };
 const inspect=async(label,screenshot=false)=>{
  const result=await page.evaluate(async()=>{
   const {materialIcons}=await import('/src/components/material-icons.js');
   const failures=[];
   const describe=element=>element.className?.baseVal||element.className||element.tagName;
   for(const element of document.querySelectorAll('.workspace,.app-header,.player,.panel,.target-card,.modal-window')){
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
   return {failures,icons:document.querySelectorAll('.material-symbols-rounded svg').length,width:innerWidth};
  });
  results.push({label,...result});
  if(screenshot)await page.screenshot({path:path.join(out,`after-${label}.png`)});
 };
 const views=['listen','library','history','spotify','outputs','group','device','updates','settings','setup','help','lab'];
 for(const [device,width,height] of [['desktop',1440,1000],['tablet',834,1112],['mobile',390,844],['small-mobile',320,740]]){
  await page.setViewport({width,height,deviceScaleFactor:1});
  for(const view of views){await route(view);await inspect(`${view}-${device}`,device!=='small-mobile');}
  for(const tab of ['sound','network','advanced']){await route('device',{tab});await inspect(`device-${tab}-${device}`,device==='desktop'||device==='mobile');}
  for(const tab of ['appearance','advanced']){await route('settings',{tab});await inspect(`settings-${tab}-${device}`);}
  for(const modal of [{kind:'picker'},{kind:'create',type:'group'},{kind:'create',type:'pair'},{kind:'preset'},{kind:'wifi'},{kind:'maintenance'}]){
   await route('device',{modal});await inspect(`dialog-${modal.kind}-${modal.type||'default'}-${device}`,device==='mobile');
  }
  await route('lab',{editor:true});await inspect(`lab-editor-${device}`);
  for(const view of ['outputs','device','group','lab']){await route(view,{appearance:'light'});await inspect(`${view}-light-${device}`,device==='desktop'||device==='mobile');}
 }
 for(const scenario of ['many','maintenance','multistream','first-run']){
  await page.evaluate(async(id,storeUrl)=>{const {loadScenario}=await import(storeUrl);await loadScenario(id,false,true);},scenario,storeUrl);
  for(const [device,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
   await page.setViewport({width,height,deviceScaleFactor:1});
   for(const view of views){await route(view);await inspect(`${scenario}-${view}-${device}`,['outputs','updates'].includes(view));}
  }
 }
 await fs.writeFile(path.join(out,'webshot-audit.json'),JSON.stringify({checks:results.length,failed:results.filter(result=>result.failures.length),pageErrors:errors,externalRequests,results},null,2)+'\n');
 // Exercise the actual controls after the geometry sweep.
 await page.evaluate(async storeUrl=>{const {loadScenario}=await import(storeUrl);await loadScenario('home',false,true);},storeUrl);
 await page.setViewport({width:390,height:844,deviceScaleFactor:1});
 await page.click('.mobile-menu');
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
 const report={timestamp:new Date().toISOString(),checks:results.length,failed:results.filter(result=>result.failures.length),pageErrors:errors,externalRequests,interactionChecks:'mobile navigation, session selection, output picker, Escape, slider focus/value/scroll',results};
 await fs.writeFile(path.join(out,'webshot-audit.json'),JSON.stringify(report,null,2)+'\n');
 log(JSON.stringify({checks:report.checks,failures:report.failed,pageErrors:errors,externalRequests}));
 if(report.failed.length||errors.length||externalRequests.length)throw new Error('Visual audit failed; see project/visual-audit/evidence/webshot-audit.json');
};
