'use strict';
// Copy upstream bitmap resources without redrawing or rescaling their pixel art.
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../reference/spyglass/profile/chrome');
const dest=path.join(__dirname,'../ui/assets');
if(!fs.existsSync(path.join(root,'userChrome.css'))){
  require('node:child_process').execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'download-theme.ps1'),'-OutputDirectory',root],{stdio:'inherit',windowsHide:true});
}
fs.mkdirSync(dest,{recursive:true});
for(const name of ['toolbar.png','toolbar_large.png','page.png','go.png'])fs.copyFileSync(path.join(root,name),path.join(dest,name));
const css=fs.readFileSync(path.join(root,'userChrome.css'),'utf8');
function dataImage(selector){const escaped=selector.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const block=css.match(new RegExp(escaped+'\\s*\\{([^}]+)\\}'));const match=block?.[1].match(/url\("(data:image\/[^";]+;base64,[^"]+)"\)/);if(!match)throw new Error('Image missing: '+selector);return match[1];}
const idle=dataImage('#activity_throbber'),busy=dataImage('#activity_throbber[busy]');
fs.writeFileSync(path.join(dest,'activity.css'),`:root{--throbber-idle:url("${idle}");--throbber-busy:url("${busy}")}\n`);
const internet=dataImage('.statusBarInternet::before');fs.writeFileSync(path.join(dest,'internet.png'),Buffer.from(internet.split(',')[1],'base64'));
fs.copyFileSync(path.join(dest,'page.png'),path.join(dest,'browser.png'));
// Pack the original page symbol into standard Windows icon sizes.
const {PNG}=require('pngjs');
const source=PNG.sync.read(fs.readFileSync(path.join(dest,'page.png')));
const sizes=[16,24,32,48,256];
const images=sizes.map(size=>{
  const output=new PNG({width:size,height:size});
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const from=(Math.floor(y*source.height/size)*source.width+Math.floor(x*source.width/size))*4;
    source.data.copy(output.data,(y*size+x)*4,from,from+4);
  }
  return PNG.sync.write(output);
});
const header=Buffer.alloc(6+16*sizes.length);header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4);
let offset=header.length;
images.forEach((data,index)=>{const entry=6+16*index;header[entry]=sizes[index]===256?0:sizes[index];header[entry+1]=header[entry];header.writeUInt16LE(1,entry+4);header.writeUInt16LE(32,entry+6);header.writeUInt32LE(data.length,entry+8);header.writeUInt32LE(offset,entry+12);offset+=data.length;});
fs.writeFileSync(path.join(dest,'browser.ico'),Buffer.concat([header,...images]));
console.log('Spyglass assets prepared.');
