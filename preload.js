const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('browser',{
  command:(name,value)=>ipcRenderer.invoke('command',name,value),bounds:rect=>ipcRenderer.send('bounds',rect),saveOptions:value=>ipcRenderer.invoke('options-save',value),closeOptions:()=>ipcRenderer.invoke('options-close'),
  onState:callback=>ipcRenderer.on('state',(_e,v)=>callback(v)),onLayout:callback=>ipcRenderer.on('layout',()=>callback()),onFocusAddress:callback=>ipcRenderer.on('focus-address',()=>callback()),onFocusFind:callback=>ipcRenderer.on('focus-find',()=>callback()),onFindResult:callback=>ipcRenderer.on('find-result',(_e,v)=>callback(v)),onOptions:callback=>ipcRenderer.on('options-state',(_e,v)=>callback(v)),
  onIntegrations:callback=>ipcRenderer.on('integrations-state',(_e,v)=>callback(v)),saveIntegrations:value=>ipcRenderer.invoke('integrations-save',value),updateFilters:()=>ipcRenderer.invoke('integrations-update'),closeIntegrations:()=>ipcRenderer.invoke('integrations-close')
});
