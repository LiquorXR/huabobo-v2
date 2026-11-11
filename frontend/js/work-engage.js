/**
 * 作品点赞 / 留言（展厅瀑布流 + 作品详情页共用）
 */
window.ZJS = window.ZJS || {};

ZJS.heartIcon = function (filled) {
  var fill = filled ? ' currentColor' : ' none';
  return (
    '<svg class="engage-icon-heart" width="18" height="18" viewBox="0 0 24 24" fill="' +
    (filled ? 'currentColor' : 'none') +
    '" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
    '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>'
  );
};

ZJS.commentIcon = function () {
  return (
    '<svg class="engage-icon-comment" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
    '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>'
  );
};

ZJS.formatCommentTime = function (iso) {
  if (!iso) return '';
  try {
    var d = new Date(iso);
    var loc = ZJS.getLang && ZJS.getLang() === 'en' ? 'en-US' : 'zh-CN';
    return d.toLocaleDateString(loc, { month: 'short', day: 'numeric' });
  } catch (e) {
    return '';
  }
};

ZJS.renderCommentItem = function (comment) {
  var name = comment.userName || comment.userHandle || '用户';
  var profileHref = ZJS.profileUrl(comment.userId);
  return (
    '<li class="comment-item">' +
    '<a href="' +
    profileHref +
    '" class="comment-author">' +
    ZJS.escapeHtml(name) +
    '</a>' +
    '<span class="comment-time">' +
    ZJS.escapeHtml(ZJS.formatCommentTime(comment.createdAt)) +
    '</span>' +
    '<p class="comment-text">' +
    ZJS.escapeHtml(comment.text) +
    '</p></li>'
  );
};

ZJS.renderCommentList = function (comments, emptyText) {
  if (!comments || !comments.length) {
    return (
      '<p class="comment-empty">' +
      ZJS.escapeHtml(emptyText || (ZJS.t ? ZJS.t('engage.empty') : '暂无留言，来说第一句吧')) +
      '</p>'
    );
  }
  return '<ul class="comment-list">' + comments.map(ZJS.renderCommentItem).join('') + '</ul>';
};

ZJS.renderCommentForm = function (workId, placeholder) {
  if (!Api.isLoggedIn()) {
    return (
      '<p class="comment-login-tip">' +
      (ZJS.t ? ZJS.t('engage.loginTip') : '登录后可留言。<a href="login.html">去登录</a>') +
      '</p>'
    );
  }
  return (
    '<form class="comment-form" data-work-id="' +
    ZJS.escapeHtml(workId) +
    '">' +
    '<textarea class="comment-input" rows="2" maxlength="300" placeholder="' +
    ZJS.escapeHtml(placeholder || (ZJS.t ? ZJS.t('engage.placeholder') : '写下留言…')) +
    '" required></textarea>' +
    '<button type="submit" class="btn btn-primary comment-submit">' +
    (ZJS.t ? ZJS.t('engage.submit') : '发送留言') +
    '</button></form>'
  );
};

ZJS.requireLogin = function (action) {
  if (Api.isLoggedIn()) return true;
  var msg = ZJS.t
    ? ZJS.t('engage.loginConfirm', { action: action || (ZJS.getLang() === 'en' ? 'continue' : '操作') })
    : '请先登录后再' + (action || '操作') + '。\n\n点击「确定」前往登录页。';
  if (confirm(msg)) {
    var returnUrl = encodeURIComponent(location.pathname.split('/').pop() + location.search);
    location.href = 'login.html?return=' + returnUrl;
  }
  return false;
};

/**
 * 展厅瀑布流卡片 HTML（与 gallery.html 列表完全一致）
 * opts: { mode:'card'|'detail', commentsExpanded, highlight, showDetailLink }
 */
ZJS.renderGalleryWorkCard = function (work, author, eng, opts) {
  opts = opts || {};
  var mode = opts.mode || 'card';
  var handle = author ? author.handle : '@未知';
  var engSafe = eng || { likeCount: 0, likedByMe: false, commentCount: 0, comments: [] };
  var likedClass = engSafe.likedByMe ? ' is-liked' : '';
  var expanded = !!opts.commentsExpanded;
  var detailClass = mode === 'detail' ? ' gallery-item--detail' : '';
  var imgSrc = ZJS.escapeAttr(
    work.image || (ZJS.workPlaceholderImage ? ZJS.workPlaceholderImage() : '')
  );

  var coverInner =
    '<img class="gallery-cover-img" src="' + imgSrc + '" alt="' + ZJS.escapeHtml(work.title) + '" loading="lazy" decoding="async">';
  var coverHtml =
    mode === 'detail'
      ? '<div class="gallery-item-cover">' + coverInner + '</div>'
      : '<a href="' + ZJS.workUrl(work.id) + '" class="gallery-item-cover">' + coverInner + '</a>';

  var commentsHidden = expanded ? '' : ' hidden';
  var showDetailLink = opts.showDetailLink !== false && mode === 'card';

  return (
    '<article class="gallery-item' + detailClass + '" data-work-id="' + ZJS.escapeHtml(work.id) + '">' +
    coverHtml +
    '<div class="gallery-item-body">' +
    '<p class="gallery-item-author"><a href="' + ZJS.profileUrl(work.userId) + '">' + ZJS.escapeHtml(handle) + '</a></p>' +
    '<h3>' +
    (mode === 'detail' ? ZJS.escapeHtml(work.title) : '<a href="' + ZJS.workUrl(work.id) + '">' + ZJS.escapeHtml(work.title) + '</a>') +
    '</h3>' +
    '<p class="gallery-item-desc">' + ZJS.escapeHtml(work.desc) + '</p>' +
    '<div class="gallery-item-actions">' +
    '<button type="button" class="gallery-like-btn' + likedClass + '" data-work-id="' + ZJS.escapeHtml(work.id) + '" aria-pressed="' + engSafe.likedByMe + '">' +
    ZJS.heartIcon(engSafe.likedByMe) +
    '<span class="gallery-like-count">' + engSafe.likeCount + '</span></button>' +
    '<button type="button" class="gallery-comment-btn' + (expanded ? ' is-open' : '') + '" data-work-id="' + ZJS.escapeHtml(work.id) + '" aria-expanded="' + expanded + '">' +
    ZJS.commentIcon() +
    '<span class="gallery-comment-count">' + engSafe.commentCount + '</span></button>' +
    (showDetailLink
      ? '<a href="' +
        ZJS.workUrl(work.id) +
        '#comments" class="gallery-comment-detail">' +
        (ZJS.t ? ZJS.t('engage.detail') : '详情') +
        '</a>'
      : '') +
    '</div>' +
    '<div class="gallery-item-comments" id="gallery-comments-' + ZJS.escapeHtml(work.id) + '"' + commentsHidden + ' data-work-id="' + ZJS.escapeHtml(work.id) + '">' +
    ZJS.renderCommentList(engSafe.comments) +
    ZJS.renderCommentForm(work.id, ZJS.t ? ZJS.t('engage.placeholder') : '写下留言…') +
    '</div></div></article>'
  );
};

