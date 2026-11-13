/**
 * 首页整合板块 — 新闻资讯（最新 3 条）+ 关于我们（平台简介/联系/可打印展示）
 * 数据源与独立页逻辑一致：GET /api/news?limit=3、GET /api/about；无后端时用静态兜底
 */
(function () {
  function esc(s) {
    if (window.ZJS && ZJS.escapeHtml) return ZJS.escapeHtml(s || '');
    var d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function apiBase() {
    if (window.ZJS && ZJS.USE_BACKEND && ZJS.API_BASE) return ZJS.API_BASE.replace(/\/$/, '');
    return '';
  }

  /* —— 新闻资讯 —— */
  var FALLBACK_NEWS = [
    {
      id: '',
      title: '指间塑文化传播平台正式上线',
      summary: '以「年轻态传播胶东花饽饽」为使命，平台同步开放数字化体验预约与手艺人合作通道，欢迎各界关注。',
      image: 'images/news-1.jpg',
      publishedAt: '2026-05-18'
    },
    {
      id: '',
      title: '胶东花饽饽专题展亮相非遗博览会',
      summary: '指间塑携合作手艺人代表作及 AR 互动装置参展，现场吸引超万人次体验，社交媒体话题阅读量破百万。',
      image: 'images/news-2.jpg',
      publishedAt: '2026-04-22'
    },
    {
      id: '',
      title: '春季校园公益行启动 · 首站威海',
      summary: '「指尖上的非遗」走进 6 所中小学，孩子们完成人生第一只面塑作品，数字化课件获教师好评。',
      image: 'images/news-3.jpg',
      publishedAt: '2026-03-10'
    }
  ];

  function renderNewsItem(n) {
    var img = n.image || 'images/news-1.jpg';
    var body =
      '<div class="news-thumb"><img src="' +
      esc(img) +
      '" alt="" loading="lazy" decoding="async"></div>' +
      '<div class="news-body"><time class="news-date">' +
      esc(n.publishedAt || '') +
      '</time><h3>' +
      esc(n.title) +
      '</h3><p>' +
      esc(n.summary || '') +
      '</p></div>';
    if (n.id) {
      return (
        '<a href="news-detail.html?id=' +
        encodeURIComponent(n.id) +
        '" class="news-item news-item-link">' +
        body +
        '</a>'
      );
    }
    return '<article class="news-item">' + body + '</article>';
  }

  function renderNews(list) {
    var root = document.getElementById('home-news-list');
    if (!root) return;
    if (!list || !list.length) {
      root.innerHTML = '<p class="section-desc">暂无新闻</p>';
      return;
    }
    root.innerHTML = list.slice(0, 3).map(renderNewsItem).join('');
  }

  function loadHomeNews() {
    if (!document.getElementById('home-news-list')) return;
    var base = apiBase();
    if (!base) {
      renderNews(FALLBACK_NEWS);
      return;
    }
    fetch(base + '/api/news?limit=3')
      .then(function (r) {
        return r.json();
      })
      .then(function (res) {
        var list = res && res.data && res.data.list;
        renderNews(list && list.length ? list : FALLBACK_NEWS);
      })
      .catch(function () {
        renderNews(FALLBACK_NEWS);
      });
  }

  /* —— 关于我们 —— */
  var FALLBACK_ABOUT_TEXT =
    '指间塑是一个面向 Z 世代的胶东花饽饽文化传播平台。我们用更潮的视觉、更轻的叙事，让这门指尖上的非遗，从乡间灶台走进你的屏幕与日常。\n\n从文化渊源到制作工艺，从节庆摆盘到当代国潮美学，指间塑连接匠人与年轻人，让手艺被看见、被喜欢、被传承。';

  function renderParagraphs(text, container) {
    if (!container) return;
    var parts = String(text || '')
      .split(/\n\s*\n/)
      .map(function (p) {
        return p.trim();
      })
      .filter(Boolean);
    if (!parts.length) {
      container.innerHTML = '';
      return;
    }
    container.innerHTML = parts
      .map(function (p) {
        return '<p style="color: var(--ink-soft); margin-bottom: 16px;">' + esc(p) + '</p>';
      })
      .join('');
  }

  function renderHomeAbout(d) {
    if (!d) return;
    var sub = document.getElementById('home-about-hero-subtitle');
    if (sub && d.heroSubtitle) sub.textContent = d.heroSubtitle;
    var introTitle = document.getElementById('home-about-intro-title');
    if (introTitle) introTitle.textContent = d.introTitle || '平台简介';
    renderParagraphs(d.introText || FALLBACK_ABOUT_TEXT, document.getElementById('home-about-intro-text'));
    var valuesEl = document.getElementById('home-about-values');
    if (valuesEl) {
      valuesEl.innerHTML = (d.values || [])
        .map(function (v) {
          return '<span class="value-pill">' + esc(v) + '</span>';
        })
        .join('');
    }
    var introImg = document.getElementById('home-about-image');
    if (introImg && d.introImage) {
      introImg.src = d.introImage;
      introImg.alt = d.introTitle || '指间塑';
    }
    var printTitle = document.getElementById('home-about-print-title');
    var printDesc = document.getElementById('home-about-print-desc');
    var printGrid = document.getElementById('home-about-print-grid');
    if (printTitle) printTitle.textContent = d.printSectionTitle || '可打印作品展示';
    if (printDesc) printDesc.textContent = d.printSectionDesc || '';
    if (printGrid) {
      var works = (d.printWorks || []).filter(function (w) {
        return w && (w.title || w.image);
      });
      if (!works.length) {
        printGrid.innerHTML = '<p class="section-desc">暂无展示作品</p>';
      } else {
        printGrid.innerHTML = works
          .map(function (w) {
            return (
              '<article class="about-print-card">' +
              (w.image ? '<img src="' + esc(w.image) + '" alt="' + esc(w.title) + '" loading="lazy">' : '') +
              '<h3>' +
              esc(w.title) +
              '</h3><p>' +
              esc(w.desc) +
              '</p></article>'
            );
          })
          .join('');
      }
    }
    var c = d.contact || {};
    var noteEl = document.getElementById('home-about-contact-note');
    if (noteEl) noteEl.textContent = c.note || '';
    var listEl = document.getElementById('home-about-contact-list');
    if (listEl) {
      listEl.innerHTML =
        (c.email ? '<li><strong>邮箱</strong> ' + esc(c.email) + '</li>' : '') +
        (c.wechat ? '<li><strong>微信</strong> ' + esc(c.wechat) + '</li>' : '') +
        (c.address ? '<li><strong>地址</strong> ' + esc(c.address) + '</li>' : '') +
        (c.hours ? '<li><strong>工作时间</strong> ' + esc(c.hours) + '</li>' : '');
    }
    var joinTitle = document.getElementById('home-about-join-title');
    var joinText = document.getElementById('home-about-join-text');
    if (joinTitle) joinTitle.textContent = d.joinTitle || '加入我们';
    if (joinText) {
      joinText.style.color = 'var(--ink-soft)';
      joinText.textContent = d.joinText || '';
    }
  }

  function loadHomeAbout() {
    if (!document.getElementById('home-about-intro-text')) return;
    renderParagraphs(FALLBACK_ABOUT_TEXT, document.getElementById('home-about-intro-text'));
    var base = apiBase();
    if (!base) return;
    fetch(base + '/api/about')
      .then(function (r) {
        return r.json();
      })
      .then(function (res) {
        if (res && res.ok && res.data) renderHomeAbout(res.data);
      })
      .catch(function () {});
  }

  loadHomeNews();
  loadHomeAbout();
})();
