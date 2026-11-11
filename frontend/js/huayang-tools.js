/**
 * 馒有花样 — 模块⑤ 花饽饽制作工具介绍（浮动展示 + 3D 预览）
 * UI 与 Three.js 分离：工具区始终可显示，3D 在需要时再动态加载。
 */
(function () {
  'use strict';

  var TOOLS = [
    {
      id: 'shuzi',
      name: '梳子',
      icon: '🪮',
      image: 'images/tool-shuzi.png',
      model: 'models/tools/tool-shuzi.glb',
      usage: '梳子：用来压出花纹纹理',
      desc: '【说明待补充】齿距均匀的木梳或竹梳，在面皮表面轻轻压过，可形成整齐的花边、网格或条纹，是花饽饽装饰中最常用的纹理工具之一。',
      x: 10,
      y: 18,
      floatDur: 5.5,
      floatDelay: 0
    },
    {
      id: 'jiandao',
      name: '剪刀',
      icon: '✂️',
      image: 'images/tool-jiandao.png',
      model: 'models/tools/tool-jiandao.glb',
      usage: '剪刀：修剪造型边缘与开口',
      desc: '【说明待补充】小号尖头剪刀用于剪出鱼鳍、花瓣尖角等细节，要求刀口锋利、动作利落，避免拉扯面皮。',
      x: 28,
      y: 58,
      floatDur: 6.8,
      floatDelay: 0.4
    },
    {
      id: 'xiaodao',
      name: '小刀',
      icon: '🔪',
      image: 'images/tool-xiaodao.png',
      model: 'models/tools/tool-xiaodao.glb',
      usage: '小刀：刻画线条与切口',
      desc: '【说明待补充】刀刃细长，可在面团上划出叶脉、鱼鳞等细线，也可辅助分割小块面剂。',
      x: 48,
      y: 12,
      floatDur: 7.2,
      floatDelay: 1.1
    },
    {
      id: 'muzi',
      name: '模子',
      icon: '⬡',
      image: 'images/tool-muzi.png',
      model: 'models/tools/tool-muzi.glb',
      usage: '模子：拓印传统吉祥纹样',
      desc: '【说明待补充】木质或陶质花模，一压成型，常见寿桃、福字、鱼纹等图案，效率高且纹样统一，适合批量制作。',
      x: 66,
      y: 42,
      floatDur: 5.8,
      floatDelay: 0.7
    },
    {
      id: 'kedao',
      name: '刻刀',
      icon: '🛠',
      image: 'images/tool-kedao.png',
      model: 'models/tools/tool-kedao.glb',
      usage: '刻刀：精雕细节与镂空',
      desc: '【说明待补充】用于雕刻较深的花纹或镂空结构，刀尖角度多变，需手稳力匀，多用于高级造型花饽饽。',
      x: 82,
      y: 16,
      floatDur: 6.4,
      floatDelay: 1.8
    },
    {
      id: 'shaozi',
      name: '勺子',
      icon: '🥄',
      image: 'images/tool-shaozi.png',
      model: 'models/tools/tool-shaozi.glb',
      usage: '勺子：压弧、挖槽与整形',
      desc: '【说明待补充】勺背可压出圆润弧面，勺口可挖槽塑形，是捏塑花瓣、叶片时的常用辅助工具。',
      x: 14,
      y: 72,
      floatDur: 7.5,
      floatDelay: 0.2
    },
    {
      id: 'ganmianzhang',
      name: '擀面杖',
      icon: '🪵',
      image: 'images/tool-ganmianzhang.png',
      model: 'models/tools/tool-ganmianzhang.glb',
      usage: '擀面杖：擀平面皮、控制厚薄',
      desc: '【说明待补充】长短不一的木质擀面杖，用于擀片、擀圆，保证面皮厚薄均匀，为包馅与造型打基础。',
      x: 40,
      y: 78,
      floatDur: 6.2,
      floatDelay: 1.4
    },
    {
      id: 'hongzao',
      name: '红枣',
      icon: '🫒',
      image: 'images/tool-hongzao.png',
      model: 'models/tools/tool-hongzao.glb',
      usage: '红枣：点缀装饰、寓意吉祥',
      desc: '【说明待补充】去核红枣嵌入或粘贴在花饽饽表面，象征早生贵子、红红火火，常用于婚庆、节庆造型。',
      x: 58,
      y: 70,
      floatDur: 5.2,
      floatDelay: 0.9
    },
    {
      id: 'douzi',
      name: '豆子装饰',
      icon: '🫘',
      image: 'images/tool-douzi.png',
      model: 'models/tools/tool-douzi.glb',
      usage: '豆子：点睛缀色、模拟花蕊',
      desc: '【说明待补充】红豆、绿豆等按颗粒粘贴，可表现花蕊、眼睛或局部点缀，蒸熟后色泽自然，增添层次感。',
      x: 76,
      y: 62,
      floatDur: 7,
      floatDelay: 2.2
    }
  ];

  var threeBundle = null;
  var threeLoadPromise = null;

  function loadThreeBundle() {
    if (threeBundle) return Promise.resolve(threeBundle);
    if (threeLoadPromise) return threeLoadPromise;

    threeLoadPromise = Promise.all([
      import('three'),
      import('three/addons/controls/OrbitControls.js'),
      import('three/addons/loaders/GLTFLoader.js')
    ])
      .then(function (mods) {
        threeBundle = {
          THREE: mods[0],
          OrbitControls: mods[1].OrbitControls,
          GLTFLoader: mods[2].GLTFLoader
        };
        return threeBundle;
      })
      .catch(function (err) {
        threeLoadPromise = null;
        console.warn('[huayang-tools] Three.js 未能加载，3D 预览不可用：', err);
        return null;
      });

    return threeLoadPromise;
  }

  function initToolsModule() {
    var arenaEl = document.getElementById('tools-arena');
    if (!arenaEl) return;

    var guideEl = document.getElementById('tools-guide');
    var emptyPanel = document.getElementById('tools-panel-empty');
    var panel = document.getElementById('tools-panel');
    var panelTitle = document.getElementById('tools-panel-title');
    var panelUsage = document.getElementById('tools-panel-usage');
    var panelDesc = document.getElementById('tools-panel-desc');
    var modelPathEl = document.getElementById('tools-viewer-model-path');
    var placeholderEl = document.getElementById('tools-viewer-placeholder');
    var loadingEl = document.getElementById('tools-viewer-loading');
    var errorEl = document.getElementById('tools-viewer-error');
    var canvas = document.getElementById('tools-viewer-canvas');

    var buttons = [];
    var activeId = null;
    var pendingTool = null;
    var loadGeneration = 0;

    var scene;
    var camera;
    var renderer;
    var controls;
    var loader;
    var currentModel = null;
    var viewerReady = false;
    var viewerInitStarted = false;

    function resolveModelUrl(relativePath) {
      try {
        return new URL(relativePath, window.location.href).href;
      } catch (e) {
        return relativePath;
      }
    }

    function modelResourceBase(relativePath) {
      var idx = relativePath.lastIndexOf('/');
      return idx >= 0 ? relativePath.slice(0, idx + 1) : '';
    }

    /** file:// 下 fetch 常失败，用 XHR 读取本地 GLB */
    function loadModelArrayBuffer(url) {
      return fetch(url, { cache: 'default' })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.arrayBuffer();
        })
        .then(function (buf) {
          if (buf && buf.byteLength > 0) return buf;
          throw new Error('文件为空');
        })
        .catch(function () {
          return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'arraybuffer';
            xhr.onload = function () {
              if ((xhr.status === 200 || xhr.status === 0) && xhr.response && xhr.response.byteLength > 0) {
                resolve(xhr.response);
              } else {
                reject(new Error('无法读取 ' + url));
              }
            };
            xhr.onerror = function () {
              reject(new Error('无法读取 ' + url));
            };
            xhr.send();
          });
        });
    }

    function whenCanvasSized(cb) {
      function tick() {
        var wrap = canvas && canvas.parentElement;
        if (wrap && wrap.clientWidth > 0 && wrap.clientHeight > 0) cb();
        else requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    function scheduleResize() {
      resizeViewer();
      requestAnimationFrame(function () {
        resizeViewer();
      });
    }

    function clearViewerError() {
      if (errorEl) {
        errorEl.textContent = '';
        errorEl.hidden = true;
      }
    }

    function showViewerError(message) {
      if (loadingEl) loadingEl.hidden = true;
      if (placeholderEl) placeholderEl.hidden = false;
      if (canvas) canvas.classList.remove('is-ready');
      if (errorEl) {
        errorEl.textContent = message || '';
        errorEl.hidden = !message;
      }
    }

    function initViewer() {
      if (!canvas || viewerReady || viewerInitStarted) return;
      viewerInitStarted = true;

      whenCanvasSized(function () {
        loadThreeBundle().then(function (bundle) {
          viewerInitStarted = false;
          if (!bundle || !canvas) return;

          var THREE = bundle.THREE;

          scene = new THREE.Scene();
          scene.background = new THREE.Color(0xe8f1f6);

          camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
          camera.position.set(0, 0.8, 2.4);

          renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
          renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
          renderer.outputColorSpace = THREE.SRGBColorSpace;

          scene.add(new THREE.AmbientLight(0xffffff, 0.65));
          var dir = new THREE.DirectionalLight(0xffffff, 0.95);
          dir.position.set(2, 4, 3);
          scene.add(dir);
          var fill = new THREE.DirectionalLight(0xa8bdd0, 0.35);
          fill.position.set(-2, 1, -1);
          scene.add(fill);

          controls = new bundle.OrbitControls(camera, canvas);
          controls.enableDamping = true;
          controls.dampingFactor = 0.06;
          controls.enablePan = false;
          controls.minDistance = 0.6;
          controls.maxDistance = 6;

          loader = new bundle.GLTFLoader();
          viewerReady = true;
          scheduleResize();
          window.addEventListener('resize', resizeViewer);
          animateViewer();

          var toolToLoad = pendingTool;
          if (!toolToLoad && activeId) {
            var active = buttons.find(function (b) { return b.id === activeId; });
            if (active) toolToLoad = active.tool;
          }
          pendingTool = null;
          if (toolToLoad) loadToolModel(toolToLoad);
        });
      });
    }

    function resizeViewer() {
      if (!renderer || !camera || !canvas) return;
      var wrap = canvas.parentElement;
      if (!wrap) return;
      var w = wrap.clientWidth;
      var h = wrap.clientHeight;
      if (w < 1 || h < 1) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    function animateViewer() {
      requestAnimationFrame(animateViewer);
      if (controls) controls.update();
      if (renderer && scene && camera) renderer.render(scene, camera);
    }

    function clearModel() {
      if (!scene) return;
      if (currentModel) {
        scene.remove(currentModel);
        currentModel.traverse(function (obj) {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach(function (m) { m.dispose(); });
            } else {
              obj.material.dispose();
            }
          }
        });
        currentModel = null;
      }
      if (controls) {
        controls.target.set(0, 0, 0);
        controls.update();
      }
      if (canvas) canvas.classList.remove('is-ready');
    }

    function fitModel(root) {
      if (!threeBundle) return;
      var THREE = threeBundle.THREE;
      var box = new THREE.Box3().setFromObject(root);
      var center = box.getCenter(new THREE.Vector3());
      var size = box.getSize(new THREE.Vector3());
      var maxDim = Math.max(size.x, size.y, size.z, 0.001);
      var scale = 1.2 / maxDim;
      root.scale.setScalar(scale);
      root.position.sub(center.clone().multiplyScalar(scale));
      if (controls) {
        controls.target.set(0, 0, 0);
        controls.update();
      }
    }

    function loadToolModel(tool) {
      if (!tool) return;

      pendingTool = tool;
      initViewer();

      var modelUrl = tool.model;
      if (modelPathEl) modelPathEl.textContent = modelUrl || '';
      clearViewerError();

      if (!viewerReady || !loader) {
        if (loadingEl) loadingEl.hidden = false;
        if (placeholderEl) placeholderEl.hidden = true;
        if (canvas) canvas.classList.remove('is-ready');
        return;
      }

      pendingTool = null;
      var gen = ++loadGeneration;

      /* 切换工具时立即移除上一件工具的模型，避免模子等仍残留在场景中 */
      clearModel();

      if (!modelUrl) {
        showViewerError('未配置模型路径');
        return;
      }

      var resolvedUrl = resolveModelUrl(modelUrl);
      var resourceBase = modelResourceBase(modelUrl);

      if (loadingEl) loadingEl.hidden = false;
      if (placeholderEl) placeholderEl.hidden = true;

      loadModelArrayBuffer(resolvedUrl)
        .then(function (buffer) {
          if (gen !== loadGeneration) return null;
          return new Promise(function (resolve, reject) {
            loader.parse(buffer, resourceBase, resolve, reject);
          });
        })
        .then(function (gltf) {
          if (gen !== loadGeneration || !gltf) return;
          currentModel = gltf.scene;
          scene.add(currentModel);
          fitModel(currentModel);
          if (loadingEl) loadingEl.hidden = true;
          if (placeholderEl) placeholderEl.hidden = true;
          clearViewerError();
          if (canvas) {
            canvas.classList.add('is-ready');
            scheduleResize();
          }
        })
        .catch(function (err) {
          if (gen !== loadGeneration) return;
          console.warn('[huayang-tools] 模型加载失败:', tool.id, err);
          var msg = '模型未能加载，请确认文件位于 models/tools/ 目录';
          if (location.protocol === 'file:') {
            msg = 'file:// 下加载受限，请用本地服务器打开（如 python3 -m http.server 8080）';
          } else if (err && err.message) {
            msg += '：' + err.message;
          }
          showViewerError(msg);
        });
    }

    function buildToolButton(tool) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tools-item';
      btn.setAttribute('role', 'listitem');
      btn.setAttribute('data-tool', tool.id);
      btn.setAttribute('aria-label', tool.name + '：' + tool.usage);
      btn.style.left = tool.x + '%';
      btn.style.top = tool.y + '%';
      btn.style.setProperty('--float-dur', tool.floatDur + 's');
      btn.style.setProperty('--float-delay', tool.floatDelay + 's');

      var visual = document.createElement('span');
      visual.className = 'tools-item-visual';

      var img = document.createElement('img');
      img.className = 'tools-item-img';
      img.src = tool.image;
      img.alt = tool.name;
      img.decoding = 'async';

      var icon = document.createElement('span');
      icon.className = 'tools-item-icon';
      icon.textContent = tool.icon;
      icon.setAttribute('aria-hidden', 'true');

      var imgPh = document.createElement('span');
      imgPh.className = 'tools-item-img-ph';
      imgPh.textContent = tool.image.replace(/^images\//, '');
      imgPh.hidden = true;

      icon.hidden = false;
      img.hidden = true;

      function showCustomImage() {
        img.hidden = false;
        icon.hidden = true;
        imgPh.hidden = true;
        visual.classList.remove('tools-item-visual--awaiting');
      }

      function showPlaceholder() {
        img.hidden = true;
        icon.hidden = false;
        imgPh.hidden = true;
        visual.classList.add('tools-item-visual--awaiting');
      }

      img.onerror = showPlaceholder;
      img.onload = function () {
        if (img.naturalWidth > 0) showCustomImage();
        else showPlaceholder();
      };

      if (img.complete && img.naturalWidth > 0) {
        showCustomImage();
      } else if (img.complete) {
        showPlaceholder();
      }

      visual.appendChild(img);
      visual.appendChild(icon);
      visual.appendChild(imgPh);

      var name = document.createElement('span');
      name.className = 'tools-item-name';
      name.textContent = tool.name;

      btn.appendChild(visual);
      btn.appendChild(name);

      btn.addEventListener('click', function () {
        activate(tool.id);
      });
      btn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate(tool.id);
        }
      });

      arenaEl.appendChild(btn);
      buttons.push({ id: tool.id, el: btn, tool: tool });
    }

    function showPanel(tool) {
      if (!panel) return;
      if (panelTitle) panelTitle.textContent = tool.name;
      if (panelUsage) panelUsage.textContent = tool.usage;
      if (panelDesc) panelDesc.textContent = tool.desc;

      if (emptyPanel) emptyPanel.hidden = true;
      panel.hidden = false;
      if (guideEl) guideEl.classList.add('is-dismissed');

      whenCanvasSized(function () {
        panel.classList.add('is-visible');
        scheduleResize();
        loadToolModel(tool);
      });
    }

    function activate(toolId) {
      if (activeId === toolId) return;
      activeId = toolId;

      buttons.forEach(function (b) {
        b.el.classList.toggle('is-active', b.id === toolId);
        b.el.setAttribute('aria-pressed', b.id === toolId ? 'true' : 'false');
      });

      var entry = buttons.find(function (b) { return b.id === toolId; });
      if (entry) showPanel(entry.tool);
    }

    TOOLS.forEach(buildToolButton);

    if (canvas && canvas.parentElement && typeof IntersectionObserver !== 'undefined') {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              initViewer();
              observer.disconnect();
            }
          });
        },
        { rootMargin: '80px' }
      );
      observer.observe(canvas.parentElement);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initToolsModule);
  } else {
    initToolsModule();
  }
})();
