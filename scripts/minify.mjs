import { readdir, readFile, writeFile } from 'node:fs/promises';
import { transform } from 'esbuild';
// Release Rollup's module graph before compressing the large graphics bundle.
// Filenames remain deterministic from Vite's pre-minification source hashes.
let total=0;
for(const entry of await readdir('dist/assets')) {
 if(!entry.endsWith('.js')) continue;
 const path=`dist/assets/${entry}`;
 const source=await readFile(path,'utf8');
 const result=await transform(source,{minify:true,target:'es2022',format:'esm',legalComments:'inline'});
 await writeFile(path,result.code);
 total+=Buffer.byteLength(result.code);
}
console.log(`Minified JavaScript: ${(total/1024).toFixed(1)} KiB (sequential pass)`);
