/**
 * 工具函数
 */
window.ZJS = window.ZJS || {};

ZJS.getQuery = function (key) {
  return new URLSearchParams(window.location.search).get(key);
};

ZJS.profileUrl = function (userId) {
  return 'profile.html?id=' + encodeURIComponent(userId);
};

ZJS.workUrl = function (workId) {
  return 'work.html?id=' + encodeURIComponent(workId);
};

ZJS.studioEditUrl = function (workId) {
  var page = 'studio.html?edit=' + encodeURIComponent(workId);
  return ZJS.resolve ? ZJS.resolve(page) : page;
};

/** 当前用户可编辑 / 删除的作品（本人名下全部作品与草稿） */
ZJS.canManageWork = function (work, userId) {
  return !!(work && userId && work.userId === userId);
};

ZJS.workPlaceholderImage = function () {
  return (
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">' +
        '<rect fill="#f3ebe0" width="400" height="400"/>' +
        '<text x="200" y="205" text-anchor="middle" fill="#9a8878" font-size="18" font-family="sans-serif">暂无封面</text>' +
        '</svg>'
    )
  );
};

/** 规范化上传图 / 封面 URL（走当前 API，避免 HTTPS Mixed Content 与缺少 /uploads 反代） */
ZJS.normalizeWorkImageUrl = function (url) {
  if (!url || typeof url !== 'string') return '';
  if (url.indexOf('/data:image') >= 0) url = url.slice(url.indexOf('data:image'));
  if (/^data:image/i.test(url)) return url;
  var base = window.ZJS && ZJS.API_BASE ? String(ZJS.API_BASE).replace(/\/$/, '') : '';
  var upIdx = url.indexOf('/uploads/');
  if (upIdx >= 0) {
    var uploadPath = url.slice(upIdx);
    if (!base) return uploadPath;
    return base + '/api' + uploadPath;
  }
  if (/^https?:\/\//i.test(url)) {
    var imgIdx = url.indexOf('/images/');
    if (imgIdx >= 0) return url.slice(imgIdx + 1);
    return url;
  }
  if (url.indexOf('/images/') === 0) return url.slice(1);
  if (url.indexOf('images/') === 0) return url;
  return url;
};

ZJS.normalizeMediaUrl = ZJS.normalizeWorkImageUrl;

/** data URL 转 Blob，用于上传作品封面 */
ZJS.dataUrlToBlob = function (dataUrl) {
  if (!dataUrl || dataUrl.indexOf('data:') !== 0) return null;
  var match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  try {
    var binary = atob(match[2]);
    var len = binary.length;
    var arr = new Uint8Array(len);
    for (var i = 0; i < len; i++) arr[i] = binary.charCodeAt(i);
    return new Blob([arr], { type: match[1] });
  } catch (e) {
    return null;
  }
};

/** 压缩 dataURL 封面，避免 localStorage 写满导致发布失败 */
ZJS.compressDataUrl = function (dataUrl, maxWidth, quality) {
  maxWidth = maxWidth || 360;
  quality = quality || 0.62;
  if (!dataUrl || dataUrl.indexOf('data:image') !== 0) {
    return Promise.resolve(dataUrl);
  }
  return new Promise(function (resolve) {
    var img = new Image();
    img.onload = function () {
      var w = img.width;
      var h = img.height;
      if (w > maxWidth) {
        h = Math.round((h * maxWidth) / w);
        w = maxWidth;
      }
      var canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      try {
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (e) {
        resolve(dataUrl);
      }
    };
    img.onerror = function () {
      resolve('');
    };
    img.src = dataUrl;
  });
};

ZJS.escapeHtml = function (str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

ZJS.escapeAttr = function (str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
};

/** 数字化体验发布到展厅的作品 */
ZJS.isDiyGalleryWork = function (work) {
  if (!work) return false;
  return !!(work.studio || work.tag === 'DIY体验' || (work.id && String(work.id).indexOf('w_diy_') === 0));
};
