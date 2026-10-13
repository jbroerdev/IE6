const {execFileSync}=require('node:child_process');
const path=require('node:path');
execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'download-filters.ps1'),'-OutputDirectory',path.join(__dirname,'../vendor/adguard-filters')],{stdio:'inherit',windowsHide:true});
