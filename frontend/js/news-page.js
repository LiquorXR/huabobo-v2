/**
 * 新闻资讯 — 对接后台 GET /api/news（每页 5 条）
 * 结构须与 style.css 中 .news-item > .news-thumb + .news-body 一致
 */
(function () {
  var PAGE_SIZE = 5;
  var listRoot = document.querySelector('.news-list');
  var pagerRoot = document.getElementById('news-pager');
  if (!listRoot) return;

  var BASE =
    window.ZJS && ZJS.USE_BACKEND && ZJS.API_BASE
      ? ZJS.API_BASE.replace(/\/$/, '')
      : null;

  var FALLBACK_NEWS = [
    {
      id: '',
      title: '指间塑文化传播平台正式上线',
      summary:
        '以「年轻态传播胶东花饽饽」为使命，平台同步开放数字化体验预约与手艺人合作通道，欢迎各界关注。',
      image: 'images/news-1.jpg',
      publishedAt: '2026-05-18'
    },
    {
      id: '',
      title: '胶东花饽饽专题展亮相非遗博览会',
      summary:
        '指间塑携合作手艺人代表作及 AR 互动装置参展，现场吸引超万人次体验，社交媒体话题阅读量破百万。',
      image: 'images/news-2.jpg',
      publishedAt: '2026-04-22'
    },
    {
      id: '',
      title: '春季校园公益行启动 · 首站威海',
      summary:
        '「指尖上的非遗」走进 6 所中小学，孩子们完成人生第一只面塑作品，数字化课件获教师好评。',
      image: 'images/news-3.jpg',
      publishedAt: '2026-03-10'
    }
  ];

  function escapeHtml(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function resolveImageUrl(url) {
    var img = url || 'images/news-1.jpg';
    if (img.indexOf('http') === 0 && img.indexOf('/images/') > 0) {
      img = img.slice(img.indexOf('/images/'));
    }
    return img;
  }

  function getPageFromUrl() {
    var p = parseInt(new URLSearchParams(window.location.search).get('page'), 10);
    return p > 0 ? p : 1;
  }

  function setPageInUrl(page) {
    var url = new URL(window.location.href);
    if (page <= 1) url.searchParams.delete('page');
    else url.searchParams.set('page', String(page));
    var next = url.pathname + url.search + url.hash;
    if (next !== window.location.pathname + window.location.search + window.location.hash) {
      window.history.replaceState(null, '', next);
    }
  }

  function renderNewsItem(n) {
    var img = resolveImageUrl(n.image);
    var summary = n.summary || '';
    var href = n.id
      ? 'news-detail.html?id=' + encodeURIComponent(n.id)
      : 'news.html';
    var tag = n.id ? 'a' : 'article';
    var extraClass = n.id ? ' news-item-link' : '';
    return (
      '<' +
      tag +
      (n.id ? ' href="' + href + '"' : '') +
      ' class="news-item' +
      extraClass +
      '">' +
      '<div class="news-thumb"><img src="' +
      img +
      '" alt="" loading="lazy" decoding="async"></div>' +
      '<div class="news-body">' +
      '<time class="news-date">' +
      escapeHtml(n.publishedAt || '') +
      '</time>' +
      '<h3>' +
      escapeHtml(n.title) +
      '</h3>' +
      '<p>' +
      escapeHtml(summary) +
      '</p></div></' +
      tag +
      '>'
    );
  }

  function renderList(list) {
    listRoot.innerHTML = list.map(renderNewsItem).join('');
  }

  function hidePager() {
    if (pagerRoot) pagerRoot.hidden = true;
  }

  function renderPager(meta, page, onPage) {
    if (!pagerRoot) return;
    var pages = meta.pages || 1;
    var total = meta.total || 0;
    if (total <= PAGE_SIZE) {
      hidePager();
      return;
    }

    pagerRoot.hidden = false;
    pagerRoot.innerHTML =
      '<span class="news-pager-info">共 ' +
      total +
      ' 条 · 第 ' +
      page +
      ' / ' +
      pages +
      ' 页</span>' +
      '<div class="news-pager-actions">' +
      '<button type="button" class="btn btn-outline news-pager-btn" data-pager="prev"' +
      (page <= 1 ? ' disabled' : '') +
      '>上一页</button>' +
      '<button type="button" class="btn btn-outline news-pager-btn" data-pager="next"' +
      (page >= pages ? ' disabled' : '') +
      '>下一页</button>' +
      '</div>';

    pagerRoot.querySelectorAll('[data-pager]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.disabled) return;
        var next = btn.getAttribute('data-pager') === 'next' ? page + 1 : page - 1;
        onPage(next);
      });
    });
  }

  function loadNewsPage(page) {
    listRoot.innerHTML = '<p class="section-desc">正在加载新闻…</p>';
    hidePager();

    fetch(BASE + '/api/news?limit=' + PAGE_SIZE + '&page=' + page)
      .then(function (r) {
        return r.json();
      })
      .then(function (res) {
        if (!res.ok || !res.data) {
          renderList(FALLBACK_NEWS);
          hidePager();
          return;
        }

        var data = res.data;
        var list = data.list || [];
        var total = data.total || 0;

        if (!list.length && total > 0 && page > 1) {
          loadNewsPage(page - 1);
          return;
        }

        if (!total) {
          listRoot.innerHTML = '<p class="section-desc">暂无新闻</p>';
          hidePager();
          return;
        }

        renderList(list);
        renderPager(data, page, loadNewsPage);
        setPageInUrl(page);

        var panel = listRoot.closest('.news-panel') || listRoot;
        if (panel && page > 1) {
          panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      })
      .catch(function () {
        renderList(FALLBACK_NEWS);
        hidePager();
      });
  }

  if (!BASE) {
    renderList(FALLBACK_NEWS);
    hidePager();
    return;
  }

  loadNewsPage(getPageFromUrl());
})();
