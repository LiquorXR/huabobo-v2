/**
 * 合作艺人详情 — GET /api/artisans/:id
 */
(function () {
  var root = document.getElementById('artisan-detail');
  if (!root) return;

  var id = new URLSearchParams(window.location.search).get('id');
  var base = window.ZJS && ZJS.API_BASE ? ZJS.API_BASE.replace(/\/$/, '') : '';

  function esc(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function resolveImg(url, fallback) {
    var n = window.ZJS && ZJS.normalizeWorkImageUrl ? ZJS.normalizeWorkImageUrl(url) : url;
    return n || fallback || 'images/artisan-1.jpg';
  }

  function renderDetail(a) {
    document.title = a.name + ' — 合作手艺人';
    var tags = (a.tags || [])
      .map(function (t) {
        return '<span>' + esc(t) + '</span>';
      })
      .join('');
    var portfolio = (a.portfolio || [])
      .map(function (p) {
        return (
          '<figure class="work-item">' +
          '<img src="' +
          esc(resolveImg(p.image, 'images/my-work-1.jpg')) +
          '" alt="' +
          esc(p.title) +
          '" loading="lazy">' +
          '<figcaption><h3>' +
          esc(p.title) +
          '</h3><p>' +
          esc(p.desc) +
          '</p></figcaption></figure>'
        );
      })
      .join('');
    var c = a.contact || {};
    var hasContact = c.shopName || c.address || c.hours || c.main || c.phone || c.note;
    var contactHtml = hasContact
      ? '<div class="detail-block"><h2>联系方式</h2><div class="shop-info"><dl>' +
        (c.shopName ? '<dt>店铺名称</dt><dd>' + esc(c.shopName) + '</dd>' : '') +
        (c.address ? '<dt>地址</dt><dd>' + esc(c.address) + '</dd>' : '') +
        (c.hours ? '<dt>营业时间</dt><dd>' + esc(c.hours) + '</dd>' : '') +
        (c.main ? '<dt>主营</dt><dd>' + esc(c.main) + '</dd>' : '') +
        (c.phone ? '<dt>联系电话</dt><dd>' + esc(c.phone) + '</dd>' : '') +
        (c.note ? '<dt>备注</dt><dd>' + esc(c.note) + '</dd>' : '') +
        '</dl></div></div>'
      : '';

    var wechatHtml = '';
    if (a.wechat && (a.wechat.id || a.wechat.qr)) {
      wechatHtml =
        '<div class="detail-block"><h2>微信联系</h2><div class="contact-wechat">' +
        '<div><h3>添加' +
        esc(a.name) +
        '微信</h3>' +
        (a.wechat.tip ? '<p class="tip">' + esc(a.wechat.tip) + '</p>' : '') +
        (a.wechat.id
          ? '<div class="wechat-id">微信号：' + esc(a.wechat.id) + '</div>'
          : '') +
        '</div>' +
        (a.wechat.qr
          ? '<div class="wechat-qr"><img src="' +
            esc(resolveImg(a.wechat.qr)) +
            '" alt="微信二维码"></div>'
          : '') +
        '</div></div>';
    }

    root.innerHTML =
      '<nav class="breadcrumb"><a href="index.html">首页</a><span>/</span><a href="artisans.html">合作手艺人</a><span>/</span>' +
      esc(a.name) +
      '</nav>' +
      '<div class="artisan-detail-hero">' +
      '<div class="artisan-detail-avatar"><img src="' +
      esc(resolveImg(a.image, 'images/artisan-1.jpg')) +
      '" alt="' +
      esc(a.name) +
      '"></div>' +
      '<div><h1>' +
      esc(a.name) +
      '</h1>' +
      '<p class="artisan-detail-title">' +
      esc(a.title || '') +
      '</p>' +
      '<p class="artisan-detail-intro">' +
      esc(a.bio || '') +
      '</p>' +
      (tags ? '<div class="artisan-detail-tags">' + tags + '</div>' : '') +
      '</div></div>' +
      (portfolio
        ? '<div class="detail-block"><h2>代表作品</h2><div class="works-grid">' +
          portfolio +
          '</div></div>'
        : '') +
      contactHtml +
      wechatHtml +
      '<p class="detail-back"><a href="artisans.html" class="btn btn-outline">← 返回手艺人列表</a></p>';
  }

  if (!id || !base) {
    root.innerHTML = '<p class="section-desc">参数错误或后台未配置</p>';
    return;
  }

  fetch(base + '/api/artisans/' + encodeURIComponent(id))
    .then(function (r) {
      return r.json();
    })
    .then(function (res) {
      if (!res.ok || !res.data) {
        root.innerHTML = '<p class="section-desc">未找到该手艺人</p>';
        return;
      }
      renderDetail(res.data);
    })
    .catch(function () {
      root.innerHTML = '<p class="section-desc">加载失败，请稍后重试</p>';
    });
})();