/** 绑定展厅卡片上的点赞、留言（gallery 瀑布流 & DIY 详情页共用） */
ZJS.bindGalleryEngage = function (root, state) {
  if (!root || !state) return;

  state.updateCard = function (workId) {
    var eng = state.engageMap[workId];
    if (!eng) return;
    var card = root.querySelector('.gallery-item[data-work-id="' + workId + '"]');
    if (!card) return;

    var likeBtn = card.querySelector('.gallery-like-btn');
    if (likeBtn) {
      likeBtn.classList.toggle('is-liked', eng.likedByMe);
      likeBtn.setAttribute('aria-pressed', eng.likedByMe);
      likeBtn.innerHTML = ZJS.heartIcon(eng.likedByMe) + '<span class="gallery-like-count">' + eng.likeCount + '</span>';
    }
    var commentBtn = card.querySelector('.gallery-comment-btn');
    if (commentBtn) {
      var countEl = commentBtn.querySelector('.gallery-comment-count');
      if (countEl) countEl.textContent = eng.commentCount;
    }
    var panel = card.querySelector('.gallery-item-comments');
    if (panel && !panel.hidden) {
      panel.innerHTML =
        ZJS.renderCommentList(eng.comments) +
        ZJS.renderCommentForm(workId, ZJS.t ? ZJS.t('engage.placeholder') : '写下留言…');
    }
  };

  root.addEventListener('click', function (e) {
    var likeBtn = e.target.closest('.gallery-like-btn');
    if (likeBtn && root.contains(likeBtn)) {
      e.preventDefault();
      e.stopPropagation();
      var workId = likeBtn.dataset.workId;
      if (!ZJS.requireLogin(ZJS.t ? ZJS.t('engage.like') : '点赞')) return;
      Api.toggleWorkLike(workId).then(function (res) {
        if (res.needLogin) {
          ZJS.requireLogin(ZJS.t ? ZJS.t('engage.like') : '点赞');
          return;
        }
        if (res.ok && res.engagement) {
          state.engageMap[workId] = res.engagement;
          state.updateCard(workId);
          return;
        }
        alert(res.message || (ZJS.t ? ZJS.t('engage.fail') : '点赞失败，请确认已登录且后台接口可用'));
      });
      return;
    }

    var commentBtn = e.target.closest('.gallery-comment-btn');
    if (commentBtn && root.contains(commentBtn)) {
      e.preventDefault();
      e.stopPropagation();
      var wid = commentBtn.dataset.workId;
      var card = root.querySelector('.gallery-item[data-work-id="' + wid + '"]');
      var panel = card && card.querySelector('.gallery-item-comments');
      if (!panel) return;

      var willOpen = panel.hidden;
      root.querySelectorAll('.gallery-item-comments').forEach(function (p) {
        p.hidden = true;
      });
      root.querySelectorAll('.gallery-comment-btn').forEach(function (b) {
        b.classList.remove('is-open');
        b.setAttribute('aria-expanded', 'false');
      });

      if (willOpen) {
        panel.hidden = false;
        commentBtn.classList.add('is-open');
        commentBtn.setAttribute('aria-expanded', 'true');
        state.openCommentsId = wid;
      } else {
        state.openCommentsId = null;
      }
    }
  });

  root.addEventListener('submit', function (e) {
    var form = e.target.closest('.comment-form');
    if (!form || !root.contains(form)) return;
    e.preventDefault();
    var workId = form.dataset.workId;
    var input = form.querySelector('.comment-input');
    if (!input) return;
    if (!ZJS.requireLogin(ZJS.t ? ZJS.t('engage.comment') : '留言')) return;

    Api.addWorkComment(workId, input.value).then(function (res) {
      if (res.needLogin) {
        ZJS.requireLogin(ZJS.t ? ZJS.t('engage.comment') : '留言');
        return;
      }
      if (!res.ok) {
        alert(res.message || (ZJS.t ? ZJS.t('engage.fail') : '留言失败'));
        return;
      }
      state.engageMap[workId] = res.engagement;
      input.value = '';
      state.updateCard(workId);
      var card = root.querySelector('.gallery-item[data-work-id="' + workId + '"]');
      var panel = card && card.querySelector('.gallery-item-comments');
      if (panel) panel.hidden = false;
      state.openCommentsId = workId;
    });
  });
};

