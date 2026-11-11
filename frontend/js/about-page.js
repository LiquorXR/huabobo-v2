/**
 * 关于我们 — 对接 GET /api/about
 */
(function () {
  function esc(s) {
    if (window.ZJS && ZJS.escapeHtml) return ZJS.escapeHtml(s || '');
    var d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

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

  function renderAbout(d) {
    if (!d) return;

    var heroTitle = document.getElementById('about-hero-title');
    var heroSub = document.getElementById('about-hero-subtitle');
    if (heroTitle) heroTitle.textContent = d.heroTitle || '关于我们';
    if (heroSub) heroSub.textContent = d.heroSubtitle || '';

    var introTitle = document.getElementById('about-intro-title');
    if (introTitle) introTitle.textContent = d.introTitle || '平台简介';
    renderParagraphs(d.introText, document.getElementById('about-intro-text'));

    var valuesEl = document.getElementById('about-values');
    if (valuesEl) {
      valuesEl.innerHTML = (d.values || [])
        .map(function (v) {
          return '<span class="value-pill">' + esc(v) + '</span>';
        })
        .join('');
    }

    var introImg = document.getElementById('about-intro-image');
    if (introImg && d.introImage) {
      introImg.src = d.introImage;
      introImg.alt = d.introTitle || '指间塑';
    }

    var printTitle = document.getElementById('about-print-title');
    var printDesc = document.getElementById('about-print-desc');
    var printGrid = document.getElementById('about-print-grid');
    var printSection = document.getElementById('about-print-section');
    if (printTitle) printTitle.textContent = d.printSectionTitle || '可打印作品展示';
    if (printDesc) printDesc.textContent = d.printSectionDesc || '';

    var works = (d.printWorks || []).filter(function (w) {
      return w && (w.title || w.image);
    });
    if (printGrid) {
      if (!works.length) {
        printGrid.innerHTML = '<p class="section-desc">暂无展示作品</p>';
      } else {
        printGrid.innerHTML = works
          .map(function (w) {
            return (
              '<article class="about-print-card">' +
              (w.image
                ? '<img src="' + esc(w.image) + '" alt="' + esc(w.title) + '" loading="lazy">'
                : '') +
              '<h3>' +
              esc(w.title) +
              '</h3>' +
              '<p>' +
              esc(w.desc) +
              '</p></article>'
            );
          })
          .join('');
      }
    }
    if (printSection) printSection.hidden = false;

    var c = d.contact || {};
    var noteEl = document.getElementById('about-contact-note');
    if (noteEl) noteEl.textContent = c.note || '';
    var listEl = document.getElementById('about-contact-list');
    if (listEl) {
      listEl.innerHTML =
        (c.email ? '<li><strong>邮箱</strong> ' + esc(c.email) + '</li>' : '') +
        (c.wechat ? '<li><strong>微信</strong> ' + esc(c.wechat) + '</li>' : '') +
        (c.address ? '<li><strong>地址</strong> ' + esc(c.address) + '</li>' : '') +
        (c.hours ? '<li><strong>工作时间</strong> ' + esc(c.hours) + '</li>' : '');
    }

    var joinTitle = document.getElementById('about-join-title');
    var joinText = document.getElementById('about-join-text');
    if (joinTitle) joinTitle.textContent = d.joinTitle || '加入我们';
    if (joinText) {
      joinText.style.color = 'var(--ink-soft)';
      joinText.textContent = d.joinText || '';
    }
  }

  function loadAbout() {
    var base =
      window.ZJS && ZJS.API_BASE && ZJS.USE_BACKEND
        ? ZJS.API_BASE.replace(/\/$/, '')
        : '';
    if (!base) return;

    fetch(base + '/api/about')
      .then(function (r) {
        return r.json();
      })
      .then(function (res) {
        if (res && res.ok && res.data) renderAbout(res.data);
      })
      .catch(function () {
        var heroSub = document.getElementById('about-hero-subtitle');
        if (heroSub) heroSub.textContent = '内容加载失败，请稍后刷新';
      });
  }

  if (document.getElementById('about-page')) {
    loadAbout();
  }
})();
