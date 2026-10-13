'use strict';
const {app,BrowserWindow,WebContentsView,Menu,ipcMain,dialog,shell,clipboard,desktopCapturer,session:electronSession}=require('electron');
const path=require('node:path'),fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const {readSystemTheme}=require('./lib/system-theme');
const {resolveAddress,allowedNavigation}=require('./lib/navigation');
const {Profile}=require('./lib/profile');
const {classicScrollbars}=require('./lib/scrollbars');
const {Builtins}=require('./lib/builtins');
if(process.env.CLASSIC_SMOKE==='1'){
  const testProfile=fs.mkdtempSync(path.join(app.getPath('temp'),'classic-browser-test-'));
  app.setPath('userData',testProfile);app.setPath('sessionData',testProfile);
}
const HOME=pathToFileURL(path.join(__dirname,'ui/home.html')).href;
const windows=new Map(),options=new Map(),integrationWindows=new Map();let profile,theme,builtins;
const load=(wc,url)=>wc.loadURL(url).catch(()=>{});
const broadcast=()=>{for(const b of windows.values())b.publish();};
class Browser{
  constructor(url){
    // Windows owns the real caption, system buttons and resize borders.
    this.win=new BrowserWindow({width:1050,height:760,minWidth:600,minHeight:360,frame:true,titleBarStyle:'default',show:false,icon:path.join(__dirname,'ui/assets/browser.ico'),backgroundColor:theme.colors.face,webPreferences:{preload:path.join(__dirname,'preload.js'),sandbox:true,contextIsolation:true,nodeIntegration:false}});
    this.id=this.win.webContents.id;this.view=new WebContentsView({webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,partition:'persist:browsing',disableHtmlFullscreenWindowResize:true}});this.wc=this.view.webContents;
    this.status='Fertig';this.failure=null;this.panel='';this.findOpen=false;this.htmlFullscreen=false;this.visibility={toolbar:true,address:true,links:true,status:true};
    windows.set(this.id,this);this.win.contentView.addChildView(this.view);this.wire();this.rebuildMenu();
    this.win.loadFile('ui/index.html');this.win.once('ready-to-show',()=>this.win.show());load(this.wc,url||this.home());
  }
  home(){return profile.data.settings.home||HOME;}
  wire(){
    const {wc,win}=this;
    win.webContents.on('did-finish-load',()=>this.publish());win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());
    win.on('closed',()=>{windows.delete(this.id);if(!wc.isDestroyed())wc.close();});win.on('resize',()=>{if(this.htmlFullscreen)this.fullscreenBounds();else win.webContents.send('layout');});
    win.on('enter-full-screen',()=>{if(this.htmlFullscreen)this.fullscreenBounds();});
    win.on('leave-full-screen',()=>{if(this.htmlFullscreen)this.exitHtmlFullscreen();});
    wc.on('enter-html-full-screen',()=>{
      this.fullscreenRestore={fullscreen:win.isFullScreen(),menuVisible:win.isMenuBarVisible()};
      this.htmlFullscreen=true;win.setMenuBarVisibility(false);win.setFullScreen(true);this.fullscreenBounds();wc.focus();
    });
    wc.on('leave-html-full-screen',()=>{
      if(!this.htmlFullscreen)return;this.htmlFullscreen=false;
      const restore=this.fullscreenRestore;this.fullscreenRestore=null;
      win.setFullScreen(restore.fullscreen);win.setMenuBarVisibility(restore.menuVisible);
      if(this.normalBounds)this.bounds(this.normalBounds);win.webContents.send('layout');
    });
    for(const message of [0x031a,0x0015,0x001a])win.hookWindowMessage(message,refreshTheme);
    wc.on('did-start-loading',()=>{this.failure=null;this.status='Verbindung wird hergestellt…';this.publish();});
    wc.on('did-stop-loading',()=>{this.status=this.failure?'Fehler beim Laden der Seite':'Fertig';this.publish();});
    wc.on('page-title-updated',()=>this.publish());
    for(const event of ['did-navigate','did-navigate-in-page'])wc.on(event,()=>{this.publish();this.rebuildMenu();});
    wc.on('did-finish-load',()=>{wc.insertCSS(classicScrollbars(theme),{cssOrigin:'user'}).catch(()=>{});if(/^https?:/.test(wc.getURL()))profile.visit({url:wc.getURL(),title:wc.getTitle()||wc.getURL()});broadcast();this.rebuildMenu();});
    wc.on('did-fail-load',(_e,code,description,url,main)=>{if(main&&code!==-3){this.failure={url,description};this.publish();}});
    wc.on('update-target-url',(_e,url)=>{this.status=url||(wc.isLoading()?'Seite wird geladen…':'Fertig');this.publish();});
    wc.on('found-in-page',(_e,result)=>win.webContents.send('find-result',result));
    wc.on('will-navigate',(e,url)=>{if(!allowedNavigation(url,HOME))e.preventDefault();});
    wc.setWindowOpenHandler(({url})=>{if(allowedNavigation(url,HOME))new Browser(url);return{action:'deny'};});
    wc.on('context-menu',(_e,p)=>this.contextMenu(p));
    wc.on('before-input-event',(event,input)=>{
      if(input.type!=='keyDown')return;const key=input.key.toLowerCase();let action;
      // Let Chromium handle Esc so the Fullscreen API and embedded players exit together.
      if(key==='escape'&&this.htmlFullscreen)return;
      if((input.control&&['l','o'].includes(key))||(input.alt&&key==='d'))action='address';
      else if(input.alt&&key==='arrowleft')action='back';else if(input.alt&&key==='arrowright')action='forward';else if(input.alt&&key==='home')action='home';
      else if(key==='f5'||(input.control&&key==='r'))action='reload';else if(key==='escape')action='stop';else if(key==='f11')action='fullscreen';
      else if(input.control)action=({n:'new',f:'find',d:'favorite',p:'print',s:'save',i:'panel-favorites',h:'panel-history',j:'panel-downloads'})[key];
      if(action){event.preventDefault();this.command(action);}
    });
  }
  publish(){
    if(this.win.isDestroyed()||this.wc.isDestroyed())return;
    const title=(this.wc.getTitle()||'Classic Browser')+' - Classic Browser';this.win.setTitle(title);
    this.win.webContents.send('state',{title,url:this.wc.getURL()===HOME?'about:home':builtins.visibleUrl(this.wc.getURL()),loading:this.wc.isLoading(),back:this.wc.navigationHistory.canGoBack(),forward:this.wc.navigationHistory.canGoForward(),status:this.status,failure:this.failure,theme,panel:this.panel,findOpen:this.findOpen,visibility:this.visibility,settings:profile.data.settings,favorites:profile.data.favorites,history:profile.data.history,downloads:profile.data.downloads});
  }
  bounds(r){
    if(!r||!['x','y','width','height'].every(k=>Number.isFinite(r[k])))return;
    this.normalBounds=r;if(this.htmlFullscreen){this.fullscreenBounds();return;}
    const[w,h]=this.win.getContentSize(),x=Math.max(0,Math.min(w,Math.round(r.x))),y=Math.max(0,Math.min(h,Math.round(r.y)));
    this.view.setBounds({x,y,width:Math.max(0,Math.min(w-x,Math.round(r.width))),height:Math.max(0,Math.min(h-y,Math.round(r.height)))});this.view.setVisible(!this.failure);
  }
  fullscreenBounds(){const[width,height]=this.win.getContentSize();this.view.setBounds({x:0,y:0,width,height});}
  exitHtmlFullscreen(){return this.wc.executeJavaScript('document.fullscreenElement ? document.exitFullscreen() : undefined').catch(()=>{});}
  item(label,action,accelerator,extra={}){return{label,accelerator,click:()=>this.command(action),...extra};}
  rebuildMenu(){
    if(this.win.isDestroyed())return;const item=(...a)=>this.item(...a),sep={type:'separator'};
    this.win.setMenu(Menu.buildFromTemplate([
      {label:'&Datei',submenu:[item('&Neues Fenster','new','Ctrl+N'),item('Ö&ffnen…','address','Ctrl+O'),sep,item('Speichern &unter…','save','Ctrl+S'),item('&Drucken…','print','Ctrl+P'),sep,item('&Schließen','close','Alt+F4')]},
      {label:'&Bearbeiten',submenu:[item('&Ausschneiden','cut','Ctrl+X'),item('&Kopieren','copy','Ctrl+C'),item('&Einfügen','paste','Ctrl+V'),sep,item('Alles &markieren','selectAll','Ctrl+A'),item('&Suchen (aktuelle Seite)…','find','Ctrl+F')]},
      {label:'&Ansicht',submenu:[{label:'&Symbolleisten',submenu:[['toolbar','Standard-Schaltflächen'],['address','Adressleiste'],['links','Links']].map(([key,label])=>({label,type:'checkbox',checked:this.visibility[key],click:()=>this.toggleBar(key)}))},{label:'&Statusleiste',type:'checkbox',checked:this.visibility.status,click:()=>this.toggleBar('status')},{label:'E&xplorer-Leiste',submenu:[item('S&uchen','panel-search'),item('&Favoriten','panel-favorites','Ctrl+I'),item('&Verlauf','panel-history','Ctrl+H'),item('&Downloads','panel-downloads','Ctrl+J')]},sep,item('&Abbrechen','stop'),item('A&ktualisieren','reload','F5'),sep,item('&Vergrößern','zoomIn','Ctrl+Plus'),item('Ver&kleinern','zoomOut','Ctrl+-'),item('Originalgröße','zoomReset','Ctrl+0'),sep,item('&Vollbild','fullscreen','F11')]},
      {label:'&Favoriten',submenu:[item('Zu Favoriten &hinzufügen…','favorite','Ctrl+D'),item('Favoriten &verwalten','panel-favorites'),sep,...profile.data.favorites.map(f=>({label:f.title.replace(/&/g,'&&'),click:()=>load(this.wc,f.url)}))]},
      {label:'E&xtras',submenu:[item('Zur &Startseite','home','Alt+Home'),item('Im Web &suchen','panel-search'),sep,item('Legacy &Wikipedia…','builtin-wikipedia'),item('Old &Reddit Redirect…','builtin-reddit'),item('&YouTube Redux…','builtin-youtube'),item('&Werbeblocker (AdGuard-Engine)…','builtin-adguard'),sep,item('Internet&optionen…','options')]},
      {label:'&?',submenu:[item('&Info über Classic Browser','about')]}
    ]));
    if(this.htmlFullscreen){this.win.setMenuBarVisibility(false);this.fullscreenBounds();}
  }
  toggleBar(key){this.visibility[key]=!this.visibility[key];this.publish();this.rebuildMenu();}
  contextMenu(p){
    const items=[];
    if(/^https?:/.test(p.linkURL))items.push({label:'In neuem Fenster öffnen',click:()=>new Browser(p.linkURL)},{label:'Verknüpfung kopieren',click:()=>clipboard.writeText(p.linkURL)},{type:'separator'});
    if(p.isEditable)items.push(this.item('Ausschneiden','cut'),this.item('Kopieren','copy'),this.item('Einfügen','paste'),{type:'separator'});else if(p.selectionText)items.push(this.item('Kopieren','copy'),{type:'separator'});
    items.push(this.item('Zurück','back',undefined,{enabled:this.wc.navigationHistory.canGoBack()}),this.item('Vorwärts','forward',undefined,{enabled:this.wc.navigationHistory.canGoForward()}),this.item('Aktualisieren','reload'),{type:'separator'},this.item('Zu Favoriten hinzufügen…','favorite'),this.item('Drucken…','print'));Menu.buildFromTemplate(items).popup({window:this.win});
  }
  async command(action,value){
    const {wc,win}=this;
    try{
      if(action.startsWith('builtin-')){this.openIntegrations(action.slice(8));return;}
      if(action.startsWith('panel-')&&action!=='panel-close'){const p=action.slice(6);if(['search','favorites','history','downloads'].includes(p))this.panel=this.panel===p?'':p;this.publish();return;}
      switch(action){
        case'navigate':{const url=resolveAddress(value,HOME);if(url)load(wc,url);wc.focus();break;}
        case'address':if(!this.visibility.address){this.visibility.address=true;this.publish();this.rebuildMenu();}win.webContents.focus();win.webContents.send('focus-address');break;
        case'back':if(wc.navigationHistory.canGoBack())wc.navigationHistory.goBack();break;
        case'forward':if(wc.navigationHistory.canGoForward())wc.navigationHistory.goForward();break;
        case'stop':wc.stop();break;case'reload':load(wc,wc.getURL()||this.home());break;case'home':load(wc,this.home());break;
        case'new':new Browser();break;case'close':win.close();break;case'panel-close':this.panel='';this.publish();break;
        case'fullscreen':
          if(this.htmlFullscreen){
            this.fullscreenRestore.fullscreen=false;
            if(this.browserFullscreenMenu!==undefined)this.fullscreenRestore.menuVisible=this.browserFullscreenMenu;
            this.browserFullscreenMenu=undefined;await this.exitHtmlFullscreen();
          }else if(win.isFullScreen()){
            win.setFullScreen(false);
            if(this.browserFullscreenMenu!==undefined){win.setMenuBarVisibility(this.browserFullscreenMenu);this.browserFullscreenMenu=undefined;}
          }else{this.browserFullscreenMenu=win.isMenuBarVisible();win.setFullScreen(true);}
          break;
        case'print':wc.print();break;
        case'cut':case'copy':case'paste':case'selectAll':(win.webContents.isFocused()?win.webContents:wc)[action]();break;
        case'zoomIn':wc.setZoomLevel(Math.min(5,wc.getZoomLevel()+.5));break;case'zoomOut':wc.setZoomLevel(Math.max(-4,wc.getZoomLevel()-.5));break;case'zoomReset':wc.setZoomLevel(0);break;
        case'favorite':if(/^https?:/.test(wc.getURL())){profile.favorite({title:wc.getTitle()||wc.getURL(),url:wc.getURL()});broadcast();for(const b of windows.values())b.rebuildMenu();}else await dialog.showMessageBox(win,{title:'Favoriten',message:'Öffnen Sie zuerst eine Internetseite, die Sie speichern möchten.'});break;
        case'remove-favorite':profile.removeFavorite(String(value));broadcast();for(const b of windows.values())b.rebuildMenu();break;
        case'clear-history':{const r=await dialog.showMessageBox(win,{type:'question',title:'Verlauf löschen',message:'Möchten Sie den gesamten Verlauf löschen?',buttons:['Abbrechen','Löschen'],defaultId:0,cancelId:0});if(r.response===1){profile.data.history=[];profile.save();broadcast();}break;}
        case'save':{const r=await dialog.showSaveDialog(win,{defaultPath:'Webseite.html',filters:[{name:'Webseite, vollständig',extensions:['html']}]});if(!r.canceled)await wc.savePage(r.filePath,'HTMLComplete');break;}
        case'find':this.findOpen=true;this.publish();win.webContents.focus();win.webContents.send('focus-find');break;
        case'find-text':if(value&&typeof value.text==='string'&&value.text)wc.findInPage(value.text,{forward:value.forward!==false,findNext:!!value.next});else wc.stopFindInPage('clearSelection');break;
        case'find-close':wc.stopFindInPage('clearSelection');this.findOpen=false;this.publish();wc.focus();break;
        case'navigation-menu':this.navigationMenu(value);break;
        case'options':this.openOptions();break;
        case'open-download':{const d=profile.data.downloads.find(d=>d.id===value);if(d?.state==='completed'&&d.path)shell.showItemInFolder(d.path);break;}
        case'about':dialog.showMessageBox(win,{title:'Info über Classic Browser',message:'Classic Browser '+app.getVersion(),detail:`Native Windows-Titelleiste\nOberfläche und Bitmap-Grafiken basieren auf Spyglass / MSFX von echelon-theme.\n\nChromium ${process.versions.chrome}\nElectron ${process.versions.electron}\n\nhttps://github.com/echelon-theme/spyglass`});break;
      }
    }catch(error){if(!win.isDestroyed())dialog.showMessageBox(win,{type:'error',title:'Classic Browser',message:'Der Vorgang konnte nicht abgeschlossen werden.',detail:error.message});}
  }
  navigationMenu(value){
    if(!value||!['back','forward','address'].includes(value.kind))return;const h=this.wc.navigationHistory;let items;
    if(value.kind==='address')items=profile.data.history.slice(0,20).map(e=>({label:e.url,click:()=>load(this.wc,e.url)}));
    else{const index=h.getActiveIndex();let entries=h.getAllEntries().map((e,i)=>({...e,index:i})).filter(e=>value.kind==='back'?e.index<index:e.index>index);if(value.kind==='back')entries.reverse();items=entries.slice(0,15).map(e=>({label:e.title||e.url,click:()=>h.goToIndex(e.index)}));}
    if(!items.length)items=[{label:'Keine Einträge',enabled:false}];Menu.buildFromTemplate(items).popup({window:this.win,x:Math.max(0,Math.round(value.x||0)),y:Math.max(0,Math.round(value.y||0))});
  }
  openOptions(){
    const old=options.get(this.id);if(old&&!old.isDestroyed()){old.focus();return;}
    const win=new BrowserWindow({parent:this.win,modal:true,width:440,height:370,resizable:false,minimizable:false,maximizable:false,title:'Internetoptionen',icon:path.join(__dirname,'ui/assets/browser.ico'),backgroundColor:theme.colors.face,webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
    win.setMenu(null);options.set(this.id,win);win.loadFile('ui/options.html');win.webContents.on('did-finish-load',()=>win.webContents.send('options-state',{settings:profile.data.settings,current:/^https?:/.test(this.wc.getURL())?this.wc.getURL():'',theme}));win.on('closed',()=>options.delete(this.id));
  }
  openIntegrations(section){
    if(!['wikipedia','reddit','youtube','adguard'].includes(section))return;
    const existing=integrationWindows.get(this.id);
    if(existing&&!existing.isDestroyed()){existing.focus();existing.webContents.send('integrations-state',{settings:builtins.settings,status:builtins.status(),theme,section});return;}
    const win=new BrowserWindow({parent:this.win,width:650,height:680,minWidth:520,minHeight:480,title:'Extras – Webseiten und Werbefilter',icon:path.join(__dirname,'ui/assets/browser.ico'),backgroundColor:theme.colors.face,webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
    win.setMenu(null);integrationWindows.set(this.id,win);win.loadFile('ui/integrations.html');
    win.webContents.on('did-finish-load',()=>win.webContents.send('integrations-state',{settings:builtins.settings,status:builtins.status(),theme,section}));
    win.on('closed',()=>integrationWindows.delete(this.id));
  }
}
let themeTimer;function refreshTheme(){clearTimeout(themeTimer);themeTimer=setTimeout(async()=>{theme=await readSystemTheme();broadcast();},200);}
ipcMain.on('bounds',(event,rect)=>windows.get(event.sender.id)?.bounds(rect));
ipcMain.on('content-bootstrap',(event,url)=>{
  if(![...windows.values()].some(browser=>browser.wc===event.sender)){event.returnValue=null;return;}
  try{event.returnValue=builtins.bootstrap(String(url),event.senderFrame?.parent?.url||String(url));}catch{event.returnValue=null;}
});
ipcMain.handle('command',(event,name,value)=>{if(typeof name==='string')return windows.get(event.sender.id)?.command(name,value);});
ipcMain.handle('options-save',(event,value)=>{
  const win=[...options.values()].find(w=>w.webContents.id===event.sender.id);if(!win)return;
  const home=value.home==='about:home'?'':resolveAddress(value.home,HOME);if(value.home&&!home&&value.home!=='about:home')return{error:'Bitte geben Sie eine gültige Webadresse ein.'};
  profile.data.settings={home:home||'',largeIcons:!!value.largeIcons,labels:!!value.labels};profile.save();broadcast();win.close();return{};
});
ipcMain.handle('options-close',event=>[...options.values()].find(w=>w.webContents.id===event.sender.id)?.close());
const integrationWindow=event=>[...integrationWindows.values()].find(w=>w.webContents.id===event.sender.id);
ipcMain.handle('integrations-save',async(event,value)=>{if(!integrationWindow(event))return;try{await builtins.save(value);broadcast();return{status:builtins.status()};}catch(error){return{error:error.message};}});
ipcMain.handle('integrations-update',async event=>{if(!integrationWindow(event))return;try{return{status:await builtins.updateFilters()};}catch(error){return{error:error.message};}});
ipcMain.handle('integrations-close',event=>integrationWindow(event)?.close());
app.whenReady().then(async()=>{
  theme=await readSystemTheme();profile=new Profile(app.getPath('userData'));
  builtins=new Builtins(electronSession.fromPartition('persist:browsing'),profile);await builtins.start();
  Menu.setApplicationMenu(null);const browser=new Browser();
  const session=browser.wc.session;
  const allowFullscreen=(wc,permission)=>permission==='fullscreen'&&[...windows.values()].some(b=>b.wc===wc);
  session.setPermissionRequestHandler((wc,permission,callback)=>callback(allowFullscreen(wc,permission)));
  session.setPermissionCheckHandler(allowFullscreen);
  session.on('will-download',(_event,item,wc)=>{
    const owner=[...windows.values()].find(b=>b.wc===wc),entry={id:require('node:crypto').randomUUID(),name:item.getFilename(),state:'progressing',received:0,total:item.getTotalBytes(),path:''};
    profile.data.downloads.unshift(entry);if(owner){owner.panel='downloads';owner.publish();}item.on('updated',(_e,state)=>{entry.state=state;entry.received=item.getReceivedBytes();broadcast();});item.once('done',(_e,state)=>{entry.state=state;entry.path=item.getSavePath();profile.save();broadcast();});
  });
  if(process.env.CLASSIC_SMOKE==='1')require('./scripts/smoke').run({app,browser,theme,desktopCapturer,profile,resolveAddress,HOME,builtins});
}).catch(error=>{console.error(error);if(process.env.CLASSIC_SMOKE==='1')app.exit(1);else dialog.showErrorBox('Classic Browser',error.message);});
app.on('window-all-closed',()=>app.quit());
