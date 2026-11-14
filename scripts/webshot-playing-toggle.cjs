module.exports=async({page,log})=>{
 const fs=require('node:fs/promises'),path=require('node:path'),out=path.resolve(__dirname,'../../project/playing-toggle/evidence'),results=[];
 const check=(ok,message)=>{if(!ok)throw new Error(message)};
 await page.waitForSelector('.workspace');const url=await page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>new URL(e.name).pathname==='/src/app/store.js').at(-1).name);
 for(const appearance of ['dark','light']){
  await page.setViewport({width:1280,height:900,deviceScaleFactor:1,isMobile:false,hasTouch:false});
  await page.evaluate(async(url,appearance)=>{const {state,loadScenario,applyDesign,notify}=await import(url);await loadScenario('home',false,true);state.designTokens.sidebarCollapsed=false;state.designTokens.appearance=appearance;applyDesign();state.toasts=[];notify()},url,appearance);
  const selector='.session-card__state[data-id="s2"]';
  const before=await page.evaluate(async url=>{const {state}=await import(url);return JSON.stringify({view:state.view,selected:state.model.selectedSessionId,other:state.model.sessions.find(s=>s.id==='s1')})},url);
  await page.mouse.move(900,75);
  check(await page.$eval(selector,e=>getComputedStyle(e.querySelector('.session-card__status-icon')).display!=='none'&&getComputedStyle(e.querySelector('.session-card__transport-icon')).display==='none'),'Idle status not shown');
  await page.hover(selector);
  check(await page.$eval(selector,e=>getComputedStyle(e.querySelector('.session-card__status-icon')).display==='none'&&getComputedStyle(e.querySelector('.session-card__transport-icon')).display!=='none'),'Hover did not replace icon');
  await page.click(selector);
  check(await page.$eval(selector,e=>e.dataset.status==='paused'&&document.activeElement===e&&e.title==='Resume NDR Info on Office'),'Pause lost binding or focus');
  check(await page.evaluate(async(url,before)=>{const {state}=await import(url);return JSON.stringify({view:state.view,selected:state.model.selectedSessionId,other:state.model.sessions.find(s=>s.id==='s1')})===before},url,before),'Transport navigated or affected other session');
  await page.screenshot({path:path.join(out,`paused-hover-${appearance}.png`)});
  await page.keyboard.press('Space');
  check(await page.$eval(selector,e=>e.dataset.status==='playing'&&document.activeElement===e),'Keyboard resume failed');
  await page.click('.session-card__open[data-id="s2"]');
  check(await page.evaluate(async url=>{const {state}=await import(url);return state.view==='device'&&state.detailDeviceId==='d4'&&state.model.selectedSessionId==='s2'},url),'Name stopped opening matching details');
  await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true});await page.click('.mobile-menu');
  check(await page.$eval(selector,e=>getComputedStyle(e.querySelector('.session-card__status-icon')).display==='none'&&getComputedStyle(e.querySelector('.session-card__transport-icon')).display!=='none'),'Touch transport hidden');
  results.push({appearance,hoverReplacesStatus:true,pauseResumeBound:true,routePreserved:true,keyboardFocus:true,nameOpensDevice:true,touchExposed:true});
 }
 await fs.writeFile(path.join(out,'browser.json'),JSON.stringify({passed:true,results},null,2)+'\n');log(JSON.stringify({passed:true,cases:results.length}));
};
