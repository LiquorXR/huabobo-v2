/**
 * 后台 API 地址
 *
 * 同源优先：域名部署时请求当前站点 /api（Caddy 反代到后端 :3000）
 * 本地 127.0.0.1 / localhost：默认请求本机后端 http://127.0.0.1:3000
 * 联调其他后端：在地址栏加 ?api=http://host:port（会被记住），?api=prod 恢复默认
 */
(function () {
  window.ZJS = window.ZJS || {};
  var LOCAL_API = 'http://127.0.0.1:3000';
  var BUILD = '20260521';

  function resolveApiBase() {
    try {
      var q = new URLSearchParams(location.search).get('api');
      if (q) {
        if (q === 'local') q = LOCAL_API;
        if (q === 'prod' || q === 'server') {
          try { localStorage.removeItem('ZJS_API_BASE'); } catch (e) {}
        } else {
          try { localStorage.setItem('ZJS_API_BASE', q); } catch (e) {}
          return String(q).replace(/\/$/, '');
        }
      }
    } catch (e) {}
    try {
      var saved = localStorage.getItem('ZJS_API_BASE');
      if (saved) return saved.replace(/\/$/, '');
    } catch (e) {}
    var host = location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return LOCAL_API;
    }
    return location.origin.replace(/\/$/, '');
  }

  ZJS.API_BASE = resolveApiBase();
  ZJS.USE_BACKEND = true;
  ZJS.BUILD = BUILD;
})();
