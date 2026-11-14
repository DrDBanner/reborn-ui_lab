// Targeted Webshot check for sidebar overview links and the radio toolbar.
module.exports=async({page,log})=>{
 const fs=require('node:fs/promises'),path=require('node:path');
 const out=path.resolve(__dirname,'../../project/item-functions/evidence'),results=[];
 const check=(condition,message)=>{if(!condition)throw new Error(message);};
 for(const [width,height] of [[1440,740],[834,900],[390,844],[320,740]]){
  await page.setViewport({width,height,deviceScaleFactor:1});
  await page.goto('http://127.0.0.1:5173',{waitUntil:'networkidle0'});
  await page.waitForSelector('.radio-toolbar');await page.evaluate(()=>document.fonts.ready);
  const radio=await page.evaluate(()=>{
   const toolbar=document.querySelector('.radio-toolbar'),filters=document.querySelector('[data-action="radio-filter"]');
   const headings=[...document.querySelectorAll('h1')].filter(element=>element.textContent.trim()==='Radio');
   return {radioHeadings:headings.length,filtersInToolbar:toolbar.contains(filters),overflow:document.querySelector('.workspace').scrollWidth>document.querySelector('.workspace').clientWidth+1};
  });
  check(radio.radioHeadings===1&&radio.filtersInToolbar&&!radio.overflow,'Radio toolbar layout failed at '+width);
  await page.screenshot({path:path.join(out,`radio-toolbar-${width}.png`)});
  await page.click('[data-action="radio-filter"]');await page.waitForSelector('#radio-country');
  await page.click('[data-action="radio-genre"][data-value="News"]');await page.click('[data-action="apply-radio-filter"]');
  check(await page.$$eval('.source-row',elements=>elements.every(element=>element.querySelector('.source-row__genre').textContent==='News')),'Radio filter did not apply');
  await page.click('[data-action="radio-filter"]');
  await page.click('[data-action="radio-genre"][data-value="All"]');
  await page.select('#radio-country','France');await page.select('#radio-language','French');
  check(await page.$$eval('.source-row__main strong',elements=>elements.length===1&&elements[0].textContent.includes('Paris Jazz')),'Country/language filter did not select Paris station');
  await page.select('#radio-bitrate','320');
  check(await page.$$eval('.source-row',elements=>elements.length===0),'Combined country/language/bitrate filters did not apply');
  await page.click('[data-action="reset-radio-filters"]');
  check(await page.$$eval('.source-row',elements=>elements.length===12),'Reset did not restore all stations');
  await page.click('[data-field="radio-working"]');
  check(!await page.$$eval('.source-row__main strong',elements=>elements.some(element=>element.textContent.includes('Offline station'))),'Working-only filter failed');
  await page.click('[data-field="radio-compatible"]');
  check(!await page.$$eval('.source-row__main strong',elements=>elements.some(element=>element.textContent.includes('Open Wave'))),'Output compatibility filter failed');
  check(await page.$$eval('.source-row__main strong',elements=>elements.some(element=>element.textContent.includes('London Live'))),'Compatible HLS station was hidden');
  await page.$eval('.radio-filter-panel',element=>element.scrollTop=0);
  await page.screenshot({path:path.join(out,`radio-full-filters-${width}.png`)});
  await page.click('[data-action="reset-radio-filters"]');await page.click('[data-action="apply-radio-filter"]');
  if(await page.$eval('.radio-pin',element=>element.getAttribute('aria-pressed')!=='true'))await page.click('.radio-pin');
  await page.$eval('.workspace',element=>element.scrollTop=250);
  const sticky=await page.evaluate(()=>({top:document.querySelector('.radio-controls').getBoundingClientRect().top,workspaceTop:document.querySelector('.workspace').getBoundingClientRect().top,paddingTop:parseFloat(getComputedStyle(document.querySelector('.workspace')).paddingTop),scroll:document.querySelector('.workspace').scrollTop}));
  check(sticky.scroll>0&&sticky.top>=sticky.workspaceTop-1&&sticky.top<=sticky.workspaceTop+sticky.paddingTop+1,'Pinned filters did not remain in the workspace header area: '+JSON.stringify(sticky));
  await page.$eval('.workspace',element=>element.scrollTop+=80);
  check(Math.abs(await page.$eval('.radio-controls',element=>element.getBoundingClientRect().top)-sticky.top)<2,'Pinned filters moved with the results');
  await page.screenshot({path:path.join(out,`radio-pinned-${width}.png`)});
  await page.reload({waitUntil:'networkidle0'});await page.waitForSelector('.radio-controls.is-pinned');
  check(await page.$eval('.radio-pin',element=>element.getAttribute('aria-pressed')==='true'),'Pin preference did not persist');
  await page.click('.radio-pin');
  const unpinned=await page.$eval('.radio-controls',element=>getComputedStyle(element).position);
  check(unpinned!=='sticky','Unpin failed');
  await page.$eval('.workspace',element=>element.scrollTop=0);
  if(width<=720){await page.click('.mobile-menu');await page.waitForSelector('.sidebar--open');}
  const sections=[];
  for(const [id,label] of [['playbacks','All playbacks'],['outputs','Manage all outputs']]){
   const selector=`[data-section="${id}"]`;
   if(await page.$eval(selector+' .section-chevron',element=>element.getAttribute('aria-expanded')==='true'))await page.click(selector+' .section-chevron');
   const info=await page.$eval(selector,(element)=>{
    const link=element.querySelector('.section-workspace-link'),chevron=element.querySelector('.section-chevron');
    const a=link.getBoundingClientRect(),b=chevron.getBoundingClientRect();
    return {label:link.getAttribute('aria-label'),beforeChevron:link.nextElementSibling===chevron&&a.right<=b.left+1,collapsed:chevron.getAttribute('aria-expanded')==='false',visible:a.width>0&&a.height>0};
   });
   check(info.label===label&&info.beforeChevron&&info.collapsed&&info.visible,'Section shortcut failed: '+id+' / '+width);
   sections.push(info);
  }
  await page.screenshot({path:path.join(out,`sidebar-overview-links-${width}.png`)});
  await page.click('[data-section="playbacks"] .section-workspace-link');
  await page.waitForSelector('.targets-grid');
  check(await page.$eval('.scope-filter',element=>element.getAttribute('aria-pressed')==='true'),'Playbacks should open active outputs');
  if(width<=720){await page.click('.mobile-menu');await page.waitForSelector('.sidebar--open');}
  await page.click('[data-section="outputs"] .section-workspace-link');await page.waitForSelector('.targets-grid');
  await page.click(width<=720?'.mobile-brand':'.brand-trigger');await page.waitForSelector('#app-menu');
  check(!await page.$('#app-menu [data-value="outputs"]'),'Duplicate output navigation in app menu');
  await page.screenshot({path:path.join(out,`logo-menu-clean-${width}.png`)});
  await page.keyboard.press('Escape');
  results.push({width,radio,fullFilters:true,sticky,unpinned,sections,overviewNavigation:true,logoMenuDuplicate:false});
 }
 await fs.writeFile(path.join(out,'navigation-smoke.json'),JSON.stringify({passed:true,results},null,2)+'\n');
 log(JSON.stringify({passed:true,widths:results.map(result=>result.width)}));
};
