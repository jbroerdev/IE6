'use strict';
const {execFile}=require('node:child_process'),path=require('node:path');
const fallback={source:'fallback',colors:{face:'#ece9d8',text:'#000000',shadow:'#aca899',light:'#ffffff',dark:'#716f64',window:'#ffffff',windowText:'#000000',highlight:'#316ac5',highlightText:'#ffffff',gray:'#aca899'},font:{family:'Tahoma',size:11}};
async function readSystemTheme(){if(process.platform!=='win32')return fallback;const script=path.join(__dirname,'system-theme.ps1').replace(/app\.asar([\\/])/,'app.asar.unpacked$1');return new Promise(resolve=>execFile('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',script],{windowsHide:true,timeout:8000,encoding:'utf8'},(error,stdout)=>{try{if(error)throw error;const value=JSON.parse(stdout.replace(/^\uFEFF/,''));if(!value.colors?.face)throw new Error('No colors');resolve({...value,source:'Windows SystemColors / SystemFonts'});}catch{resolve(fallback);}}));}
module.exports={readSystemTheme};
