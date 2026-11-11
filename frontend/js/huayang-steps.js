/**
 * 馒有花样 — 模块④ 花饽饽制作步骤流程交互
 * 工序示意图目录：images/steps/
 */
(function () {
  var STEPS_IMAGE_DIR = 'images/steps/';

  var STEPS = [
    {
      id: 'xuancai',
      name: '选材',
      tagline: '好料是好面的起点',
      hasImage: true,
      image: STEPS_IMAGE_DIR + 'step-xuancai.jpg',
      desc: '【步骤说明 · 待补充】选用优质小麦粉、酵母与清水，有的作坊还会加入少量白糖或牛奶，让面团更易发酵、成品色泽更润。',
      tip: '胶东民间讲究「面香先入鼻」，面粉筋度与新鲜度直接影响后续醒发与造型。'
    },
    {
      id: 'huomian',
      name: '和面',
      tagline: '揉出筋道与温度',
      hasImage: true,
      image: STEPS_IMAGE_DIR + 'step-huomian.jpg',
      desc: '【步骤说明 · 待补充】将干粉与液体反复揉匀，达到「三光」——手光、盆光、面光，面团柔软而有弹性，为发酵做好准备。',
      tip: '冬季常用温水和面，夏季则注意控温，避免面团过早发酵。'
    },
    {
      id: 'zhengzhi',
      name: '蒸制',
      tagline: '火候成就面香',
      hasImage: false,
      desc: '【步骤说明 · 待补充】部分工序中需先将面坯或半成品入笼蒸透，使结构稳定、便于后续刻花与造型（具体顺序因花样而异）。',
      tip: '蒸笼火候宜「先大火后中火」，揭盖前稍焖片刻，可防止表皮回缩。'
    },
    {
      id: 'kemou',
      name: '刻模',
      tagline: '木模拓出纹样',
      hasImage: true,
      image: STEPS_IMAGE_DIR + 'step-kemou.jpg',
      desc: '【步骤说明 · 待补充】使用梨木、枣木等雕刻的传统花模，在面坯表面压出鱼、桃、福字等吉祥图案，一印即成，整齐美观。',
      tip: '刻模需提前抹油防粘，图案深浅要均匀，才能保证蒸后纹样清晰。'
    },
    {
      id: 'zhiyangzi',
      name: '制样子',
      tagline: '构思花样与造型',
      hasImage: true,
      image: STEPS_IMAGE_DIR + 'step-zhiyangzi.jpg',
      desc: '【步骤说明 · 待补充】根据节庆或礼俗确定要做成寿桃、鲤鱼还是十二生肖等，在纸上或心中打好「样子」，再分步捏制。',
      tip: '制样子是花饽饽的「设计稿」，老手艺人往往凭经验一眼定夺尺寸与配色。'
    },
    {
      id: 'zhijizi',
      name: '制剂子',
      tagline: '分剂搓圆见功夫',
      hasImage: false,
      desc: '【步骤说明 · 待补充】将大块面团切成大小均匀的小剂子，搓圆压扁，便于包馅、捏形或入模，保证成品大小一致。',
      tip: '剂子大小要随花样调整，寿桃、面鱼等大造型需单独留足面量。'
    },
    {
      id: 'ganpian',
      name: '擀片儿',
      tagline: '薄厚均匀铺底色',
      hasImage: true,
      image: STEPS_IMAGE_DIR + 'step-ganpian.jpg',
      desc: '【步骤说明 · 待补充】用擀面杖将剂子擀成圆片或长片，作为包边、贴花或叠层的「底坯」，要求厚薄均匀、边缘光滑。',
      tip: '擀片儿时桌面要撒薄粉，动作宜轻宜快，避免面皮风干。'
    },
    {
      id: 'baobian',
      name: '包边',
      tagline: '收边定型不露馅',
      hasImage: false,
      desc: '【步骤说明 · 待补充】将面皮合拢、捏紧收口，形成馒头、包子或造型胚体的基础轮廓，边缘要严实，蒸制时才不易开裂。',
      tip: '包边纹路可借助梳子、筷子压出花边，既加固又美观。'
    },
    {
      id: 'chengxing',
      name: '成型',
      tagline: '捏塑魂魄在这一步',
      hasImage: true,
      image: STEPS_IMAGE_DIR + 'step-chengxing.jpg',
      desc: '【步骤说明 · 待补充】通过捏、搓、剪、挑等手法，将面团塑成鱼、桃、莲、人物等形象，讲究比例协调、神态生动。',
      tip: '成型最考验手艺人功力，往往需在面团未完全发干前一气呵成。'
    },
    {
      id: 'zuopeizi',
      name: '做胚子',
      tagline: '内部结构打底',
      hasImage: false,
      desc: '【步骤说明 · 待补充】为复杂造型制作内部支撑或基础胚体，有的以面团垒叠，有的留空便于后续装饰与蒸熟。',
      tip: '大型花饽饽的胚子要预留膨胀空间，防止蒸后走形。'
    },
    {
      id: 'zhanhua',
      name: '粘花',
      tagline: '点睛缀彩迎喜庆',
      hasImage: true,
      image: STEPS_IMAGE_DIR + 'step-zhanhua.jpg',
      desc: '【步骤说明 · 待补充】用少量清水或糖浆将预制的花朵、叶片、小动物等面塑部件粘到主胚上，并可点染食用色素，完成最后装饰。',
      tip: '粘花顺序一般从主到次、从大到小，色彩多用红、绿、黄，喜庆而不俗。'
    }
  ];

  var nodesEl = document.getElementById('steps-nodes');
  if (!nodesEl) return;

  var lineProgress = document.getElementById('steps-line-progress');
  var lineFlow = document.getElementById('steps-line-flow');
  var guideEl = document.getElementById('steps-guide');
  var emptyPanel = document.getElementById('steps-panel-empty');
  var card = document.getElementById('steps-card');
  var cardOrder = document.getElementById('steps-card-order');
  var cardTitle = document.getElementById('steps-card-title');
  var cardTagline = document.getElementById('steps-card-tagline');
  var cardMedia = document.getElementById('steps-card-media');
  var cardImg = document.getElementById('steps-card-img');
  var cardImgPh = document.getElementById('steps-card-img-placeholder');
  var cardImgPath = document.getElementById('steps-card-img-path');
  var cardDesc = document.getElementById('steps-card-desc');
  var cardTip = document.getElementById('steps-card-tip');
  var btnPrev = document.getElementById('steps-prev');
  var btnNext = document.getElementById('steps-next');

  var buttons = [];
  var activeIndex = -1;
  var hoverIndex = -1;

  function padOrder(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function buildNodes() {
    STEPS.forEach(function (step, i) {
      var li = document.createElement('li');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'steps-node';
      btn.setAttribute('data-step', step.id);
      btn.setAttribute('data-index', String(i));
      btn.setAttribute('aria-label', '第' + (i + 1) + '步：' + step.name);

      btn.innerHTML =
        '<span class="steps-node-index">' +
        padOrder(i + 1) +
        '</span>' +
        '<span class="steps-node-tooltip">' +
        step.name +
        '</span>' +
        '<span class="steps-node-dot" aria-hidden="true"></span>' +
        '<span class="steps-node-label">' +
        step.name +
        '</span>';

      btn.addEventListener('mouseenter', function () {
        hoverIndex = i;
        btn.classList.add('is-hover');
      });
      btn.addEventListener('mouseleave', function () {
        hoverIndex = -1;
        btn.classList.remove('is-hover');
      });
      btn.addEventListener('click', function () {
        activate(i);
      });
      btn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate(i);
        }
      });

      li.appendChild(btn);
      nodesEl.appendChild(li);
      buttons.push(btn);
    });
  }

  function updateLine(index) {
    if (!lineProgress) return;
    if (index < 0) {
      lineProgress.style.width = '0%';
      if (lineFlow) lineFlow.hidden = true;
      return;
    }
    var pct = STEPS.length <= 1 ? 100 : (index / (STEPS.length - 1)) * 100;
    lineProgress.style.width = pct + '%';
    if (lineFlow) lineFlow.hidden = false;
  }

  function updateNodeStates(index) {
    buttons.forEach(function (btn, i) {
      btn.classList.toggle('is-active', i === index);
      btn.classList.toggle('is-reached', index >= 0 && i <= index);
      btn.setAttribute('aria-pressed', i === index ? 'true' : 'false');
    });
  }

  function setStepImage(step) {
    if (!cardMedia) return;
    if (!step.hasImage) {
      cardMedia.hidden = true;
      return;
    }
    cardMedia.hidden = false;
    var path = step.image || STEPS_IMAGE_DIR + 'step-' + step.id + '.jpg';
    if (cardImgPath) cardImgPath.textContent = path;
    if (!cardImg || !cardImgPh) return;

    cardImg.hidden = true;
    cardImgPh.hidden = false;
    cardImg.alt = step.name + ' 工序示意图';
    cardImg.onload = function () {
      cardImg.hidden = false;
      cardImgPh.hidden = true;
    };
    cardImg.onerror = function () {
      cardImg.hidden = true;
      cardImgPh.hidden = false;
    };
    cardImg.src = path;
  }

  function showCard(index) {
    var step = STEPS[index];
    if (!step || !card) return;

    cardOrder.textContent = padOrder(index + 1);
    cardTitle.textContent = step.name;
    cardTagline.textContent = step.tagline;
    cardDesc.textContent = step.desc;
    cardTip.textContent = step.tip;
    setStepImage(step);

    if (emptyPanel) emptyPanel.hidden = true;
    card.hidden = false;
    requestAnimationFrame(function () {
      card.classList.add('is-visible');
    });
    if (guideEl) guideEl.classList.add('is-dismissed');

    if (btnPrev) btnPrev.disabled = index <= 0;
    if (btnNext) btnNext.disabled = index >= STEPS.length - 1;
  }

  function activate(index) {
    if (index < 0 || index >= STEPS.length) return;
    activeIndex = index;
    updateLine(index);
    updateNodeStates(index);
    showCard(index);
  }

  function initNav() {
    if (btnPrev) {
      btnPrev.addEventListener('click', function () {
        if (activeIndex > 0) activate(activeIndex - 1);
      });
    }
    if (btnNext) {
      btnNext.addEventListener('click', function () {
        if (activeIndex < STEPS.length - 1) activate(activeIndex + 1);
      });
    }
  }

  buildNodes();
  initNav();
  updateLine(-1);
  updateNodeStates(-1);
})();
