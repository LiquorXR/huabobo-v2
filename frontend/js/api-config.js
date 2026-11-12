/**
 * 后台 API 地址
 *
 * 用域名（www.songqingtian.top）打开：请求当前站点 /api（须 Nginx 反代到 3000）
 * 用 IP 打开：请求 http://8.160.184.132:3000
 * 本地 127.0.0.1：默认请求线上 IP:3000；本地联调时在地址栏加 ?api=local
 *   切到本机后端（http://127.0.0.1:3000），选择会被记住，?api=prod 切回线上
 */
(function () {
  window.ZJS = window.ZJS || {};
  var SERVER_API = 'http://8.160.184.132:3000';
  var LOCAL_API = 'http://127.0.0.1:3000';
  var BUILD = '20260521';

  function resolveApiBase() {
    try {
      var q = new URLSearchParams(location.search).get('api');
      if (q === 'local') {
        try { localStorage.setItem('ZJS_API_BASE', LOCAL_API); } catch (e) {}
        return LOCAL_API;
      }
      if (q === 'prod' || q === 'server') {
        try { localStorage.removeItem('ZJS_API_BASE'); } catch (e) {}
      }
    } catch (e) {}
    try {
      var saved = localStorage.getItem('ZJS_API_BASE');
      if (saved) return saved.replace(/\/$/, '');
    } catch (e) {}
    var host = location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '8.160.184.132') {
      return SERVER_API;
    }
    return location.origin.replace(/\/$/, '');
  }

  ZJS.API_BASE = resolveApiBase();
  ZJS.API_SERVER = SERVER_API;
  ZJS.USE_BACKEND = true;
  ZJS.BUILD = BUILD;
})();
