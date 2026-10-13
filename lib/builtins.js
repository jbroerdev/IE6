'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { WebContentsView, net } = require('electron');
const { Engine, Request, RequestType, CosmeticOption, setConfiguration } = require('./generated/adguard.cjs');
const { redirectSite, visibleUrl } = require('./site-adapters');
const youtubeDefaults = require('../vendor/youtube-defaults.json');
const FILTER_IDS = [2, 3, 6, 14];
const resourceType = { mainFrame: RequestType.Document, subFrame: RequestType.SubDocument, script: RequestType.Script, stylesheet: RequestType.Stylesheet, image: RequestType.Image, xhr: RequestType.XmlHttpRequest, media: RequestType.Media, font: RequestType.Font, webSocket: RequestType.WebSocket, ping: RequestType.Ping, cspReport: RequestType.CspReport, object: RequestType.Object };
const unpacked = file => file.replace(/app\.asar([\\/])/, 'app.asar.unpacked$1');
function defaults() {
  return { wikipedia: { enabled: true, skin: 'vector', hideParameter: true, exclude: '' }, reddit: { enabled: true }, youtube: { enabled: true, settings: { ...youtubeDefaults } }, adguard: { enabled: true, tracking: true, german: true, annoyances: false, exceptions: '', rules: '' } };
}
class Builtins {
  constructor(session, profile) {
    this.session = session; this.profile = profile;
    const saved = profile.data.builtins || {}, base = defaults();
    this.settings = Object.fromEntries(Object.keys(base).map(key => [key, { ...base[key], ...saved[key] }]));
    this.settings.youtube.settings = { ...youtubeDefaults, ...saved.youtube?.settings, showChangelog: false, completedSettingsTutorial: true };
    profile.data.builtins = this.settings;
    this.cache = new Map(); this.blocked = 0; this.youtubeExtension = null; this.youtubeHost = null; this.error = '';
    this.filterDirectory = path.join(path.dirname(profile.path), 'adguard-filters');
    this.extendedCode = fs.readFileSync(path.join(__dirname, 'generated/extended-css.js'), 'utf8');
  }
  async start() {
    setConfiguration({ engine: 'extension', version: '1.0.0', verbose: false });
    await this.buildEngine(); await this.setYoutubeEnabled(); await this.syncRedditCookie();
    this.session.registerPreloadScript({ type: 'frame', id: 'classic-content-filter', filePath: path.join(__dirname, 'content-preload.js') });
    this.session.webRequest.onBeforeRequest((details, callback) => {
      try {
        if (details.resourceType === 'mainFrame') { const redirectURL = redirectSite(details.url, this.settings); if (redirectURL) { callback({ redirectURL }); return; } }
        const source = details.resourceType === 'mainFrame' ? details.url : details.frame?.url || details.webContents?.getURL() || details.referrer || details.url;
        if (this.shouldBlock(details.url, source, details.resourceType)) { this.blocked++; callback({ cancel: true }); return; }
      } catch (error) { this.error = error.message; }
      callback({});
    });
    this.session.webRequest.onBeforeSendHeaders((details, callback) => {
      const requestHeaders = details.requestHeaders;
      if (this.settings.reddit.enabled && details.resourceType === 'mainFrame' && /^https:\/\/(i|preview)\.redd\.it\//.test(details.url)) {
        for (const key of Object.keys(requestHeaders)) if (key.toLowerCase() === 'accept') delete requestHeaders[key];
      }
      callback({ requestHeaders });
    });
  }
  async buildEngine() {
    const ids = [2]; if (this.settings.adguard.tracking) ids.push(3); if (this.settings.adguard.german) ids.push(6); if (this.settings.adguard.annoyances) ids.push(14);
    const filters = ids.map(id => { const cached = path.join(this.filterDirectory, id + '.txt'); const bundled = path.join(__dirname, '../vendor/adguard-filters', id + '.txt'); return { id, content: fs.readFileSync(fs.existsSync(cached) ? cached : bundled, 'utf8') }; });
    filters.push({ id: 1000, content: this.settings.adguard.rules, ignoreUnsafe: true });
    this.engine = await Engine.createAsync({ filters }); this.cache.clear();
  }
  excluded(input) {
    try { const host = new URL(input).hostname; return this.settings.adguard.exceptions.split(/[\s,]+/).filter(Boolean).some(domain => host === domain || host.endsWith('.' + domain)); } catch { return true; }
  }
  shouldBlock(url, source, type = 'other') {
    if (!this.settings.adguard.enabled || !/^https?:|^wss?:/.test(url) || this.excluded(source)) return false;
    const request = new Request(url, source, resourceType[type] || RequestType.Other);
    const result = this.engine.matchRequest(request).getBasicResult(); return !!result && !result.isAllowlist();
  }
  bootstrap(url, source = url) {
    if (!/^https?:\/\//.test(url)) return null;
    const key = source + '\n' + url; if (this.cache.has(key)) return this.cache.get(key);
    let css = '', js = '', extended = '';
    if (this.settings.reddit.enabled && /(^|\.)reddit\.com$/.test(new URL(url).hostname)) css += '.cookie-infobar { display: none !important; }';
    if (this.settings.adguard.enabled && !this.excluded(source)) {
      const request = new Request(url, source, RequestType.Document);
      const options = this.engine.matchRequest(request).getCosmeticOption();
      const result = this.engine.getCosmeticResult(request, options ?? CosmeticOption.CosmeticOptionAll);
      const native = result.elementHiding.generic.concat(result.elementHiding.specific).map(rule => rule.getContent());
      for (let i = 0; i < native.length; i += 100) css += native.slice(i, i + 100).join(',\n') + '{display:none!important;}\n';
      css += result.CSS.generic.concat(result.CSS.specific).map(rule => rule.getContent()).join('\n');
      js = result.JS.getRules().map(rule => rule.getScript({ frameUrl: url }) || '').join('\n;\n');
      const ext = result.elementHiding.genericExtCss.concat(result.elementHiding.specificExtCss).map(rule => rule.getContent() + '{display:none!important;}').concat(result.CSS.genericExtCss,result.CSS.specificExtCss).map(rule => typeof rule === 'string' ? rule : rule.getContent()).join('\n');
      if (ext) extended = this.extendedCode + '\n;new ExtendedCss.ExtendedCss({styleSheet:' + JSON.stringify(ext) + '}).apply();';
    }
    const result = { css, js, extended }; if (this.cache.size > 150) this.cache.clear(); this.cache.set(key, result); return result;
  }
  visibleUrl(url) { return visibleUrl(url, this.settings); }
  async setYoutubeEnabled() {
    if (!this.settings.youtube.enabled) {
      if (this.youtubeHost) { this.youtubeHost.webContents.close(); this.youtubeHost = null; }
      if (this.youtubeExtension) this.session.extensions.removeExtension(this.youtubeExtension.id);
      this.youtubeExtension = null; return;
    }
    if (!this.youtubeExtension) {
      this.youtubeExtension = await this.session.extensions.loadExtension(unpacked(path.join(__dirname, '../vendor/youtube-redux')));
      this.youtubeHost = new WebContentsView({ webPreferences: { session: this.session, sandbox: true, contextIsolation: true, nodeIntegration: false } });
      await this.youtubeHost.webContents.loadURL('chrome-extension://' + this.youtubeExtension.id + '/host.html');
    }
    await this.youtubeHost.webContents.executeJavaScript('chrome.storage.local.set(' + JSON.stringify({ reduxSettings: this.settings.youtube.settings, queueDisplayChangelog: false }) + ')');
  }
  async syncRedditCookie() {
    if (this.settings.reddit.enabled) await this.session.cookies.set({ url: 'https://www.reddit.com', domain: '.reddit.com', path: '/', name: 'redesign_optout', value: 'true', secure: true, sameSite: 'lax', expirationDate: Math.floor(Date.now() / 1000) + 63072000 });
    else await this.session.cookies.remove('https://www.reddit.com', 'redesign_optout');
  }
  async save(value) {
    const filterConfig = ad => JSON.stringify([ad.tracking,ad.german,ad.annoyances,ad.rules]);
    const previousFilterConfig = filterConfig(this.settings.adguard);
    const base = defaults();
    for (const key of Object.keys(base)) {
      if (!value[key]) throw new Error('Einstellungen fehlen.');
      this.settings[key].enabled = !!value[key].enabled;
    }
    const wiki = value.wikipedia;
    if (!['vector','monobook','timeless','minerva','vector-2022','modern','cologneblue'].includes(wiki.skin)) throw new Error('Ungültiges Wikipedia-Layout.');
    this.settings.wikipedia = { enabled: !!wiki.enabled, skin: wiki.skin, hideParameter: !!wiki.hideParameter, exclude: String(wiki.exclude || '').slice(0,2000) };
    const youtube = { ...youtubeDefaults };
    for (const [key, original] of Object.entries(youtubeDefaults)) {
      const incoming = value.youtube.settings?.[key]; if (incoming === undefined) continue;
      if (typeof original === 'boolean') youtube[key] = !!incoming;
      else if (typeof incoming === 'number' || typeof incoming === 'string') youtube[key] = String(incoming).slice(0,200);
    }
    youtube.showChangelog = false; youtube.completedSettingsTutorial = true; this.settings.youtube.settings = youtube;
    const ad = value.adguard;
    this.settings.adguard = { enabled: !!ad.enabled, tracking: !!ad.tracking, german: !!ad.german, annoyances: !!ad.annoyances, exceptions: String(ad.exceptions || '').toLowerCase().slice(0,20000), rules: String(ad.rules || '').slice(0,500000) };
    if(filterConfig(this.settings.adguard)!==previousFilterConfig)await this.buildEngine();else this.cache.clear();
    await this.setYoutubeEnabled(); await this.syncRedditCookie();
    this.profile.data.builtins = this.settings; this.profile.save();
  }
  async updateFilters() {
    fs.mkdirSync(this.filterDirectory, { recursive: true });
    const contents = await Promise.all(FILTER_IDS.map(async id => {
      const response = await net.fetch(`https://filters.adtidy.org/extension/chromium/filters/${id}_optimized.txt`);
      if (!response.ok) throw new Error('Filterdownload fehlgeschlagen (' + response.status + ').');
      const text = await response.text(); if (!text.includes('! Title: AdGuard') || text.length < 1000) throw new Error('Ungültige Filterliste.'); return [id,text];
    }));
    for (const [id,text] of contents) fs.writeFileSync(path.join(this.filterDirectory,id+'.txt'),text);
    fs.writeFileSync(path.join(this.filterDirectory,'updated.txt'),new Date().toISOString()); await this.buildEngine(); return this.status();
  }
  status() {
    const date = path.join(this.filterDirectory, 'updated.txt');
    return { blocked: this.blocked, rules: this.engine?.getRulesCount() || 0, updated: fs.existsSync(date) ? fs.readFileSync(date,'utf8') : require('../vendor/adguard-filters/metadata.json').downloaded, youtubeLoaded: !!this.youtubeExtension, error: this.error };
  }
}
module.exports = { Builtins, defaults };
