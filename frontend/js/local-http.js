/**
 * Chrome 等浏览器在 file:// 下禁止使用摄像头，须通过 http://127.0.0.1 访问。
 * 探测本机是否已有简易 HTTP 服务（如 python3 -m http.server），若有则自动切换。
 */
(function () {
  window.ZJS = window.ZJS || {};

  var PORTS = [8765, 5500, 8080, 3000];

  function localBase(port) {
    return 'http://127.0.0.1:' + port + '/';
  }

  function currentPageFile() {
    var path = location.pathname || '';
    var name = path.indexOf('/') >= 0 ? path.substring(path.lastIndexOf('/') + 1) : path;
    return name || 'index.html';
  }

  function pageUrl(port) {
    return localBase(port) + currentPageFile() + (location.search || '') + (location.hash || '');
  }

  function probePort(port) {
    var url = localBase(port) + 'index.html?ping=' + Date.now();
    return fetch(url, { method: 'GET', mode: 'no-cors', cache: 'no-store' })
      .then(function () {
        return port;
      })
      .catch(function () {
        return null;
      });
  }

  function findRunningPort() {
    return PORTS.reduce(function (chain, port) {
      return chain.then(function (found) {
        if (found) return found;
        return probePort(port);
      });
    }, Promise.resolve(null));
  }

  function syncSiteBase(port) {
    try {
      sessionStorage.setItem('zhijiansu_site_base', localBase(port));
    } catch (e) {}
  }

  ZJS.LocalHttp = {
    PORTS: PORTS,
    activePort: 8765,

    isFilePage: function () {
      return location.protocol === 'file:';
    },

    isLocalHttp: function () {
      return location.hostname === '127.0.0.1' || location.hostname === 'localhost';
    },

    /** 通过 http://域名 访问（非 localhost）时浏览器不允许摄像头，须改 HTTPS */
    needsHttpsForCamera: function () {
      return !window.isSecureContext && !this.isFilePage() && !this.isLocalHttp();
    },

    renderHttpsHelp: function (container) {
      if (!container) return;
      var host = location.hostname || '您的域名';
      container.innerHTML =
        '<div class="local-http-help local-http-help--https">' +
        '<p class="local-http-help-title">当前通过 <strong>HTTP</strong> 打开网站，Chrome 等浏览器<strong>不允许使用摄像头</strong>，手势识别无法启动。</p>' +
        '<ol class="local-http-help-steps">' +
        '<li>在服务器上为站点 <code>' +
        host +
        '</code> 开启 <strong>SSL（HTTPS）</strong>（生产用仓根 docker compose，一键自动配证书）</li>' +
        '<li>用 <code>https://' +
        host +
        '/</code> 访问本站（不要用 http://）</li>' +
        '<li>若使用 HTTPS，须将 <code>/api</code>、<code>/uploads</code> 反代到后端 <code>127.0.0.1:3000</code>（生产 docker compose 已配好 Caddy 反代）</li>' +
        '</ol>' +
        '<p class="local-http-help-note">展厅点赞、留言同样依赖后台接口；HTTPS 下未配置反代时也会失败。</p>' +
        '</div>';
    },

    getPageUrl: function (port, page, query) {
      var spec = page || currentPageFile();
      var path = spec;
      var q = query;
      if (spec.indexOf('?') >= 0) {
        var parts = spec.split('?');
        path = parts[0];
        q = '?' + parts.slice(1).join('?');
      }
      if (q == null || q === '') q = location.search || '';
      else if (q.charAt(0) !== '?') q = '?' + q;
      return localBase(port || this.activePort) + path + q;
    },

    findRunningPort: findRunningPort,

    /** file:// 下若本机已有 HTTP 服务，跳转到同页的 http 地址 */
    trySwitchCurrentPage: function () {
      if (!this.isFilePage()) return Promise.resolve(false);
      var self = this;
      return findRunningPort().then(function (port) {
        if (!port) return false;
        self.activePort = port;
        syncSiteBase(port);
        location.replace(pageUrl(port));
        return true;
      });
    },

    serverCommand: function () {
      return 'python3 -m http.server 8765';
    },

    renderHelp: function (container, pageName) {
      if (!container) return;
      var page = pageName || currentPageFile();
      var cmd = this.serverCommand();
      container.innerHTML =
        '<div class="local-http-help">' +
        '<p class="local-http-help-title">Chrome 打开本地 HTML 文件时<strong>无法使用摄像头</strong>，须用网页地址访问。</p>' +
        '<ol class="local-http-help-steps">' +
        '<li>打开「终端」，进入本网站的 <code>前端</code> 文件夹</li>' +
        '<li>执行：<code class="local-http-cmd">' + cmd + '</code> <button type="button" class="btn btn-outline btn-sm" id="btn-copy-http-cmd">复制命令</button></li>' +
        '<li>在 Chrome 地址栏打开下方链接（不要关终端）</li>' +
        '</ol>' +
        '<a class="btn btn-primary btn-sm" id="link-local-http-open" href="' +
        this.getPageUrl(8765, page) +
        '">用本地网页地址打开' +
        (page.indexOf('studio') >= 0 ? '工作台' : '本页') +
        '</a>' +
        '<p class="local-http-help-note">若已执行上述命令，刷新本页或点上方按钮即可使用摄像头。</p>' +
        '</div>';

      var copyBtn = container.querySelector('#btn-copy-http-cmd');
      if (copyBtn) {
        copyBtn.addEventListener('click', function () {
          var text = cmd;
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
              copyBtn.textContent = '已复制';
              setTimeout(function () {
                copyBtn.textContent = '复制命令';
              }, 2000);
            });
          } else {
            alert('请手动复制终端命令：\n' + text);
          }
        });
      }

      var self = this;
      findRunningPort().then(function (port) {
        if (!port) return;
        self.activePort = port;
        syncSiteBase(port);
        var link = container.querySelector('#link-local-http-open');
        if (link) link.href = self.getPageUrl(port, page);
        var note = container.querySelector('.local-http-help-note');
        if (note) note.textContent = '检测到本地服务已启动（端口 ' + port + '），请点击上方按钮或刷新。';
      });
    }
  };
})();
