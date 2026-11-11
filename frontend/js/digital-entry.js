/**
 * 数字化体验 —「开始体验」登录校验
 */
(function () {
  var btn = document.getElementById('btn-start-diy');
  if (!btn) return;

  btn.addEventListener('click', function (e) {
    e.preventDefault();
    if (typeof Api !== 'undefined' && Api.isLoggedIn && Api.isLoggedIn()) {
      window.location.href = 'studio.html';
      return;
    }
    var msg = ZJS.t
      ? ZJS.t('digital.startConfirm')
      : '体验 3D 面塑 DIY 工作台需要先登录或注册。\n\n点击「确定」前往登录页。';
    if (confirm(msg)) {
      window.location.href = 'login.html?return=studio';
    }
  });
})();
