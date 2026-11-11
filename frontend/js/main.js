/**
 * 指间塑 — 全站通用脚本（非 SPA，仅导航高亮与移动端菜单）
 */
(function () {
  var nav = document.querySelector('.main-nav');
  var toggle = document.querySelector('.nav-toggle');
  if (!nav) return;

  var page = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var links = nav.querySelectorAll('a');
  var queryId = window.ZJS && ZJS.getQuery ? ZJS.getQuery('id') : null;

  links.forEach(function (link) {
    var href = (link.getAttribute('href') || '').toLowerCase();
    var match = href === page || (page === '' && href === 'index.html');
    if (page === 'profile.html' && href === 'artisans.html' && queryId && /^a\d/.test(queryId)) {
      match = true;
    }
    if ((page === 'profile.html' || page === 'work.html') && href === 'gallery.html' && queryId && /^u/.test(queryId) && queryId !== 'me') {
      match = true;
    }
    if (page === 'work.html' && href === 'gallery.html') match = true;
    if (match) link.classList.add('is-active');
  });

  var loginBtn = document.querySelector('.btn-login');
  var registerBtn = document.querySelector('.btn-register');
  var mineBtn = document.querySelector('.nav-mine');
  if (page === 'login.html' && loginBtn) loginBtn.classList.add('is-active');
  if (page === 'register.html' && registerBtn) registerBtn.classList.add('is-active');
  if ((page === 'profile.html' && queryId === 'me') || page === 'my.html') {
    if (mineBtn) mineBtn.classList.add('is-active');
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      toggle.classList.toggle('is-open');
      nav.classList.toggle('is-open');
    });
    links.forEach(function (link) {
      link.addEventListener('click', function () {
        toggle.classList.remove('is-open');
        nav.classList.remove('is-open');
      });
    });
  }
})();
