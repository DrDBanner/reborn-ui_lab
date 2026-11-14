module.exports=async({page,log})=>{
 const fs=require('node:fs/promises'),path=require('node:path'),out=path.resolve(__dirname,'../../project/group-membership/evidence'),results=[];
 const check=(ok,msg)=>{if(!ok)throw new Error(msg)};
 await page.waitForSelector('.workspace');
 const storeUrl=await page.evaluate(async()=>{const loaded=performance.getEntriesByType('resource').filter(entry=>new URL(entry.name).pathname==='/src/app/store.js').at(-1)?.name;if(loaded)return loaded;const js=await fetch('/src/main.js').then(r=>r.text());return js.match(/from\s*['"]([^'"]*\/app\/store\.js[^'"]*)['"]/)?.[1]||'/src/app/store.js'});
 const click=async selector=>{await page.$eval(selector,el=>el.scrollIntoView({block:'center'}));await page.click(selector)};
 const read=()=>page.evaluate(async url=>{const {state}=await import(url);return {groups:state.model.groups,sessions:state.model.sessions,modal:state.modal}},storeUrl);
 const reset=async(appearance,view='device')=>page.evaluate(async(url,appearance,view)=>{const {state,loadScenario,applyDesign,clearToast,notify}=await import(url);await loadScenario('home',false,true);state.designTokens.appearance=appearance;applyDesign();state.view=view;state.detailDeviceId='d4';state.detailOutputId='g1';clearToast(false);notify()},storeUrl,appearance,view);
 for(const appearance of ['dark','light'])for(const width of [1440,834,390,320]){
  await page.setViewport({width,height:width<=720?844:1000,deviceScaleFactor:1,isMobile:width<=720,hasTouch:width<=720});await reset(appearance);
  const before=JSON.stringify(await read());await click('[data-action="add-to-group"]');await click('[data-action="membership-choice"][data-id="g1"]');
  check(await page.$eval('.membership-review',e=>e.textContent.includes('Replaces NDR Info')),'Missing playback consequence');
  check(!(await read()).groups[0].memberIds.includes('d4'),'Preview mutated membership');
  await page.screenshot({path:path.join(out,`join-existing-${appearance}-${width}.png`)});
  await click('[data-action="membership-save"]');check((await read()).groups[0].memberIds.includes('d4')&&(await read()).sessions.length===1,'Join failed');
  await reset(appearance,'group');await page.evaluate(async url=>{const {state,notify}=await import(url);state.model.groups.push({id:'g2',name:'Upstairs',memberIds:['d5','d6'],leaderDeviceId:'d5',persistent:false,volume:20});state.model.sessions.push({id:'nest-session',targetId:'g2',sourceId:'ndr2',status:'paused',volume:20});notify()},storeUrl);
  await click('[data-action="add-to-group"]');await click('[data-action="membership-choice"][data-id="g2"]');await click('[data-action="membership-save"]');
  const nested=await read();check(nested.groups.find(g=>g.id==='g2').memberIds.includes('g1')&&nested.groups.find(g=>g.id==='g1').memberIds.join(',')==='p1,d3','Nested structure lost');
  check(nested.sessions.some(s=>s.targetId==='g2'&&s.status==='paused'&&s.sourceId==='ndr2')&&!nested.sessions.some(s=>s.targetId==='g1'),'Nested playback conflict');
  await page.screenshot({path:path.join(out,`nested-group-${appearance}-${width}.png`)});
  await reset(appearance);await click('.item-membership [data-action="start-group-create"]');await page.focus('#composite-name');
  const focus=await page.$eval('#composite-name',el=>{const r=el.getBoundingClientRect(),body=el.closest('.composite-form').getBoundingClientRect(),c=getComputedStyle(el);const ring=parseFloat(c.outlineWidth)+parseFloat(c.outlineOffset);return {ring,left:r.left-ring>=body.left-1,right:r.right+ring<=body.right+1,visible:el.matches(':focus-visible')}});
  check(focus.left&&focus.right&&focus.visible,'Focus ring clipped '+width);await page.screenshot({path:path.join(out,`focus-ring-${appearance}-${width}.png`)});await click('[data-action="close-modal"]');
  await reset(appearance,'group');await click('[data-action="group-tab"][data-value="sound"]');
  const bars=await page.$$eval('.volume-level',rows=>rows.map(row=>{const input=row.querySelector('input'),out=row.querySelector('output'),r=input.getBoundingClientRect();return {left:r.left,right:r.right,fill:input.style.getPropertyValue('--range-fill'),nowrap:getComputedStyle(out).whiteSpace==='nowrap',text:out.textContent.trim()}}));
  check(bars.length===4&&bars.every(row=>Math.abs(row.left-bars[0].left)<1&&Math.abs(row.right-bars[0].right)<1&&row.fill&&row.nowrap&&row.text.endsWith('%')),'Volume grid mismatch '+width);
  await page.screenshot({path:path.join(out,`volume-bars-${appearance}-${width}.png`)});
  await reset(appearance,'outputs');await click('.output-members summary');
  const firstRow=await page.$('.output-member-row');check(!!firstRow,'Member projection missing');
  check(await page.$eval('.output-member-row',e=>!e.dataset.action&&!e.querySelector('[data-icon="chevron_right"]')&&!!e.querySelector('[data-icon="open_in_new"]')),'Member row still navigates wholesale');
  if(width>720){await page.mouse.move(0,0);check(await page.$eval('.output-member-open',e=>getComputedStyle(e).opacity==='0'),'Open icon visible without hover');await page.hover('.output-member-row');await new Promise(r=>setTimeout(r,180));}
  check(await page.$eval('.output-member-open',e=>getComputedStyle(e).opacity==='1'),'Open icon did not reveal');
  await page.screenshot({path:path.join(out,`member-open-${appearance}-${width}.png`)});
  await click('.output-member-open');check(await page.$('.device-detail-name'),'Open icon did not navigate');
  // Preset expansion gives every device tab enough content to preserve a real scroll offset.
  await reset(appearance);await click('[data-action="toggle-preset-details"]');
  await page.$eval('.workspace',el=>el.scrollTop=110);const scrollBefore=await page.$eval('.workspace',e=>e.scrollTop);
  await page.evaluate(()=>document.querySelector('[data-action="device-tab"][data-value="sound"]').click());
  const scrollAfter=await page.$eval('.workspace',e=>({top:e.scrollTop,max:e.scrollHeight-e.clientHeight}));
  check(Math.abs(scrollAfter.top-Math.min(scrollBefore,scrollAfter.max))<2,'Device tab reset scroll '+width);
  check(await page.$eval('.workspace',e=>e.scrollWidth<=e.clientWidth+1),'Workspace overflow');
  results.push({appearance,width,joinExisting:true,nested:true,focus,bars,scroll:{before:scrollBefore,after:scrollAfter.top}});
 }
 await page.setViewport({width:1440,height:1000});await page.evaluate(async url=>{const {state,loadScenario,clearToast,notify}=await import(url);await loadScenario('many',false,true);state.view='outputs';state.model.ui.outputView='devices';clearToast(false);notify()},storeUrl);
 check(await page.$$eval('.output-card',e=>e.length===50),'N inventory is not 50');await page.screenshot({path:path.join(out,'fifty-device-inventory.png')});
 await page.evaluate(async url=>{const {state,notify}=await import(url);state.model.ui.outputView='outputs';notify()},storeUrl);check(await page.$$eval('.output-card',e=>e.length===38),'N targets is not 38');
 const favoriteColors=[];
 for(const appearance of ['light','dark']){
  await reset(appearance,'listen');await page.mouse.move(0,0);
  const colors=await page.evaluate(()=>{
   const active=document.querySelector('[data-action="toggle-favorite"][aria-pressed="true"]'),idle=document.querySelector('[data-action="toggle-favorite"][aria-pressed="false"]');
   return {active:getComputedStyle(active).color,idle:getComputedStyle(idle).color,accent:getComputedStyle(document.querySelector('.tab-control.active')).color};
  });check(colors.active!==colors.idle&&colors.active!==colors.accent,'Favorite color is not distinct');
  await page.hover('[data-action="toggle-favorite"][aria-pressed="false"]');check(await page.$eval('[data-action="toggle-favorite"][aria-pressed="false"]',(el,color)=>getComputedStyle(el).color===color,colors.active),'Unselected heart hover is not pink');
  await page.screenshot({path:path.join(out,`favorite-${appearance}.png`)});favoriteColors.push({appearance,...colors});
 }
 await fs.writeFile(path.join(out,'browser.json'),JSON.stringify({passed:true,inventory:50,targets:38,favoriteColors,results},null,2)+'\n');log(JSON.stringify({passed:true,cases:results.length,inventory:50,targets:38}));
};
