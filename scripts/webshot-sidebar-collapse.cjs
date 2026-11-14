module.exports=async({page,log})=>{
 const fs=require('node:fs/promises'),path=require('node:path'),out=path.resolve(__dirname,'../../project/sidebar-collapse/evidence'),results=[];
 const check=(ok,message)=>{if(!ok)throw new Error(message)};
 const store=()=>page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>new URL(e.name).pathname==='/src/app/store.js').at(-1).name);
 await page.waitForSelector('.workspace');let url=await store();
 for(const appearance of ['dark','light'])for(const width of [1440,800]){
  await page.setViewport({width,height:900,deviceScaleFactor:1,isMobile:false,hasTouch:false});
  await page.evaluate(async(url,appearance)=>{const {state,loadScenario,applyDesign,save,notify}=await import(url);await loadScenario('home',false,true);state.designTokens.sidebarCollapsed=false;state.designTokens.appearance=appearance;state.toasts=[];applyDesign();save();notify()},url,appearance);
  const before=await page.$eval('.workspace',e=>e.clientWidth);
  const sessions=await page.evaluate(async url=>JSON.stringify((await import(url)).state.model.sessions),url);
  await page.focus('.sidebar-toggle');await page.keyboard.press('Enter');
  check(await page.$eval('.sidebar-toggle',e=>e.getAttribute('aria-expanded')==='false'&&document.activeElement===e),'Collapsed toggle lost focus/ARIA');
  check(await page.$eval('.sidebar',e=>getComputedStyle(e).display==='none'),'Sidebar remains visible');
  const after=await page.$eval('.workspace',e=>e.clientWidth);
  check(after>before+200,'Collapsed navigation did not free width');
  check(await page.$eval('.workspace',e=>e.scrollWidth<=e.clientWidth+1),'Workspace overflow');
  check(await page.evaluate(async(url,sessions)=>JSON.stringify((await import(url)).state.model.sessions)===sessions,url,sessions),'Playback changed');
  await page.click('.mobile-brand');await page.click('[data-action="close-app-menu"]');
  check(await page.$eval('.mobile-brand',e=>e===document.activeElement),'App menu returned focus to hidden logo');
  await page.screenshot({path:path.join(out,`collapsed-${appearance}-${width}.png`)});
  await page.reload({waitUntil:'load'});await page.waitForSelector('.workspace');url=await store();
  check(await page.$eval('.sidebar',e=>getComputedStyle(e).display==='none'),'Collapsed preference lost on reload');
  await page.click('.sidebar-toggle');
  check(await page.$eval('.sidebar',e=>getComputedStyle(e).display!=='none'),'Could not reopen navigation');
  // Mobile drawer opens even with the desktop preference collapsed.
  await page.click('.sidebar-toggle');await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true});
  check(await page.$eval('.sidebar-toggle',e=>getComputedStyle(e).display==='none'),'Desktop toggle exposed on mobile');
  await page.click('.mobile-menu');check(await page.$eval('.sidebar',e=>e.getBoundingClientRect().x>=-1),'Mobile drawer did not open');
  await page.click('.sidebar-close');
  await page.screenshot({path:path.join(out,`mobile-${appearance}-${width}.png`)});
  await page.setViewport({width,height:900,deviceScaleFactor:1,isMobile:false,hasTouch:false});
  check(await page.$eval('.sidebar',e=>getComputedStyle(e).display==='none'),'Mobile drawer changed desktop preference');
  results.push({appearance,width,before,after,persisted:true,keyboardFocus:true,mobileIndependent:true,playbackUnchanged:true});
 }
 await fs.writeFile(path.join(out,'browser.json'),JSON.stringify({passed:true,results},null,2)+'\n');log(JSON.stringify({passed:true,cases:results.length}));
};
