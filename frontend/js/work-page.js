/**
 * 统一作品详情 work.html?id=xxx
 * 展厅作品（含 DIY）均展示互动、合作手艺人定制与指间塑统筹入口
 */
(function () {
  var root = document.getElementById('work-root');
  if (!root) return;

  var workId = ZJS.getQuery('id');
  if (!workId) {
    root.innerHTML = '<p class="section-desc">缺少作品 ID 参数。</p>';
    return;
  }

  function renderClassicDetail(work, author, artisans, eng) {
    var pickHtml = artisans
      .map(function (a) {
        return (
          '<a href="' + a.link + '" class="artisan-pick-item">' +
          '<img src="' + ZJS.escapeAttr(a.image) + '" alt="' + ZJS.escapeHtml(a.name) + '" width="48" height="48" loading="lazy">' +
          '<div class="artisan-pick-info"><strong>' + ZJS.escapeHtml(a.name) + '</strong>' +
          '<span class="artisan-pick-role">' + ZJS.escapeHtml(a.role) + '</span>' +
          '<span class="artisan-pick-meta">' + ZJS.escapeHtml(a.meta) + '</span></div>' +
          '<span class="artisan-pick-arrow">→</span></a>'
        );
      })
      .join('');

    root.innerHTML =
      '<nav class="breadcrumb"><a href="index.html">首页</a><span>/</span><a href="gallery.html">数字化展厅</a><span>/</span>' +
      ZJS.escapeHtml(work.title) +
      '</nav>' +
      renderOwnerManageBar(work) +
      '<div class="work-detail-layout">' +
      '<div class="work-detail-main">' +
      '<div class="work-detail-visual"><img src="' +
      ZJS.escapeAttr(work.image || (ZJS.workPlaceholderImage ? ZJS.workPlaceholderImage() : '')) +
      '" alt="' +
      ZJS.escapeHtml(work.title) +
      '"></div>' +
      '<section class="work-engage" id="comments">' +
      '<div class="work-engage-head"><h2>互动</h2>' +
      '<div class="work-engage-actions">' +
      '<button type="button" class="work-like-btn' + (eng.likedByMe ? ' is-liked' : '') + '" id="work-like-btn" data-work-id="' + ZJS.escapeHtml(work.id) + '" aria-pressed="' + eng.likedByMe + '">' +
      ZJS.heartIcon(eng.likedByMe) + '<span id="work-like-count">' + eng.likeCount + '</span> 赞</button>' +
      '<span class="work-comment-stat">' + ZJS.commentIcon() + '<span id="work-comment-count">' + eng.commentCount + '</span> 条留言</span>' +
      '</div></div>' +
      '<div class="work-comments-panel"><h3>留言</h3><div id="work-comment-list">' + ZJS.renderCommentList(eng.comments) + '</div>' +
      '<div id="work-comment-form-wrap">' + ZJS.renderCommentForm(work.id, '写下你的留言…') + '</div></div></section>' +
      '</div>' +
      '<aside class="work-detail-side">' +
      '<h1>' + ZJS.escapeHtml(work.title) + '</h1>' +
      '<p class="work-detail-meta">创作者：<strong><a href="' + ZJS.profileUrl(work.userId) + '" class="author-link">' +
      ZJS.escapeHtml(author ? author.name || author.handle : '') + '</a></strong><br>发布时间：' +
      ZJS.escapeHtml(work.publishedAt || '—') + '</p>' +
      '<p class="work-detail-desc">' + ZJS.escapeHtml(work.desc) + '</p>' +
      '<div class="work-custom-box"><h3>选择合作手艺人定制</h3><p>以下手艺人均可承接实物定制，请点击选择。</p>' +
      '<div class="artisan-pick-list">' + pickHtml + '</div>' +
      '<a href="about.html" class="btn btn-outline" style="width:100%;justify-content:center;margin-top:12px;">联系指间塑统筹定制</a></div>' +
      '<a href="gallery.html" class="btn btn-outline" style="width:100%;justify-content:center;">← 返回展厅</a>' +
      '</aside></div>';

    bindClassicEngage(workId);
    bindOwnerManage(work);
  }

  function bindClassicEngage(workId) {
    var likeBtn = document.getElementById('work-like-btn');
    if (likeBtn) {
      likeBtn.addEventListener('click', function () {
        if (!ZJS.requireLogin('点赞')) return;
        Api.toggleWorkLike(workId).then(function (res) {
          if (res.needLogin) {
            ZJS.requireLogin('点赞');
            return;
          }
          if (res.ok && res.engagement) {
            likeBtn.classList.toggle('is-liked', res.engagement.likedByMe);
            likeBtn.setAttribute('aria-pressed', res.engagement.likedByMe);
            likeBtn.innerHTML =
              ZJS.heartIcon(res.engagement.likedByMe) +
              '<span id="work-like-count">' + res.engagement.likeCount + '</span> 赞';
            document.getElementById('work-comment-list').innerHTML = ZJS.renderCommentList(res.engagement.comments);
            document.getElementById('work-comment-count').textContent = res.engagement.commentCount;
          }
        });
      });
    }

    var formWrap = document.getElementById('work-comment-form-wrap');
    if (formWrap) {
      formWrap.addEventListener('submit', function (e) {
        var form = e.target.closest('.comment-form');
        if (!form) return;
        e.preventDefault();
        var input = form.querySelector('.comment-input');
        if (!input || !ZJS.requireLogin('留言')) return;
        Api.addWorkComment(workId, input.value).then(function (res) {
          if (res.needLogin) {
            ZJS.requireLogin('留言');
            return;
          }
          if (!res.ok) {
            alert(res.message || '留言失败');
            return;
          }
          input.value = '';
          document.getElementById('work-comment-list').innerHTML = ZJS.renderCommentList(res.engagement.comments);
          document.getElementById('work-comment-count').textContent = res.engagement.commentCount;
        });
      });
    }

    if (location.hash === '#comments') {
      var section = document.getElementById('comments');
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function renderOwnerManageBar(work) {
    var uid = Api.getCurrentUserId();
    if (!ZJS.canManageWork(work, uid)) return '';
    return (
      '<div class="work-owner-actions">' +
      '<a href="' +
      ZJS.studioEditUrl(work.id) +
      '" class="btn btn-primary btn-sm">编辑作品</a>' +
      '<button type="button" class="btn btn-outline btn-sm btn-danger-outline" id="work-delete-btn" data-work-id="' +
      ZJS.escapeHtml(work.id) +
      '" data-work-title="' +
      ZJS.escapeAttr(work.title) +
      '">删除作品</button>' +
      '</div>'
    );
  }

  function bindOwnerManage(work) {
    var delBtn = document.getElementById('work-delete-btn');
    if (!delBtn) return;
    delBtn.addEventListener('click', function () {
      var title = delBtn.getAttribute('data-work-title') || '该作品';
      if (!confirm('确定删除「' + title + '」？')) return;
      Api.deleteWork(work.id).then(function (res) {
        if (!res.ok) {
          alert(res.message || '删除失败');
          return;
        }
        var profile =
          typeof ZJS.resolve === 'function'
            ? ZJS.resolve('profile.html?id=me')
            : 'profile.html?id=me';
        window.location.href = profile;
      });
    });
  }

  Promise.all([Api.getWork(workId), Api.getWorkEngagement(workId)]).then(function (res) {
    var work = res[0];
    var eng = res[1];
    if (!work) {
      root.innerHTML = '<p class="section-desc">未找到该作品。</p>';
      return;
    }

    return Promise.all([Api.getUser(work.userId), Api.getAllArtisansForPick()]).then(function (pair) {
      var author = pair[0];
      var artisans = pair[1];
      document.title = work.title + ' — 指间塑';
      renderClassicDetail(work, author, artisans, eng);
    });
  });
})();
