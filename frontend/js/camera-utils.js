/**
 * 摄像头获取：多策略回退，兼容无后置摄像头、外置摄像头等环境
 */
(function () {
  window.ZJS = window.ZJS || {};

  function friendlyCameraError(err) {
    var name = err && err.name;
    var msg = (err && err.message) || '';
    if (name === 'NotFoundError' || /not found/i.test(msg)) {
      return '未检测到可用摄像头。请确认电脑已连接摄像头（或本机自带摄像头未被禁用），并关闭占用摄像头的其他软件后重试。';
    }
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return '摄像头权限被拒绝。请在浏览器地址栏允许摄像头，并在 Mac「系统设置 → 隐私与安全性 → 相机」中勾选 Chrome。';
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return '摄像头正被其他程序占用，请关闭视频会议、微信视频等后重试。';
    }
    if (name === 'SecurityError' || name === 'NotSupportedError') {
      if (location.protocol === 'file:') {
        return '当前为本地文件打开，请用 http://127.0.0.1 访问本站（勿直接双击 HTML）。';
      }
      if (location.protocol === 'http:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        return '请使用 https://' + (location.hostname || '您的域名') + ' 打开本站（须配置 SSL 证书）。';
      }
      return '当前页面无法调用摄像头，请检查是否使用 HTTPS 或本地 http://127.0.0.1。';
    }
    if (msg) return msg;
    return '无法打开摄像头，请检查设备与权限。';
  }

  function legacyGetUserMedia(constraints) {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      return navigator.mediaDevices.getUserMedia(constraints);
    }
    var legacy =
      navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    if (!legacy) {
      return Promise.reject(new Error('浏览器不支持摄像头，请使用 Chrome 或 Edge'));
    }
    return new Promise(function (resolve, reject) {
      legacy.call(navigator, constraints, resolve, reject);
    });
  }

  function tryGetUserMedia(constraints) {
    return legacyGetUserMedia(constraints);
  }

  function listVideoInputs() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return Promise.resolve([]);
    }
    return navigator.mediaDevices.enumerateDevices().then(function (devices) {
      return devices.filter(function (d) {
        return d.kind === 'videoinput';
      });
    });
  }

  /**
   * @param {{ preferEnvironment?: boolean }} opts
   * @returns {Promise<MediaStream>}
   */
  function requestVideoStream(opts) {
    opts = opts || {};

    if (location.protocol === 'file:') {
      return Promise.reject(
        new Error('当前为本地文件地址，须通过 http://127.0.0.1 打开页面后才能使用摄像头。')
      );
    }
    if (
      !window.isSecureContext &&
      location.protocol === 'http:' &&
      location.hostname !== 'localhost' &&
      location.hostname !== '127.0.0.1'
    ) {
      return Promise.reject(
        new Error(
          '请使用 https://' + location.hostname + ' 打开本站。HTTP 域名下浏览器禁止摄像头与手势识别。'
        )
      );
    }

    var attempts = [];

    if (opts.preferEnvironment) {
      attempts.push({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      attempts.push({ video: { facingMode: 'user' }, audio: false });
    } else {
      attempts.push({ video: true, audio: false });
      attempts.push({ video: { facingMode: 'user' }, audio: false });
    }

    attempts.push({
      video: { width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false
    });

    function trySequence(i) {
      if (i >= attempts.length) {
        return listVideoInputs().then(function (inputs) {
          if (!inputs.length) {
            return Promise.reject(new Error('NotFoundError'));
          }
          return tryGetUserMedia({
            video: { deviceId: { exact: inputs[0].deviceId } },
            audio: false
          });
        });
      }
      return tryGetUserMedia(attempts[i]).catch(function () {
        return trySequence(i + 1);
      });
    }

    return trySequence(0);
  }

  ZJS.Camera = {
    requestVideoStream: requestVideoStream,
    friendlyCameraError: friendlyCameraError
  };
})();
