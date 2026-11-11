const fs = require('fs');
const path = require('path');
const config = require('../config');

function ensureDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    if (err && err.code !== 'EEXIST') {
      console.warn('[workImage] 无法创建目录 ' + dir + ': ' + err.message);
    }
  }
}

function persistDataImage(image, subdir, prefix) {
  if (!image || typeof image !== 'string') return '';
  if (/^https?:\/\//i.test(image)) {
    var absIdx = image.indexOf('/uploads/');
    return absIdx >= 0 ? image.slice(absIdx) : image;
  }
  if (image.indexOf('/uploads/') === 0) return image;
  if (image.indexOf('/data:image') >= 0) image = image.slice(image.indexOf('data:image'));
  var match = image.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) return '';

  var kind = match[1].toLowerCase();
  var ext = kind === 'png' ? '.png' : kind === 'webp' ? '.webp' : '.jpg';
  var buf;
  try {
    buf = Buffer.from(match[2], 'base64');
  } catch (e) {
    return '';
  }
  if (!buf.length) return '';

  var dir = path.join(config.uploadDir, subdir || 'works');
  ensureDir(dir);
  var safeId = String(prefix || Date.now()).replace(/[^\w-]/g, '') || String(Date.now());
  var filename = safeId + '-' + Date.now() + ext;
  fs.writeFileSync(path.join(dir, filename), buf);
  return '/uploads/' + String(subdir || 'works').replace(/^\/|\/$/g, '') + '/' + filename;
}

/**
 * 将 data URL 封面保存为 uploads/works 下的文件；已是 URL 或路径则原样返回
 */
function persistWorkImage(image, workId) {
  return persistDataImage(image, 'works', workId || 'work');
}

function normalizeWorkImage(image) {
  if (!image) return '';
  if (image.indexOf('/data:image') >= 0) image = image.slice(image.indexOf('data:image'));
  if (/^data:/i.test(image)) return image;
  if (/^https?:\/\//i.test(image)) return image;
  return require('./url').publicUrl(image) || image;
}

module.exports = { persistWorkImage, persistDataImage, normalizeWorkImage };
