/**
 * 全站统一根路径：保证从任意页面跳转到 gallery.html 与直接打开展厅完全一致（同域、同数据）
 */
(function () {
  function computeBase() {
    var href = window.location.href;
    var path = window.location.pathname || '';
    if (location.protocol === 'file:') {
      return href.substring(0, href.lastIndexOf('/') + 1);
    }
    if (path.indexOf('/') >= 0) {
      return href.substring(0, href.length - path.length) + path.substring(0, path.lastIndexOf('/') + 1);
    }
    return href.substring(0, href.lastIndexOf('/') + 1);
  }

  var base = computeBase();
  try {
    sessionStorage.setItem('zhijiansu_site_base', base);
  } catch (e) {}

  window.ZJS = window.ZJS || {};

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
