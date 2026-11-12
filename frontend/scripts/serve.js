/**
 * 前端本地开发服务器（零依赖，替代 python3 -m http.server）
 * 用法：cd frontend && npm start        （默认 http://127.0.0.1:8765）
 *       PORT=8080 npm start             （自定义端口）
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = parseInt(process.env.PORT, 10) || 8765;
const HOST = '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.glb': 'model/gltf-binary',
  '.obj': 'text/plain; charset=utf-8',
  '.task': 'application/octet-stream',
  '.mp3': 'audio/mpeg',
  '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer(function (req, res) {
  try {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    let file = path.normalize(path.join(ROOT, urlPath === '/' ? '/index.html' : urlPath));
    if (!file.startsWith(ROOT)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('forbidden');
      return;
    }
    let stat;
    try {
      stat = fs.statSync(file);
    } catch (e) {
      stat = null;
    }
    if (stat && stat.isDirectory()) {
      file = path.join(file, 'index.html');
      try {
        stat = fs.statSync(file);
      } catch (e) {
        stat = null;
      }
    }
    if (!stat || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('not found: ' + urlPath);
      return;
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': ext === '.html' ? 'no-store' : 'public, max-age=3600'
    });
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('server error');
  }
});

server.listen(PORT, HOST, function () {
  console.log('[frontend] http://' + HOST + ':' + PORT + '/  (root: ' + ROOT + ')');
});
