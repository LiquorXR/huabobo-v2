/**
 * 馒有花样 — 模块① 全国花饽饽分布地图交互（真实省界 SVG）
 */
(function () {
  var REGIONS = {
    gansu: {
      name: '甘肃',
      subtitle: '陇原面点 · 丝路烟火',
      badge: '西北风味',
      image: 'images/region-gansu.jpg',
      history: '【历史渊源 · 待补充】甘肃地处丝路要道，面食文化深厚，花饽饽与节庆礼仪相伴相生，融入当地礼俗与信仰表达。',
      features: '【地域特色 · 待补充】造型质朴、寓意吉祥，常见寿桃、福字等纹样，与河西走廊年节习俗紧密相连。'
    },
    shaanxi: {
      name: '陕西',
      subtitle: '关中礼馍 · 千年面韵',
      badge: '关中重镇',
      image: 'images/region-shaanxi.jpg',
      history: '【历史渊源 · 待补充】关中平原素有「面食王国」之称，礼馍、花馍在婚丧嫁娶与岁时节令中承担重要礼仪功能。',
      features: '【地域特色 · 待补充】花型饱满、色彩热烈，注重口彩与寓意，与胶东花饽饽在礼仪功能上遥相呼应。'
    },
    shanxi: {
      name: '山西',
      subtitle: '晋面花馍 · 黄河吉庆',
      badge: '晋文化圈',
      image: 'images/region-shanxi.jpg',
      history: '【历史渊源 · 待补充】晋地民间面塑历史悠久，花馍与庙会、婚嫁、祝寿等场景结合，是黄河流域面点艺术的重要一支。',
      features: '【地域特色 · 待补充】刀工细腻、层次丰富，常见花鸟、生肖等造型，寓意祈福纳祥、五谷丰登。'
    },
    hebei: {
      name: '河北',
      subtitle: '燕赵花馍 · 民俗传承',
      badge: '华北腹地',
      image: 'images/region-hebei.jpg',
      history: '【历史渊源 · 待补充】燕赵大地民俗浓厚，花饽饽与春节、元宵、婚庆等习俗交织，是华北面食文化的重要组成。',
      features: '【地域特色 · 待补充】造型多样、贴近生活，既有传统吉祥图案，也吸收周边省份面塑技艺。'
    },
    henan: {
      name: '河南',
      subtitle: '中原面花 · 礼仪之邦',
      badge: '中原核心',
      image: 'images/region-henan.jpg',
      history: '【历史渊源 · 待补充】中原地区为华夏文明发祥地，面塑与礼仪文化同源，花饽饽在节庆与人生礼仪中象征祝福与敬意。',
      features: '【地域特色 · 待补充】寓意鲜明、制作精细，与庙会、年节供桌文化联系紧密，影响周边诸省。'
    },
    shandong: {
      name: '山东',
      subtitle: '胶东花饽饽 · 非遗瑰宝',
      badge: '核心产区 ✦',
      image: 'images/region-shandong.jpg',
      history: '【历史渊源 · 待补充】胶东花饽饽是山东省非物质文化遗产代表性项目，源于沿海渔农家庭的节庆面点习俗，承袭「以面代言、以形传情」的礼俗传统。',
      features: '【地域特色 · 待补充】造型灵动、色彩喜庆，寿桃、鲤鱼、花卉等题材寓意福寿吉祥；与婚嫁、寿宴、年节紧密相连，是「馒有花样」故事的主角。'
    }
  };

  function initMapInteractions(map) {
    if (!map) return;

    var regions = map.querySelectorAll('.map-region');
    var card = document.getElementById('region-card');
    var emptyPanel = document.getElementById('region-panel-empty');
    var cardTitle = document.getElementById('region-card-title');
    var cardSubtitle = document.getElementById('region-card-subtitle');
    var cardBadge = document.getElementById('region-card-badge');
    var cardHistory = document.getElementById('region-card-history');
    var cardFeatures = document.getElementById('region-card-features');
    var cardImg = document.getElementById('region-card-img');
    var cardImgPlaceholder = document.getElementById('region-card-img-placeholder');
    var cardImgPath = document.getElementById('region-card-img-path');
    var guide = document.getElementById('map-guide');
    var activeId = null;

    function setRegionImage(data) {
      var imgPath = data.image || 'images/region-unknown.jpg';
      if (cardImgPath) cardImgPath.textContent = imgPath;
      if (!cardImg || !cardImgPlaceholder) return;

      cardImg.hidden = true;
      cardImgPlaceholder.hidden = false;
      cardImg.alt = data.name + ' 花饽饽地域实拍';

      cardImg.onload = function () {
        cardImg.hidden = false;
        cardImgPlaceholder.hidden = true;
      };
      cardImg.onerror = function () {
        cardImg.hidden = true;
        cardImgPlaceholder.hidden = false;
      };
      cardImg.src = imgPath;
    }

    function showCard(regionId) {
      var data = REGIONS[regionId];
      if (!data || !card) return;

      cardTitle.textContent = data.name;
      cardSubtitle.textContent = data.subtitle;
      if (cardBadge) cardBadge.textContent = data.badge;
      cardHistory.textContent = data.history;
      cardFeatures.textContent = data.features;
      setRegionImage(data);

      if (emptyPanel) emptyPanel.hidden = true;
      card.hidden = false;
      requestAnimationFrame(function () {
        card.classList.add('is-visible');
      });
      if (guide) guide.classList.add('is-dismissed');
    }

    function activate(regionId) {
      if (activeId === regionId) return;
      activeId = regionId;

      regions.forEach(function (el) {
        var id = el.getAttribute('data-region');
        el.classList.toggle('is-active', id === regionId);
        el.setAttribute('aria-pressed', id === regionId ? 'true' : 'false');
      });

      showCard(regionId);
    }

    regions.forEach(function (el) {
      var regionId = el.getAttribute('data-region');

      el.addEventListener('click', function () {
        activate(regionId);
      });

      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate(regionId);
        }
      });
    });
  }

  /** 按地图实际占用的边界收紧 viewBox，避免白框上下留白过高 */
  function fitChinaMapStage(svg) {
    if (!svg) return;
    var layers = svg.querySelectorAll('.map-china-bg, .map-china-frame, .map-region');
    if (!layers.length) return;

    var minX = Infinity;
    var minY = Infinity;
    var maxX = -Infinity;
    var maxY = -Infinity;

    layers.forEach(function (el) {
      var b = el.getBBox();
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.width);
      maxY = Math.max(maxY, b.y + b.height);
    });

    if (!isFinite(minX)) return;

    var pad = 8;
    var x = minX - pad;
    var y = minY - pad;
    var w = maxX - minX + pad * 2;
    var h = maxY - minY + pad * 2;

    svg.setAttribute('viewBox', x + ' ' + y + ' ' + w + ' ' + h);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    var ocean = svg.querySelector('.map-ocean');
    if (ocean) {
      ocean.setAttribute('x', x);
      ocean.setAttribute('y', y);
      ocean.setAttribute('width', w);
      ocean.setAttribute('height', h);
    }

    var stage = document.querySelector('.map-stage--china');
    if (stage) stage.style.aspectRatio = w + ' / ' + h;
  }

  function init() {
    var map = document.getElementById('china-bun-map');
    fitChinaMapStage(map);
    initMapInteractions(map);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
