const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..');
execFileSync(process.execPath,[require.resolve('tailwindcss/lib/cli.js'),'-i','./src/input.css','-o','./public/css/style.css','--minify'],{cwd:root,stdio:'inherit'});
const vendor=path.join(root,'public/vendor');
fs.mkdirSync(vendor,{recursive:true});
fs.cpSync(path.join(root,'node_modules/leaflet/dist'),path.join(vendor,'leaflet'),{recursive:true});
fs.copyFileSync(path.join(root,'node_modules/leaflet/LICENSE'),path.join(vendor,'leaflet/LICENSE'));
for(const family of ['jost','cormorant-garamond']){
  const source=path.join(root,'node_modules/@fontsource',family);
  const target=path.join(vendor,'fonts',family,'files');
  fs.mkdirSync(target,{recursive:true});
  const styles=family==='jost'?['400-normal','500-normal','600-normal']:['500-normal','600-normal','500-italic'];
  for(const style of styles){const name=`${family}-latin-${style}.woff2`;fs.copyFileSync(path.join(source,'files',name),path.join(target,name));}
  fs.copyFileSync(path.join(source,'LICENSE'),path.join(target,'../LICENSE'));
}
console.log('Built CSS and copied local map/font assets to public/vendor.');
