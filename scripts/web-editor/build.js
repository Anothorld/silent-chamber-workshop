const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');

const outdir = path.resolve(__dirname, '../../docs');
function build() {
  fs.mkdirSync(outdir, { recursive: true });
  for (const name of ['index.html', 'styles.css']) fs.copyFileSync(path.join(__dirname, name), path.join(outdir, name));

  esbuild.buildSync({ entryPoints: [path.join(__dirname, 'app.js')], bundle: true, platform: 'browser', format: 'iife',
    outfile: path.join(outdir, 'app.js'), legalComments: 'eof', logLevel: 'info' });
  return outdir;
}
if (require.main === module) { build(); console.log(`网页编辑器已构建：${outdir}`); }
module.exports = { build, outdir };
