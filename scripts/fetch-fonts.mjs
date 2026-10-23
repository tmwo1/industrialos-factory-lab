import {mkdir,writeFile,readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const out=new URL('public/fonts/',root);await mkdir(out,{recursive:true});
const source='https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap';
const response=await fetch(source,{headers:{'User-Agent':'Mozilla/5.0 AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36'}});if(!response.ok)throw Error('Font stylesheet HTTP '+response.status);
let css=await response.text();const urls=[...new Set([...css.matchAll(/url\((https:[^)]+)\)/g)].map(m=>m[1]))];
const manifest=[];
for(let i=0;i<urls.length;i++){const url=urls[i],filename=`font-${i+1}.woff2`;const res=await fetch(url);if(!res.ok)throw Error('Font download HTTP '+res.status);const bytes=Buffer.from(await res.arrayBuffer());await writeFile(new URL(filename,out),bytes);css=css.replaceAll(url,'/fonts/'+filename);manifest.push({file:filename,source:url,bytes:bytes.length});}
await writeFile(new URL('fonts.css',out),css);
for(const [name,url] of [['IBM-Plex-OFL.txt','https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexsansarabic/OFL.txt'],['Inter-OFL.txt','https://raw.githubusercontent.com/google/fonts/main/ofl/inter/OFL.txt']]){const res=await fetch(url);if(!res.ok)throw Error('License download HTTP '+res.status);await writeFile(new URL(name,out),await res.text());}
await writeFile(new URL('manifest.json',out),JSON.stringify({source,license:'SIL Open Font License',fonts:manifest},null,2));
const style=new URL('src/styles.css',root);let app=await readFile(style,'utf8');app=app.replace(/^@import url\([^\n]+\);/,"@import url('/fonts/fonts.css');");await writeFile(style,app);
console.log(JSON.stringify({files:manifest.length,bytes:manifest.reduce((sum,m)=>sum+m.bytes,0)}));
