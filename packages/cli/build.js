
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

esbuild.build({
  entryPoints: ['src/index.ts'], // entry file
  bundle: true,                  // bundle every dependency
  platform: 'node',              // run time is Node.js
  target: 'node20',              // node your target version
  outfile: 'dist/cli.js',
  // Keep real external NPM deps out, but include local workspace code
  external: ['fs', 'path', 'os'], 
})
.then(()=>{
    if(fs.existsSync(".env")){
        fs.copyFileSync(
            path.join(__dirname, '.env'), 
            path.join(__dirname, 'dist', '.env')
        );
    }
})
.catch(() => process.exit(1));

