'use strict';
// No bridge is exposed to websites. Only our isolated preload can request filtering data.
const { ipcRenderer, webFrame } = require('electron');
if (/^https?:$/.test(location.protocol)) {
  const data = ipcRenderer.sendSync('content-bootstrap', location.href);
  if (data) {
    if (data.css) webFrame.insertCSS(data.css, { cssOrigin: 'user' });
    if (data.js) webFrame.executeJavaScript(data.js).catch(() => {});
    if (data.extended) window.addEventListener('DOMContentLoaded', () => webFrame.executeJavaScript(data.extended).catch(() => {}), { once: true });
  }
}
