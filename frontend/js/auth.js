/**
 * 登录 / 注册 — 对接后台 POST /api/users/register、/api/users/login
 */
(function () {
  var loginForm = document.getElementById('login-form');
  var registerForm = document.getElementById('register-form');
  var authError = document.getElementById('auth-error');

  function showError(msg) {
    if (authError) {
      authError.textContent = msg || '';
      authError.hidden = !msg;
    } else if (msg) {
      alert(msg);
    }
  }

  function setSubmitting(form, loading) {
    var btn = form && form.querySelector('button[type="submit"]');
    if (!btn) return;
    btn.disabled = !!loading;
    btn.textContent = loading ? btn.getAttribute('data-loading') || '提交中…' : btn.getAttribute('data-label') || '提交';
  }

  function initSubmitBtn(form, label, loadingLabel) {
    var btn = form && form.querySelector('button[type="submit"]');
    if (!btn) return;
    btn.setAttribute('data-label', label);
    btn.setAttribute('data-loading', loadingLabel);
  }

  function normalizePhone(raw) {
    return String(raw || '').trim().replace(/\s/g, '');
  }

  function afterAuthSuccess(userId, isRegister) {
    var ret = ZJS.getQuery && ZJS.getQuery('return');
    if (ret === 'studio') {
      if (isRegister) alert('注册成功！即将进入 DIY 体验。');
      window.location.href = 'studio.html';
      return;
    }
    if (isRegister) alert('注册成功！');
    window.location.href =
      'profile.html?id=' + encodeURIComponent(userId || 'me');
  }

  if (registerForm) {
    initSubmitBtn(registerForm, '注册', '注册中…');
    registerForm.addEventListener('submit', function (e) {
      e.preventDefault();
      showError('');
      if (!window.Api || !Api.registerUser) {
        showError('数据服务未加载，请刷新页面或检查 api-config.js');
        return;
      }
      var fd = new FormData(registerForm);
      var phone = normalizePhone(fd.get('phone'));
      var password = fd.get('password');
      if (!/^1\d{10}$/.test(phone)) {
        showError('请输入正确的 11 位手机号（1 开头）');
        return;
      }
      if (!password || String(password).length < 6) {
        showError('密码至少 6 位');
        return;
      }
      setSubmitting(registerForm, true);
      Api.registerUser({
        nickname: fd.get('nickname'),
        phone: phone,
        password: password
      })
        .then(function (res) {
          if (res.ok && res.userId) {
            sessionStorage.setItem('zhijiansu_user_id', res.userId);
            afterAuthSuccess(res.userId, true);
          } else {
            showError(res.message || '注册失败');
          }
        })
        .catch(function (err) {
          showError((err && err.message) || '注册失败');
        })
        .finally(function () {
          setSubmitting(registerForm, false);
        });
    });
  }

  if (loginForm) {
    initSubmitBtn(loginForm, '登录', '登录中…');
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      showError('');
      if (!window.Api || !Api.login) {
        showError('数据服务未加载，请刷新页面或检查 api-config.js');
        return;
      }
      var fd = new FormData(loginForm);
      var phone = normalizePhone(fd.get('phone'));
      var password = fd.get('password');
      if (!/^1\d{10}$/.test(phone)) {
        showError('请输入正确的 11 位手机号（1 开头）');
        return;
      }
      if (!password) {
        showError('请输入密码');
        return;
      }
      setSubmitting(loginForm, true);
      Api.login(phone, password)
        .then(function (res) {
          if (res.ok && res.userId) {
            sessionStorage.setItem('zhijiansu_user_id', res.userId);
            afterAuthSuccess(res.userId, false);
          } else {
            showError(res.message || '登录失败');
          }
        })
        .catch(function (err) {
          showError((err && err.message) || '登录失败');
        })
        .finally(function () {
          setSubmitting(loginForm, false);
        });
    });
  }
})();
