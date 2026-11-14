// Real pointer, keyboard and touch checks for direct play and preset propagation.
module.exports=async({page,log})=>{
 const fs=require('node:fs/promises'),path=require('node:path');
 const out=path.resolve(__dirname,'../../project/item-functions/evidence'),results=[];
 const check=(ok,message)=>{if(!ok)throw new Error(message)};
 await page.waitForSelector('.workspace');
 const storeUrl=await page.evaluate(async()=>{const js=await fetch('/src/main.js').then(response=>response.text());return js.match(/from\s*['"]([^'"]*\/app\/store\.js[^'"]*)['"]/)?.[1]||'/src/app/store.js';});
 for(const width of [1440,834,390,320]){
  await page.setViewport({width,height:width<720?844:1000,hasTouch:width<720,deviceScaleFactor:1});
  await page.evaluate(async storeUrl=>{const {loadScenario,state,notify}=await import(storeUrl);await loadScenario('home',false,true);state.model.selectedSessionId='s2';state.toasts=[];notify();},storeUrl);
  const direct='.source-row [data-action="source-play"][data-id="1live"]';
  check((await page.$eval(direct,element=>element.getAttribute('aria-label'))).includes('Office'),'Direct play must identify current player output');
  await page.hover('.source-row');
  const overlay=await page.$eval('.source-art__play',element=>getComputedStyle(element).opacity);
  check(overlay==='1','Station hover should reveal play icon');
  await page.screenshot({path:path.join(out,`station-direct-play-${width}.png`)});
  await page.$eval(direct,element=>element.focus());await page.keyboard.press('Enter');
  const played=await page.evaluate(async storeUrl=>{const {state}=await import(storeUrl);return {sessions:state.model.sessions,modal:state.modal};},storeUrl);
  check(!played.modal&&played.sessions.some(session=>session.targetId==='d4'&&session.sourceId==='1live'),'Direct play did not start on Office');
  check(played.sessions.some(session=>session.targetId==='g1'&&session.sourceId==='flux'),'Direct play changed independent playback');
  await page.click('.source-row [data-action="source-select"][data-id="ndr2"]');await page.waitForSelector('.modal-output');
  const pending=await page.evaluate(async storeUrl=>{const {state}=await import(storeUrl);return state.model.sessions;},storeUrl);
  check(JSON.stringify(pending)===JSON.stringify(played.sessions),'Cast picker should wait for target selection');
  await page.keyboard.press('Escape');
  await page.evaluate(async storeUrl=>{const {state,notify}=await import(storeUrl);state.view='device';state.detailDeviceId='d1';state.model.ui.deviceTab='functions';state.toasts=[];notify();},storeUrl);
  check(!!await page.$('[data-action="button-transfer-open"] [data-icon="add_link"]'),'Transfer action should use add_link');
  if(!await page.$('[data-action="button-transfer-open"]'))await page.click('[data-action="toggle-preset-details"]');
  await page.click('[data-action="button-transfer-open"]');await page.waitForSelector('.transfer-key-grid');
  await page.click('[data-field="button-transfer-target"][value="g1"]');
  await page.click('[data-field="button-transfer-target"][value="d2"]');
  await page.click('[data-field="button-transfer-target"][value="d2"]');
  await page.click('[data-field="button-transfer-target"][value="d4"]');
  check(await page.$$eval('.transfer-result',items=>items.length===3),'Composite transfer must de-duplicate physical targets');
  await page.screenshot({path:path.join(out,`preset-transfer-review-${width}.png`)});
  await page.click('[data-action="button-transfer-save"]');
  await page.waitForSelector('.transfer-results');
  const report=await page.evaluate(async storeUrl=>{const {state}=await import(storeUrl);return state.modal.report;},storeUrl);
  check(report.results.length===3&&report.results.find(item=>item.id==='d4').skipped.length===3,'Unsupported second layer must be reported');
  check(report.results.find(item=>item.id==='d2').copied.length===9,'Both supported banks should copy');
  await page.screenshot({path:path.join(out,`preset-transfer-results-${width}.png`)});
  await page.keyboard.press('Escape');
  check(await page.$$eval('.sidebar [aria-current="page"]',items=>items.length===1),'Sidebar active context must be unique');
  results.push({width,directPlay:'Office',independentPlaybackPreserved:true,castDefersPlayback:true,keyboard:true,hoverOrTouchPlay:true,groupFanoutDeduplicated:true,unsupportedLayerReported:true,oneNavigationContext:true});
 }
 await fs.writeFile(path.join(out,'context-smoke.json'),JSON.stringify({passed:true,results},null,2)+'\n');log(JSON.stringify({passed:true,widths:results.map(item=>item.width)}));
};
