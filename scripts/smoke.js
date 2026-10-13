'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(check,label){for(let i=0;i<80;i++){if(await check())return;await delay(50);}throw new Error('Timeout: '+label);}
const {videoFixture,checkFullscreen}=require('./fullscreen-checks');
const {checkBuiltins}=require('./builtins-checks');
async function run({app,browser,theme,desktopCapturer,profile,resolveAddress,HOME,builtins}){
  const output=process.env.CLASSIC_TEST_OUTPUT||path.join(app.getPath('temp'),'classic-browser-qa');fs.mkdirSync(output,{recursive:true});
  const timer=setTimeout(()=>{console.error('SMOKE TIMEOUT');app.exit(1);},120000);
  const errors=[];browser.win.webContents.on('console-message',(_e,_level,message)=>{if(/Uncaught|Failed to load resource/.test(message))errors.push(message);});
  const fixture=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');if(req.url==='/ad-test'){res.end('<title>AdGuard test</title><div class="classic-test-ad">Advertisement</div><div id="extended-ad">ClassicExtendedAd</div><script src="/blocked-test.js"></script>');return;}if(req.url==='/blocked-test.js'){res.setHeader('Content-Type','application/javascript');res.end('window.blockedScriptRan=true;');return;}if(req.url==='/video'){res.end(videoFixture());return;}if(req.url==='/embed'){res.end('<iframe allowfullscreen src="http://localhost:'+fixture.address().port+'/video"></iframe>');return;}if(req.url==='/next'){res.end('<html><title>Second page</title><body><h1>Second page</h1><a href="/">Back</a></body></html>');return;}res.end('<html><title>Navigation fixture</title><body><h1>Test website</h1><p>Find this sentence</p><a href="/next">Next page</a></body></html>');});
  try{
    await new Promise(resolve=>fixture.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+fixture.address().port;
    for(let i=0;i<60;i++){if(!browser.wc.isLoading()&&browser.wc.getTitle()==='Willkommen'&&!browser.win.webContents.isLoading())break;await delay(100);}
    await delay(500);browser.win.show();await delay(300);assert.equal(browser.wc.getTitle(),'Willkommen');assert.equal(theme.source,'Windows SystemColors / SystemFonts');
    assert.equal(browser.win.getTitle(),'Willkommen - Classic Browser');
    const frame=browser.win.getBounds(),content=browser.win.getContentBounds();assert.ok(frame.height>content.height,'Native non-client frame missing');
    const ui=await browser.win.webContents.executeJavaScript(`({fakeTitle:!!document.querySelector('header,.controls'),font:getComputedStyle(document.body).fontFamily,color:getComputedStyle(document.body).backgroundColor,images:[...document.images].every(i=>i.complete&&i.naturalWidth),viewport:document.querySelector('#viewport').getBoundingClientRect().toJSON()})`);
    assert.equal(ui.fakeTitle,false);assert.equal(ui.images,true);assert.ok(ui.viewport.height>100);assert.ok(ui.font.includes(theme.font.family));
    const capture=async name=>{if(process.env.CLASSIC_SKIP_CAPTURES==='1')return;await delay(400);const sources=await desktopCapturer.getSources({types:['window'],thumbnailSize:{width:1800,height:1200}});const source=sources.find(s=>s.id===browser.win.getMediaSourceId())||sources.find(s=>s.name===browser.win.getTitle());if(source&&!source.thumbnail.isEmpty())fs.writeFileSync(path.join(output,name+'.png'),source.thumbnail.toPNG());else {
      fs.writeFileSync(path.join(output,name+'-shell.png'),(await browser.win.webContents.capturePage()).toPNG());
      const script=path.join(__dirname,'capture-window.ps1').replace(/app\.asar([\\/])/,'app.asar.unpacked$1');
      if(fs.existsSync(script))await new Promise((resolve,reject)=>require('node:child_process').execFile('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',script,'-HandleValue',browser.win.getNativeWindowHandle().readBigUInt64LE().toString(),'-OutputPath',path.join(output,name+'.png')],{windowsHide:true,timeout:8000},error=>error?reject(error):resolve()));
    }
      const nativeScript=path.join(__dirname,'capture-window.ps1').replace(/app\.asar([\\/])/,'app.asar.unpacked$1');
      if(fs.existsSync(nativeScript))await new Promise((resolve,reject)=>require('node:child_process').execFile('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',nativeScript,'-HandleValue',browser.win.getNativeWindowHandle().readBigUInt64LE().toString(),'-OutputPath',path.join(output,name+'-native.png')],{windowsHide:true,timeout:8000},error=>error?reject(error):resolve()));
    };
    await capture('home');
    assert.equal(resolveAddress('localhost:8080',HOME),'http://localhost:8080');assert.equal(resolveAddress('javascript:alert(1)',HOME),null);assert.equal(resolveAddress('example.com',HOME),'https://example.com');
    await browser.wc.loadURL(base);assert.equal(browser.wc.getTitle(),'Navigation fixture');
    await browser.wc.loadURL(base+'/next');assert.equal(browser.wc.getTitle(),'Second page');assert.ok(browser.wc.navigationHistory.canGoBack());
    await browser.command('back');await delay(400);assert.equal(browser.wc.getTitle(),'Navigation fixture');assert.ok(browser.wc.navigationHistory.canGoForward());
    await browser.command('favorite');assert.ok(profile.data.favorites.some(f=>f.url===base+'/'));await browser.command('panel-favorites');await delay(200);
    const withPanel=browser.view.getBounds();assert.ok(withPanel.x>150);await capture('favorites');
    await browser.command('panel-close');await until(()=>browser.view.getBounds().x<10,'sidebar closes');
    const before=browser.view.getBounds();browser.win.setSize(800,600);await until(()=>browser.view.getBounds().width<before.width,'resized webpage');browser.win.setSize(1050,760);await delay(300);
    await browser.command('find');await delay(100);await browser.command('find-text',{text:'sentence'});await delay(200);assert.ok(await browser.win.webContents.executeJavaScript('!document.querySelector("#findbar").hidden'));await browser.command('find-close');
    browser.openOptions();await delay(600);const modal=require('electron').BrowserWindow.getAllWindows().find(w=>w!==browser.win);assert.ok(modal);assert.equal(modal.getTitle(),'Internetoptionen');assert.equal(await modal.webContents.executeJavaScript('document.querySelector("#home").value'),'about:home');modal.close();
    await checkFullscreen(browser,base);
    await checkBuiltins({builtins,browser,base,output,capture});
    await browser.wc.loadURL('https://example.com');assert.equal(browser.wc.getTitle(),'Example Domain');await delay(300);await capture('https');
    assert.equal(await browser.wc.executeJavaScript('typeof require'),'undefined');assert.equal(await browser.wc.executeJavaScript('typeof window.browser'),'undefined');
    await browser.command('remove-favorite',base+'/');profile.data.history=profile.data.history.filter(h=>!h.url.startsWith(base));profile.save();
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({result:'pass',theme,ui,frame,content,builtins:builtins.status(),checks:['native-frame','system-palette-font','spyglass-assets','startpage','address-resolution','http-https-navigation','back-forward','favorites','sidebar-layout','resize','find','options','web-sandbox','video-fullscreen','fullscreen-layout-restore','fullscreen-escape','fullscreen-f11','cross-origin-iframe-fullscreen','fullscreen-navigation-exit','wikipedia-redirect','reddit-redirect','youtube-redux-content-script','youtube-redux-settings','youtube-redux-disable','extension-stable-identity','adguard-network','adguard-cosmetic','adguard-scriptlets','adguard-extended-css','adguard-exceptions','builtin-settings-persistence','extras-settings-ui']},null,2));
    console.log('SMOKE OK: native frame, Windows theme, Spyglass assets, navigation, history, favorites, sidebar, resize, find, options, HTTPS, sandbox.');console.log('QA: '+output);
    clearTimeout(timer);fixture.close();app.exit(0);
  }catch(error){console.error(error);clearTimeout(timer);fixture.close();app.exit(1);}
}
module.exports={run};
