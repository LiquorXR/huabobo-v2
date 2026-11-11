/**
 * 后台 API 地址
 *
 * 用域名（www.songqingtian.top）打开：请求当前站点 /api（须 Nginx 反代到 3000）
 * 用 IP 打开：请求 http://8.160.184.132:3000
 * 本地 127.0.0.1：同样请求线上 IP:3000
 */
(function () {
  window.ZJS = window.ZJS || {};
  var SERVER_API = 'http://8.160.184.132:3000';
  var BUILD = '20260521';

  function resolveApiBase() {
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
