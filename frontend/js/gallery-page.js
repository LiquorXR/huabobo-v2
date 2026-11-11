/**
 * 数字化展厅 — 唯一渲染路径（任意入口、任意打开方式效果一致）
 */
(function () {
  var root = document.getElementById('gallery-masonry');
  if (!root) return;

  function t(key, vars) {
    return ZJS.t ? ZJS.t(key, vars) : key;
  }

  if (root.querySelector('.section-desc')) {
    root.querySelector('.section-desc').textContent = t('gallery.loading');
  }

  (function initGalleryPage() {
    try {
      sessionStorage.setItem('zhijiansu_site_base', ZJS.getSiteBase());
    } catch (e) {}
    try {
      if (location.search && window.history && window.history.replaceState) {
        var path = location.pathname || 'gallery.html';
        var file = path.indexOf('/') >= 0 ? path.substring(path.lastIndexOf('/') + 1) : path;
        if (!publishedHighlightId) {
          window.history.replaceState({}, '', file || 'gallery.html');
        }
      }
    } catch (e) {}
    document.body.classList.add('page-gallery');
  })();

  var publishedHighlightId = typeof ZJS !== 'undefined' && ZJS.getQuery ? ZJS.getQuery('published') : null;

  var searchInput = document.getElementById('gallery-search-input');
  var searchClear = document.getElementById('gallery-search-clear');
  var searchHint = document.getElementById('gallery-search-hint');

  var allWorks = [];
  var userMap = {};
  var engageMap = {};

  var engageState = {
    engageMap: engageMap,
    openCommentsId: null,
    updateCard: null
  };

  function authorSearchText(user) {
    if (!user) return '';
    return [user.handle, user.name].filter(Boolean).join(' ');
  }

  function workMatchesQuery(work, q) {
    if (!q) return true;
    var author = userMap[work.userId];
    var haystack = (work.title + ' ' + authorSearchText(author)).toLowerCase();
    return haystack.indexOf(q) !== -1;
  }

  function getEng(workId) {
    return (
      engageMap[workId] || {
        likeCount: 0,
        likedByMe: false,
        commentCount: 0,
        comments: []
      }
    );
  }

  /** 与入口无关：所有作品同一套卡片参数 */
  function renderWorkCard(w) {
    var author = userMap[w.userId];
    return ZJS.renderGalleryWorkCard(w, author, getEng(w.id), {
      mode: 'card',
      commentsExpanded: false,
      highlight: false,
      showDetailLink: true
    });
  }

  function renderGallery(list, query) {
    if (!list.length) {
      root.innerHTML =
        '<p class="gallery-empty">' +
        (query
          ? ZJS.escapeHtml(t('gallery.emptySearch', { q: query }))
          : ZJS.escapeHtml(t('gallery.empty'))) +
        '</p>';
      if (searchHint) searchHint.textContent = query ? t('gallery.countZero') : '';
      return;
    }

    root.innerHTML = list.map(renderWorkCard).join('');
    if (searchHint) {
      var total = allWorks.length;
      searchHint.textContent = query
        ? t('gallery.countFound', { n: list.length, t: total })
        : t('gallery.countAll', { n: total });
    }
  }

  function applySearch() {
    var raw = searchInput ? searchInput.value.trim() : '';
    var q = raw.toLowerCase();
    if (searchClear) searchClear.hidden = !raw;
    renderGallery(
      allWorks.filter(function (w) {
        return workMatchesQuery(w, q);
      }),
      raw
    );
  }

  function setupSearch() {
    if (!searchInput) return;
    searchInput.addEventListener('input', applySearch);
    searchInput.addEventListener('search', applySearch);
    if (searchClear) {
      searchClear.addEventListener('click', function () {
        searchInput.value = '';
        searchInput.focus();
        applySearch();
      });
    }
  }

  ZJS.bindGalleryEngage(root, engageState);

  function warnApiIfNeeded() {
    if (!window.ZJS || !ZJS.API_BASE) return;
    var base = ZJS.API_BASE.replace(/\/$/, '');
    fetch(base + '/api/health', { method: 'GET' })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (!data || !data.ok) throw new Error('health');
      })
      .catch(function () {
        var tip =
          '无法连接后台 API（' +
          base +
          '）。展厅点赞/留言需要接口：请确认 Node 已启动、已部署 engagement 路由，' +
          (location.protocol === 'https:'
            ? 'HTTPS 站点须在 Nginx 配置 /api 反代到 3000 端口（见 部署/nginx-域名与API反代.conf）。'
            : '并在安全组放行 3000 端口。');
        if (searchHint) searchHint.textContent = tip;
        console.warn('[gallery]', tip);
      });
  }
  warnApiIfNeeded();

  Api.getPublishedWorks().then(function (works) {
    allWorks = works;
    var userIds = {};
    works.forEach(function (w) {
      userIds[w.userId] = true;
    });

    Promise.all([
      Promise.all(
        Object.keys(userIds).map(function (uid) {
          return Api.getUser(uid).then(function (u) {
            return { id: uid, user: u };
          });
        })
      ),
      Api.getEngagementMap(
        works.map(function (w) {
          return w.id;
        })
      )
    ]).then(function (results) {
      results[0].forEach(function (p) {
        userMap[p.id] = p.user;
      });
      engageMap = results[1];
      engageState.engageMap = engageMap;
      engageState.openCommentsId = null;
      setupSearch();
      var loading = root.querySelector('.section-desc');
      if (loading) loading.remove();
      applySearch();
      if (publishedHighlightId) {
        var card = root.querySelector('.gallery-item[data-work-id="' + publishedHighlightId + '"]');
        if (card) {
          card.style.outline = '3px solid rgba(196, 30, 58, 0.75)';
          card.style.outlineOffset = '4px';
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        try {
          var path = location.pathname || 'gallery.html';
          var file = path.indexOf('/') >= 0 ? path.substring(path.lastIndexOf('/') + 1) : path;
          window.history.replaceState({}, '', file || 'gallery.html');
        } catch (e2) {}
      }
    });
  });

  window.addEventListener('zhijiansu:langchange', function () {
    applySearch();
    if (ZJS.applyI18n) ZJS.applyI18n();
  });
})();
