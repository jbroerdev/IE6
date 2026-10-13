'use strict';
const fs=require('node:fs'),path=require('node:path');
class Profile{
  constructor(directory){this.path=path.join(directory,'profile-v2.json');this.data={favorites:[],history:[],downloads:[],settings:{home:'',largeIcons:true,labels:true}};try{const data=JSON.parse(fs.readFileSync(this.path,'utf8'));for(const key of['favorites','history'])if(Array.isArray(data[key]))this.data[key]=data[key].filter(e=>typeof e.title==='string'&&/^https?:\/\//.test(e.url));if(data.settings)this.data.settings={...this.data.settings,...data.settings};if(data.builtins&&typeof data.builtins==='object')this.data.builtins=data.builtins;}catch{}}
  save(){fs.mkdirSync(path.dirname(this.path),{recursive:true});fs.writeFileSync(this.path+'.tmp',JSON.stringify(this.data,null,2));fs.renameSync(this.path+'.tmp',this.path);}
  visit(entry){this.data.history=[{...entry,date:Date.now()},...this.data.history.filter(e=>e.url!==entry.url)].slice(0,300);this.save();}
  favorite(entry){if(!this.data.favorites.some(e=>e.url===entry.url)){this.data.favorites.push(entry);this.save();}}
  removeFavorite(url){this.data.favorites=this.data.favorites.filter(e=>e.url!==url);this.save();}
}
module.exports={Profile};
