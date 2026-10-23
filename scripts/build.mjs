import { spawnSync } from 'node:child_process';
const steps = [['node_modules/typescript/bin/tsc','-b'],['node_modules/vite/bin/vite.js','build'],['scripts/minify.mjs']];
// Bound parallelism on small development laptops without changing the artifact.
for (const args of steps) {
 const result=spawnSync(process.execPath,['--max-old-space-size=384',...args],{stdio:'inherit',env:{...process.env,GOMAXPROCS:process.env.GOMAXPROCS||'2',GOMEMLIMIT:process.env.GOMEMLIMIT||'128MiB'}});
 if(result.error) throw result.error;
 if(result.status!==0) process.exit(result.status??1);
}
