'use strict';
function resolveAddress(input,home){
  const value=String(input||'').trim();if(!value)return null;if(value==='about:home')return home;if(value==='about:blank')return value;
  if(/^https?:\/\//i.test(value)){try{return new URL(value).href;}catch{return null;}}
  if(/^[a-z][a-z\d+.-]*:/i.test(value)&&!/^localhost:\d/i.test(value)&&!/^([\w-]+\.)+[\w-]+:\d/.test(value))return null;
  if(/^(localhost|\[[\da-f:]+\]|(?:\d{1,3}\.){3}\d{1,3})(:\d+)?([/?#]|$)/i.test(value))return'http://'+value;
  if(/^(?:[\w-]+\.)+[a-z]{2,}(?::\d+)?(?:[/?#]|$)/i.test(value))return'https://'+value;
  return'https://www.google.com/search?q='+encodeURIComponent(value);
}
function allowedNavigation(url,home){return/^https?:\/\//i.test(url)||url==='about:blank'||url===home;}
module.exports={resolveAddress,allowedNavigation};
