// Webshot-injected smoke check for the built app, plain preview and single file.
module.exports=async({page,log})=>{
 const fs=require('node:fs/promises');
 const path=require('node:path');
 const out=path.resolve(__dirname,'../../project/visual-audit/evidence');
 const url=new URL(page.url());
 const variant=url.pathname.includes('Standalone')?'standalone':url.pathname.includes('preview.html')?'plain-preview':'production';
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.waitForSelector('.workspace');
 if(await page.$eval('.mobile-menu',element=>getComputedStyle(element).display!=='none'))await page.click('.mobile-menu');
 await page.click('.sidebar [data-action="navigate"][data-value="outputs"]');
 await page.waitForSelector('.target-card');
 await page.click('.target-card [data-action="device-open"]');
 await page.waitForSelector('.key-values .device-status');
 const status=await page.$eval('.key-values .device-status',element=>{
  const rect=element.getBoundingClientRect();
  return {text:element.textContent.trim(),width:rect.width,scrollWidth:element.scrollWidth};
 });
 if(status.width<status.scrollWidth-1)throw new Error('Status clipped in '+variant);
 await page.click('[data-action="device-tab"][data-value="network"]');
 await page.click('[data-action="wifi-change"]');
 await page.waitForSelector('[role="dialog"]');
 await page.keyboard.press('Escape');
 const icons=await page.$$eval('.material-symbols-rounded',elements=>({total:elements.length,missing:elements.filter(element=>!element.querySelector('svg path')).length}));
 if(!icons.total||icons.missing||errors.length)throw new Error('Smoke check failed for '+variant);
 if(variant==='standalone'){
  await page.setOfflineMode(true);
  await page.reload({waitUntil:'load'});
  await page.waitForSelector('.workspace');
  if(!await page.$('.material-symbols-rounded svg path'))throw new Error('Standalone icons unavailable offline');
 }
 await page.screenshot({path:path.join(out,`after-${variant}-smoke.png`)});
 const result={variant,url:page.url(),status,icons,pageErrors:errors,offlineReload:variant==='standalone',passed:true};
 await fs.writeFile(path.join(out,`${variant}-smoke.json`),JSON.stringify(result,null,2)+'\n');
 log(JSON.stringify(result));
};
