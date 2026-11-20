import path from 'path';
import { fileURLToPath } from 'url';
import { build } from 'esbuild';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.join(scriptDir, '..');

await build({
  entryPoints: [path.join(scriptDir, 'admin-thumb-entry.mjs')],
  bundle: true,
  format: 'iife',
  globalName: 'AdminModelThumbBundle',
  outfile: path.join(backendDir, 'public', 'admin', 'vendor', 'admin-thumb.bundle.js'),
  platform: 'browser',
  target: ['es2018'],
  minify: false,
  define: { 'process.env.NODE_ENV': '"production"' },
  alias: {
    three: path.join(backendDir, 'public', 'admin', 'vendor', 'three', 'build', 'three.module.js'),
    'three/addons': path.join(backendDir, 'public', 'admin', 'vendor', 'three', 'examples', 'jsm')
  },
  logLevel: 'info'
});
