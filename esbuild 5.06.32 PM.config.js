const esbuild = require('esbuild');
const vuePlugin = require('@vitejs/plugin-vue');

const frappeVueStyle = require('./frappe-vue-style.js');

esbuild.build({
  entryPoints: ['posawesome/public/js/posawesome.bundle.js'],
  bundle: true,
  outdir: 'posawesome/public/dist/js',
  format: 'esm',
  target: 'esnext',
  plugins: [frappeVueStyle(), vuePlugin()],
  metafile: true,
}).then(result => {
  console.log('Build outputs:', Object.keys(result.metafile.outputs));
}).catch(() => process.exit(1));
