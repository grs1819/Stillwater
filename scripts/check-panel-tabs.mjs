import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{for(const [width,height,touch] of [[1280,850,false],[390,844,true],[320,568,true],[844,390,true]]){
 const page=await browser.newPage({viewport:{width,height},isMobile:touch,hasTouch:touch});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/app.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+'\nrenderer.setAnimationLoop(null);renderer.render(scene,camera);window.menuReady=true;'});});
 await page.goto(process.env.STILLWATER_URL||'http://localhost:5214');await page.waitForFunction(()=>window.menuReady);console.log('Ready',width);
 const tab=name=>page.locator(`button[data-panel=${name}]`);
 await tab('build').click();await page.locator('#appearance-toggle').click();await page.locator('[data-design=woodland]').click();assert.equal(await page.locator('#cabin-design').inputValue(),'woodland');
 await tab('skills').click();assert.equal(await page.locator('.palette').isVisible(),false);assert.equal(await page.locator('.skill-card').count(),4);
 await tab('settlement').click();assert.equal(await page.locator('#skills-panel').isVisible(),false);assert.equal(await page.locator('#business-overview').isVisible(),true);
 await tab('settlement').click();assert.equal(await page.locator('.dock').getAttribute('data-open'),'false');
 await tab('build').click();assert.equal(await page.locator('.palette').isVisible(),true);await page.keyboard.press('Escape');assert.equal(await page.locator('.dock').getAttribute('data-open'),'false');
 await tab('skills').click();await page.waitForTimeout(400);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 for(const sel of ['.village-tabs','.dock-panel']){const r=await page.locator(sel).boundingBox();assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=width+1&&r.y+r.height<=height+1,`${sel} ${JSON.stringify(r)}`);}
 await page.screenshot({path:`/tmp/menu-${width}.png`});assert.deepEqual(errors,[]);console.log(`PASS tabs, design selection, panel exclusion, keyboard, bounds ${width}x${height}`);await page.close();
}}finally{await browser.close();}
