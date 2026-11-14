module.exports=async({page,log})=>{
 const fs=require('node:fs/promises'),path=require('node:path'),out=path.resolve(__dirname,'../../project/playback-membership/evidence'),results=[],errors=[];
 const check=(ok,msg)=>{if(!ok)throw new Error(msg)};page.on('pageerror',e=>errors.push(e.message));
 await page.waitForSelector('.workspace');
 const url=await page.evaluate(async()=>{const js=await fetch('/src/main.js').then(r=>r.text());return js.match(/from\s*['"]([^'"]*\/app\/store\.js[^'"]*)['"]/)?.[1]||'/src/app/store.js'});
 const reset=async theme=>page.evaluate(async(url,theme)=>{const {state,loadScenario,notify,applyDesign}=await import(url);await loadScenario('home',false,true);state.designTokens.appearance=theme;state.toasts=[];applyDesign();notify()},url,theme);
 const snapshot=()=>page.evaluate(async url=>{const {state}=await import(url);return {model:structuredClone(state.model),modal:structuredClone(state.modal),toasts:state.toasts.map(t=>t.message)}},url);
 const click=async selector=>{await page.$eval(selector,el=>el.scrollIntoView({block:'center'}));await page.click(selector)};
 for(const width of [1440,834,390,320])for(const theme of ['dark','light']){
  await page.setViewport({width,height:width<720?844:1000,deviceScaleFactor:1,isMobile:width<720,hasTouch:width<720});await reset(theme);
  const before=await snapshot();await click('[data-action="open-output-picker"]');
  check(await page.$eval('[data-field="picker-as-member"]',el=>!el.checked),'As member must default off');
  await click('[data-field="picker-as-member"]');
  check(await page.$eval('[data-action="assign-output"][data-id="g1"]',el=>el.disabled),'Origin should not join itself');
  check(await page.$eval('[data-action="assign-output"][data-id="d4"]',el=>el.textContent.includes('Replaces NDR Info on Office')),'Existing destination playback not explained');
  const geometry=await page.$eval('.modal-window',el=>{const r=el.getBoundingClientRect();return {overflow:el.scrollWidth>el.clientWidth+1,inViewport:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight}});
  check(!geometry.overflow&&geometry.inViewport,'Picker layout invalid '+JSON.stringify({width,theme,geometry}));
  await page.screenshot({path:path.join(out,`member-picker-${theme}-${width}.png`)});
  await click('[data-action="close-modal"]');check(JSON.stringify((await snapshot()).model)===JSON.stringify(before.model),'Cancel modified model');
  await click('[data-action="open-output-picker"]');await click('[data-action="assign-output"][data-id="d5"]');
  let result=await snapshot();check(result.model.sessions.length===3&&result.model.groups.length===1,'Unchecked casting must stay independent');
  check(result.toasts.at(-1)==='Playing FluxFM on Terrace L','Toast omitted source or target');
  await reset(theme);await click('[data-action="open-output-picker"]');await click('[data-field="picker-as-member"]');await click('[data-action="assign-output"][data-id="d5"]');
  result=await snapshot();check(result.model.groups[0].memberIds.includes('d5')&&result.model.sessions.length===2,'Joining existing group created a separate stream');
  check(result.model.sessions.find(s=>s.id==='s1').sourceId==='flux'&&result.model.sessions.find(s=>s.id==='s2').sourceId==='ndrinfo','Joining changed an unrelated source');
  await reset(theme);await page.select('[data-field="session"]','s2');
  await page.evaluate(async url=>{const {state,notify}=await import(url);state.model.sessions.find(s=>s.id==='s2').status='paused';notify()},url);
  await click('[data-action="open-output-picker"]');await click('[data-field="picker-as-member"]');await click('[data-action="assign-output"][data-id="d5"]');
  result=await snapshot();const session=result.model.sessions.find(s=>s.id==='s2'),group=result.model.groups.find(g=>g.id===session.targetId);
  check(session.status==='paused'&&session.sourceId==='ndrinfo'&&group&&!group.persistent&&group.memberIds.join(',')==='d4,d5','Standalone joining did not preserve its playback');
  check(result.model.sessions.find(s=>s.id==='s1').sourceId==='flux','Standalone join changed other stream');
  // A real source-art click from history must identify both the replacement source and target.
  await page.evaluate(async url=>{const {state,notify}=await import(url);state.view='history';state.toasts=[];notify()},url);
  await click('.source-art--play[data-id="flux"]');result=await snapshot();
  check(result.toasts.at(-1)===`Playing FluxFM on ${group.name}`,'History switch toast omitted source/output');
  for(const [view,sourceId,sourceName] of [['listen','ndr2','NDR 2'],['history','1live','1LIVE']]){
   await reset(theme);await page.evaluate(async(url,view)=>{const {state,notify}=await import(url);state.view=view;notify()},url,view);
   await click(`[data-action="source-select"][data-id="${sourceId}"]`);check(!!await page.$('[data-field="picker-as-member"]'),'List Choose output omitted membership');
   await click('[data-field="picker-as-member"]');check(await page.$eval('.picker-source-change',(el,sourceName)=>el.textContent.includes(sourceName)&&el.textContent.includes('whole output'),sourceName),'Shared source change not explained');
   await page.screenshot({path:path.join(out,`list-choose-output-${view}-${theme}-${width}.png`)});await click('[data-action="assign-output"][data-id="d5"]');result=await snapshot();
   check(result.model.groups[0].memberIds.includes('d5')&&result.model.sessions.find(s=>s.id==='s1').sourceId===sourceId,'List membership did not apply source to joined output');
   check(result.model.sessions.find(s=>s.id==='s2').sourceId==='ndrinfo','List membership changed independent stream');
   check(result.toasts.at(-1).includes(sourceName+' on Downstairs'),'List toast omitted source/output');
  }
  results.push({width,theme,geometry,cancelUnchanged:true,independentDefault:true,groupExtended:true,standaloneTemporaryGroup:true,pausedPreserved:true,toastSourceAndOutput:true,radioListMembership:true,historyListMembership:true});
 }
 check(!errors.length,'Browser errors: '+errors.join('; '));await fs.writeFile(path.join(out,'browser.json'),JSON.stringify({passed:true,results,errors},null,2)+'\n');log(JSON.stringify({passed:true,cases:results.length}));
};
