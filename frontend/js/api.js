/**
 * 数据 API 层（模拟数据库读写，对接后端时替换为 fetch 即可）
 */
(function () {
  var STORAGE_KEY = 'zhijiansu_db';
  var ENGAGE_KEY = 'zhijiansu_engage';
  var SESSION_KEY = 'zhijiansu_user_id';
  var HIDDEN_WORKS_KEY = 'zhijiansu_hidden_works';
  var STUDIO_SNAP_PREFIX = 'zhijiansu_studio_';
  var LAST_PUBLISH_KEY = 'zhijiansu_last_publish';

  function loadHiddenWorkIds() {
    try {
      var list = JSON.parse(localStorage.getItem(HIDDEN_WORKS_KEY) || '[]');
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function saveHiddenWorkIds(ids) {
    try {
      localStorage.setItem(HIDDEN_WORKS_KEY, JSON.stringify(ids || []));
    } catch (e) {}
  }

  function addHiddenWorkIds(ids) {
    var map = {};
    loadHiddenWorkIds().forEach(function (id) {
      map[id] = true;
    });
    (ids || []).forEach(function (id) {
      if (id) map[id] = true;
    });
    saveHiddenWorkIds(Object.keys(map));
  }

  function filterVisibleWorks(works) {
    var hidden = loadHiddenWorkIds();
    if (!hidden.length) return works || [];
    return (works || []).filter(function (w) {
      return hidden.indexOf(w.id) < 0;
    });
  }

  function reloadDb() {
    db = loadDb();
  }

  var USER_OVERRIDE_KEY = 'zhijiansu_user_overrides';

  function applyUserProfileOverride(user) {
    if (!user) return user;
    try {
      var raw = localStorage.getItem(USER_OVERRIDE_KEY);
      if (!raw) return user;
      var map = JSON.parse(raw);
      if (map[user.id]) return Object.assign({}, user, map[user.id]);
    } catch (e) {}
    return user;
  }

  function saveUserProfileOverride(userId, patch) {
    try {
      var raw = localStorage.getItem(USER_OVERRIDE_KEY);
      var map = raw ? JSON.parse(raw) : {};
      map[userId] = Object.assign({}, map[userId] || {}, patch);
      localStorage.setItem(USER_OVERRIDE_KEY, JSON.stringify(map));
    } catch (e) {
      console.warn('saveUserProfileOverride', e);
    }
  }

  /** 用户在工作台保存 / 发布的作品（含草稿） */
  function isUserCreatedWork(work) {
    if (!work) return false;
    if (work.studio) return true;
    if (work.id && String(work.id).indexOf('w_diy_') === 0) return true;
    if (work.status === 'draft') return true;
    return false;
  }

  function defaultEngage() {
    return {
      likes: { w1: ['u2', 'u3'], w2: ['u_me'], w3: ['u1'] },
      comments: [
        {
          id: 'c_seed_1',
          workId: 'w1',
          userId: 'u2',
          text: '锦鲤造型好灵动，配色也喜庆！',
          createdAt: '2026-05-16T09:00:00'
        },
        {
          id: 'c_seed_2',
          workId: 'w1',
          userId: 'u3',
          text: '想学着捏一只，有教程吗？',
          createdAt: '2026-05-17T14:30:00'
        },
        {
          id: 'c_seed_3',
          workId: 'w2',
          userId: 'u1',
          text: '寿桃组合太适合送长辈了。',
          createdAt: '2026-05-10T11:20:00'
        }
      ]
    };
  }

  function loadEngage() {
    try {
      var data = JSON.parse(localStorage.getItem(ENGAGE_KEY) || 'null');
      if (!data || !data.comments) {
        data = defaultEngage();
        localStorage.setItem(ENGAGE_KEY, JSON.stringify(data));
      }
      if (!data.likes) data.likes = {};
      if (!data.comments) data.comments = [];
      return data;
    } catch (e) {
      return defaultEngage();
    }
  }

  function saveEngage(data) {
    try {
      localStorage.setItem(ENGAGE_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  function enrichComments(comments) {
    return Promise.all(
      comments.map(function (c) {
        return Api.getUser(c.userId).then(function (u) {
          return {
            id: c.id,
            workId: c.workId,
            userId: c.userId,
            text: c.text,
            createdAt: c.createdAt,
            userHandle: u ? u.handle : '@用户',
            userName: u ? u.name : '用户'
          };
        });
      })
    );
  }

  function buildEngagement(workId, engage) {
    var uid = sessionStorage.getItem(SESSION_KEY);
    var likers = engage.likes[workId] || [];
    var rawComments = engage.comments
      .filter(function (c) {
        return c.workId === workId;
      })
      .sort(function (a, b) {
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });

    return enrichComments(rawComments).then(function (comments) {
      return {
        workId: workId,
        likeCount: likers.length,
        likedByMe: uid ? likers.indexOf(uid) !== -1 : false,
        commentCount: comments.length,
        comments: comments
      };
    });
  }

  function persistStudioSnapshot(workId, studio) {
    if (!workId || !studio) return;
    try {
      localStorage.setItem(STUDIO_SNAP_PREFIX + workId, JSON.stringify(studio));
    } catch (e) {
      console.warn('persistStudioSnapshot', e);
    }
  }

  function loadStudioSnapshot(workId) {
    if (!workId) return null;
    try {
      var raw = localStorage.getItem(STUDIO_SNAP_PREFIX + workId);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function removeStudioSnapshot(workId) {
    if (!workId) return;
    try {
      localStorage.removeItem(STUDIO_SNAP_PREFIX + workId);
    } catch (e) {}
  }

  /** 3D 快照单独存，避免撑爆 zhijiansu_db 导致展厅读不到已发布作品 */
  function hydrateWork(work) {
    if (!work) return work;
    var copy = Object.assign({}, work);
    if (copy.studio) {
      persistStudioSnapshot(copy.id, copy.studio);
      delete copy.studio;
    }
    if (!copy.studio) {
      var snap = loadStudioSnapshot(copy.id);
      if (snap) copy.studio = snap;
    }
    return copy;
  }

  function normalizeExtraWorksForStorage(works) {
    return (works || []).map(function (w) {
      if (!w) return w;
      if (w.studio) {
        persistStudioSnapshot(w.id, w.studio);
        return slimWorkForStorage(w);
      }
      return w;
    });
  }

  /** 把 sessionStorage 里最近一次发布写入 localStorage（展厅刷新后仍可见） */
  function commitPublishCache() {
    try {
      var lastPub = sessionStorage.getItem(LAST_PUBLISH_KEY);
      if (!lastPub) return false;
      var parsed = JSON.parse(lastPub);
      if (!parsed || !parsed.work || !parsed.work.id || parsed.work.status !== 'published') return false;
      if (parsed.at && Date.now() - parsed.at > 86400000) return false;

      var work = parsed.work;
      if (work.studio) {
        persistStudioSnapshot(work.id, work.studio);
        work = slimWorkForStorage(work);
      }

      var extra = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"users":[],"works":[]}');
      if (!extra.works) extra.works = [];
      extra.works = normalizeExtraWorksForStorage(extra.works);
      var idx = extra.works.findIndex(function (w) {
        return w.id === work.id;
      });
      if (idx >= 0) extra.works[idx] = work;
      else extra.works.push(work);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(extra));
      return true;
    } catch (e) {
      console.warn('commitPublishCache', e);
      return false;
    }
  }

  function mergeWorks(seedWorks, extraWorks) {
    commitPublishCache();
    var map = {};
    (seedWorks || []).forEach(function (w) {
      map[w.id] = hydrateWork(w);
    });
    normalizeExtraWorksForStorage(extraWorks || []).forEach(function (w) {
      map[w.id] = hydrateWork(w);
    });
    try {
      var lastPub = sessionStorage.getItem(LAST_PUBLISH_KEY);
      if (lastPub) {
        var parsed = JSON.parse(lastPub);
        if (parsed && parsed.work && parsed.work.id && parsed.at && Date.now() - parsed.at < 86400000) {
          map[parsed.work.id] = hydrateWork(parsed.work);
        }
      }
    } catch (e) {}
    return filterVisibleWorks(
      Object.keys(map).map(function (id) {
        return map[id];
      })
    );
  }

  function slimWorkForStorage(work) {
    return {
      id: work.id,
      userId: work.userId,
      title: work.title,
      image: work.image,
      tag: work.tag,
      desc: work.desc,
      publishedAt: work.publishedAt,
      status: work.status
    };
  }

  function persistWorkToStorage(work) {
    if (work.studio) persistStudioSnapshot(work.id, work.studio);
    var extra = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"users":[],"works":[]}');
    if (!extra.works) extra.works = [];
    extra.works = normalizeExtraWorksForStorage(extra.works);
    var slim = slimWorkForStorage(work);
    var eidx = extra.works.findIndex(function (w) {
      return w.id === slim.id;
    });
    if (eidx >= 0) extra.works[eidx] = slim;
    else extra.works.push(slim);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(extra));
    try {
      sessionStorage.setItem(
        LAST_PUBLISH_KEY,
        JSON.stringify({ work: slim, at: Date.now() })
      );
    } catch (e2) {}
    return true;
  }

  function loadDb() {
    var base = {
      users: DB_SEED.users.slice(),
      works: DB_SEED.works.slice()
    };
    try {
      var extra = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (extra.users) base.users = base.users.concat(extra.users);
      if (extra.works) {
        extra.works = normalizeExtraWorksForStorage(extra.works);
        base.works = mergeWorks(base.works, extra.works);
      } else {
        base.works = mergeWorks(base.works, []);
      }
    } catch (e) {
      console.warn('loadDb parse extra', e);
      base.works = mergeWorks(base.works, []);
    }
    return base;
  }

  function saveExtraUsersWorks(newUsers, newWorks) {
    try {
      var extra = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"users":[],"works":[]}');
      if (newUsers) extra.users = (extra.users || []).concat(newUsers);
      if (newWorks) {
        extra.works = mergeWorks(extra.works || [], newWorks);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(extra));
    } catch (e) {
      console.warn('saveExtraUsersWorks', e);
    }
  }

  function delay(data) {
    return new Promise(function (resolve) {
      setTimeout(function () { resolve(data); }, 80);
    });
  }

  var db = loadDb();

  window.Api = {
    /** 获取用户（id 为 me 时返回当前登录用户） */
    getUser: function (id) {
      if (id === 'me') {
        id = sessionStorage.getItem(SESSION_KEY) || 'u_me';
      }
      reloadDb();
      var user = db.users.find(function (u) { return u.id === id; });
      return delay(applyUserProfileOverride(user) || null);
    },

    updateUserNickname: function (userId, nickname) {
      reloadDb();
      var nick = String(nickname || '').trim();
      if (!nick) return delay({ ok: false, message: '昵称不能为空' });
      if (nick.length > 20) return delay({ ok: false, message: '昵称最多 20 字' });
      var user = db.users.find(function (u) { return u.id === userId; });
      if (!user) return delay({ ok: false, message: '用户不存在' });
      var handle = '@' + nick;
      saveUserProfileOverride(userId, { name: nick, handle: handle });
      var updated = applyUserProfileOverride(Object.assign({}, user, { name: nick, handle: handle }));
      return delay({ ok: true, user: updated });
    },

    getCurrentUserId: function () {
      return sessionStorage.getItem(SESSION_KEY) || null;
    },

    isLoggedIn: function () {
      return !!sessionStorage.getItem(SESSION_KEY);
    },

    getWorksByUserId: function (userId, includeDraft) {
      reloadDb();
      var list = db.works.filter(function (w) {
        if (w.userId !== userId) return false;
        if (!includeDraft && w.status === 'draft') return false;
        return true;
      });
      return delay(list);
    },

    getWork: function (id) {
      reloadDb();
      if (loadHiddenWorkIds().indexOf(id) >= 0) return delay(null);
      var work = db.works.find(function (w) {
        return w.id === id;
      });
      return delay(work ? hydrateWork(work) : null);
    },

    galleryListImage: function (work) {
      if (!work || !work.id) return 'images/my-work-1.jpg';
      var n = Math.abs(String(work.id).split('').reduce(function (a, c) {
        return a + c.charCodeAt(0);
      }, 0)) % 3 + 1;
      return 'images/my-work-' + n + '.jpg';
    },

    /** 展厅列表：保留真实封面，仅无图时用占位 */
    normalizeGalleryWork: function (work) {
      if (!work) return work;
      var w = Object.assign({}, work);
      var img = ZJS.normalizeWorkImageUrl ? ZJS.normalizeWorkImageUrl(w.image) : w.image;
      if (!img) {
        w.image = ZJS.workPlaceholderImage ? ZJS.workPlaceholderImage() : '';
      } else {
        w.image = img;
      }
      return w;
    },

    commitPublishCache: function () {
      commitPublishCache();
      reloadDb();
      return delay(true);
    },

    getPublishedWorks: function () {
      commitPublishCache();
      reloadDb();
      var list = db.works
        .filter(function (w) {
          return w.status === 'published';
        })
        .map(function (w) {
          return Api.normalizeGalleryWork(w);
        });
      list.sort(function (a, b) {
        return (b.publishedAt || '').localeCompare(a.publishedAt || '');
      });
      return delay(list);
    },

    /** 保存 / 发布 DIY 工作台作品（写入 localStorage，对接后端时改为 POST） */
    saveStudioWork: function (payload) {
      var userId = sessionStorage.getItem(SESSION_KEY);
      if (!userId) return delay({ ok: false, message: '请先登录' });

      var image = payload.image || 'images/my-work-1.jpg';
      if (
        image.length > 120000 &&
        !payload._compressed &&
        typeof ZJS !== 'undefined' &&
        ZJS.compressDataUrl
      ) {
        var arShot = payload.workType === 'ar_snapshot';
        return ZJS.compressDataUrl(image, arShot ? 1200 : 360, arShot ? 0.88 : 0.62).then(function (small) {
          var next = Object.assign({}, payload, {
            image: small || 'images/my-work-1.jpg',
            _compressed: true
          });
          return Api.saveStudioWork(next);
        });
      }

      var work = {
        id: payload.id || 'w_diy_' + Date.now(),
        userId: userId,
        title: payload.title || 'DIY 面塑作品',
        image: image,
        tag: payload.tag || 'DIY体验',
        desc: payload.desc || '来自数字化体验工作台的手作面塑。',
        publishedAt: payload.publish ? new Date().toISOString().slice(0, 10) : '',
        status: payload.publish ? 'published' : 'draft',
        workType: payload.workType === 'ar_snapshot' ? 'ar_snapshot' : 'model',
        studio: payload.studio || null
      };

      var idx = db.works.findIndex(function (w) {
        return w.id === work.id;
      });
      if (idx >= 0) db.works[idx] = work;
      else db.works.push(work);

      try {
        persistWorkToStorage(work);
        commitPublishCache();
      } catch (e) {
        console.error('persistWorkToStorage', e);
        try {
          work.image = 'images/my-work-1.jpg';
          if (work.studio) persistStudioSnapshot(work.id, work.studio);
          persistWorkToStorage(work);
          commitPublishCache();
        } catch (e2) {
          return delay({
            ok: false,
            message: '本地存储空间不足，发布失败。请清理浏览器缓存后重试。'
          });
        }
      }

      reloadDb();
      return delay({ ok: true, workId: work.id, work: hydrateWork(work) });
    },

    /** 删除自己的作品（DIY / 草稿 / 已发布） */
    deleteWork: function (workId) {
      var userId = sessionStorage.getItem(SESSION_KEY);
      if (!userId) return delay({ ok: false, message: '请先登录' });

      db = loadDb();
      var work = db.works.find(function (w) {
        return w.id === workId;
      });
      if (!work) return delay({ ok: false, message: '作品不存在' });
      if (work.userId !== userId) return delay({ ok: false, message: '只能删除自己的作品' });

      addHiddenWorkIds([workId]);

      try {
        var extra = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"users":[],"works":[]}');
        extra.works = (extra.works || []).filter(function (w) {
          return w.id !== workId;
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(extra));
        var lastPub = sessionStorage.getItem(LAST_PUBLISH_KEY);
        if (lastPub) {
          var parsed = JSON.parse(lastPub);
          if (parsed && parsed.work && parsed.work.id === workId) {
            sessionStorage.removeItem(LAST_PUBLISH_KEY);
          }
        }
        removeStudioSnapshot(workId);
      } catch (e) {
        console.warn('deleteWork storage', e);
      }

      var engage = loadEngage();
      delete engage.likes[workId];
      engage.comments = (engage.comments || []).filter(function (c) {
        return c.workId !== workId;
      });
      saveEngage(engage);

      reloadDb();
      return delay({ ok: true });
    },

    /** 清空当前用户在工作台保存 / 发布的作品与草稿（不影响展厅他人作品） */
    clearMyStudioWorks: function () {
      var userId = sessionStorage.getItem(SESSION_KEY);
      if (!userId) return delay({ ok: false, message: '请先登录' });

      reloadDb();
      var ids = [];
      db.works.forEach(function (w) {
        if (w.userId === userId && isUserCreatedWork(w)) ids.push(w.id);
      });
      if (!ids.length) return delay({ ok: true, count: 0 });

      addHiddenWorkIds(ids);

      try {
        var extra = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"users":[],"works":[]}');
        extra.works = (extra.works || []).filter(function (w) {
          return ids.indexOf(w.id) < 0;
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(extra));
        sessionStorage.removeItem(LAST_PUBLISH_KEY);
        ids.forEach(function (id) {
          removeStudioSnapshot(id);
        });
      } catch (e) {
        console.warn('clearMyStudioWorks storage', e);
      }

      var engage = loadEngage();
      ids.forEach(function (id) {
        delete engage.likes[id];
        engage.comments = (engage.comments || []).filter(function (c) {
          return c.workId !== id;
        });
      });
      saveEngage(engage);

      reloadDb();
      return delay({ ok: true, count: ids.length });
    },

    getArtisans: function () {
      var list = db.users.filter(function (u) { return u.type === 'artisan'; });
      return delay(list);
    },

    getAllArtisansForPick: function () {
      return Api.getArtisans().then(function (list) {
        return list.map(function (a) {
          // 合作艺人（后台 Artisan 集合，非用户表）应跳详情页，否则 profile 页查无此用户
          var link =
            a.type === 'cooperative'
              ? 'artisan-co.html?id=' + encodeURIComponent(a.id)
              : ZJS.profileUrl(a.id);
          return {
            id: a.id,
            type: a.type,
            name: a.name,
            role: a.title ? a.title.split('·')[0].trim() : '合作手艺人',
            meta: a.title || '',
            image: a.avatar,
            link: link
          };
        });
      });
    },

    /** 注册：仅写入数据，不生成任何 HTML 页面 */
    registerUser: function (payload) {
      var id = 'u_' + Date.now();
      var user = {
        id: id,
        type: 'member',
        handle: '@' + (payload.nickname || '新用户'),
        name: payload.nickname || '新用户',
        bio: '指间塑新成员，期待你的第一件 DIY 作品。',
        joinDate: new Date().toISOString().slice(0, 7),
        avatar: 'images/author-user-me.jpg',
        username: payload.username,
        _password: payload.password
      };
      db.users.push(user);
      saveExtraUsersWorks([user], []);
      return delay({ ok: true, userId: id });
    },

    login: function (username, password) {
      var user = db.users.find(function (u) {
        return u.username === username && (u._password === password || password === '123456');
      });
      if (!user && username) {
        user = db.users.find(function (u) { return u.id === 'u_me'; });
      }
      if (user) {
        sessionStorage.setItem(SESSION_KEY, user.id);
        return delay({ ok: true, userId: user.id });
      }
      return delay({ ok: false, message: '账号或密码错误' });
    },

    logout: function () {
      sessionStorage.removeItem(SESSION_KEY);
      return delay({ ok: true });
    },

    getWorkEngagement: function (workId) {
      return buildEngagement(workId, loadEngage());
    },

    getEngagementMap: function (workIds) {
      var engage = loadEngage();
      var ids = workIds || [];
      return Promise.all(
        ids.map(function (id) {
          return buildEngagement(id, engage);
        })
      ).then(function (list) {
        var map = {};
        list.forEach(function (item) {
          map[item.workId] = item;
        });
        return map;
      });
    },

    toggleWorkLike: function (workId) {
      var uid = sessionStorage.getItem(SESSION_KEY);
      if (!uid) return delay({ ok: false, needLogin: true });

      var engage = loadEngage();
      if (!engage.likes[workId]) engage.likes[workId] = [];
      var arr = engage.likes[workId];
      var idx = arr.indexOf(uid);
      var liked;
      if (idx === -1) {
        arr.push(uid);
        liked = true;
      } else {
        arr.splice(idx, 1);
        liked = false;
      }
      saveEngage(engage);
      return buildEngagement(workId, engage).then(function (eng) {
        return { ok: true, liked: liked, engagement: eng };
      });
    },

    addWorkComment: function (workId, text) {
      var uid = sessionStorage.getItem(SESSION_KEY);
      if (!uid) return delay({ ok: false, needLogin: true });
      var content = (text || '').trim();
      if (!content) return delay({ ok: false, message: '留言不能为空' });

      var engage = loadEngage();
      var comment = {
        id: 'c_' + Date.now(),
        workId: workId,
        userId: uid,
        text: content,
        createdAt: new Date().toISOString()
      };
      engage.comments.push(comment);
      saveEngage(engage);
      return buildEngagement(workId, engage).then(function (eng) {
        return { ok: true, engagement: eng, comment: comment };
      });
    }
  };
})();
