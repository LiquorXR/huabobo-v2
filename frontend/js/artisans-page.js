/**
 * 合作手艺人列表 — 动态渲染
 */
(function () {
  var root = document.getElementById('artisans-list');
  if (!root) return;

  Api.getArtisans().then(function (list) {
    if (!list || !list.length) {
      root.innerHTML =
        '<p class="section-desc">暂无合作艺人数据。请在服务器后台目录执行 <code>npm run seed</code> 后重启 Node，或登录管理后台添加。</p>';
      return;
    }
    root.innerHTML = list.map(function (a) {
      var href =
        a.type === 'cooperative'
          ? 'artisan-co.html?id=' + encodeURIComponent(a.id)
          : ZJS.profileUrl(a.id);
      var img =
        (ZJS.normalizeWorkImageUrl
          ? ZJS.normalizeWorkImageUrl(a.avatar || a.image)
          : a.avatar || a.image) || 'images/artisan-1.jpg';
      return '<a href="' + href + '" class="artisan-card">' +
        '<div class="artisan-avatar"><img src="' +
        ZJS.escapeAttr(img) +
        '" alt="' +
        ZJS.escapeHtml(a.name) +
        '" loading="lazy"></div>' +
        '<div class="artisan-info"><h3>' + ZJS.escapeHtml(a.name) + ' · ' + ZJS.escapeHtml((a.title || '').split('·')[0].trim()) + '</h3>' +
        '<p class="artisan-meta">' + ZJS.escapeHtml(a.title || '') + '</p>' +
        '<p>' + ZJS.escapeHtml(a.bio) + '</p>' +
        '<span class="artisan-more">' +
        (ZJS.t ? ZJS.t('artisans.more') : '查看详情 →') +
        '</span></div></a>';
    }).join('');
  });
})();
