const fs = require('fs');
const path = require('path');
const config = require('../config');

function resolveUploadPath(url) {
  if (!url || typeof url !== 'string') return '';
  const clean = String(url).split('?')[0].split('#')[0];
  const marker = '/uploads/';
  const index = clean.indexOf(marker);
  if (index < 0) return '';
  const relative = clean.slice(index + marker.length);
  if (!relative) return '';
  const root = path.resolve(config.uploadDir);
  const target = path.resolve(root, relative);
  const rel = path.relative(root, target);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return '';
  return target;
}

function deleteUploadByUrl(url) {
  const file = resolveUploadPath(url);
  if (!file) return false;
  try {
    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      fs.unlinkSync(file);
      return true;
    }
  } catch (err) {
    console.warn('[uploadFiles] 删除失败 ' + file + ': ' + (err && err.message));
  }
  return false;
}

function deleteUploadedFiles(files) {
  if (!files || typeof files !== 'object') return;
  Object.keys(files).forEach(function (field) {
    const list = Array.isArray(files[field]) ? files[field] : [files[field]];
    list.forEach(function (file) {
      if (!file || !file.path) return;
      try {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      } catch (err) {
        console.warn('[uploadFiles] 清理临时文件失败 ' + file.path + ': ' + (err && err.message));
      }
    });
  });
}

module.exports = { resolveUploadPath, deleteUploadByUrl, deleteUploadedFiles };
