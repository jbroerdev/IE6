'use strict';
const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
const directory=path.join(__dirname,'../lib/generated');fs.mkdirSync(directory,{recursive:true});
esbuild.buildSync({entryPoints:[path.join(__dirname,'../lib/adguard-entry.mjs')],outfile:path.join(directory,'adguard.cjs'),bundle:true,platform:'node',format:'cjs',minify:true,legalComments:'eof'});
const extended=require.resolve('@adguard/extended-css');
fs.copyFileSync(extended,path.join(directory,'extended-css.js'));
console.log('AdGuard engine bundled.');
