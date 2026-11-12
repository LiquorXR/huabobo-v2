/**
 * 登录 / 注册页 — 检测后台连通性
 */
(function () {
  var statusEl = document.getElementById('auth-status');
  if (!statusEl || !window.ZJS || !ZJS.USE_BACKEND || !ZJS.API_BASE) return;

  var base = ZJS.API_BASE.replace(/\/$/, '');

  if (window.location.protocol === 'file:') {
    statusEl.innerHTML =
      '⚠ 当前为本地文件打开，无法连接后台。请用本地服务打开本站（如前端目录执行 npm start 后访问 http://127.0.0.1:8765/），或部署后用站点域名访问。';
    statusEl.className = 'auth-status is-bad';
    return;
  }

  statusEl.textContent = '正在连接后台 ' + base + ' …';
  fetch(base + '/api/health', { method: 'GET', mode: 'cors' })
    .then(function (r) {
      return r.json();
    })
    .then(function (data) {
      if (data && data.ok) {
        statusEl.textContent =
          '后台已连通' + (data.db === 'connected' ? '，可以注册 / 登录' : '（数据库未连接：本地检查 dev.db，生产检查 postgres 容器）');
        statusEl.className = 'auth-status ' + (data.db === 'connected' ? 'is-ok' : 'is-bad');
      } else {
        throw new Error('服务异常');
      }
    })
    .catch(function () {
      statusEl.textContent =
        '无法连接后台（' +
        base +
        '）。请打开 ' +
        base +
        '/api/health 检查。若是域名访问，须在 Nginx 把 /api 反代到 127.0.0.1:3000，并重启 Node。';
      statusEl.className = 'auth-status is-bad';
    });
})();
