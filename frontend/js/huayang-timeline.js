/**
 * 馒有花样 — 模块③ 人生时间轴 · 时令节气花饽饽
 * 节点照片：images/timeline/node-{节点ID}.jpg
 */
(function () {
  var PHOTO_EXTS = ['jpg', 'jpeg', 'png', 'webp'];
  var TIMELINE_DIR = 'images/timeline/';

  var NODES = {
    birth: {
      group: '生命礼俗',
      label: '出生',
      bunName: '新生锁饽饽',
      title: '出生礼 · 新生锁饽饽',
      desc: '专为新生儿制作百家锁样式花饽饽，汇聚百家福气，锁住平安好运，寓意孩子一生无灾无难，福气满满顺遂无忧。'
    },
    wedding: {
      group: '生命礼俗',
      label: '结婚',
      bunName: '婚嫁龙凤饽饽',
      title: '婚嫁礼 · 婚嫁龙凤饽饽',
      desc: '婚礼专属龙凤造型花饽饽，龙凤成双成对，象征新人琴瑟和鸣、姻缘美满，寓意夫妻同心同德，往后日子幸福和睦。'
    },
    longevity: {
      group: '生命礼俗',
      label: '寿宴',
      bunName: '寿宴寿桃饽饽',
      title: '寿宴礼 · 寿宴寿桃饽饽',
      desc: '老人过寿必蒸寿桃花饽饽，外形饱满圆润，是福寿吉祥的象征，祝愿长辈松鹤延年，身体康健，岁岁平安长寿。'
    },
    qiaoqian: {
      group: '生命礼俗',
      label: '乔迁',
      bunName: '乔迁元宝饽饽',
      title: '乔迁礼 · 乔迁元宝饽饽',
      desc: '新居搬迁选用元宝花饽饽，形似金元宝招财聚气，寓意新家财源滚滚，家宅兴旺，阖家生活富足安稳万事顺心。'
    },
    spring: {
      group: '岁时节令',
      label: '春节',
      bunName: '春节面鱼饽饽',
      title: '春节 · 春节面鱼饽饽',
      desc: '新春佳节蒸制面鱼花饽饽，形态灵动鲜活，取年年有余美好寓意，期盼新年衣食丰盈，财运兴旺，阖家日子富足红火。'
    },
    qingming: {
      group: '岁时节令',
      label: '清明',
      bunName: '清明燕子饽饽',
      title: '清明 · 清明燕子饽饽',
      desc: '清明时节特色面燕花饽饽，贴合春燕归来时令，用来祭祖追思先人，寄托绵长思念，也祈愿春日顺遂平安。'
    },
    duanwu: {
      group: '岁时节令',
      label: '端午',
      bunName: '端午虎头饽饽',
      title: '端午节 · 端午虎头饽饽',
      desc: '端午节食用虎头花饽饽，承袭端午民俗，借瑞虎之势祛除暑气邪祟，守护家人四季安康，纳取夏日吉祥福气。'
    },
    qixi: {
      group: '岁时节令',
      label: '七夕',
      bunName: '七夕七巧果',
      title: '七夕节 · 七夕七巧果',
      desc: '七夕专属小巧花样七巧果，造型精致灵巧，寓意女子心灵手巧，祈愿有情人姻缘美满，良缘相守岁岁相伴。'
    }
  };

  var guideEl = document.getElementById('timeline-guide');
  var card = document.getElementById('timeline-card');
  var cardEmpty = document.getElementById('timeline-card-empty');
  var cardTag = document.getElementById('timeline-card-tag');
  var cardTitle = document.getElementById('timeline-card-title');
  var cardBun = document.getElementById('timeline-card-bun');
  var cardDesc = document.getElementById('timeline-card-desc');
  var bunPhoto = document.getElementById('timeline-bun-photo');
  var bunPhotoWrap = bunPhoto && bunPhoto.parentElement;
  var nodeBtns = document.querySelectorAll('.timeline-node');

  if (!nodeBtns.length) return;

  function photoPath(id, ext) {
    return TIMELINE_DIR + 'node-' + id + '.' + (ext || PHOTO_EXTS[0]);
  }

  function bindPhoto(img, wrap, nodeId, customSrc) {
    if (!img || !wrap) return;

    var extTry = 0;
    var baseSrc = customSrc || photoPath(nodeId);

    function showPlaceholder() {
      wrap.classList.remove('is-awaiting-photo', 'has-photo');
      wrap.classList.add('no-photo');
    }

    function showPhoto() {
      wrap.classList.remove('is-awaiting-photo', 'no-photo');
      wrap.classList.add('has-photo');
    }

    function tryNextExtension() {
      if (customSrc) {
        showPlaceholder();
        return;
      }
      extTry += 1;
      if (extTry >= PHOTO_EXTS.length) {
        showPlaceholder();
        return;
      }
      img.src = photoPath(nodeId, PHOTO_EXTS[extTry]);
    }

    wrap.classList.add('is-awaiting-photo');
    wrap.classList.remove('has-photo', 'no-photo');

    img.onload = function () {
      if (img.naturalWidth > 0) showPhoto();
      else tryNextExtension();
    };
    img.onerror = tryNextExtension;

    img.src = baseSrc;

    if (img.complete) {
      if (img.naturalWidth > 0) showPhoto();
      else tryNextExtension();
    }
  }

  function showCard(nodeId) {
    var data = NODES[nodeId];
    if (!data || !card) return;

    if (cardTag) cardTag.textContent = data.group;
    if (cardTitle) cardTitle.textContent = data.title;
    if (cardBun) cardBun.textContent = '代表花样：' + data.bunName;
    if (cardDesc) cardDesc.textContent = data.desc;

    if (bunPhoto && bunPhotoWrap) {
      bunPhoto.alt = data.label + ' · ' + data.bunName;
      bindPhoto(bunPhoto, bunPhotoWrap, nodeId, data.photo);
      bunPhotoWrap.classList.remove('is-animating');
      void bunPhotoWrap.offsetWidth;
      bunPhotoWrap.classList.add('is-animating');
    }

    if (cardEmpty) cardEmpty.hidden = true;
    card.hidden = false;
    requestAnimationFrame(function () {
      card.classList.add('is-visible');
    });
    if (guideEl) guideEl.classList.add('is-dismissed');
  }

  function activate(nodeId) {
    if (!NODES[nodeId]) return;

    nodeBtns.forEach(function (btn) {
      var id = btn.getAttribute('data-node');
      btn.classList.toggle('is-active', id === nodeId);
      btn.setAttribute('aria-pressed', id === nodeId ? 'true' : 'false');
    });

    showCard(nodeId);
  }

  nodeBtns.forEach(function (btn) {
    var nodeId = btn.getAttribute('data-node');
    btn.addEventListener('click', function () {
      activate(nodeId);
    });
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activate(nodeId);
      }
    });
  });
})();
