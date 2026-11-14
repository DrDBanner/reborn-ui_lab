module.exports=async({page,log})=>{
 const fs=require('node:fs/promises'),path=require('node:path'),out=path.resolve(__dirname,'../../project/update-notifications/evidence'),results=[];
 const check=(ok,msg)=>{if(!ok)throw new Error(msg)};
 await page.waitForSelector('.workspace');
 const storeUrl=await page.evaluate(async()=>{const js=await fetch('/src/main.js').then(r=>r.text());return js.match(/from\s*['"]([^'"]*\/app\/store\.js[^'"]*)['"]/)?.[1]||'/src/app/store.js'});
 const click=async selector=>{await page.$eval(selector,e=>e.scrollIntoView({block:'center'}));await page.click(selector)};
 for(const appearance of ['dark','light'])for(const width of [1440,390,320]){
  await page.setViewport({width,height:width<=720?844:1000,deviceScaleFactor:1,isMobile:width<=720,hasTouch:width<=720});
  await page.evaluate(async(url,appearance)=>{const {state,loadScenario,applyDesign}=await import(url);state.designTokens.appearance=appearance;applyDesign();await loadScenario('update-notifications',false,true)},storeUrl,appearance);
  await new Promise(r=>setTimeout(r,350));
  check(await page.$$eval('.toast-message--update',e=>e.length===1),'Missing/duplicate update toast');
  check(await page.$eval('.toast-message--update',e=>e.textContent.includes('Office')&&e.textContent.includes('1.6.3')&&e.textContent.includes('27.0.7')),'Toast lacks versions/targets');
  const geometry=await page.$eval('.toast-message--update',e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,within:r.left>=0&&r.right<=innerWidth+1,overflow:e.scrollWidth>e.clientWidth+1}});
  check(geometry.within&&!geometry.overflow,'Toast overflow');
  await page.screenshot({path:path.join(out,`update-toast-${appearance}-${width}.png`)});
  await click('.toast-action');
  check(await page.$('[data-action="check-updates"]'),'Link did not open maintenance');
  await click('[data-action="check-updates"]');await click('[data-action="check-updates"]');
  check(await page.$$eval('.toast-message--update:not(.is-leaving)',e=>e.length===0),'Repeat check duplicated notification');
  check(await page.$eval('.workspace',e=>e.textContent.includes('Checked just now')),'No check feedback');
  check(await page.evaluate(async url=>{const {state}=await import(url);return !state.model.devices.some(d=>d.status==='updating')},storeUrl),'Link installed update');
  await page.evaluate(async url=>{const {state,mutate,clearToast}=await import(url);clearToast();mutate(s=>{s.view='group';s.detailOutputId='g1';s.model.selectedOutputId='g1'})},storeUrl);
  await page.mouse.move(0,0);
  const quiet=await page.$eval('.item-member__remove',e=>({opacity:getComputedStyle(e).opacity,touch:matchMedia('(hover:none),(pointer:coarse)').matches}));
  check(quiet.touch?quiet.opacity==='1':quiet.opacity==='0','Wrong remove visibility');
  if(width>720){await page.hover('.item-member');await new Promise(r=>setTimeout(r,180));check(await page.$eval('.item-member__remove',e=>getComputedStyle(e).opacity!=='0'),'Remove did not reveal on hover')}
  await page.mouse.move(0,0);
  check(await page.$eval('.group-settings-trigger',e=>getComputedStyle(e).color===getComputedStyle(document.documentElement).getPropertyValue('--muted').trim()||getComputedStyle(e).color!==getComputedStyle(document.querySelector('.item-membership h2')).color),'Secondary gear remains loud');
  await page.screenshot({path:path.join(out,`quiet-members-${appearance}-${width}.png`)});
  results.push({appearance,width,geometry,link:true,deduplicated:true,noInstall:true,secondaryActions:quiet});
 }
 // A normal update notice follows the existing eight-second animated lifecycle.
 await page.evaluate(async url=>{const {loadScenario}=await import(url);await loadScenario('update-notifications',false,true)},storeUrl);
 await new Promise(r=>setTimeout(r,8400));check(!await page.$('.toast-message--update'),'Update toast did not expire');
 await fs.writeFile(path.join(out,'browser.json'),JSON.stringify({passed:true,expiresAfterEightSeconds:true,results},null,2)+'\n');log(JSON.stringify({passed:true,cases:results.length,expiry:true}));
};
