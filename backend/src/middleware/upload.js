const path = require('path');
const fs = require('fs');
const multer = require('multer');
const config = require('../config');

function ensureDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    if (err && err.code !== 'EEXIST') {
      console.warn('[upload] 无法创建目录 ' + dir + ': ' + err.message);
    }
  }
}

function isImageUpload(file) {
  var name = String((file && file.originalname) || '').toLowerCase();
  // 扩展名白名单优先：svg 等可执行载体一律拒绝（防存储型 XSS）
  if (!/\.(png|jpe?g|webp|gif)$/i.test(name)) return false;
  var mime = String((file && file.mimetype) || '').toLowerCase();
  // 允许 mime 缺失/通用二进制（部分客户端行为），但明确拒绝 svg
  if (!mime || mime === 'application/octet-stream') return true;
  if (mime.indexOf('svg') >= 0) return false;
  return mime.indexOf('image/') === 0;
}

function imageFilter(_req, file, cb) {
  if (isImageUpload(file)) return cb(null, true);
  return cb(new Error('仅支持图片文件（png/jpg/webp/gif）'));
}

function createUploader(subdir) {
  const dest = path.join(config.uploadDir, subdir);
  ensureDir(dest);
  const storage = multer.diskStorage({
    destination: function (_req, _file, cb) {
      cb(null, dest);
    },
    filename: function (_req, file, cb) {
      const ext = path.extname(file.originalname) || '.jpg';
      const safe = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext.toLowerCase();
      cb(null, safe);
    }
  });
  const fileFilter = function (_req, file, cb) {
    if (isImageUpload(file)) return cb(null, true);
    return cb(new Error('仅支持图片文件'));
  };
  return multer({
    storage,
    fileFilter,
    limits: { fileSize: 8 * 1024 * 1024 }
  });
}

const uploadNewsImage = createUploader('news');
const uploadArtisanImage = createUploader('artisans');
const uploadUserAvatar = createUploader('users');
const uploadWorkCover = createUploader('works');

function aboutUploadDest(_req, file, cb) {
  var sub = file.fieldname === 'printWorkImages' ? 'about/works' : 'about';
  var dest = path.join(config.uploadDir, sub);
  ensureDir(dest);
  cb(null, dest);
}

const uploadAboutStorage = multer.diskStorage({
  destination: aboutUploadDest,
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg';
    const safe = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext.toLowerCase();
    cb(null, safe);
  }
});

const uploadAboutFiles = multer({
  storage: uploadAboutStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 8 * 1024 * 1024 }
}).fields([
  { name: 'introImage', maxCount: 1 },
  { name: 'printWorkImages', maxCount: 5 }
]);

function studioModelUploadDest(_req, file, cb) {
  var sub = file.fieldname === 'thumbnail' ? 'models/thumbs' : 'models';
  var dest = path.join(config.uploadDir, sub);
  ensureDir(dest);
  cb(null, dest);
}

const uploadStudioModelStorage = multer.diskStorage({
  destination: studioModelUploadDest,
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname) || (file.fieldname === 'glb' ? '.glb' : '.jpg');
    const safe = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext.toLowerCase();
    cb(null, safe);
  }
});

function studioModelFileFilter(_req, file, cb) {
  if (file.fieldname === 'glb') {
    const ok =
      /\.glb$/i.test(file.originalname) ||
      file.mimetype === 'model/gltf-binary' ||
      file.mimetype === 'application/octet-stream';
    if (!ok) return cb(new Error('模型文件须为 .glb 格式'));
    return cb(null, true);
  }
  if (file.fieldname === 'thumbnail') {
    if (!isImageUpload(file)) return cb(new Error('缩略图须为图片'));
    return cb(null, true);
  }
  cb(new Error('不支持的文件字段'));
}

const uploadStudioModelFiles = multer({
  storage: uploadStudioModelStorage,
  fileFilter: studioModelFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }
}).fields([
  { name: 'glb', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]);

function artisanUploadDest(_req, file, cb) {
  var sub = 'artisans';
  if (file.fieldname === 'wechatQr') sub = 'artisans/wechat';
  else if (file.fieldname === 'portfolioImages') sub = 'artisans/works';
  var dest = path.join(config.uploadDir, sub);
  ensureDir(dest);
  cb(null, dest);
}

const uploadArtisanStorage = multer.diskStorage({
  destination: artisanUploadDest,
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg';
    const safe = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext.toLowerCase();
    cb(null, safe);
  }
});

const uploadArtisanFiles = multer({
  storage: uploadArtisanStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 8 * 1024 * 1024 }
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'wechatQr', maxCount: 1 },
  { name: 'portfolioImages', maxCount: 12 }
]);

module.exports = {
  uploadNewsImage,
  uploadArtisanImage,
  uploadArtisanFiles,
  uploadUserAvatar,
  uploadAboutFiles,
  uploadStudioModelFiles,
  uploadWorkCover
};
