import * as esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const entry = path.join(root, 'scripts', 'admin-thumb-entry.mjs');
const outfile = path.join(root, 'public', 'admin', 'vendor', 'admin-thumb.bundle.js');

await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  format: 'iife',
  globalName: 'AdminModelThumbBundle',
  outfile,
  platform: 'browser',
  target: ['es2018'],
  minify: false,
  define: { 'process.env.NODE_ENV': '"production"' }
});

console.log('[ok] wrote', outfile);
