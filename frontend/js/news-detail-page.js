(function () {
  var root = document.getElementById('news-detail-root');
  if (!root || !window.ZJS) return;

  var id = ZJS.getQuery('id');
  if (!id) {
    root.innerHTML = '<p class="section-desc">未指定新闻 ID</p>';
    return;
  }

  if (!Api.getNewsDetail) {
    root.innerHTML = '<p class="section-desc">请启用后台接口（api-config.js）</p>';
    return;
  }

  Api.getNewsDetail(id).then(function (n) {
    if (!n) {
      root.innerHTML = '<p class="section-desc">文章不存在</p>';
      return;
    }
    document.title = n.title + ' — 指间塑';
    root.innerHTML =
      '<article class="news-detail">' +
      '<header class="news-detail-header">' +
      '<h1 class="news-detail-title">' +
      (n.title || '') +
      '</h1>' +
      '<time class="news-date news-detail-date">' +
      (n.publishedAt || '') +
      '</time>' +
      '</header>' +
      (n.image ? '<figure class="news-detail-cover"><img src="' + n.image + '" alt=""></figure>' : '') +
      '<p class="news-detail-summary">' +
      (n.summary || '') +
      '</p>' +
      '<div class="news-detail-content">' +
      (n.contentHtml || n.content || '') +
      '</div></article>';
  });
})();
