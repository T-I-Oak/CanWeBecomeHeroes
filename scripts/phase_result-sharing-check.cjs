const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({headless:true,channel:'chrome'});
 const page = await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'});
 const errors=[];
 page.on('pageerror', error => errors.push(error.message));
 await page.goto('http://127.0.0.1:5173/CanWeBecomeHeroes/tests/manual/result-sharing.html');
 await page.waitForFunction(()=>document.querySelector('#version').textContent==='v0.53.1');
 const results=[];
 for(const language of ['ja','en']) for(const type of ['certificate','failure-notice','challenge-notice']) {
  const result = await page.evaluate(async ({language,type})=>{
   const { default: Texts }= await import('/CanWeBecomeHeroes/src/game/GameTextRepository.js');
   const { sampleResult, refreshLanguage } = await import('/CanWeBecomeHeroes/tests/manual/result-sharing.js');
   const {createTrialResultShareImage} = await import('/CanWeBecomeHeroes/src/app/TrialResultShareImage.js');
   document.documentElement.lang=language;
   document.querySelector('#language').value=language;
   document.querySelector('#outcome').value=type;
   document.querySelector('#long-text').checked=true;
   await refreshLanguage();
   const texts=await new Texts().load();
   const snapshot=sampleResult();
   const before=JSON.stringify(snapshot);
   const blob=await createTrialResultShareImage(snapshot,texts,language);
   if(before!==JSON.stringify(snapshot)) throw new Error('snapshot mutated');
   const bitmap=await createImageBitmap(blob);
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))).join(',');
   window.testShare={snapshot,texts,language,hash};
   return {dimensions:[bitmap.width,bitmap.height],bytes:blob.size,hash,data:await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(blob)})};
  },{language,type});
  assert.deepEqual(result.dimensions,[1776,2680]);
  assert.ok(result.bytes>50000);
  fs.writeFileSync('tmp_result_'+language+'_'+type+'.png',Buffer.from(result.data,'base64'));
  const hash=result.hash;
  for(const viewport of [{width:390,height:844},{width:844,height:390}]) {
   await page.setViewportSize(viewport);
   const nextHash=await page.evaluate(async ()=>{
    const {createTrialResultShareImage}=await import('/CanWeBecomeHeroes/src/app/TrialResultShareImage.js');
    const {snapshot,texts,language}=window.testShare;
    const blob=await createTrialResultShareImage(snapshot,texts,language);
    return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))).join(',');
   });
   assert.equal(nextHash,hash,`${language} ${type} viewport independence`);
  }
  await page.setViewportSize({width:1280,height:900});
  results.push({language,type,dimensions:result.dimensions,bytes:result.bytes,viewportIndependent:true});
 }
 await page.selectOption('#language','ja');
 await page.selectOption('#outcome','certificate');
 await page.uncheck('#long-text');
 await page.click('#show-result');
 await page.waitForFunction(()=>!document.querySelector('.ShareButton')?.disabled);
 await page.waitForTimeout(500);
 await page.evaluate(()=>{
  Object.defineProperty(navigator,'userAgent',{configurable:true,value:'iPhone'});
  window.shareCalls=[];
  Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});
  Object.defineProperty(navigator,'share',{configurable:true,value:payload=>{window.shareCalls.push(payload);return new Promise(resolve=>{window.finishShare=resolve})}});
 });
 await page.evaluate(()=>{document.querySelector('.ShareButton').click();document.querySelector('.ShareButton').click()});
 await page.waitForFunction(()=>window.shareCalls.length===1);
 assert.equal(await page.locator('.ShareButton').isDisabled(),true);
 await page.evaluate(()=>window.finishShare());
 await page.waitForFunction(()=>!document.querySelector('.ShareButton').disabled);
 await page.click('.FlipButton');
 await page.waitForFunction(()=>document.querySelector('.state-score')&&!document.querySelector('.FlipButton').disabled);
 await page.evaluate(()=>document.querySelector('.ShareButton').click());
 await page.waitForFunction(()=>window.shareCalls.length===2);
 assert.equal(await page.evaluate(async()=>{
  const [a,b]=window.shareCalls;
  return (await a.files[0].text())===(await b.files[0].text()) && a.text===b.text;
 }),true);
 await page.evaluate(()=>window.finishShare());
 await page.waitForFunction(()=>!document.querySelector('.ShareButton').disabled);
 for(const viewport of [{width:390,height:844},{width:844,height:390}]){
  await page.setViewportSize(viewport);
  await page.waitForTimeout(100);
  const buttons=await page.locator('.ResultActions button').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,height:r.height}}));
  assert.ok(buttons.every(r=>r.x>=0&&r.y>=0&&r.right<=viewport.width&&r.bottom<=viewport.height&&r.height>=36));
  await page.screenshot({path:`tmp_result_controls_${viewport.width}.png`});
 }
 await page.evaluate(()=>{Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw new DOMException('cancel','AbortError')}})});
 await page.click('.ShareButton');
 await page.waitForFunction(()=>!document.querySelector('.ShareButton').disabled);
 assert.equal(await page.locator('.ResultShareStatus').textContent(),'');
 await page.evaluate(()=>{Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw new Error('simulated share failure')}})});
 await page.click('.ShareButton');
 await page.waitForFunction(()=>document.querySelector('.ResultShareStatus').textContent.includes('もう一度'));
 assert.equal(await page.locator('.ShareButton').isEnabled(),true);
 await page.evaluate(()=>{Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>false})});
 await page.click('.ShareButton');
 await page.waitForFunction(()=>document.querySelector('.ResultShareStatus').textContent.includes('もう一度'));
 await page.evaluate(()=>{
  Object.defineProperty(navigator,'userAgent',{configurable:true,value:'Windows NT 10.0'});
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{write:async items=>{window.copiedItems=items;window.copyCount=(window.copyCount||0)+1}}});
  Object.defineProperty(navigator,'share',{configurable:true,value:()=>{throw new Error('Desktop must not use native share')}});
  window.openedUrls=[];window.open=(...args)=>window.openedUrls.push(args);
 });
 await page.click('.ShareButton');
 await page.waitForSelector('.ResultShareConfirm[open]');
 assert.ok(await page.locator('.ResultShareConfirm').innerText().then(t=>t.includes('クリップボード')));
 assert.equal(await page.evaluate(async()=>(await window.copiedItems[0].getType('image/png')).type),'image/png');
 assert.equal(await page.locator('.ShareButton').isDisabled(),true);
 await page.screenshot({path:'tmp_result_pc_confirm.png'});
 await page.locator('.ResultShareConfirm button').last().click();
 assert.equal(await page.evaluate(()=>window.openedUrls.length),0);
 await page.click('.ShareButton');
 await page.waitForSelector('.ResultShareConfirm[open]');
 await page.locator('.ResultShareConfirm button').first().click();
 assert.equal(await page.evaluate(()=>window.openedUrls.length),1);
 assert.equal(await page.evaluate(()=>new URL(window.openedUrls[0][0]).searchParams.get('text')),await page.evaluate(()=>window.shareCalls[0].text));
 await page.click('.ShareButton');
 await page.waitForSelector('.ResultShareConfirm[open]');
 await page.keyboard.press('Escape');
 assert.equal(await page.locator('.ResultShareConfirm').count(),0);
 await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{write:async()=>{throw new Error('clipboard denied')}}})});
 await page.click('.ShareButton');
 await page.waitForFunction(()=>document.querySelector('.ResultShareStatus').textContent.includes('もう一度'));
 assert.equal(await page.locator('.ResultShareConfirm').count(),0);
 assert.equal(await page.evaluate(()=>window.openedUrls.length),1);
 await page.click('.ReturnButton');
 assert.equal(await page.locator('#trial-run-result').isHidden(),true);
 assert.deepEqual(errors,[]);
 await page.setViewportSize({width:1280,height:900});
 await page.click('#preview-image');
 await page.waitForFunction(()=>document.querySelector('#preview-status').textContent==='1776 × 2680 PNG');
 const sample = await page.locator('#share-preview').evaluate(async image=>{
  const response=await fetch(image.src); const blob=await response.blob();
  return await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(blob)});
 });
 fs.writeFileSync('tmp_result_share_sample.png',Buffer.from(sample,'base64'));
 console.log(JSON.stringify({images:results,interactions:'single share on double click, same image after flip, buttons fit portrait/landscape, cancel, mobile unsupported error, desktop PNG clipboard/confirm/X/close/Escape/failure, title return',errors},null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
