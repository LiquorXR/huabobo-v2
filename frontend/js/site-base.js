/**
 * 全站统一根路径：保证从任意页面跳转到 gallery.html 与直接打开展厅完全一致（同域、同数据）
 */
(function () {
  function computeBase() {
    var path = window.location.pathname || '';
    // 必须用 origin + 目录拼，href 里可能带 ?query，直接按长度截会把查询串算进去
    var dir = path.substring(0, path.lastIndexOf('/') + 1) || '/';
    if (location.protocol === 'file:') {
      var href = window.location.href;
      return href.substring(0, href.lastIndexOf('/') + 1);
    }
    try {
      return window.location.origin + dir;
    } catch (e) {
      var href2 = window.location.href;
      return href2.substring(0, href2.indexOf(path)) + dir;
    }
  }

  var base = computeBase();
  try {
    sessionStorage.setItem('zhijiansu_site_base', base);
  } catch (e) {}

  window.ZJS = window.ZJS || {};

  ZJS.IMAGE_FALLBACK_SVG =
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect fill="#f3ebe0" width="400" height="400"/><text x="200" y="208" text-anchor="middle" fill="#9a8878" font-size="22" font-family="sans-serif">暂无图片</text></svg>'
    );

  // 全站图片兜底：任何 <img> 加载失败（缺文件、上传目录被清空等）都换成占位图，不再显示裂图
  document.addEventListener(
    'error',
    function (e) {
      var t = e.target;
      if (t && t.tagName === 'IMG' && !t.dataset.fbk) {
        t.dataset.fbk = '1';
        try {
          t.src = ZJS.IMAGE_FALLBACK_SVG;
        } catch (err) {}
      }
    },
    true
  );

  ZJS.getSiteBase = function () {
    return sessionStorage.getItem('zhijiansu_site_base') || computeBase();
  };

  ZJS.resolve = function (page) {
    var name = page || 'index.html';
    if (name.indexOf('?') >= 0) {
      var parts = name.split('?');
      return ZJS.getSiteBase() + parts[0] + '?' + parts.slice(1).join('?');
    }
    return ZJS.getSiteBase() + name;
  };

  ZJS.go = function (page) {
    window.location.href = ZJS.resolve(page);
  };

  ZJS.replace = function (page) {
    window.location.replace(ZJS.resolve(page));
  };

  ZJS.galleryUrl = function () {
    return ZJS.resolve('gallery.html');
  };
})();
