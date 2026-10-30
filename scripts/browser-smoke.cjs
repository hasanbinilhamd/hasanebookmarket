const {chromium} = require('playwright');
const assert = require('node:assert/strict');
require('node:fs').mkdirSync('.audit-local', {recursive:true});
const titles=['The Natural World','The Art of Thinking','The Celestial Atlas','The Human Story','The Language of Form','The Mathematical Mind'];
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
 for(const [name,viewport] of [['desktop',{width:1440,height:900}],['mobile',{width:390,height:844}]]) {
  const context=await browser.newContext({viewport,deviceScaleFactor:1,hasTouch:name==='mobile'});const p=await context.newPage();let errors=[];let consoleErrors=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
  await p.goto('http://localhost:5174/',{waitUntil:'networkidle'}); await p.waitForTimeout(2500);
  assert.equal(await p.locator('canvas').count(),1);assert.equal(await p.locator('.fallback').count(),0);
  await p.screenshot({path:`.audit-local/after-${name}.png`});
  const point=name==='desktop'?[335,470]:[85,420];
  if(name==='mobile')await p.touchscreen.tap(...point);else await p.mouse.click(...point);
  await p.locator('.detail.visible h2').waitFor({timeout:30000});assert.equal(await p.locator('.detail.visible h2').innerText(),titles[0]);await p.waitForTimeout(2000);
  await p.screenshot({path:`.audit-local/after-detail-${name}.png`});
  if(name==='desktop'){
    await p.mouse.move(270,450);await p.mouse.down();await p.mouse.move(360,470,{steps:8});await p.waitForTimeout(500);await p.screenshot({path:'.audit-local/drag-desktop.png'});await p.mouse.up();
  }else{
    const cdp=await context.newCDPSession(p);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:190,y:300}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:260,y:315}]});await p.waitForTimeout(500);await p.screenshot({path:'.audit-local/drag-mobile.png'});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  await p.getByRole('button',{name:'RESET VIEW'}).click();await p.waitForTimeout(1500);await p.screenshot({path:`.audit-local/reset-${name}.png`});
  await p.getByRole('button',{name:'BACK TO THE COLLECTION'}).click();assert.equal(await p.locator('.detail.visible').count(),0);await p.waitForTimeout(1500);
  if(name==='desktop'){
    for(let i=1;i<6;i++){await p.mouse.click(335+i*153,470);await p.locator('.detail.visible h2').waitFor({timeout:30000});assert.equal(await p.locator('.detail.visible h2').innerText(),titles[i]);await p.keyboard.press('Escape');await p.waitForTimeout(1200)}
  }else{await p.touchscreen.tap(195,420);await p.locator('.detail.visible h2').waitFor({timeout:30000});assert.equal(await p.locator('.detail.visible h2').innerText(),titles[1]);await p.keyboard.press('Escape')}
  console.log(name,'canvas, selection, drag gesture, reset, return: PASS; page errors:',JSON.stringify(errors),'console errors:',JSON.stringify(consoleErrors));assert.deepEqual(errors,[]);await context.close();
 }
 const fallback=await browser.newPage();
 await fallback.addInitScript(()=>{window.WebGLRenderingContext=undefined});
 await fallback.goto('http://localhost:5174/',{waitUntil:'networkidle'});
 assert.equal(await fallback.locator('.fallback').count(),1);
 assert.match(await fallback.locator('.fallback').innerText(),/doesn.t support WebGL/);
 assert.equal(await fallback.locator('.loading').count(),0);
 console.log('WebGL unsupported fallback: PASS'); await fallback.close();
 const page=await browser.newPage();
 for(const [path,title] of [['/book/natural-world','Book detail'],['/login','Login & registration'],['/checkout','Checkout'],['/my-library','My Library'],['/reader/123','Reader'],['/admin','Administration'],['/not-found','Page not found']]){await page.goto('http://localhost:5174'+path);assert.equal(await page.locator('h1').innerText(),title);if(path!=='/not-found')assert.match(await page.locator('.placeholder-content').innerText(),/not functional yet/)}
 console.log('7 direct routes and honest placeholders: PASS');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
