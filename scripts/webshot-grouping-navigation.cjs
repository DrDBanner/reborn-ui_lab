module.exports=async({page,log})=>{
 const fs=require('node:fs/promises'),path=require('node:path');
 const out=path.resolve(__dirname,'../../project/grouping-navigation/evidence'),results=[];
 const check=(ok,msg)=>{if(!ok)throw new Error(msg)};
 await page.waitForSelector('.workspace');
 const storeUrl=await page.evaluate(async()=>{const js=await fetch('/src/main.js').then(r=>r.text());return js.match(/from\s*['"]([^'"]*\/app\/store\.js[^'"]*)['"]/)?.[1]||'/src/app/store.js'});
 const read=()=>page.evaluate(async url=>{const {state}=await import(url);return {view:state.view,detailDevice:state.detailDeviceId,detailOutput:state.detailOutputId,selectedOutput:state.model.selectedOutputId,selectedSession:state.model.selectedSessionId,sessions:JSON.stringify(state.model.sessions),pairs:state.model.pairs,groups:state.model.groups,modal:state.modal}},storeUrl);
 const click=async selector=>{await page.$eval(selector,el=>el.scrollIntoView({block:'center'}));await page.click(selector)};
 const openSidebar=async width=>{if(width<=720){await page.click('.mobile-menu');await page.waitForSelector('.sidebar--open');await new Promise(r=>setTimeout(r,250));}};
 for(const width of [1440,834,390,320]){
  await page.setViewport({width,height:width<=720?844:1000,deviceScaleFactor:1});
  await page.evaluate(async url=>{const {state,loadScenario}=await import(url);await loadScenario('home',false,true);state.toasts=[];state.model.ui.speakerVariant='sidebar';state.model.ui.collapsed.outputs=false;},storeUrl);
  await openSidebar(width);
  const before=await read();
  await click('.sidebar [data-action="select-session"][data-id="s2"]');
  let data=await read();check(data.view==='device'&&data.detailDevice==='d4'&&data.selectedOutput==='d4'&&data.selectedSession==='s2'&&data.sessions===before.sessions,'Playing device context failed '+width);
  check(await page.$$eval('.sidebar [aria-current="page"]',els=>els.length===1&&els[0].dataset.id==='d4'),'Duplicate or wrong sidebar context');
  check(await page.$eval('.item-membership',(el)=>(el.compareDocumentPosition(document.querySelector('.detail-tabs'))&Node.DOCUMENT_POSITION_FOLLOWING)&&(document.querySelector('.item-key-functions').compareDocumentPosition(el)&Node.DOCUMENT_POSITION_FOLLOWING)),'Members not between presets and tabs');
  await page.screenshot({path:path.join(out,`device-members-${width}.png`)});
  await click('.item-membership [data-action="start-group-create"]');
  check((await read()).modal.type==='group','Device did not open shared grouping');
  check(await page.$eval('[data-field="member-select"][value="d4"]',el=>el.checked),'Device not preselected');
  await page.type('#composite-name','Office stereo');
  await click('[data-field="member-select"][value="d5"]');
  await click('[data-field="composite-stereo"]');
  check(await page.$eval('#composite-name',el=>el.value)==='Office stereo','Name draft lost');
  check(await page.$eval('#composite-left',el=>el.value)==='d4'&&await page.$eval('#composite-right',el=>el.value)==='d5','Stereo channels not seeded');
  await page.select('#composite-right','');await page.select('#composite-left','d5');await page.select('#composite-right','d4');
  const layout=await page.evaluate(()=>{const w=document.querySelector('.modal-window'),r=w.getBoundingClientRect();return {overflow:w.scrollWidth>w.clientWidth+1,within:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,footer:!!document.querySelector('[data-action="composite-create"]:not(:disabled)')}});
  check(!layout.overflow&&layout.within&&layout.footer,'Grouping dialog geometry failed '+width);
  await page.screenshot({path:path.join(out,`stereo-dialog-${width}.png`)});
  await click('[data-action="composite-create"]');data=await read();const pair=data.pairs.at(-1);
  check(pair.name==='Office stereo'&&pair.leftDeviceId==='d5'&&pair.rightDeviceId==='d4'&&data.view==='group','Stereo create failed '+width);
  await page.evaluate(async url=>{const {state,notify}=await import(url);state.toasts=[];notify()},storeUrl);
  await openSidebar(width);await click('.sidebar [data-action="select-session"][data-id="s1"]');
  data=await read();check(data.view==='group'&&data.detailOutput==='g1'&&data.selectedOutput==='g1'&&data.sessions===before.sessions,'Playing group context changed streams');
  check(await page.$$eval('.sidebar [aria-current="page"]',els=>els.length===1&&els[0].dataset.id==='g1'),'Group context marker failed');
  // Create normal group containing an existing pair using the same form.
  await page.evaluate(async url=>{const {state,loadScenario,notify}=await import(url);await loadScenario('home',false,true);state.model.groups=[];state.view='outputs';state.modal=null;state.toasts=[];notify()},storeUrl);
  check(await page.$$eval('.output-create-actions button',els=>els.length===1),'Duplicate group/pair entry');
  await click('.output-create-actions [data-action="start-group-create"]');
  await click('[data-field="member-select"][value="p1"]');await click('[data-field="member-select"][value="d3"]');
  await page.type('#composite-name','Whole room');await click('[data-field="composite-persistent"]');
  await click('[data-action="composite-create"]');data=await read();
  check(data.groups.length===1&&data.groups[0].name==='Whole room'&&!data.groups[0].persistent&&data.groups[0].memberIds.join(',')==='p1,d3','Normal group failed '+width);
  results.push({width,playingDevice:true,playingGroup:true,unchangedStreams:true,singleCurrentContext:true,membersAboveTabs:true,stereoChannels:pair.memberIds,groupWithPair:true,layout});
 }
 await fs.writeFile(path.join(out,'browser.json'),JSON.stringify({passed:true,results},null,2)+'\n');log(JSON.stringify({passed:true,widths:results.map(r=>r.width)}));
};
