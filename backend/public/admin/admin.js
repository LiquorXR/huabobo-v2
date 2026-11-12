(function () {
  'use strict';

  var TOKEN_KEY = 'zhijiansu_admin_token';
  var API_BASE_KEY = 'zhijiansu_admin_api_base';

  var loginScreen = document.getElementById('login-screen');
  var loginForm = document.getElementById('login-form');
  var loginError = document.getElementById('login-error');
  var loginStatus = document.getElementById('login-status');
  var apiBaseInput = document.getElementById('api-base-input');
  var btnLoginSubmit = document.getElementById('btn-login-submit');

  function resolveApiBase() {
    var saved = localStorage.getItem(API_BASE_KEY);
    if (saved) return saved.replace(/\/$/, '');
    if (window.ADMIN_API_BASE) return String(window.ADMIN_API_BASE).replace(/\/$/, '');
    if (window.location.protocol === 'file:') {
      return 'http://127.0.0.1:3000';
    }
    return window.location.origin.replace(/\/$/, '');
  }

  function getApiBase() {
    return resolveApiBase();
  }

  function saveApiBaseFromInput() {
    if (apiBaseInput && apiBaseInput.value.trim()) {
      var v = apiBaseInput.value.trim().replace(/\/$/, '');
      localStorage.setItem(API_BASE_KEY, v);
      return v;
    }
    return getApiBase();
  }

  if (apiBaseInput) {
    apiBaseInput.value = getApiBase();
  }

  function friendlyFetchError(err) {
    var msg = (err && err.message) || '请求失败';
    if (msg === 'Failed to fetch' || msg.indexOf('NetworkError') >= 0 || msg.indexOf('fetch') >= 0) {
      return (
        '无法连接后台 API（' +
        getApiBase() +
        '）\n\n请检查：\n' +
        '1. 后端服务已启动（本地 `npm start` / 生产 `docker compose ps` 全 Up）\n' +
        '2. 同源部署无需放行端口；若前后端分开部署，在服务器安全组放行后端端口\n' +
        '3. 浏览器直接打开：' + getApiBase() + '/api/health\n' +
        '4. 本地打开 HTML 时，请在登录页确认 API 地址正确'
      );
    }
    return msg;
  }

  function isFileProtocolPage() {
    return window.location.protocol === 'file:';
  }

  function adminAssetUrl(relativePath) {
    return new URL(relativePath, window.location.href).href;
  }

  function warnIfFileProtocol() {
    if (!isFileProtocolPage()) return;
    var base = getApiBase();
    var tip = '本地文件模式：缩略图在本机生成；数据保存到 ' + base + '（可在下方修改 API 地址）';
    console.info('[admin]', tip);
    if (loginStatus) {
      loginStatus.textContent = tip;
      loginStatus.className = 'login-status';
    }
  }

  function pingApi() {
    if (!loginStatus) return;
    var base = getApiBase();
    loginStatus.textContent = '正在检测后台 ' + base + ' …';
    loginStatus.className = 'login-status';
    fetch(base + '/api/health', { method: 'GET', mode: 'cors' })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (data && data.ok) {
          var dbTip =
            data.db === 'connected'
              ? ''
              : '（⚠ 数据库未连接，保存新闻/艺人会失败）';
          loginStatus.textContent = '后台已连通' + dbTip;
          loginStatus.className = 'login-status ' + (data.db === 'connected' ? 'is-ok' : 'is-bad');
        } else {
          throw new Error('服务异常');
        }
      })
      .catch(function () {
        loginStatus.textContent = '后台未连通，请检查 Node 是否启动、3000 端口是否开放';
        loginStatus.className = 'login-status is-bad';
      });
  }
  var app = document.getElementById('app');
  var panelTitle = document.getElementById('panel-title');
  var adminUserEl = document.getElementById('admin-user');

  function token() {
    return localStorage.getItem(TOKEN_KEY) || '';
  }

  function setToken(t) {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  }

  function api(path, options) {
    options = options || {};
    var headers = options.headers || {};
    if (token()) headers.Authorization = 'Bearer ' + token();
    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }
    var timeoutMs = options.timeout || 45000;
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = controller
      ? setTimeout(function () {
          controller.abort();
        }, timeoutMs)
      : null;

    return fetch(getApiBase() + path, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body,
      signal: controller ? controller.signal : undefined
    })
      .then(function (res) {
        return res.text().then(function (text) {
          var data;
          try {
            data = text ? JSON.parse(text) : {};
          } catch (e2) {
            throw new Error(
              '服务器返回异常（HTTP ' +
                res.status +
                '）。若刚更新过后台，请确认 routes/artisans.js、middleware/upload.js 已上传并重启 Node'
            );
          }
          if (!res.ok) {
            var err = new Error((data && data.message) || '请求失败');
            err.status = res.status;
            throw err;
          }
          return data;
        });
      })
      .catch(function (err) {
        if (err && err.name === 'AbortError') {
          throw new Error(
            '请求超时（' +
              Math.round(timeoutMs / 1000) +
              ' 秒）。常见原因：① 数据库未连接 ② 图片过大 ③ 服务器未重启最新代码。请先打开 ' +
              getApiBase() +
              '/api/health 查看 db 是否为 connected'
          );
        }
        if (err && err.message === 'Failed to fetch') {
          throw new Error(friendlyFetchError(err));
        }
        throw err;
      })
      .finally(function () {
        if (timer) clearTimeout(timer);
      });
  }

  function fieldVal(id) {
    var el = document.getElementById(id);
    return el ? el.value : '';
  }

  function onEl(id, event, handler) {
    var el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
  }

  function validateArtisanUploads() {
    var maxBytes = 8 * 1024 * 1024;
    var total = 0;
    var checks = [
      { el: document.getElementById('artisan-image'), label: '头像' },
      { el: document.getElementById('artisan-wechat-qr'), label: '微信二维码' }
    ];
    var i;
    for (i = 0; i < checks.length; i++) {
      var file = checks[i].el && checks[i].el.files[0];
      if (!file) continue;
      if (file.size > maxBytes) {
        return checks[i].label + ' 超过 8MB，请压缩后重试';
      }
      total += file.size;
    }
    var portfolioInputs = document.querySelectorAll('#artisan-portfolio-list .portfolio-file');
    for (i = 0; i < portfolioInputs.length; i++) {
      var pf = portfolioInputs[i].files[0];
      if (!pf) continue;
      if (pf.size > maxBytes) {
        return '作品 ' + (i + 1) + ' 图片超过 8MB，请压缩后重试';
      }
      total += pf.size;
    }
    if (total > 24 * 1024 * 1024) {
      return '本次上传图片合计超过 24MB，请减少数量或压缩后再保存';
    }
    return '';
  }

  function artisanApiSupportsDetail(data) {
    return !!(data && (data.portfolio !== undefined || data.contact !== undefined));
  }

  function showFormError(id, message) {
    var el = document.getElementById(id);
    if (!el) {
      alert(message);
      return;
    }
    el.textContent = message;
    el.hidden = !message;
  }

  function showLogin() {
    document.body.classList.remove('admin-auth');
    document.body.classList.add('admin-guest');
    loginScreen.hidden = false;
    app.hidden = true;
    setToken('');
  }

  function showApp() {
    document.body.classList.remove('admin-guest');
    document.body.classList.add('admin-auth');
    loginScreen.hidden = true;
    app.hidden = false;
    bootModelThumbModule().catch(function () {});
  }

  function escapeHtml(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function drawLineChart(canvas, labels, values, color, labelKey) {
    var ctx = canvas.getContext('2d');
    var w = canvas.width;
    var h = canvas.height;
    var pad = { top: 24, right: 20, bottom: 36, left: 44 };
    var cw = w - pad.left - pad.right;
    var ch = h - pad.top - pad.bottom;
    var max = Math.max.apply(null, values.concat([1]));

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(30,77,107,0.12)';
    ctx.lineWidth = 1;
    for (var g = 0; g <= 4; g++) {
      var gy = pad.top + (ch * g) / 4;
      ctx.beginPath();
      ctx.moveTo(pad.left, gy);
      ctx.lineTo(w - pad.right, gy);
      ctx.stroke();
    }

    var points = [];
    for (var i = 0; i < values.length; i++) {
      var x = pad.left + (cw * i) / Math.max(values.length - 1, 1);
      var y = pad.top + ch - (values[i] / max) * ch;
      points.push({ x: x, y: y });
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    points.forEach(function (p, idx) {
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    ctx.fillStyle = color;
    points.forEach(function (p) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = '#5c6378';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    labels.forEach(function (lb, i) {
      var x = pad.left + (cw * i) / Math.max(labels.length - 1, 1);
      ctx.fillText(lb.slice(5), x, h - 10);
    });

    ctx.textAlign = 'right';
    for (var j = 0; j <= 4; j++) {
      var val = Math.round((max * (4 - j)) / 4);
      var yy = pad.top + (ch * j) / 4;
      ctx.fillText(String(val), pad.left - 8, yy + 4);
    }
  }

  function loadDashboard() {
    return api('/api/admin/dashboard').then(function (res) {
      var d = res.data;
      document.getElementById('stat-users').textContent = d.totalUsers;
      document.getElementById('stat-works').textContent = d.totalWorks;
      var labels = d.userTrend.map(function (x) {
        return x.date;
      });
      drawLineChart(
        document.getElementById('chart-new'),
        labels,
        d.userTrend.map(function (x) {
          return x.count;
        }),
        '#c41e3a'
      );
      drawLineChart(
        document.getElementById('chart-total'),
        labels,
        d.userTotalTrend.map(function (x) {
          return x.total;
        }),
        '#1e4d6b'
      );
    });
  }

  var NEWS_PAGE_SIZE = 5;
  var newsPage = 1;
  var newsEditor = null;
  var NEWS_TITLE_MAX = 120;
  var NEWS_SUMMARY_MAX = 500;
  var NEWS_CONTENT_MAX = 20000;
  var selectedNewsImage = null;
  var newsImageOverlay = null;
  var newsImageOverlayScrollEl = null;

  function destroyNewsEditor() {
    clearNewsEditorImageSelection();
    if (newsEditor) {
      newsEditor.destroy();
      newsEditor = null;
    }
  }

  function getNewsEditorContentsEl() {
    return (
      document.querySelector('#news-editor-mount .toastui-editor-ww-container .ProseMirror') ||
      document.querySelector('#news-editor-mount .ProseMirror') ||
      document.querySelector('#news-editor-mount .toastui-editor-contents')
    );
  }

  function bindNewsImageSelection() {
    var mount = document.getElementById('news-editor-mount');
    if (!mount || mount._imgSelBound) return;
    mount._imgSelBound = true;

    mount.addEventListener(
      'mousedown',
      function (e) {
        if (e.target.closest('.news-img-resize-handle')) return;
        var img = e.target.closest('#news-editor-mount img');
        if (img && img.closest('.ProseMirror, .toastui-editor-contents')) {
          e.preventDefault();
          e.stopPropagation();
          selectNewsEditorImage(img);
          return;
        }
        if (!e.target.closest('.news-img-resize-overlay')) {
          clearNewsEditorImageSelection();
        }
      },
      true
    );
  }

  function clearNewsEditorImageSelection() {
    selectedNewsImage = null;
    if (newsImageOverlayScrollEl && newsImageOverlayScrollEl._newsImgScroll) {
      newsImageOverlayScrollEl.removeEventListener('scroll', newsImageOverlayScrollEl._newsImgScroll);
      newsImageOverlayScrollEl._newsImgScroll = null;
    }
    newsImageOverlayScrollEl = null;
    if (newsImageOverlay && newsImageOverlay.parentNode) {
      newsImageOverlay.parentNode.removeChild(newsImageOverlay);
    }
    newsImageOverlay = null;
    var root = getNewsEditorContentsEl();
    if (root) {
      root.querySelectorAll('img.news-editor-img-selected').forEach(function (img) {
        img.classList.remove('news-editor-img-selected');
      });
    }
  }

  function positionNewsImageOverlay() {
    if (!newsImageOverlay || !selectedNewsImage) return;
    var contents = getNewsEditorContentsEl();
    if (!contents || !contents.contains(selectedNewsImage)) {
      clearNewsEditorImageSelection();
      return;
    }
    var box = newsImageOverlay.querySelector('.news-img-resize-box');
    if (!box) return;
    var cr = contents.getBoundingClientRect();
    var ir = selectedNewsImage.getBoundingClientRect();
    newsImageOverlay.style.left = ir.left - cr.left + contents.scrollLeft + 'px';
    newsImageOverlay.style.top = ir.top - cr.top + contents.scrollTop + 'px';
    box.style.width = ir.width + 'px';
    box.style.height = ir.height + 'px';
  }

  function attachNewsImageOverlay(img) {
    clearNewsEditorImageSelection();
    selectedNewsImage = img;
    img.classList.add('news-editor-img-selected');

    var contents = getNewsEditorContentsEl();
    if (!contents) return;

    var host = contents.parentElement;
    if (host && getComputedStyle(host).position === 'static') {
      host.style.position = 'relative';
    }

    newsImageOverlay = document.createElement('div');
    newsImageOverlay.className = 'news-img-resize-overlay';
    newsImageOverlay.id = 'news-img-resize-overlay';

    var box = document.createElement('div');
    box.className = 'news-img-resize-box';

    var handle = document.createElement('div');
    handle.className = 'news-img-resize-handle';
    handle.title = '拖拽缩放';
    box.appendChild(handle);
    newsImageOverlay.appendChild(box);
    host.appendChild(newsImageOverlay);
    positionNewsImageOverlay();

    newsImageOverlayScrollEl = contents;
    var onScroll = function () {
      positionNewsImageOverlay();
    };
    contents._newsImgScroll = onScroll;
    contents.addEventListener('scroll', onScroll);

    handle.addEventListener('mousedown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var startX = e.clientX;
      var startWidth = selectedNewsImage.offsetWidth;
      var maxWidth = contents.clientWidth || startWidth;

      function onMove(ev) {
        var next = Math.max(80, Math.min(maxWidth, startWidth + (ev.clientX - startX)));
        var pct = Math.min(100, Math.round((next / maxWidth) * 100));
        selectedNewsImage.style.width = pct + '%';
        selectedNewsImage.style.height = 'auto';
        selectedNewsImage.style.maxWidth = '100%';
        positionNewsImageOverlay();
      }

      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        updateNewsCharCount();
      }

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  function selectNewsEditorImage(img) {
    if (!img) return;
    attachNewsImageOverlay(img);
  }

  function selectLastEditorImage() {
    var contents = getNewsEditorContentsEl();
    if (!contents) return;
    var imgs = contents.querySelectorAll('img');
    if (imgs.length) selectNewsEditorImage(imgs[imgs.length - 1]);
  }

  function ensureNewsEditor() {
    var mount = document.getElementById('news-editor-mount');
    if (!mount) return null;
    if (newsEditor) return newsEditor;
    if (!window.toastui || !window.toastui.Editor) {
      mount.innerHTML = '<p class="form-error">编辑器加载失败，请刷新页面后重试</p>';
      return null;
    }
    newsEditor = new toastui.Editor({
      el: mount,
      height: '560px',
      initialEditType: 'wysiwyg',
      previewStyle: 'tab',
      hideModeSwitch: true,
      usageStatistics: false,
      toolbarItems: [
        ['heading', 'bold', 'italic', 'strike'],
        ['hr', 'quote'],
        ['ul', 'ol'],
        ['table', 'link']
      ]
    });
    newsEditor.on('change', function () {
      updateNewsCharCount();
      if (selectedNewsImage && !document.body.contains(selectedNewsImage)) {
        clearNewsEditorImageSelection();
      } else {
        positionNewsImageOverlay();
      }
    });
    bindNewsImageSelection();
    updateNewsCharCount();
    return newsEditor;
  }

  function dispatchEditorKey(key, opts) {
    opts = opts || {};
    var pm = getNewsEditorContentsEl();
    if (!pm) return;
    pm.focus();
    var init = {
      key: key,
      code: key,
      keyCode: key === 'Enter' ? 13 : 0,
      which: key === 'Enter' ? 13 : 0,
      bubbles: true,
      cancelable: true,
      composed: true,
      shiftKey: !!opts.shiftKey
    };
    pm.dispatchEvent(new KeyboardEvent('keydown', init));
    pm.dispatchEvent(new KeyboardEvent('keyup', init));
  }

  function insertNewsNewParagraph() {
    ensureNewsEditor();
    dispatchEditorKey('Enter');
    clearNewsEditorImageSelection();
    updateNewsCharCount();
  }

  function insertNewsSoftBreak() {
    ensureNewsEditor();
    dispatchEditorKey('Enter', { shiftKey: true });
    updateNewsCharCount();
  }

  function getNewsEditorBlockElement() {
    var pm = getNewsEditorContentsEl();
    if (!pm) return null;

    if (selectedNewsImage && pm.contains(selectedNewsImage)) {
      return selectedNewsImage.closest('p') || selectedNewsImage.parentElement;
    }

    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    var node = sel.anchorNode;
    if (!node || !pm.contains(node)) return null;
    if (node.nodeType === 3) node = node.parentElement;

    var block = node;
    while (block && block !== pm) {
      if (/^(P|H1|H2|H3|H4|H5|H6|DIV|LI|BLOCKQUOTE|TD|TH|FIGURE)$/.test(block.tagName)) {
        return block;
      }
      block = block.parentElement;
    }
    return null;
  }

  function snapshotImagesInBlock(block) {
    var snaps = [];
    if (!block) return snaps;
    block.querySelectorAll('img').forEach(function (img) {
      snaps.push({
        el: img,
        width: img.style.width,
        height: img.style.height,
        maxWidth: img.style.maxWidth,
        display: img.style.display,
        marginLeft: img.style.marginLeft,
        marginRight: img.style.marginRight,
        pixelWidth: img.offsetWidth
      });
    });
    return snaps;
  }

  function restoreImageDimensions(snaps) {
    snaps.forEach(function (s) {
      if (s.width) {
        s.el.style.width = s.width;
      } else if (s.pixelWidth > 0) {
        s.el.style.width = s.pixelWidth + 'px';
      }
      s.el.style.height = s.height || 'auto';
      s.el.style.maxWidth = s.maxWidth || '100%';
    });
  }

  function blockHasOnlyImages(block) {
    if (!block) return false;
    var imgs = block.querySelectorAll('img');
    if (!imgs.length) return false;
    var clone = block.cloneNode(true);
    clone.querySelectorAll('img').forEach(function (img) {
      img.remove();
    });
    return !(clone.textContent || '').replace(/\u200b/g, '').trim();
  }

  function applyNewsTextAlign(align) {
    ensureNewsEditor();
    var pm = getNewsEditorContentsEl();
    if (!pm) return;
    pm.focus();

    var block = getNewsEditorBlockElement();
    if (!block) {
      alert('请先把光标放在要调整的段落里，或选中图片');
      return;
    }

    var snaps = snapshotImagesInBlock(block);
    var hasImages = snaps.length > 0;
    var imageOnly = hasImages && blockHasOnlyImages(block);

    if (hasImages) {
      restoreImageDimensions(snaps);
    }

    if (imageOnly) {
      block.style.textAlign = '';
      snaps.forEach(function (s) {
        var img = s.el;
        img.style.display = 'block';
        img.style.maxWidth = '100%';
        img.style.height = s.height || 'auto';
        if (align === 'center') {
          img.style.marginLeft = 'auto';
          img.style.marginRight = 'auto';
        } else if (align === 'right') {
          img.style.marginLeft = 'auto';
          img.style.marginRight = '0';
        } else {
          img.style.marginLeft = '0';
          img.style.marginRight = '0';
        }
      });
    } else if (hasImages) {
      if (align === 'left') {
        block.style.textAlign = '';
      } else {
        block.style.textAlign = align;
      }
      snaps.forEach(function (s) {
        var img = s.el;
        img.style.display = 'inline-block';
        img.style.verticalAlign = 'top';
        img.style.marginLeft = '';
        img.style.marginRight = '';
        img.style.maxWidth = '100%';
        img.style.height = s.height || 'auto';
        if (s.width) {
          img.style.width = s.width;
        } else if (s.pixelWidth > 0) {
          img.style.width = s.pixelWidth + 'px';
        }
      });
    } else {
      if (align === 'left') {
        block.style.textAlign = '';
      } else {
        block.style.textAlign = align;
      }
    }

    if (selectedNewsImage && block.contains(selectedNewsImage)) {
      setTimeout(positionNewsImageOverlay, 0);
    }
    updateNewsCharCount();
  }

  function getNewsEditorCharCount() {
    if (!newsEditor) return 0;
    if (typeof newsEditor.getCharacterCount === 'function') {
      return newsEditor.getCharacterCount();
    }
    if (typeof newsEditor.getText === 'function') {
      return newsEditor.getText().length;
    }
    return getNewsEditorContent().length;
  }

  function updateNewsCharCount() {
    var el = document.getElementById('news-char-count');
    if (!el) return;
    var count = getNewsEditorCharCount();
    el.textContent = count.toLocaleString() + ' / ' + NEWS_CONTENT_MAX.toLocaleString() + ' 字';
    el.classList.toggle('is-over', count > NEWS_CONTENT_MAX);
  }

  function validateNewsForm() {
    var title = document.getElementById('news-title').value.trim();
    var summary = document.getElementById('news-summary').value;
    var contentLen = getNewsEditorCharCount();
    if (!title) {
      alert('请填写标题');
      return false;
    }
    if (title.length > NEWS_TITLE_MAX) {
      alert('标题最多 ' + NEWS_TITLE_MAX + ' 字');
      return false;
    }
    if (summary.length > NEWS_SUMMARY_MAX) {
      alert('概述最多 ' + NEWS_SUMMARY_MAX + ' 字');
      return false;
    }
    if (contentLen > NEWS_CONTENT_MAX) {
      alert('正文最多 ' + NEWS_CONTENT_MAX + ' 字，当前 ' + contentLen + ' 字');
      return false;
    }
    return true;
  }

  function getSelectedEditorImage() {
    if (selectedNewsImage && document.body.contains(selectedNewsImage)) {
      return selectedNewsImage;
    }
    return null;
  }

  function applySelectedImageWidth(width) {
    ensureNewsEditor();
    var img = getSelectedEditorImage();
    if (!img) {
      alert('请先点击正文中的图片（会出现蓝色边框），再选择宽度');
      return;
    }
    img.style.width = width;
    img.style.height = 'auto';
    img.style.maxWidth = '100%';
    positionNewsImageOverlay();
    updateNewsCharCount();
  }

  function saveNewsForm() {
    if (!validateNewsForm()) return;
    var id = document.getElementById('news-edit-id').value;
    var fd = new FormData();
    fd.append('title', document.getElementById('news-title').value);
    fd.append('summary', document.getElementById('news-summary').value);
    fd.append('content', getNewsEditorContent());
    var pub = document.getElementById('news-published').value;
    if (pub) fd.append('publishedAt', pub);
    var file = document.getElementById('news-image').files[0];
    if (file) fd.append('image', file);
    var path = id ? '/api/admin/news/' + id : '/api/admin/news';
    api(path, { method: id ? 'PUT' : 'POST', body: fd })
      .then(function () {
        document.getElementById('news-form').hidden = true;
        destroyNewsEditor();
        if (!id) newsPage = 1;
        loadNews(newsPage);
      })
      .catch(function (err) {
        alert(err.message || '保存失败');
      });
  }

  function setNewsEditorContent(content) {
    var editor = ensureNewsEditor();
    if (!editor) return;
    var text = content || '';
    if (text && /<[a-z][\s\S]*>/i.test(text.trim())) {
      editor.setHTML(text);
    } else {
      editor.setMarkdown(text);
    }
    updateNewsCharCount();
  }

  function getNewsEditorContent() {
    if (!newsEditor) return '';
    if (typeof newsEditor.getHTML === 'function') {
      return newsEditor.getHTML();
    }
    return newsEditor.getMarkdown();
  }

  function switchNewsEditorTab(tab) {
    var writePanel = document.getElementById('news-editor-panel');
    var previewPanel = document.getElementById('news-preview-panel');
    var writeBtn = document.getElementById('news-editor-tab-write');
    var previewBtn = document.getElementById('news-editor-tab-preview');
    if (!writePanel || !previewPanel) return;

    if (tab === 'preview') {
      refreshNewsPreview();
      writePanel.hidden = true;
      previewPanel.hidden = false;
      if (writeBtn) {
        writeBtn.classList.remove('is-active');
        writeBtn.setAttribute('aria-selected', 'false');
      }
      if (previewBtn) {
        previewBtn.classList.add('is-active');
        previewBtn.setAttribute('aria-selected', 'true');
      }
      return;
    }

    writePanel.hidden = false;
    previewPanel.hidden = true;
    if (writeBtn) {
      writeBtn.classList.add('is-active');
      writeBtn.setAttribute('aria-selected', 'true');
    }
    if (previewBtn) {
      previewBtn.classList.remove('is-active');
      previewBtn.setAttribute('aria-selected', 'false');
    }
  }

  function refreshNewsPreview() {
    var el = document.getElementById('news-content-preview');
    if (!el) return;
    el.innerHTML = '<p class="field-hint">正在调用后台渲染预览…</p>';
    api('/api/admin/news/preview-content', {
      method: 'POST',
      body: { content: getNewsEditorContent() }
    })
      .then(function (res) {
        el.innerHTML = res.html || '<p class="field-hint">暂无正文</p>';
      })
      .catch(function (err) {
        el.innerHTML = '<p class="form-error">' + escapeHtml(err.message || '预览失败') + '</p>';
      });
  }

  function todayDateInputValue() {
    return new Date().toISOString().slice(0, 10);
  }

  function parseNewsDateInput(value) {
    if (!value) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    var d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  }

  function renderTablePager(wrap, meta, onPage) {
    var page = meta.page || 1;
    var pages = meta.pages || 1;
    var total = meta.total || 0;
    if (total <= NEWS_PAGE_SIZE) return;

    var pager = document.createElement('div');
    pager.className = 'table-pager';
    pager.innerHTML =
      '<span class="pager-info">共 ' +
      total +
      ' 条 · 第 ' +
      page +
      ' / ' +
      pages +
      ' 页</span>' +
      '<div class="pager-actions">' +
      '<button type="button" class="btn btn-ghost pager-btn" data-pager="prev"' +
      (page <= 1 ? ' disabled' : '') +
      '>上一页</button>' +
      '<button type="button" class="btn btn-ghost pager-btn" data-pager="next"' +
      (page >= pages ? ' disabled' : '') +
      '>下一页</button>' +
      '</div>';

    pager.querySelectorAll('[data-pager]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.disabled) return;
        var next = btn.getAttribute('data-pager') === 'next' ? page + 1 : page - 1;
        onPage(next);
      });
    });

    wrap.appendChild(pager);
  }

  function newsThumbHtml(url) {
    if (!url) {
      return '<span class="news-list-thumb news-list-thumb--empty">无图</span>';
    }
    return (
      '<img class="news-list-thumb" src="' +
      escapeHtml(url) +
      '" alt="" loading="lazy" decoding="async">'
    );
  }

  function bindNewsThumbErrors(wrap) {
    wrap.querySelectorAll('img.news-list-thumb').forEach(function (img) {
      img.addEventListener('error', function () {
        var span = document.createElement('span');
        span.className = 'news-list-thumb news-list-thumb--empty';
        span.textContent = '无图';
        img.replaceWith(span);
      });
    });
  }

  function loadNews(page) {
    if (typeof page === 'number' && page > 0) newsPage = page;
    return api('/api/news?limit=' + NEWS_PAGE_SIZE + '&page=' + newsPage).then(function (res) {
      var wrap = document.getElementById('news-list');
      var data = res.data || {};
      var list = data.list || [];
      var total = data.total || 0;

      if (!list.length && total > 0 && newsPage > 1) {
        newsPage -= 1;
        return loadNews(newsPage);
      }

      if (!total) {
        wrap.innerHTML = '<p class="empty-hint">暂无新闻，点击「发布新闻」添加</p>';
        return;
      }

      wrap.innerHTML =
        '<table class="data-table data-table-news"><thead><tr>' +
        '<th class="cell-thumb">封面</th><th class="cell-title">标题</th><th class="cell-summary">概述</th><th class="cell-date">发布时间</th><th class="cell-actions">操作</th>' +
        '</tr></thead><tbody>' +
        list
          .map(function (n) {
            return (
              '<tr><td class="cell-thumb">' +
              newsThumbHtml(n.image) +
              '</td><td class="cell-title">' +
              escapeHtml(n.title) +
              '</td><td class="cell-summary">' +
              escapeHtml(n.summary || '—') +
              '</td><td class="cell-date">' +
              escapeHtml(n.publishedAt) +
              '</td><td class="cell-actions"><div class="table-actions">' +
              '<button type="button" class="btn btn-ghost" data-edit-news="' +
              n.id +
              '">编辑</button>' +
              '<button type="button" class="btn btn-danger" data-del-news="' +
              n.id +
              '">删除</button></div></td></tr>'
            );
          })
          .join('') +
        '</tbody></table>';

      renderTablePager(wrap, data, function (p) {
        loadNews(p);
      });

      bindNewsThumbErrors(wrap);

      wrap.querySelectorAll('[data-del-news]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (!confirm('确定删除这条新闻？')) return;
          api('/api/admin/news/' + btn.getAttribute('data-del-news'), { method: 'DELETE' }).then(function () {
            loadNews(newsPage);
          });
        });
      });
      wrap.querySelectorAll('[data-edit-news]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          openNewsForm(btn.getAttribute('data-edit-news'));
        });
      });
    });
  }

  function openNewsForm(id) {
    var form = document.getElementById('news-form');
    form.hidden = false;
    document.getElementById('news-edit-id').value = id || '';
    document.getElementById('news-form-title').textContent = id ? '编辑新闻' : '发布新闻';
    document.getElementById('news-image').value = '';
    showImagePreview(document.getElementById('news-cover-preview'), '');
    switchNewsEditorTab('write');
    destroyNewsEditor();
    if (!id) {
      document.getElementById('news-title').value = '';
      document.getElementById('news-summary').value = '';
      document.getElementById('news-published').value = todayDateInputValue();
      setNewsEditorContent('');
      return;
    }
    api('/api/news/' + id).then(function (res) {
      var n = res.data;
      document.getElementById('news-title').value = n.title;
      document.getElementById('news-summary').value = n.summary || '';
      showImagePreview(document.getElementById('news-cover-preview'), n.image || '');
      document.getElementById('news-published').value = parseNewsDateInput(n.publishedAt);
      setNewsEditorContent(n.content || '');
    });
  }

  function uploadNewsContentImage(file) {
    var fd = new FormData();
    fd.append('image', file);
    return api('/api/admin/news/upload-content-image', { method: 'POST', body: fd });
  }

  function insertNewsContentImages(files) {
    var btn = document.getElementById('news-insert-images');
    if (!files || !files.length) return Promise.resolve();
    ensureNewsEditor();
    if (!newsEditor) return Promise.resolve();

    var list = Array.prototype.slice.call(files);
    btn.disabled = true;
    var origText = btn.textContent;
    btn.textContent = '上传中…';

    var chain = Promise.resolve();
    list.forEach(function (file) {
      chain = chain.then(function () {
        if (!file.type || file.type.indexOf('image/') !== 0) {
          throw new Error('「' + (file.name || '文件') + '」不是图片');
        }
        if (file.size > 8 * 1024 * 1024) {
          throw new Error('「' + (file.name || '文件') + '」超过 8MB');
        }
        return uploadNewsContentImage(file).then(function (res) {
          if (res && res.url) {
            newsEditor.exec('addImage', { imageUrl: res.url, altText: '' });
            updateNewsCharCount();
            setTimeout(selectLastEditorImage, 80);
          }
        });
      });
    });

    return chain
      .then(function () {
        btn.textContent = origText;
        btn.disabled = false;
      })
      .catch(function (err) {
        btn.textContent = origText;
        btn.disabled = false;
        alert(err.message || '图片上传失败');
      });
  }

  function loadUsers(keyword) {
    var q = '?limit=50';
    if (keyword) q += '&keyword=' + encodeURIComponent(keyword);
    var wrap = document.getElementById('users-list');
    return api('/api/admin/users' + q)
      .then(function (res) {
        var list = (res.data && res.data.list) || [];
        if (!list.length) {
          wrap.innerHTML = '<p class="empty-hint">暂无注册用户（用户在前端 register.html 注册后会出现在此）</p>';
          return;
        }
        wrap.innerHTML =
          '<table class="data-table"><thead><tr><th>昵称</th><th>用户名</th><th>注册时间</th><th>操作</th></tr></thead><tbody>' +
          list
            .map(function (u) {
              return (
                '<tr><td>' +
                escapeHtml(u.nickname) +
                '</td><td>' +
                escapeHtml(u.username) +
                '</td><td>' +
                escapeHtml(u.createdAt) +
                '</td><td class="cell-actions"><div class="table-actions">' +
                '<button type="button" class="btn btn-ghost" data-pwd-user="' +
                u.id +
                '">改密</button>' +
                '<button type="button" class="btn btn-danger" data-del-user="' +
                u.id +
                '">删除</button></div></td></tr>'
              );
            })
            .join('') +
          '</tbody></table>';

        wrap.querySelectorAll('[data-del-user]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            if (!confirm('确定删除该用户？相关作品与留言将一并删除。')) return;
            api('/api/admin/users/' + btn.getAttribute('data-del-user'), { method: 'DELETE' }).then(function () {
              loadUsers(document.getElementById('user-keyword').value);
              loadDashboard();
            });
          });
        });
        wrap.querySelectorAll('[data-pwd-user]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var pwd = prompt('请输入新密码（至少 6 位）：');
            if (!pwd) return;
            api('/api/admin/users/' + btn.getAttribute('data-pwd-user') + '/password', {
              method: 'PATCH',
              body: { newPassword: pwd }
            }).then(function () {
              alert('密码已更新');
            });
          });
        });
      })
      .catch(function (err) {
        wrap.innerHTML =
          '<p class="empty-hint" style="color:var(--primary);">加载用户失败：' +
          escapeHtml(err.message || '请检查登录状态与数据库') +
          '</p>';
      });
  }

  function loadArtisans() {
    return api('/api/artisans').then(function (res) {
      var wrap = document.getElementById('artisans-list');
      var list = res.data;
      if (!list.length) {
        wrap.innerHTML = '<p class="empty-hint">暂无合作艺人</p>';
        return;
      }
      wrap.innerHTML = list
        .map(function (a) {
          return (
            '<article class="artisan-admin-card">' +
            '<img src="' +
            escapeHtml(adminUploadUrl(a.image || '')) +
            '" alt="">' +
            '<div class="body"><h4>' +
            escapeHtml(a.name) +
            '</h4><p>' +
            escapeHtml(a.title) +
            '</p></div>' +
            '<div class="actions">' +
            '<button type="button" class="btn btn-ghost" data-edit-artisan="' +
            a.id +
            '">编辑</button>' +
            '<button type="button" class="btn btn-danger" data-del-artisan="' +
            a.id +
            '">删除</button></div></article>'
          );
        })
        .join('');

      wrap.querySelectorAll('[data-del-artisan]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (!confirm('确定删除？')) return;
          api('/api/admin/artisans/' + btn.getAttribute('data-del-artisan'), { method: 'DELETE' }).then(
            loadArtisans
          );
        });
      });
      wrap.querySelectorAll('[data-edit-artisan]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          openArtisanForm(btn.getAttribute('data-edit-artisan'));
        });
      });
    });
  }

  function showImagePreview(el, url) {
    if (!el) return;
    if (!url) {
      el.hidden = true;
      el.innerHTML = '';
      return;
    }
    el.hidden = false;
    el.innerHTML = '<img src="' + escapeHtml(url) + '" alt="">';
  }

  function createPortfolioRow(item, index) {
    item = item || {};
    var row = document.createElement('div');
    row.className = 'portfolio-editor-item';
    row.setAttribute('data-index', String(index));

    var head = document.createElement('div');
    head.className = 'portfolio-editor-head';
    head.innerHTML =
      '<strong>作品 ' +
      (index + 1) +
      '</strong><button type="button" class="btn btn-danger portfolio-remove">删除</button>';
    row.appendChild(head);

    function addField(label, inputEl) {
      var wrap = document.createElement('label');
      var span = document.createElement('span');
      span.textContent = label;
      wrap.appendChild(span);
      wrap.appendChild(inputEl);
      row.appendChild(wrap);
    }

    var titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'portfolio-title';
    titleInput.value = item.title || '';
    addField('作品名称', titleInput);

    var descInput = document.createElement('textarea');
    descInput.className = 'portfolio-desc';
    descInput.rows = 2;
    descInput.value = item.desc || '';
    addField('作品说明', descInput);

    var fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.className = 'portfolio-file';
    fileInput.accept = 'image/*';
    addField('作品图片', fileInput);

    var keepInput = document.createElement('input');
    keepInput.type = 'hidden';
    keepInput.className = 'portfolio-image-keep';
    keepInput.value = item.imagePath || '';
    row.appendChild(keepInput);

    if (item.image) {
      var preview = document.createElement('div');
      preview.className = 'portfolio-preview';
      var img = document.createElement('img');
      img.src = adminUploadUrl(item.image);
      img.alt = '';
      preview.appendChild(img);
      row.appendChild(preview);
    }

    row.querySelector('.portfolio-remove').addEventListener('click', function () {
      row.remove();
      reindexPortfolioRows();
    });
    fileInput.addEventListener('change', function (e) {
      var file = e.target.files[0];
      var previewEl = row.querySelector('.portfolio-preview');
      if (!file) return;
      if (!previewEl) {
        previewEl = document.createElement('div');
        previewEl.className = 'portfolio-preview';
        row.appendChild(previewEl);
      }
      previewEl.innerHTML = '';
      var imgEl = document.createElement('img');
      imgEl.src = URL.createObjectURL(file);
      imgEl.alt = '';
      previewEl.appendChild(imgEl);
      keepInput.value = '';
    });
    return row;
  }

  function reindexPortfolioRows() {
    var list = document.getElementById('artisan-portfolio-list');
    if (!list) return;
    list.querySelectorAll('.portfolio-editor-item').forEach(function (row, idx) {
      row.setAttribute('data-index', String(idx));
      var head = row.querySelector('.portfolio-editor-head strong');
      if (head) head.textContent = '作品 ' + (idx + 1);
    });
  }

  function resetArtisanPortfolio(items) {
    var list = document.getElementById('artisan-portfolio-list');
    if (!list) return;
    list.innerHTML = '';
    (items || []).forEach(function (item, idx) {
      list.appendChild(createPortfolioRow(item, idx));
    });
  }

  function resetArtisanFormExtra() {
    document.getElementById('artisan-image-keep').value = '';
    document.getElementById('artisan-wechat-qr-keep').value = '';
    document.getElementById('artisan-image').value = '';
    document.getElementById('artisan-wechat-qr').value = '';
    showImagePreview(document.getElementById('artisan-image-preview'), '');
    showImagePreview(document.getElementById('artisan-wechat-preview'), '');
    [
      'artisan-contact-shop',
      'artisan-contact-address',
      'artisan-contact-hours',
      'artisan-contact-main',
      'artisan-contact-phone',
      'artisan-contact-note',
      'artisan-wechat-id',
      'artisan-wechat-tip'
    ].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = '';
    });
    resetArtisanPortfolio([]);
  }

  function fillArtisanForm(a) {
    document.getElementById('artisan-name').value = a.name;
    document.getElementById('artisan-title').value = a.title || '';
    document.getElementById('artisan-bio').value = a.bio || '';
    document.getElementById('artisan-tags').value = (a.tags || []).join('，');
    document.getElementById('artisan-sort').value = a.sortOrder || 0;
    document.getElementById('artisan-image-keep').value = a.imagePath || '';
    showImagePreview(document.getElementById('artisan-image-preview'), adminUploadUrl(a.image || ''));

    var c = a.contact || {};
    var contactFields = {
      'artisan-contact-shop': c.shopName,
      'artisan-contact-address': c.address,
      'artisan-contact-hours': c.hours,
      'artisan-contact-main': c.main,
      'artisan-contact-phone': c.phone,
      'artisan-contact-note': c.note
    };
    Object.keys(contactFields).forEach(function (fid) {
      var el = document.getElementById(fid);
      if (el) el.value = contactFields[fid] || '';
    });

    var w = a.wechat || {};
    var wechatIdEl = document.getElementById('artisan-wechat-id');
    var wechatTipEl = document.getElementById('artisan-wechat-tip');
    if (wechatIdEl) wechatIdEl.value = w.id || '';
    if (wechatTipEl) wechatTipEl.value = w.tip || '';
    document.getElementById('artisan-wechat-qr-keep').value = a.wechatQrPath || '';
    showImagePreview(document.getElementById('artisan-wechat-preview'), adminUploadUrl(w.qr || ''));

    resetArtisanPortfolio(a.portfolio || []);
    showFormError('artisan-form-error', '');
  }

  function collectPortfolioPayload(fd) {
    var rows = document.querySelectorAll('#artisan-portfolio-list .portfolio-editor-item');
    var payload = [];
    rows.forEach(function (row) {
      var titleEl = row.querySelector('.portfolio-title');
      var descEl = row.querySelector('.portfolio-desc');
      var keepEl = row.querySelector('.portfolio-image-keep');
      var fileInput = row.querySelector('.portfolio-file');
      var title = titleEl ? titleEl.value.trim() : '';
      var desc = descEl ? descEl.value.trim() : '';
      var keep = keepEl ? keepEl.value : '';
      var file = fileInput && fileInput.files[0];
      payload.push({ title: title, desc: desc, image: keep || '', newImage: file ? '1' : '0' });
      if (file) fd.append('portfolioImages', file);
    });
    fd.append('portfolio', JSON.stringify(payload));
  }

  function openArtisanForm(id) {
    var form = document.getElementById('artisan-form');
    form.hidden = false;
    showFormError('artisan-form-error', '');
    document.getElementById('artisan-edit-id').value = id || '';
    document.getElementById('artisan-form-title').textContent = id ? '编辑合作艺人' : '添加合作艺人';
    if (!id) {
      ['artisan-name', 'artisan-title', 'artisan-bio', 'artisan-tags'].forEach(function (fid) {
        document.getElementById(fid).value = '';
      });
      document.getElementById('artisan-sort').value = '0';
      resetArtisanFormExtra();
      return;
    }
    api('/api/artisans/' + id)
      .then(function (res) {
        var data = res.data || {};
        fillArtisanForm(data);
        if (!artisanApiSupportsDetail(data)) {
          showFormError(
            'artisan-form-error',
            '⚠ 服务器后台版本较旧（不支持作品/联系方式上传）。请上传最新后台代码并重启 Node，否则保存可能失败或一直转圈。'
          );
        }
      })
      .catch(function (err) {
        showFormError('artisan-form-error', err.message || '加载艺人信息失败');
      });
  }

  function adminUploadUrl(url) {
    if (!url) return '';
    var u = String(url);
    var i = u.indexOf('/uploads/');
    if (i >= 0) return getApiBase().replace(/\/$/, '') + '/api' + u.slice(i);
    var j = u.indexOf('/images/');
    if (j >= 0) return u.slice(j + 1);
    return u;
  }

  function modelThumbHtml(url) {
    var src = adminUploadUrl(url);
    if (!src) {
      return '<span class="model-list-thumb model-list-thumb--empty">无图</span>';
    }
    return (
      '<img class="model-list-thumb" src="' +
      escapeHtml(src) +
      '" alt="" loading="lazy" decoding="async">'
    );
  }

  function bindModelThumbErrors(wrap) {
    wrap.querySelectorAll('img.model-list-thumb').forEach(function (img) {
      img.addEventListener('error', function () {
        var span = document.createElement('span');
        span.className = 'model-list-thumb model-list-thumb--empty';
        span.textContent = '无图';
        img.replaceWith(span);
      });
    });
  }

  var cachedCategories = [];

  function fillModelCategorySelect(selectedId) {
    var sel = document.getElementById('model-category');
    if (!sel) return;
    var options = ['<option value="">请选择分类</option>'].concat(
      cachedCategories.map(function (c) {
        return (
          '<option value="' +
          escapeHtml(c.id) +
          '"' +
          (c.id === selectedId ? ' selected' : '') +
          '>' +
          escapeHtml(c.name) +
          '</option>'
        );
      })
    );
    sel.innerHTML = options.join('');
    if (selectedId) sel.value = selectedId;
  }

  function loadCategories() {
    return api('/api/admin/studio-model-categories').then(function (res) {
      cachedCategories = (res.data && res.data.list) || [];
      var wrap = document.getElementById('categories-list');
      if (!wrap) return cachedCategories;
      if (!cachedCategories.length) {
        wrap.innerHTML = '<p class="empty-hint">暂无分类，请先新增分类后再上传模型。</p>';
        fillModelCategorySelect('');
        return cachedCategories;
      }
      wrap.innerHTML =
        '<table class="data-table"><thead><tr><th>分类名称</th><th>模型数</th><th>排序</th><th class="cell-actions">操作</th></tr></thead><tbody>' +
        cachedCategories
          .map(function (c) {
            return (
              '<tr><td>' +
              escapeHtml(c.name) +
              '</td><td>' +
              escapeHtml(String(c.modelCount || 0)) +
              '</td><td>' +
              escapeHtml(String(c.sortOrder || 0)) +
              '</td><td class="cell-actions"><div class="table-actions">' +
              '<button type="button" class="btn btn-ghost" data-edit-category="' +
              c.id +
              '">编辑</button>' +
              '<button type="button" class="btn btn-danger" data-del-category="' +
              c.id +
              '">删除</button></div></td></tr>'
            );
          })
          .join('') +
        '</tbody></table>';
      wrap.querySelectorAll('[data-edit-category]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          openCategoryForm(btn.getAttribute('data-edit-category'));
        });
      });
      wrap.querySelectorAll('[data-del-category]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (!confirm('确定删除该分类？分类下还有模型时无法删除。')) return;
          api('/api/admin/studio-model-categories/' + btn.getAttribute('data-del-category'), {
            method: 'DELETE'
          })
            .then(function () {
              return loadStudioLibraryAdmin();
            })
            .catch(function (err) {
              alert((err && err.message) || '删除失败');
            });
        });
      });
      fillModelCategorySelect(document.getElementById('model-category').value);
      return cachedCategories;
    });
  }

  function openCategoryForm(id) {
    var form = document.getElementById('category-form');
    var errEl = document.getElementById('category-form-error');
    form.hidden = false;
    errEl.hidden = true;
    document.getElementById('category-edit-id').value = id || '';
    document.getElementById('category-form-title').textContent = id ? '编辑分类' : '新增分类';
    if (!id) {
      document.getElementById('category-name').value = '';
      document.getElementById('category-sort').value = String(cachedCategories.length);
      return;
    }
    var c = cachedCategories.find(function (x) {
      return x.id === id;
    });
    if (!c) return;
    document.getElementById('category-name').value = c.name || '';
    document.getElementById('category-sort').value = String(c.sortOrder || 0);
  }

  function saveCategoryForm(e) {
    e.preventDefault();
    var errEl = document.getElementById('category-form-error');
    errEl.hidden = true;
    var id = document.getElementById('category-edit-id').value;
    var name = document.getElementById('category-name').value.trim();
    if (!name) {
      errEl.textContent = '请填写分类名称';
      errEl.hidden = false;
      return;
    }
    api('/api/admin/studio-model-categories' + (id ? '/' + id : ''), {
      method: id ? 'PUT' : 'POST',
      body: {
        name: name,
        sortOrder: parseInt(document.getElementById('category-sort').value, 10) || 0
      }
    })
      .then(function () {
        document.getElementById('category-form').hidden = true;
        return loadStudioLibraryAdmin();
      })
      .catch(function (err) {
        errEl.textContent = err.message || '保存失败';
        errEl.hidden = false;
      });
  }

  function loadStudioLibraryAdmin() {
    return loadCategories().then(loadModels);
  }

  function loadModels() {
    return api('/api/admin/studio-models').then(function (res) {
      var wrap = document.getElementById('models-list');
      var list = (res.data && res.data.list) || [];
      if (!list.length) {
        wrap.innerHTML =
          '<p class="empty-hint">暂无模型，请先确保已有分类，再点击「上传模型」添加 GLB。上传后出现在工作台对应分类弹窗中。</p>';
        return;
      }
      wrap.innerHTML =
        '<table class="data-table data-table-models"><thead><tr><th class="cell-thumb">缩略图</th><th class="cell-title">名称</th><th>分类</th><th class="cell-summary">介绍</th><th>排序</th><th class="cell-date">更新时间</th><th class="cell-actions">操作</th></tr></thead><tbody>' +
        list
          .map(function (m) {
            return (
              '<tr><td class="cell-thumb">' +
              modelThumbHtml(m.thumbnail) +
              '</td><td class="cell-title">' +
              escapeHtml(m.name) +
              '</td><td>' +
              escapeHtml(m.categoryName || '未分类') +
              '</td><td class="cell-summary">' +
              escapeHtml(m.desc || '—') +
              '</td><td>' +
              escapeHtml(String(m.sortOrder || 0)) +
              '</td><td class="cell-date">' +
              escapeHtml(m.updatedAt || m.createdAt || '') +
              '</td><td class="cell-actions"><div class="table-actions">' +
              '<button type="button" class="btn btn-ghost" data-edit-model="' +
              m.id +
              '">编辑</button>' +
              '<button type="button" class="btn btn-danger" data-del-model="' +
              m.id +
              '">删除</button></div></td></tr>'
            );
          })
          .join('') +
        '</tbody></table>';

      bindModelThumbErrors(wrap);
      wrap.querySelectorAll('[data-edit-model]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          openModelForm(btn.getAttribute('data-edit-model'));
        });
      });
      wrap.querySelectorAll('[data-del-model]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (!confirm('确定删除该模型？前端模型库将不再显示。')) return;
          api('/api/admin/studio-models/' + btn.getAttribute('data-del-model'), { method: 'DELETE' }).then(
            loadStudioLibraryAdmin
          );
        });
      });
    });
  }

  var modelAutoThumbBlob = null;
  var modelThumbGenId = 0;
  var modelThumbPendingPromise = null;

  window.AdminModelThumb = window.AdminModelThumb || {
    ready: false,
    error: null,
    bootPromise: null,
    generateModelThumbnailFromGlb: null
  };

  function thumbModuleReady() {
    return !!(window.AdminModelThumb && window.AdminModelThumb.generateModelThumbnailFromGlb);
  }

  function loadThumbBundleScript() {
    var mod = window.AdminModelThumb;
    if (thumbModuleReady()) return Promise.resolve(window.AdminModelThumb);
    if (mod && mod.bootPromise) return mod.bootPromise;

    mod.bootPromise = new Promise(function (resolve, reject) {
      function doneOk() {
        if (thumbModuleReady()) {
          window.AdminModelThumb.ready = true;
          resolve(window.AdminModelThumb);
        } else {
          reject(new Error('缩略图 bundle 未正确初始化'));
        }
      }
      var existing =
        document.querySelector('script[data-admin-thumb-bundle]') ||
        document.querySelector('script[src*="admin-thumb.bundle.js"]');
      if (existing) {
        if (existing.readyState === 'complete' || existing.getAttribute('data-loaded') === '1') {
          doneOk();
          return;
        }
        existing.addEventListener('load', doneOk);
        existing.addEventListener('error', function () {
          reject(new Error('缩略图 bundle 加载失败，请确认 vendor/admin-thumb.bundle.js 与 index.html 在同一目录'));
        });
        setTimeout(function () {
          if (thumbModuleReady()) doneOk();
        }, 0);
        return;
      }
      var script = document.createElement('script');
      script.src = adminAssetUrl('./vendor/admin-thumb.bundle.js');
      script.setAttribute('data-admin-thumb-bundle', '1');
      script.onload = doneOk;
      script.onerror = function () {
        reject(new Error('缩略图 bundle 加载失败，请确认 vendor/admin-thumb.bundle.js 存在'));
      };
      document.head.appendChild(script);
    })
      .catch(function (err) {
        mod.bootPromise = null;
        mod.error = (err && err.message) || 'Three.js 加载失败';
        throw err;
      });

    return mod.bootPromise;
  }

  function bootModelThumbModule() {
    return loadThumbBundleScript();
  }

  function setModelThumbStatus(msg) {
    var el = document.getElementById('model-thumb-status');
    if (el) el.textContent = msg || '';
  }

  function waitForModelThumbModule(maxMs) {
    maxMs = maxMs || 20000;
    return Promise.race([
      bootModelThumbModule(),
      new Promise(function (_resolve, reject) {
        setTimeout(function () {
          reject(new Error('缩略图模块加载超时，请确认 vendor/admin-thumb.bundle.js 可访问'));
        }, maxMs);
      })
    ]);
  }

  function generateAutoThumbnailFromGlbFile(file) {
    var genId = ++modelThumbGenId;
    modelAutoThumbBlob = null;
    setModelThumbStatus('正在根据模型生成缩略图…');
    showImagePreview(document.getElementById('model-thumb-preview'), '');

    modelThumbPendingPromise = waitForModelThumbModule()
      .then(function (mod) {
        return mod.generateModelThumbnailFromGlb(file);
      })
      .then(function (blob) {
        if (genId !== modelThumbGenId) return null;
        if (!blob || !blob.size) throw new Error('缩略图为空');
        modelAutoThumbBlob = asImageFile(blob, 'model-thumb.png');
        showImagePreview(document.getElementById('model-thumb-preview'), URL.createObjectURL(modelAutoThumbBlob));
        setModelThumbStatus('缩略图已自动生成');
        return modelAutoThumbBlob;
      })
      .catch(function (err) {
        if (genId !== modelThumbGenId) return null;
        setModelThumbStatus('');
        console.warn('[admin] 缩略图生成失败', err);
        alert((err && err.message) || '缩略图生成失败，仍可保存模型');
        return null;
      })
      .finally(function () {
        if (genId === modelThumbGenId) modelThumbPendingPromise = null;
      });

    return modelThumbPendingPromise;
  }

  function generateAutoThumbnailFromGlbUrl(url) {
    if (!url) return Promise.resolve(null);
    setModelThumbStatus('正在从已有模型生成缩略图…');
    return fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error('无法读取模型文件');
        return r.blob();
      })
      .then(function (blob) {
        var file = new File([blob], 'model.glb', { type: 'model/gltf-binary' });
        return generateAutoThumbnailFromGlbFile(file);
      })
      .catch(function () {
        setModelThumbStatus('');
        return null;
      });
  }

  function openModelForm(id) {
    var form = document.getElementById('model-form');
    var errEl = document.getElementById('model-form-error');
    form.hidden = false;
    errEl.hidden = true;
    document.getElementById('model-edit-id').value = id || '';
    document.getElementById('model-form-title').textContent = id ? '编辑模型' : '上传 GLB 模型';
    document.getElementById('model-glb').value = '';
    document.getElementById('model-glb-info').textContent = '';
    modelAutoThumbBlob = null;
    modelThumbGenId += 1;
    setModelThumbStatus('');
    showImagePreview(document.getElementById('model-thumb-preview'), '');

    if (!id) {
      document.getElementById('model-name').value = '';
      document.getElementById('model-desc').value = '';
      document.getElementById('model-sort').value = '0';
      document.getElementById('model-glb-keep').value = '';
      document.getElementById('model-thumb-keep').value = '';
      fillModelCategorySelect('');
      return;
    }

    api('/api/admin/studio-models').then(function (res) {
      var list = (res.data && res.data.list) || [];
      var m = list.find(function (x) {
        return x.id === id;
      });
      if (!m) return;
      fillModelCategorySelect(m.categoryId || '');
      document.getElementById('model-name').value = m.name || '';
      document.getElementById('model-desc').value = m.desc || '';
      document.getElementById('model-sort').value = String(m.sortOrder || 0);
      document.getElementById('model-glb-keep').value = m.glbUrl || '';
      document.getElementById('model-thumb-keep').value = m.thumbnail || '';
      document.getElementById('model-glb-info').textContent = m.glbUrl
        ? '当前模型：' + m.glbUrl + '（不上传新文件则保留）'
        : '';
      if (m.thumbnail) {
        showImagePreview(document.getElementById('model-thumb-preview'), adminUploadUrl(m.thumbnail));
        setModelThumbStatus('当前缩略图（更换 GLB 后将重新生成）');
      } else if (m.glbUrl) {
        generateAutoThumbnailFromGlbUrl(adminUploadUrl(m.glbUrl) || m.glbUrl);
      }
    });
  }

  function saveModelForm(e) {
    e.preventDefault();
    var errEl = document.getElementById('model-form-error');
    errEl.hidden = true;
    var id = document.getElementById('model-edit-id').value;
    var name = document.getElementById('model-name').value.trim();
    if (!name) {
      errEl.textContent = '请填写模型名称';
      errEl.hidden = false;
      return;
    }
    var categoryId = document.getElementById('model-category').value;
    if (!categoryId) {
      errEl.textContent = '请选择归属分类';
      errEl.hidden = false;
      return;
    }
    var glbFile = document.getElementById('model-glb').files[0];
    if (!id && !glbFile) {
      errEl.textContent = '请上传 GLB 模型文件';
      errEl.hidden = false;
      return;
    }

    function submitModelForm() {
      var ready = Promise.resolve(modelAutoThumbBlob);
      if (glbFile && !modelAutoThumbBlob) {
        setModelThumbStatus('等待缩略图生成完成…');
        ready = modelThumbPendingPromise || generateAutoThumbnailFromGlbFile(glbFile);
      }
      ready
        .catch(function () {
          return null;
        })
        .then(function () {
          return modelAutoThumbBlob ? blobToDataUrl(modelAutoThumbBlob) : Promise.resolve('');
        })
        .then(function (thumbDataUrl) {
          var fd = new FormData();
          fd.append('name', name);
          fd.append('categoryId', categoryId);
          fd.append('desc', document.getElementById('model-desc').value);
          fd.append('sortOrder', document.getElementById('model-sort').value || '0');
          if (glbFile) fd.append('glb', glbFile);
          if (modelAutoThumbBlob) {
            fd.append('thumbnail', asImageFile(modelAutoThumbBlob, 'model-thumb.png'), 'model-thumb.png');
          }
          if (thumbDataUrl && thumbDataUrl.indexOf('data:image') === 0) {
            fd.append('thumbnailBase64', thumbDataUrl);
          }
          if (id) {
            fd.append('glbUrlKeep', document.getElementById('model-glb-keep').value);
            if (!glbFile) {
              fd.append('thumbnailKeep', document.getElementById('model-thumb-keep').value);
            }
          }
          return api('/api/admin/studio-models' + (id ? '/' + id : ''), {
            method: id ? 'PUT' : 'POST',
            body: fd,
            timeout: 120000
          });
        })
        .then(function () {
          document.getElementById('model-form').hidden = true;
          loadStudioLibraryAdmin();
        })
        .catch(function (err) {
          errEl.textContent = err.message || '保存失败';
          errEl.hidden = false;
        });
    }

    submitModelForm();
  }

  function asImageFile(blob, filename) {
    var type = (blob && blob.type) || (/\.png$/i.test(filename) ? 'image/png' : 'image/jpeg');
    if (typeof File !== 'undefined') {
      try {
        return new File([blob], filename, { type: type });
      } catch (e) {}
    }
    var next = blob instanceof Blob ? blob : new Blob([blob], { type: type });
    if (!next.type) next = new Blob([next], { type: type });
    return next;
  }

  function blobToDataUrl(blob) {
    return new Promise(function (resolve) {
      if (!blob) {
        resolve('');
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        resolve(String(reader.result || ''));
      };
      reader.onerror = function () {
        resolve('');
      };
      reader.readAsDataURL(blob);
    });
  }

  function loadComments() {
    return api('/api/admin/comments?limit=50').then(function (res) {
      var wrap = document.getElementById('comments-list');
      var list = res.data.list;
      if (!list.length) {
        wrap.innerHTML = '<p class="empty-hint">暂无留言</p>';
        return;
      }
      wrap.innerHTML =
        '<table class="data-table"><thead><tr><th>作品</th><th>用户</th><th>内容</th><th>时间</th><th></th></tr></thead><tbody>' +
        list
          .map(function (c) {
            return (
              '<tr><td>' +
              escapeHtml(c.workTitle) +
              '</td><td>' +
              escapeHtml(c.userName) +
              '<br><small>' +
              escapeHtml(c.username) +
              '</small></td><td>' +
              escapeHtml(c.text) +
              '</td><td>' +
              escapeHtml(c.createdAt) +
              '</td><td><button type="button" class="btn btn-danger" data-del-comment="' +
              c.id +
              '">删除</button></td></tr>'
            );
          })
          .join('') +
        '</tbody></table>';

      wrap.querySelectorAll('[data-del-comment]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          api('/api/admin/comments/' + btn.getAttribute('data-del-comment'), { method: 'DELETE' }).then(
            loadComments
          );
        });
      });
    });
  }

  var ABOUT_PRINT_SLOTS = 5;

  function renderAboutPrintSlots(works) {
    var list = document.getElementById('about-print-list');
    if (!list) return;
    works = works || [];
    list.innerHTML = '';
    for (var i = 0; i < ABOUT_PRINT_SLOTS; i++) {
      var item = works[i] || {};
      var row = document.createElement('div');
      row.className = 'about-print-editor-item';
      row.setAttribute('data-slot', String(i));
      row.innerHTML =
        '<div class="portfolio-editor-head"><strong>作品 ' +
        (i + 1) +
        '</strong></div>' +
        '<label><span>名称</span><input type="text" class="about-print-title" value="' +
        escapeHtml(item.title || '') +
        '"></label>' +
        '<label><span>说明</span><textarea class="about-print-desc" rows="2">' +
        escapeHtml(item.desc || '') +
        '</textarea></label>' +
        '<label><span>作品图片</span><input type="file" class="about-print-file" accept="image/*"></label>' +
        '<input type="hidden" class="about-print-image-keep" value="' +
        escapeHtml(item.image || '') +
        '">';
      list.appendChild(row);
      var preview = document.createElement('div');
      preview.className = 'portfolio-preview about-print-preview';
      if (item.image) {
        preview.innerHTML = '<img src="' + escapeHtml(item.image) + '" alt="">';
      }
      row.appendChild(preview);
      var fileInput = row.querySelector('.about-print-file');
      fileInput.addEventListener('change', function () {
        var f = this.files && this.files[0];
        var prev = this.closest('.about-print-editor-item').querySelector('.about-print-preview');
        if (!f || !prev) return;
        prev.innerHTML = '<img src="' + URL.createObjectURL(f) + '" alt="">';
      });
    }
  }

  function loadAbout() {
    return api('/api/admin/about').then(function (res) {
      var d = res.data || {};
      document.getElementById('about-hero-title').value = d.heroTitle || '';
      document.getElementById('about-hero-subtitle').value = d.heroSubtitle || '';
      document.getElementById('about-intro-title').value = d.introTitle || '';
      document.getElementById('about-intro-text').value = d.introText || '';
      document.getElementById('about-values').value = (d.values || []).join('，');
      document.getElementById('about-print-title').value = d.printSectionTitle || '';
      document.getElementById('about-print-desc').value = d.printSectionDesc || '';
      document.getElementById('about-join-title').value = d.joinTitle || '';
      document.getElementById('about-join-text').value = d.joinText || '';
      document.getElementById('about-intro-image-keep').value = d.introImage || '';
      showImagePreview(document.getElementById('about-intro-preview'), d.introImage || '');
      var c = d.contact || {};
      document.getElementById('about-contact-note').value = c.note || '';
      document.getElementById('about-contact-email').value = c.email || '';
      document.getElementById('about-contact-wechat').value = c.wechat || '';
      document.getElementById('about-contact-address').value = c.address || '';
      document.getElementById('about-contact-hours').value = c.hours || '';
      renderAboutPrintSlots(d.printWorks || []);
    });
  }

  function saveAboutForm(e) {
    if (e) e.preventDefault();
    var errEl = document.getElementById('about-form-error');
    errEl.hidden = true;
    var fd = new FormData();
    fd.append('heroTitle', document.getElementById('about-hero-title').value);
    fd.append('heroSubtitle', document.getElementById('about-hero-subtitle').value);
    fd.append('introTitle', document.getElementById('about-intro-title').value);
    fd.append('introText', document.getElementById('about-intro-text').value);
    fd.append('values', document.getElementById('about-values').value);
    fd.append('printSectionTitle', document.getElementById('about-print-title').value);
    fd.append('printSectionDesc', document.getElementById('about-print-desc').value);
    fd.append('joinTitle', document.getElementById('about-join-title').value);
    fd.append('joinText', document.getElementById('about-join-text').value);
    fd.append('introImageKeep', document.getElementById('about-intro-image-keep').value);
    fd.append(
      'contact',
      JSON.stringify({
        note: document.getElementById('about-contact-note').value,
        email: document.getElementById('about-contact-email').value,
        wechat: document.getElementById('about-contact-wechat').value,
        address: document.getElementById('about-contact-address').value,
        hours: document.getElementById('about-contact-hours').value
      })
    );

    var introFile = document.getElementById('about-intro-image').files[0];
    if (introFile) fd.append('introImage', introFile);

    var printPayload = [];
    document.querySelectorAll('#about-print-list .about-print-editor-item').forEach(function (row) {
      var titleEl = row.querySelector('.about-print-title');
      var descEl = row.querySelector('.about-print-desc');
      var keepEl = row.querySelector('.about-print-image-keep');
      var fileInput = row.querySelector('.about-print-file');
      var hasFile = !!(fileInput && fileInput.files && fileInput.files[0]);
      printPayload.push({
        title: titleEl ? titleEl.value : '',
        desc: descEl ? descEl.value : '',
        image: keepEl ? keepEl.value : '',
        hasNewFile: hasFile
      });
      if (hasFile) fd.append('printWorkImages', fileInput.files[0]);
    });
    fd.append('printWorks', JSON.stringify(printPayload));

    api('/api/admin/about', { method: 'PUT', body: fd })
      .then(function () {
        alert('关于我们已保存');
        loadAbout();
      })
      .catch(function (err) {
        errEl.textContent = err.message || '保存失败';
        errEl.hidden = false;
      });
  }

  var panelLoaders = {
    dashboard: loadDashboard,
    news: loadNews,
    users: function () {
      return loadUsers('');
    },
    artisans: loadArtisans,
    about: loadAbout,
    models: loadStudioLibraryAdmin,
    comments: loadComments
  };

  var panelTitles = {
    dashboard: '数据看板',
    news: '新闻资讯',
    users: '注册用户',
    artisans: '合作艺人',
    about: '关于我们',
    models: '模型管理',
    comments: '作品留言'
  };

  function switchPanel(name) {
    document.querySelectorAll('.nav-item').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-panel') === name);
    });
    document.querySelectorAll('.panel').forEach(function (p) {
      p.classList.toggle('is-active', p.id === 'panel-' + name);
    });
    panelTitle.textContent = panelTitles[name] || name;
    if (name === 'news') newsPage = 1;
    if (panelLoaders[name]) panelLoaders[name]();
  }

  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    loginError.hidden = true;
    var base = saveApiBaseFromInput();
    var fd = new FormData(loginForm);
    if (btnLoginSubmit) {
      btnLoginSubmit.disabled = true;
      btnLoginSubmit.textContent = '登录中…';
    }
    fetch(base + '/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: fd.get('username'),
        password: fd.get('password')
      })
    })
      .then(function (r) {
        return r.text().then(function (text) {
          var data;
          try {
            data = text ? JSON.parse(text) : {};
          } catch (e2) {
            throw new Error('服务器返回异常，请确认访问的是 Node 后台地址（带 :3000 端口）');
          }
          if (!r.ok) throw new Error(data.message || '登录失败');
          return data;
        });
      })
      .then(function (data) {
        setToken(data.token);
        adminUserEl.textContent = data.username;
        showApp();
        switchPanel('dashboard');
      })
      .catch(function (err) {
        loginError.textContent = friendlyFetchError(err);
        loginError.hidden = false;
      })
      .finally(function () {
        if (btnLoginSubmit) {
          btnLoginSubmit.disabled = false;
          btnLoginSubmit.textContent = '登录';
        }
      });
  });

  if (apiBaseInput) {
    apiBaseInput.addEventListener('change', function () {
      saveApiBaseFromInput();
      pingApi();
    });
  }

  warnIfFileProtocol();
  pingApi();

  document.getElementById('btn-logout').addEventListener('click', function () {
    setToken('');
    showLogin();
  });

  document.querySelectorAll('.nav-item').forEach(function (btn) {
    btn.addEventListener('click', function () {
      switchPanel(btn.getAttribute('data-panel'));
    });
  });

  document.getElementById('btn-news-new').addEventListener('click', function () {
    openNewsForm('');
  });
  document.getElementById('news-cancel').addEventListener('click', function () {
    document.getElementById('news-form').hidden = true;
    destroyNewsEditor();
  });
  document.getElementById('news-editor-tab-write').addEventListener('click', function () {
    switchNewsEditorTab('write');
  });
  document.getElementById('news-editor-tab-preview').addEventListener('click', function () {
    switchNewsEditorTab('preview');
  });
  document.getElementById('news-insert-paragraph').addEventListener('click', insertNewsNewParagraph);
  document.getElementById('news-insert-linebreak').addEventListener('click', insertNewsSoftBreak);
  document.querySelectorAll('.news-align-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyNewsTextAlign(btn.getAttribute('data-align'));
    });
  });
  document.getElementById('news-insert-images').addEventListener('click', function () {
    document.getElementById('news-content-images').click();
  });
  document.getElementById('news-content-images').addEventListener('change', function () {
    var input = this;
    var files = input.files;
    if (!files || !files.length) return;
    insertNewsContentImages(files).finally(function () {
      input.value = '';
    });
  });
  document.getElementById('news-image').addEventListener('change', function () {
    var file = this.files && this.files[0];
    var preview = document.getElementById('news-cover-preview');
    if (!file) {
      showImagePreview(preview, '');
      return;
    }
    showImagePreview(preview, URL.createObjectURL(file));
  });
  document.getElementById('news-save-btn').addEventListener('click', saveNewsForm);
  document.getElementById('news-form').addEventListener('submit', function (e) {
    e.preventDefault();
  });
  document.querySelectorAll('.news-img-width').forEach(function (btn) {
    btn.addEventListener('click', function () {
      applySelectedImageWidth(btn.getAttribute('data-width'));
    });
  });

  document.getElementById('about-form').addEventListener('submit', saveAboutForm);
  document.getElementById('about-intro-image').addEventListener('change', function () {
    var file = this.files && this.files[0];
    if (file) {
      showImagePreview(document.getElementById('about-intro-preview'), URL.createObjectURL(file));
    }
  });

  document.getElementById('btn-category-new').addEventListener('click', function () {
    openCategoryForm('');
  });
  document.getElementById('category-cancel').addEventListener('click', function () {
    document.getElementById('category-form').hidden = true;
  });
  document.getElementById('category-form').addEventListener('submit', saveCategoryForm);
  document.getElementById('btn-model-new').addEventListener('click', function () {
    if (!cachedCategories.length) {
      alert('请先新增至少一个分类，再上传模型');
      openCategoryForm('');
      return;
    }
    openModelForm('');
  });
  document.getElementById('model-cancel').addEventListener('click', function () {
    document.getElementById('model-form').hidden = true;
  });
  document.getElementById('model-form').addEventListener('submit', saveModelForm);
  document.getElementById('model-glb').addEventListener('change', function () {
    var file = this.files && this.files[0];
    if (!file) return;
    generateAutoThumbnailFromGlbFile(file);
  });

  document.getElementById('btn-user-search').addEventListener('click', function () {
    loadUsers(document.getElementById('user-keyword').value.trim());
  });

  document.getElementById('btn-artisan-new').addEventListener('click', function () {
    openArtisanForm('');
  });
  onEl('btn-portfolio-add', 'click', function () {
    var list = document.getElementById('artisan-portfolio-list');
    if (!list) return;
    var idx = list.querySelectorAll('.portfolio-editor-item').length;
    list.appendChild(createPortfolioRow({}, idx));
  });
  onEl('artisan-image', 'change', function (e) {
    var file = e.target.files[0];
    if (file) {
      showImagePreview(document.getElementById('artisan-image-preview'), URL.createObjectURL(file));
      document.getElementById('artisan-image-keep').value = '';
    }
  });
  onEl('artisan-wechat-qr', 'change', function (e) {
    var file = e.target.files[0];
    if (file) {
      showImagePreview(document.getElementById('artisan-wechat-preview'), URL.createObjectURL(file));
      document.getElementById('artisan-wechat-qr-keep').value = '';
    }
  });
  onEl('artisan-cancel', 'click', function () {
    document.getElementById('artisan-form').hidden = true;
    showFormError('artisan-form-error', '');
  });
  document.getElementById('artisan-form').addEventListener('submit', function (e) {
    e.preventDefault();
    showFormError('artisan-form-error', '');
    var uploadErr = validateArtisanUploads();
    if (uploadErr) {
      showFormError('artisan-form-error', uploadErr);
      return;
    }
    var id = fieldVal('artisan-edit-id');
    var btnSave = document.getElementById('artisan-submit-btn');
    var fd = new FormData();
    fd.append('name', fieldVal('artisan-name'));
    fd.append('title', fieldVal('artisan-title'));
    fd.append('bio', fieldVal('artisan-bio'));
    fd.append('tags', fieldVal('artisan-tags'));
    fd.append('sortOrder', fieldVal('artisan-sort'));
    fd.append('contactShopName', fieldVal('artisan-contact-shop'));
    fd.append('contactAddress', fieldVal('artisan-contact-address'));
    fd.append('contactHours', fieldVal('artisan-contact-hours'));
    fd.append('contactMain', fieldVal('artisan-contact-main'));
    fd.append('contactPhone', fieldVal('artisan-contact-phone'));
    fd.append('contactNote', fieldVal('artisan-contact-note'));
    fd.append('wechatId', fieldVal('artisan-wechat-id'));
    fd.append('wechatTip', fieldVal('artisan-wechat-tip'));
    fd.append('imageKeep', fieldVal('artisan-image-keep'));
    fd.append('wechatQrKeep', fieldVal('artisan-wechat-qr-keep'));
    collectPortfolioPayload(fd);
    var avatarEl = document.getElementById('artisan-image');
    if (avatarEl && avatarEl.files[0]) fd.append('image', avatarEl.files[0]);
    var wechatEl = document.getElementById('artisan-wechat-qr');
    if (wechatEl && wechatEl.files[0]) fd.append('wechatQr', wechatEl.files[0]);
    var path = id ? '/api/admin/artisans/' + id : '/api/admin/artisans';
    if (btnSave) {
      btnSave.disabled = true;
      btnSave.textContent = '上传并保存中…';
    }
    api(path, { method: 'POST', body: fd, timeout: 120000 })
      .then(function () {
        document.getElementById('artisan-form').hidden = true;
        loadArtisans();
      })
      .catch(function (err) {
        showFormError('artisan-form-error', err.message || '保存失败');
      })
      .finally(function () {
        if (btnSave) {
          btnSave.disabled = false;
          btnSave.textContent = '保存';
        }
      });
  });

  if (token()) {
    api('/api/admin/dashboard')
      .then(function () {
        showApp();
        adminUserEl.textContent = 'admin';
        switchPanel('dashboard');
      })
      .catch(function () {
        setToken('');
        showLogin();
      });
  } else {
    showLogin();
  }

  bootModelThumbModule().catch(function () {});
})();
