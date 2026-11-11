const fs = require('fs');
const path = require('path');

/** 上传子目录（与 middleware/upload.js 一致） */
const UPLOAD_SUBDIRS = [
  'news',
  'artisans',
  'artisans/wechat',
  'artisans/works',
  'users',
  'works',
  'about',
  'about/works',
  'models',
  'models/thumbs'
];

function ensureUploadDirs(uploadDir) {
  if (!uploadDir) return uploadDir;
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
  } catch (err) {
    if (!err || err.code !== 'EEXIST') {
      console.warn('[uploads] 无法创建目录 ' + uploadDir + ': ' + (err && err.message));
      return uploadDir;
    }
  }
  UPLOAD_SUBDIRS.forEach(function (sub) {
    var dir = path.join(uploadDir, sub);
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (err) {
      if (!err || err.code !== 'EEXIST') {
        console.warn('[uploads] 无法创建目录 ' + dir + ': ' + (err && err.message));
      }
    }
  });
  return uploadDir;
}

function countFilesRecursive(dir) {
  if (!fs.existsSync(dir)) return 0;
  var total = 0;
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (entry) {
    var full = path.join(dir, entry.name);
    if (entry.isDirectory()) total += countFilesRecursive(full);
    else if (entry.isFile() && entry.name !== '.gitkeep') total += 1;
  });
  return total;
}

function getUploadStats(uploadDir) {
  ensureUploadDirs(uploadDir);
  return {
    dir: uploadDir,
    fileCount: countFilesRecursive(uploadDir)
  };
}

module.exports = { UPLOAD_SUBDIRS, ensureUploadDirs, getUploadStats };
