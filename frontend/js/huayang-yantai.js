/**
 * 馒有花样 — 模块② 烟台胶东花饽饽非遗传承人地图
 */
(function () {
  var DISTRICTS = {
    zhifu: {
      name: '芝罘区',
      tint: 'lavender',
      inheritors: [
        {
          name: '戚惠雯',
          title: '胶东花饽饽传承人',
          bio: '拥有鲁迅美术学院附中专业设计背景的她，从2016年开始，就清醒地认识到，要让这门古老手艺活起来，必须将现代审美注入这古老的「面团」。'
        }
      ]
    },
    fushan: {
      name: '福山区',
      tint: 'butter',
      inheritors: [
        {
          name: '赵亚琳',
          title: '福山面塑 · 区级非遗代表性传承人',
          bio: '女，1978年4月生，烟台市福山区回里镇东黄山人。现为区级非遗保护项目「福山面塑」代表性传承人，长期从事福山民间面塑技艺的传承与推广，作品多见于婚嫁、年节等礼俗场景，注重福字、寿桃等吉祥造型。'
        }
      ]
    },
    laishan: {
      name: '莱山区',
      tint: 'mint',
      inheritors: [
        {
          name: '石广芹',
          title: '胶东花饽饽习俗代表性传承人',
          bio: '莱山地区的胶东花饽饽习俗历史悠久，它源于劳动者深厚的生活土壤，是根据本地地域特色、节日和生活习俗从而形成的一种民间艺术，它以面为加工对象，以刀、剪、笔等工具进行创作，是民间托物寄情、祈福平安的生活艺术用品，体现了劳动人民基本的审美观念和精神品质。'
        }
      ]
    },
    muping: {
      name: '牟平区',
      tint: 'peach',
      inheritors: [
        {
          name: '【传承人姓名 · 待补充】',
          title: '胶东花饽饽非遗传承人',
          bio: '【简介待补充】牟平地处胶东半岛东侧，渔农礼俗并存，花饽饽在祭海、年节、喜庆宴席中应用广泛。'
        }
      ]
    },
    penglai: {
      name: '蓬莱区',
      tint: 'lavender',
      inheritors: [
        {
          name: '【传承人姓名 · 待补充】',
          title: '胶东花饽饽非遗传承人',
          bio: '【简介待补充】蓬莱为历史文化名城，旅游与非遗展示结合，花饽饽常作为特色伴手礼与展演项目。'
        }
      ]
    },
    longkou: {
      name: '龙口市',
      tint: 'butter',
      inheritors: [
        {
          name: '张燕',
          title: '胶东黄县面塑 · 龙口市级非遗代表性传承人',
          bio: '张燕是龙口市级非物质文化遗产「胶东黄县面塑」代表性传承人，创立「燕子面塑」工坊十余年，致力于传统面塑的创新与教育传承。她曾任南山老年大学、明德中学、培基小学等校面塑指导老师，推动非遗进校园，并创作《盛世中华》《关公》（被山东工艺美术学院收藏）等代表作。近年活跃于冬奥主题创作（如2022年捏制「冰墩墩」）、花饽饽文化推广及面塑公益教学，持续推动黄县面塑从民俗食品向工艺美术转型。'
        }
      ]
    },
    laizhou: {
      name: '莱州市',
      tint: 'mint',
      inheritors: [
        {
          name: '孟昭泰',
          title: '胶东花饽饽习俗（莱州面塑）省级非遗传承人',
          bio: '1954年4月28日出生于山东莱州，山东省省级乡村工匠名师，「胶东花饽饽习俗」（莱州面塑）省级非遗项目传承人，技艺门类为食品制作，2019年度乡村文化和旅游能人。他开设了山东省首个以面塑为主题的博物馆「昭泰面塑艺术博物馆」。'
        }
      ]
    },
    zhaoyuan: {
      name: '招远市',
      tint: 'peach',
      inheritors: [
        {
          name: '王燕',
          title: '招远面塑技艺传承人',
          bio: '传承人王燕一直以「传承非遗文化，弘扬指尖艺术」为己任，在继承祖辈江米人技艺的基础上，突破传统竹签技艺，融合绘画和雕塑手法，创新研制了招远面塑技艺。为了让珍贵的手工艺更好地传承和发扬，王燕成立了面塑工作室，并走进中小学课堂，成立学生社团和兴趣小组。至今，广大学员、学生是招远面塑技艺的主要传承群体，分布在全国各地。'
        }
      ]
    },
    qixia: {
      name: '栖霞市',
      tint: 'lavender',
      inheritors: [
        {
          name: '贾雨萍',
          title: '胶东花饽饽习俗传承人',
          bio: '作为胶东花饽饽习俗的传承人，贾雨萍从小时候起就对花饽饽产生浓厚的兴趣，缘起便是小时候过年时看奶奶、妈妈做花饽饽，蒸出来的花饽饽不仅漂亮精致，又十分美味、实用，这对当地人来说，就是年的味道。长大后，贾雨萍对花饽饽的学习热情并未减退，反而愈加向往。一次偶然的机会，从没正式做过花饽饽的贾雨萍接到了第一笔新婚花饽饽订单，她回忆以往见过的饽饽样式，潜心研究，做出一对「龙凤呈祥」花饽饽，生动美观，由此开始了花饽饽制作的生涯路。'
        }
      ]
    },
    laiyang: {
      name: '莱阳市',
      tint: 'butter',
      inheritors: [
        {
          name: '【传承人姓名 · 待补充】',
          title: '胶东花饽饽非遗传承人',
          bio: '【简介待补充】莱阳梨乡，传承人注重果蔬、花鸟等乡土题材，作品色彩明快、寓意吉祥。'
        }
      ]
    },
    haiyang: {
      name: '海阳市',
      tint: 'mint',
      inheritors: [
        {
          name: '【传承人姓名 · 待补充】',
          title: '胶东花饽饽非遗传承人',
          bio: '【简介待补充】海阳大秧歌之乡，民俗活动频繁，花饽饽在秧歌庙会、滨海旅游推介中频频亮相。'
        }
      ]
    }
  };

  var map = document.getElementById('yantai-bun-map');
  if (!map) return;

  var districts = map.querySelectorAll('.yantai-district');
  var card = document.getElementById('yantai-inheritor-card');
  var cardEmpty = document.getElementById('yantai-card-empty');
  var cardDistrict = document.getElementById('yantai-card-district');
  var cardList = document.getElementById('yantai-inheritor-list');
  var guide = document.getElementById('yantai-guide');
  var activeId = null;

  var AVATAR_PLACEHOLDER =
    '<span class="yantai-inheritor-avatar__icon" aria-hidden="true">' +
    '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">' +
    '<circle cx="24" cy="18" r="8" fill="currentColor" opacity="0.2"/>' +
    '<path d="M10 42c0-7.7 6.3-14 14-14s14 6.3 14 14" fill="currentColor" opacity="0.2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
    '</svg></span>';

  var AVATAR_EXTS = ['jpg', 'jpeg', 'png', 'webp'];

  function defaultAvatarPath(districtId, index, ext) {
    return (
      'images/inheritor/inheritor-' +
      districtId +
      '-' +
      (index + 1) +
      '.' +
      (ext || AVATAR_EXTS[0])
    );
  }

  function renderInheritors(districtId, items) {
    if (!cardList) return;
    cardList.innerHTML = items
      .map(function (person, index) {
        var src = person.avatar || defaultAvatarPath(districtId, index);
        var alt = (person.name || '传承人') + ' 头像';
        return (
          '<div class="yantai-inheritor-item">' +
          '<div class="yantai-inheritor-avatar is-awaiting-photo">' +
          '<img class="yantai-inheritor-avatar__img" src="' +
          escapeHtml(src) +
          '" alt="' +
          escapeHtml(alt) +
          '" width="52" height="52" decoding="async" data-district="' +
          escapeHtml(districtId) +
          '" data-index="' +
          index +
          '"/>' +
          AVATAR_PLACEHOLDER +
          '</div>' +
          '<div class="yantai-inheritor-body">' +
          '<h4 class="yantai-inheritor-name">' +
          escapeHtml(person.name) +
          '</h4>' +
          '<p class="yantai-inheritor-title">' +
          escapeHtml(person.title) +
          '</p>' +
          '<p class="yantai-inheritor-bio">' +
          escapeHtml(person.bio) +
          '</p>' +
          '</div></div>'
        );
      })
      .join('');

    cardList.querySelectorAll('.yantai-inheritor-avatar__img').forEach(function (img) {
      var wrap = img.parentElement;
      var icon = wrap && wrap.querySelector('.yantai-inheritor-avatar__icon');
      var districtId = img.getAttribute('data-district') || '';
      var personIndex = parseInt(img.getAttribute('data-index'), 10) || 0;
      var extTry = 0;
      var customSrc = img.getAttribute('src');

      function showPlaceholder() {
        if (wrap) {
          wrap.classList.remove('is-awaiting-photo', 'has-photo');
          wrap.classList.add('no-photo');
        }
      }

      function showPhoto() {
        if (wrap) {
          wrap.classList.remove('is-awaiting-photo', 'no-photo');
          wrap.classList.add('has-photo');
        }
      }

      function tryNextExtension() {
        if (customSrc && customSrc.indexOf('inheritor-' + districtId) === -1) {
          showPlaceholder();
          return;
        }
        extTry += 1;
        if (extTry >= AVATAR_EXTS.length) {
          showPlaceholder();
          return;
        }
        img.src = defaultAvatarPath(districtId, personIndex, AVATAR_EXTS[extTry]);
      }

      img.onload = function () {
        if (img.naturalWidth > 0) showPhoto();
        else tryNextExtension();
      };
      img.onerror = tryNextExtension;

      if (img.complete) {
        if (img.naturalWidth > 0) showPhoto();
        else tryNextExtension();
      }
    });
  }

  function escapeHtml(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showCard(districtId) {
    var data = DISTRICTS[districtId];
    if (!data || !card) return;

    if (cardDistrict) cardDistrict.textContent = data.name;
    renderInheritors(districtId, data.inheritors || []);

    if (cardEmpty) cardEmpty.hidden = true;
    card.hidden = false;
    requestAnimationFrame(function () {
      card.classList.add('is-visible');
    });
    if (guide) guide.classList.add('is-dismissed');
  }

  function activate(districtId) {
    if (activeId === districtId) return;
    activeId = districtId;

    districts.forEach(function (el) {
      var id = el.getAttribute('data-district');
      el.classList.toggle('is-active', id === districtId);
      el.setAttribute('aria-pressed', id === districtId ? 'true' : 'false');
    });

    showCard(districtId);
  }

  districts.forEach(function (el) {
    var districtId = el.getAttribute('data-district');

    el.addEventListener('click', function () {
      activate(districtId);
    });

    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activate(districtId);
      }
    });
  });

  /* 模块 Tab 高亮（滚动到对应区块时） */
  var tabs = document.querySelectorAll('.huayang-module-tab[href^="#"]');
  var sections = [];
  tabs.forEach(function (tab) {
    var id = tab.getAttribute('href').slice(1);
    var sec = document.getElementById(id);
    if (sec) sections.push({ tab: tab, el: sec });
  });

  function updateTabs() {
    var scrollY = window.scrollY + varNavOffset();
    var current = sections[0];
    sections.forEach(function (s) {
      if (s.el.offsetTop <= scrollY) current = s;
    });
    if (!current) return;
    tabs.forEach(function (t) {
      t.classList.toggle('is-active', t === current.tab);
    });
  }

  function varNavOffset() {
    return 120;
  }

  if (sections.length && tabs.length) {
    window.addEventListener('scroll', updateTabs, { passive: true });
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) {
          t.classList.toggle('is-active', t === tab);
        });
      });
    });
  }
})();
