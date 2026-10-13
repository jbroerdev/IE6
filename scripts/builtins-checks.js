'use strict';
const assert = require('node:assert/strict');
const { net, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { redirectSite } = require('../lib/site-adapters');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check, label) { for(let i=0;i<80;i++){if(await check())return;await delay(50);}throw new Error('Timeout: '+label); }
async function checkBuiltins({ builtins, browser, base, output, capture }) {
  assert.ok(builtins.youtubeExtension, 'YouTube Redux must actually load');
  const key=JSON.parse(fs.readFileSync(path.join(__dirname,'../vendor/youtube-redux/manifest.json'),'utf8')).key;
  const expectedId=require('node:crypto').createHash('sha256').update(Buffer.from(key,'base64')).digest('hex').slice(0,32).replace(/[0-9a-f]/g,char=>String.fromCharCode(97+parseInt(char,16)));
  assert.equal(builtins.youtubeExtension.id,expectedId,'Extension identity must survive portable extraction paths');
  const original = structuredClone(builtins.settings);
  assert.equal(redirectSite('https://de.wikipedia.org/wiki/Browser?x=1#Test',original),'https://de.wikipedia.org/wiki/Browser?x=1&useskin=vector#Test');
  assert.equal(redirectSite('https://de.wikipedia.org.evil.example/wiki/Browser',original),null);
  assert.equal(redirectSite('https://www.reddit.com/r/test/?tl=de',original),'https://old.reddit.com/r/test/');
  assert.equal(redirectSite('https://old.reddit.com/r/test/',original),null);
  assert.ok(builtins.shouldBlock('https://googleads.g.doubleclick.net/pagead/ads','https://example.org','script'),'Official AdGuard filter must block known ad request');
  const settings = structuredClone(original);
  settings.adguard.rules = '/blocked-test.js$script,domain=127.0.0.1\n127.0.0.1##.classic-test-ad\n127.0.0.1#%#//scriptlet("set-constant", "classicAdTest", "false")\n127.0.0.1#?#div:contains(ClassicExtendedAd)';
  await builtins.save(settings);
  await browser.wc.loadURL(base+'/ad-test');
  await until(()=>browser.wc.executeJavaScript('window.classicAdTest === false'),'AdGuard scriptlet');
  assert.equal(await browser.wc.executeJavaScript('window.blockedScriptRan === true'),false,'Network ad request should not execute');
  assert.equal(await browser.wc.executeJavaScript('getComputedStyle(document.querySelector(".classic-test-ad")).display'),'none','Cosmetic filter');
  await until(()=>browser.wc.executeJavaScript('getComputedStyle(document.querySelector("#extended-ad")).display === "none"'),'Extended CSS filter');
  settings.adguard.exceptions='127.0.0.1';await builtins.save(settings);await browser.wc.loadURL(base+'/ad-test');
  assert.equal(await browser.wc.executeJavaScript('window.blockedScriptRan'),true,'Site exception should allow request');
  assert.notEqual(await browser.wc.executeJavaScript('getComputedStyle(document.querySelector(".classic-test-ad")).display'),'none');
  await builtins.save(original);
  const sess=browser.wc.session;
  await sess.protocol.handle('https',request=>{
    const url=new URL(request.url);
    if(url.hostname.endsWith('.wikipedia.org'))return new Response('<title>Wikipedia fixture</title><body>Wikipedia skin: '+url.searchParams.get('useskin')+'</body>',{headers:{'Content-Type':'text/html'}});
    if(url.hostname.endsWith('.reddit.com')||url.hostname==='reddit.com')return new Response('<title>Reddit fixture</title><body><div class="cookie-infobar">Cookie banner</div>Old Reddit</body>',{headers:{'Content-Type':'text/html'}});
    if(url.hostname==='www.youtube.com')return new Response('<!doctype html><title>YouTube fixture</title><link rel="shortcut icon" href="data:,"/><ytd-app><ytd-page-manager><ytd-browse><div id="primary"><ytd-rich-grid-renderer><div id="contents"></div></ytd-rich-grid-renderer></div></ytd-browse></ytd-page-manager></ytd-app>',{headers:{'Content-Type':'text/html'}});
    return net.fetch(request,{bypassCustomProtocolHandlers:true});
  });
  try {
    await browser.wc.loadURL('https://de.wikipedia.org/wiki/Browser');assert.ok(browser.wc.getURL().includes('useskin=vector'));assert.equal(builtins.visibleUrl(browser.wc.getURL()),'https://de.wikipedia.org/wiki/Browser');
    await browser.wc.loadURL('https://www.reddit.com/r/test');assert.equal(new URL(browser.wc.getURL()).hostname,'old.reddit.com');assert.equal(await browser.wc.executeJavaScript('getComputedStyle(document.querySelector(".cookie-infobar")).display'),'none');
    await browser.wc.loadURL('https://www.youtube.com/');await until(()=>browser.wc.executeJavaScript('!!document.querySelector("#redux-style")'),'Original YouTube Redux content script');
    assert.ok(await browser.wc.executeJavaScript('document.querySelector("#redux-style").textContent.includes("--ytd-rich-grid-items-per-row: 6")'));
    const changed=structuredClone(original);changed.youtube.settings.gridItems=3;changed.wikipedia.skin='monobook';changed.wikipedia.exclude='fr';await builtins.save(changed);
    await browser.wc.reload();await until(()=>browser.wc.executeJavaScript('document.querySelector("#redux-style")?.textContent.includes("--ytd-rich-grid-items-per-row: 3")'),'YouTube Redux setting applied');
    assert.equal(redirectSite('https://fr.wikipedia.org/wiki/Test',builtins.settings),null);
    const saved=JSON.parse(fs.readFileSync(builtins.profile.path,'utf8'));assert.equal(saved.builtins.wikipedia.skin,'monobook');assert.equal(saved.builtins.youtube.settings.gridItems,'3');
    changed.youtube.enabled=false;await builtins.save(changed);assert.equal(builtins.youtubeExtension,null);await browser.wc.loadURL('https://www.youtube.com/');assert.equal(await browser.wc.executeJavaScript('!!document.querySelector("#redux-style")'),false);
    await builtins.save(original);
  } finally { await sess.protocol.unhandle('https'); }
  browser.openIntegrations('adguard');const modal=BrowserWindow.getAllWindows().find(win=>win!==browser.win);assert.ok(modal);
  await until(()=>modal.webContents.executeJavaScript('!!document.querySelector("#filter-status").textContent'),'Extras settings populated');
  assert.ok(await modal.webContents.executeJavaScript('!document.querySelector("[data-section=adguard]").hidden'));
  if(process.env.CLASSIC_SKIP_CAPTURES!=='1')fs.writeFileSync(path.join(output,'extras-settings.png'),(await modal.webContents.capturePage()).toPNG());
  await modal.webContents.executeJavaScript('document.querySelector("[data-tab=youtube]").click()');await delay(150);
  assert.ok(await modal.webContents.executeJavaScript('document.querySelectorAll("[data-setting]").length>70'));
  assert.ok(await modal.webContents.executeJavaScript('[...document.querySelector("#yt-classicLogoChoice").options].some(option=>option.value==="2005alt")'));
  if(process.env.CLASSIC_SKIP_CAPTURES!=='1')fs.writeFileSync(path.join(output,'youtube-settings.png'),(await modal.webContents.capturePage()).toPNG());modal.close();
  await browser.wc.loadURL(base);await capture('builtins-browser');
  console.log('BUILTINS OK: Wikipedia/Reddit navigation, YouTube Redux actual content scripts/settings/disable, AdGuard network/cosmetic/scriptlet/Extended CSS/exceptions, persistence, Extras UI.');
}
module.exports={checkBuiltins};
