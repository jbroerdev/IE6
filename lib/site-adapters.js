'use strict';
// Native ports of Legacy Wikipedia and Old Reddit Redirect's navigation logic.
function redirectSite(input, settings) {
  let url; try { url = new URL(input); } catch { return null; }
  if (!['http:', 'https:'].includes(url.protocol)) return null;
  const wiki = settings.wikipedia;
  if (wiki.enabled && url.hostname.endsWith('.wikipedia.org') && /^\/(wiki|w)\//.test(url.pathname)) {
    const language = url.hostname.split('.')[0];
    const excluded = wiki.exclude.split(',').map(s => s.trim().toLowerCase());
    if (!excluded.includes(language) && url.searchParams.get('useskin') !== wiki.skin) {
      url.searchParams.set('useskin', wiki.skin); return url.href;
    }
  }
  if (settings.reddit.enabled && ['reddit.com', 'www.reddit.com', 'm.reddit.com', 'np.reddit.com'].includes(url.hostname) && !/^\/(api|svc|oauth)\//.test(url.pathname)) {
    url.hostname = 'old.reddit.com'; url.searchParams.delete('tl'); return url.href;
  }
  return null;
}
function visibleUrl(input, settings) {
  try { const url = new URL(input); if (settings.wikipedia.enabled && settings.wikipedia.hideParameter && url.hostname.endsWith('.wikipedia.org')) { url.searchParams.delete('useskin'); return url.href; } } catch {}
  return input;
}
module.exports = { redirectSite, visibleUrl };
