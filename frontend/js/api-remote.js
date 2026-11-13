/**
 * 对接 Node 后台 API（需在 api-config.js 中开启 USE_BACKEND）
 * 在 api.js 之后加载，覆盖部分 Api 方法
 */
(function () {
  if (!window.ZJS || !ZJS.USE_BACKEND || !ZJS.API_BASE) return;
  if (!window.Api) return;

  var BASE = ZJS.API_BASE.replace(/\/$/, '');

  function friendlyFetchError(err) {
    var msg = (err && err.message) || '请求失败';
    if (msg === 'Failed to fetch' || msg.indexOf('NetworkError') >= 0) {
      return (
        '无法连接后台（' +
        BASE +
        '）。请打开 ' +
        BASE +
        '/api/health 测试。域名访问须 Nginx 反代 /api 到 127.0.0.1:3000，并确认 Node 已启动'
      );
    }
    return msg;
  }

  function http(path, options) {
    options = options || {};
    var headers = options.headers || {};
    var token = getAuthToken();
    if (token && !headers.Authorization) {
      headers.Authorization = 'Bearer ' + token;
    }
    if (options.json) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.json);
    }
    return fetch(BASE + path, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body
    })
      .then(function (res) {
        return res.text().then(function (text) {
          var data;
          try {
            data = text ? JSON.parse(text) : {};
          } catch (e2) {
            throw new Error('后台返回格式异常，请确认 API 地址正确');
          }
          if (!res.ok) {
            var err = new Error((data && data.message) || '请求失败');
            err.data = data;
            throw err;
          }
          return data;
        });
      })
      .catch(function (err) {
        if (err.message === 'Failed to fetch' || err.message.indexOf('NetworkError') >= 0) {
          throw new Error(friendlyFetchError(err));
        }
        throw err;
      });
  }

  function delay(data) {
    return Promise.resolve(data);
  }

  var USER_CACHE_KEY = 'zhijiansu_user_profile';
  var USER_OVERRIDE_KEY = 'zhijiansu_user_overrides';
  var TOKEN_KEY = 'zhijiansu_user_token';

  function getAuthToken() {
    try {
      return sessionStorage.getItem(TOKEN_KEY) || '';
    } catch (e) {
      return '';
    }
  }

  function setAuthToken(t) {
    try {
      if (t) sessionStorage.setItem(TOKEN_KEY, t);
      else sessionStorage.removeItem(TOKEN_KEY);
    } catch (e) {}
  }

  Api.getAuthToken = getAuthToken;

  function applyLocalProfileOverride(user) {
    if (!user) return user;
    try {
      var raw = localStorage.getItem(USER_OVERRIDE_KEY);
      if (!raw) return user;
      var map = JSON.parse(raw);
      if (map[user.id]) return Object.assign({}, user, map[user.id]);
    } catch (e) {}
    return user;
  }

  function clearLocalProfileOverride(userId) {
    try {
      var raw = localStorage.getItem(USER_OVERRIDE_KEY);
      if (!raw) return;
      var map = JSON.parse(raw);
      delete map[userId];
      localStorage.setItem(USER_OVERRIDE_KEY, JSON.stringify(map));
    } catch (e) {}
  }

  function mapBackendUser(u) {
    if (!u) return null;
    return {
      id: u.id,
      type: u.type || 'member',
      name: u.nickname || u.name || '用户',
      nickname: u.nickname,
      handle: u.handle || '',
      avatar: u.avatar || 'images/author-user-me.jpg',
      bio: u.bio || '',
      joinDate: u.joinDate || '',
      username: u.username || ''
    };
  }

  function cacheUser(u) {
    if (u) {
      sessionStorage.setItem(
        USER_CACHE_KEY,
        JSON.stringify(applyLocalProfileOverride(mapBackendUser(u)))
      );
    }
  }

  function readCachedUser(id) {
    try {
      var raw = sessionStorage.getItem(USER_CACHE_KEY);
      if (!raw) return null;
      var u = JSON.parse(raw);
      if (!id || u.id === id) return applyLocalProfileOverride(u);
    } catch (e) {}
    return null;
  }

  Api.registerUser = function (payload) {
    return http('/api/users/register', {
      method: 'POST',
      json: {
        username: payload.username,
        password: payload.password,
        nickname: payload.nickname
      }
    }).then(function (res) {
      if (res.ok && res.userId) {
        sessionStorage.setItem('zhijiansu_user_id', res.userId);
        if (res.user) cacheUser(res.user);
        if (res.token) setAuthToken(res.token);
      }
      return { ok: res.ok, userId: res.userId, message: res.message };
    }).catch(function (e) {
      return { ok: false, message: e.message };
    });
  };

  Api.login = function (username, password) {
    return http('/api/users/login', {
      method: 'POST',
      json: { username: username, password: password }
    }).then(function (res) {
      if (res.ok && res.userId) {
        sessionStorage.setItem('zhijiansu_user_id', res.userId);
        if (res.user) cacheUser(res.user);
        if (res.token) setAuthToken(res.token);
      }
      return { ok: res.ok, userId: res.userId, message: res.message };
    }).catch(function (e) {
      return { ok: false, message: e.message };
    });
  };

  Api.getUser = function (id) {
    if (id === 'me') id = sessionStorage.getItem('zhijiansu_user_id');
    if (!id) return delay(null);
    var cached = readCachedUser(id);
    if (cached) return delay(cached);
    return http('/api/users/' + encodeURIComponent(id))
      .then(function (res) {
        var u = applyLocalProfileOverride(mapBackendUser(res.data));
        if (u) sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(u));
        return u;
      })
      .catch(function (err) {
        console.warn('[api-remote] getUser failed', id, err.message);
        return null;
      });
  };

  Api.getCurrentUserId = function () {
    return sessionStorage.getItem('zhijiansu_user_id') || null;
  };

  Api.isLoggedIn = function () {
    return !!getAuthToken();
  };

  var localLogout = Api.logout;
  Api.logout = function () {
    setAuthToken(null);
    try {
      sessionStorage.removeItem('zhijiansu_user_profile');
    } catch (e) {}
    if (typeof localLogout === 'function') return localLogout();
    try {
      sessionStorage.removeItem('zhijiansu_user_id');
    } catch (e) {}
    return Promise.resolve({ ok: true });
  };

  var localUpdateUserNickname = Api.updateUserNickname;

  function applyNicknameUpdateResponse(res) {
    var u = mapBackendUser(res.data);
    if (u && res.data) {
      clearLocalProfileOverride(u.id);
      cacheUser(res.data);
    }
    return { ok: true, user: u };
  }

  function requestNicknameUpdate(userId, nickname, method) {
    return http('/api/users/' + encodeURIComponent(userId) + '/profile', {
      method: method || 'POST',
      json: { nickname: nickname }
    });
  }

  Api.updateUserNickname = function (userId, nickname) {
    if (!userId) {
      return Promise.resolve({ ok: false, message: '参数错误' });
    }
    return requestNicknameUpdate(userId, nickname, 'POST')
      .catch(function () {
        return requestNicknameUpdate(userId, nickname, 'PATCH');
      })
      .then(applyNicknameUpdateResponse)
      .catch(function (err) {
        var msg = friendlyFetchError(err) || err.message || '修改失败';
        if (msg === '接口不存在' && typeof localUpdateUserNickname === 'function') {
          return localUpdateUserNickname(userId, nickname).then(function (res) {
            if (res.ok && res.user) cacheUser(res.user);
            return res;
          });
        }
        return { ok: false, message: msg };
      });
  };

  function authHeaders(extra) {
    var h = extra || {};
    var token = getAuthToken();
    if (token && !h.Authorization) h.Authorization = 'Bearer ' + token;
    return h;
  }

  Api.uploadUserAvatar = function (userId, file) {
    if (!userId || !file) {
      return Promise.resolve({ ok: false, message: '参数错误' });
    }
    var fd = new FormData();
    fd.append('avatar', file);
    return fetch(BASE + '/api/users/' + encodeURIComponent(userId) + '/avatar', {
      method: 'POST',
      headers: authHeaders(),
      body: fd
    })
      .then(function (res) {
        return res.text().then(function (text) {
          var data;
          try {
            data = text ? JSON.parse(text) : {};
          } catch (e2) {
            throw new Error('后台返回格式异常');
          }
          if (!res.ok) {
            throw new Error((data && data.message) || '上传失败');
          }
          var u = mapBackendUser(data.data);
          if (u && data.data) cacheUser(data.data);
          return { ok: true, user: u };
        });
      })
      .catch(function (err) {
        return { ok: false, message: friendlyFetchError(err) || err.message || '上传失败' };
      });
  };

  Api.getNewsDetail = function (id) {
    return http('/api/news/' + encodeURIComponent(id)).then(function (res) {
      return res.data || null;
    });
  };

  Api.getWorksByUserId = function (userId, includeDraft) {
    var q =
      '/api/works?userId=' +
      encodeURIComponent(userId) +
      '&limit=50' +
      (includeDraft ? '&includeDraft=1' : '');
    return http(q)
      .then(function (res) {
        return ((res.data && res.data.list) || []).map(function (w) {
          return {
            id: w.id,
            userId: w.userId,
            title: w.title,
            image: resolveImageUrl(w.image),
            tag: w.tag,
            desc: w.desc,
            publishedAt: w.publishedAt,
            status: w.status,
            workType: w.workType || 'model',
            studio: w.studio || null
          };
        });
      })
      .catch(function () {
        return [];
      });
  };

  Api.deleteWork = function (workId) {
    var userId = sessionStorage.getItem('zhijiansu_user_id');
    if (!userId) return delay({ ok: false, message: '请先登录' });
    return http(
      '/api/works/' + encodeURIComponent(workId) + '?userId=' + encodeURIComponent(userId),
      { method: 'DELETE' }
    )
      .then(function () {
        return { ok: true };
      })
      .catch(function (e) {
        return { ok: false, message: e.message };
      });
  };

  Api.saveStudioWork = function (payload) {
    var userId = sessionStorage.getItem('zhijiansu_user_id');
    if (!userId) return delay({ ok: false, message: '请先登录' });
    var studioJson = '';
    try {
      if (payload.studio) studioJson = JSON.stringify(payload.studio);
    } catch (e) {
      studioJson = '';
    }
    if (studioJson && studioJson.length > 200 * 1024) {
      return delay({ ok: false, message: '3D 快照过大，请减少模型数量后重试' });
    }
    var imagePromise =
      payload.image && payload.image.indexOf('data:image') === 0 && ZJS.compressDataUrl
        ? ZJS.compressDataUrl(
            payload.image,
            payload.workType === 'ar_snapshot' ? 1200 : 360,
            payload.workType === 'ar_snapshot' ? 0.88 : 0.72
          )
        : delay(payload.image || '');

    return imagePromise.then(function (image) {
      var isAr = payload.workType === 'ar_snapshot';
      var blob = image && image.indexOf('data:image') === 0 && ZJS.dataUrlToBlob ? ZJS.dataUrlToBlob(image) : null;
      if (blob) {
        var filename = isAr ? 'ar-shot.jpg' : 'cover.jpg';
        var file = blob;
        if (typeof File !== 'undefined') {
          try {
            file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
          } catch (eFile) {
            file = new Blob([blob], { type: blob.type || 'image/jpeg' });
          }
        }
        var fd = new FormData();
        fd.append('userId', userId);
        fd.append('title', payload.title || 'DIY 面塑作品');
        fd.append('tag', payload.tag || '');
        fd.append('desc', payload.desc || '');
        fd.append('publish', payload.publish ? '1' : '0');
        fd.append('workType', isAr ? 'ar_snapshot' : 'model');
        if (payload.id) fd.append('id', payload.id);
        fd.append('cover', file, filename);
        fd.append('image', image);
        if (studioJson) fd.append('studio', studioJson);
        return fetch(BASE + '/api/works', { method: 'POST', headers: authHeaders(), body: fd })
          .then(function (res) {
            return res.text().then(function (text) {
              var data;
              try {
                data = text ? JSON.parse(text) : {};
              } catch (e2) {
                throw new Error('后台返回格式异常');
              }
              if (!res.ok) throw new Error((data && data.message) || '保存失败');
              return data;
            });
          })
          .catch(function (err) {
            if (err.message === 'Failed to fetch' || err.message.indexOf('NetworkError') >= 0) {
              throw new Error(friendlyFetchError(err));
            }
            throw err;
          });
      }

      return http('/api/works', {
        method: 'POST',
        json: {
          id: payload.id,
          userId: userId,
          title: payload.title || 'DIY 面塑作品',
          image: image && image.indexOf('data:image') === 0 ? image : '',
          imageKeep:
            payload.imageKeep ||
            (image && image.indexOf('data:image') !== 0 ? image : '') ||
            '',
          tag: payload.tag || '',
          desc: payload.desc || '',
          publish: !!payload.publish,
          workType: payload.workType === 'ar_snapshot' ? 'ar_snapshot' : 'model',
          studio: payload.studio || null
        }
      });
    })
      .then(function (res) {
        return {
          ok: true,
          workId: res.data && res.data.id,
          work: {
            id: res.data && res.data.id,
            status: res.data && res.data.status,
            image: resolveImageUrl(res.data && res.data.image)
          }
        };
      })
      .catch(function (e) {
        return { ok: false, message: e.message };
      });
  };

  function resolveImageUrl(url) {
    if (ZJS.normalizeWorkImageUrl) return ZJS.normalizeWorkImageUrl(url);
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    if (/^data:/i.test(url)) return url;
    if (url.indexOf('images/') === 0) return url;
    if (url.indexOf('/uploads/') === 0) return BASE + url;
    return url;
  }

  Api.getArtisans = function () {
    return http('/api/artisans').then(function (res) {
      return (res.data || []).map(function (a) {
        var img = resolveImageUrl(a.image);
        return {
          id: a.id,
          type: 'cooperative',
          name: a.name,
          title: a.title,
          bio: a.bio,
          avatar: img,
          image: img,
          tags: a.tags || []
        };
      });
    });
  };

  Api.getPublishedWorks = function () {
    return http('/api/works?limit=50').then(function (res) {
      var list = (res.data && res.data.list) || [];
      return list.map(function (w) {
        return Api.normalizeGalleryWork({
          id: w.id,
          userId: w.userId,
          title: w.title,
          image: resolveImageUrl(w.image),
          tag: w.tag,
          desc: w.desc,
          publishedAt: w.publishedAt,
          status: 'published'
        });
      });
    });
  };

  Api.getWork = function (id) {
    return http('/api/works/' + encodeURIComponent(id))
      .then(function (res) {
        var w = res.data;
        if (!w) return null;
        w.image = resolveImageUrl(w.image);
        return w;
      })
      .catch(function () {
        return null;
      });
  };

  function mapEngagementData(data) {
    if (!data) {
      return {
        likeCount: 0,
        likedByMe: false,
        commentCount: 0,
        comments: []
      };
    }
    return {
      workId: data.workId,
      likeCount: data.likeCount || 0,
      likedByMe: !!data.likedByMe,
      commentCount: data.commentCount || 0,
      comments: (data.comments || []).map(function (c) {
        return {
          id: c.id,
          workId: c.workId,
          userId: c.userId,
          text: c.text,
          createdAt: c.createdAt,
          userName: c.userName,
          userHandle: c.userHandle || ''
        };
      })
    };
  }

  function fetchWorkEngagement(workId) {
    var uid = sessionStorage.getItem('zhijiansu_user_id') || '';
    var q =
      '/api/engagement?workIds=' +
      encodeURIComponent(workId) +
      (uid ? '&viewerId=' + encodeURIComponent(uid) : '');
    return http(q)
      .then(function (res) {
        var item = res.data && res.data[workId];
        return mapEngagementData(item || { workId: workId });
      })
      .catch(function () {
        return mapEngagementData({ workId: workId });
      });
  }

  Api.getWorkEngagement = function (workId) {
    return fetchWorkEngagement(workId);
  };

  Api.getEngagementMap = function (workIds) {
    var ids = (workIds || []).filter(Boolean);
    if (!ids.length) return delay({});
    var uid = sessionStorage.getItem('zhijiansu_user_id') || '';
    var q =
      '/api/engagement?workIds=' +
      encodeURIComponent(ids.join(',')) +
      (uid ? '&viewerId=' + encodeURIComponent(uid) : '');
    return http(q)
      .then(function (res) {
        var map = res.data || {};
        ids.forEach(function (id) {
          if (!map[id]) {
            map[id] = mapEngagementData({ workId: id });
          } else {
            map[id] = mapEngagementData(map[id]);
          }
        });
        return map;
      })
      .catch(function () {
        var fallback = {};
        ids.forEach(function (id) {
          fallback[id] = mapEngagementData({ workId: id });
        });
        return fallback;
      });
  };

  Api.addWorkComment = function (workId, text) {
    var uid = sessionStorage.getItem('zhijiansu_user_id');
    if (!uid) return delay({ ok: false, needLogin: true });
    return http('/api/comments', {
      method: 'POST',
      json: { workId: workId, userId: uid, text: text }
    })
      .then(function () {
        return fetchWorkEngagement(workId).then(function (eng) {
          return { ok: true, engagement: eng };
        });
      })
      .catch(function (e) {
        return { ok: false, message: e.message };
      });
  };

  Api.toggleWorkLike = function (workId) {
    var uid = sessionStorage.getItem('zhijiansu_user_id');
    if (!uid) return delay({ ok: false, needLogin: true });
    return http('/api/engagement/like', {
      method: 'POST',
      json: { workId: workId, userId: uid }
    })
      .then(function (res) {
        return {
          ok: true,
          liked: res.liked,
          engagement: mapEngagementData(res.data)
        };
      })
      .catch(function (e) {
        return { ok: false, message: e.message };
      });
  };

  console.info('[api-remote] 已连接后台', BASE);
})();
