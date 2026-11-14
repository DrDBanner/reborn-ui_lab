module.exports=async({page,log})=>{
 const fs=require('node:fs/promises'),path=require('node:path'),out=path.resolve(__dirname,'../../project/licensing/evidence'),results=[];
 const check=(ok,msg)=>{if(!ok)throw new Error(msg)};
 const variant=page.url().includes('Standalone')?'standalone':'module';
 if(variant==='standalone'){await page.setOfflineMode(true);await page.reload({waitUntil:'load'});}
 await page.waitForSelector('.workspace');
 const click=async selector=>{await page.$eval(selector,e=>e.scrollIntoView({block:'center'}));await page.click(selector)};
 for(const width of [1440,390]){
  await page.setViewport({width,height:1000,deviceScaleFactor:1,isMobile:width<720,hasTouch:width<720});
  await click(width<720?'.mobile-brand':'.brand-trigger');await click('.app-menu [data-action="navigate"][data-value="help"]');
  check(await page.$eval('a[href="https://github.com/DrDBanner"]',e=>e.textContent==='Dr. D. Banner'),'Author reference');
  check(await page.$eval('.workspace',e=>e.textContent.includes('Jens Roggenfelder')),'STR attribution');
  check(await page.$eval('.license-notices',e=>!e.open),'Licences expanded by default');
  await click('.license-notices>summary');
  check(await page.$$eval('.license-document',els=>els.length===9),'Missing licence documents');
  await click('.license-document:nth-of-type(1)>summary');
  check(await page.$eval('.license-document pre',e=>e.textContent.includes('Apache License')),'Apache text unavailable');
  check(await page.$eval('.license-notices',e=>e.textContent.includes('SIL OPEN FONT LICENSE')&&e.textContent.includes('Copyright (c) 2016 The Inter Project Authors')),'Font licence unavailable');
  check(await page.$eval('.workspace',e=>e.scrollWidth<=e.clientWidth+1),'Legal text overflows');
  await page.screenshot({path:path.join(out,`licenses-${variant}-${width}.png`)});
  await click('.license-notices>summary');
  results.push({width,author:true,strCredit:true,documents:9,fullText:true,noOverflow:true});
 }
 await fs.writeFile(path.join(out,`browser-${variant}.json`),JSON.stringify({passed:true,variant,offline:variant==='standalone',results},null,2)+'\n');log(JSON.stringify({passed:true,variant,cases:results.length}));
};
