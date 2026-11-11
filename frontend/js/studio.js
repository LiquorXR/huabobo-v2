/**
 * 指间塑 — 3D 面塑 DIY 工作台
 * Three.js 场景 · 模型库拖放 · 数字人点评
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';

function canRunStudio() {
  if (typeof Api !== 'undefined' && !Api.isLoggedIn()) {
    location.href = 'login.html?return=studio';
    return false;
  }
  return true;
}

/** 四系食材天然染：每系两种深浅 */
const COLOR_GROUPS = [
  {
    id: 'red',
    title: '甜菜红',
    desc: '甜菜汁、红心萝卜等红色食材揉染',
    shades: [
      { key: 'beetLight', label: '浅红', ingredient: '甜菜汁淡染', hex: 0xe87888, css: '#e87888' },
      { key: 'beetDark', label: '深红', ingredient: '红心萝卜', hex: 0xc41e3a, css: '#c41e3a' }
    ]
  },
  {
    id: 'yellow',
    title: '南瓜黄',
    desc: '南瓜泥、蛋黄等黄色食材揉染',
    shades: [
      { key: 'eggYolk', label: '蛋黄', ingredient: '蛋黄', hex: 0xf5d76e, css: '#f5d76e' },
      { key: 'pumpkinDeep', label: '深黄', ingredient: '南瓜', hex: 0xe8a317, css: '#e8a317' }
    ]
  },
  {
    id: 'blue',
    title: '蝶豆蓝',
    desc: '蝶豆花、蓝莓等蓝色食材揉染',
    shades: [
      { key: 'peaLight', label: '浅蓝', ingredient: '蝶豆花淡染', hex: 0x8ecae6, css: '#8ecae6' },
      { key: 'peaDark', label: '深蓝', ingredient: '蝶豆花浓染', hex: 0x3d5a80, css: '#3d5a80' }
    ]
  },
  {
    id: 'green',
    title: '菠菜绿',
    desc: '菠菜汁等绿色蔬菜揉染',
    shades: [
      { key: 'spinachLight', label: '浅绿', ingredient: '菠菜淡染', hex: 0xa8d5a2, css: '#a8d5a2' },
      { key: 'spinachDark', label: '深绿', ingredient: '菠菜浓染', hex: 0x3d6b4f, css: '#3d6b4f' }
    ]
  }
];

const COLORS = {};
COLOR_GROUPS.forEach((g) => {
  g.shades.forEach((s) => {
    COLORS[s.key] = s.hex;
  });
});

const BUILTIN_MODELS = [
  { id: 'round', name: '圆形面团', desc: '基础测试面团', enabled: true, type: 'sphere', builtin: true }
];

const DEFAULT_STUDIO_CATEGORIES = [
  '传统纹样',
  '传统花饽饽',
  '荣耀',
  '卡通人物',
  '水果蔬菜',
  '航空交通',
  '深海元素',
  '天空元素',
  '教师元素',
  '花子草房子元素'
];

const CATEGORY_CARD_COLORS = [
  '#c45c4a',
  '#c9893a',
  '#6b8f71',
  '#4a7c8c',
  '#7a6b9e',
  '#b56a3a',
  '#3d6b8a',
  '#5b8fbf',
  '#8b5a4a',
  '#6d8b5a'
];

let MODEL_LIBRARY = BUILTIN_MODELS.slice();
let MODEL_CATEGORIES = [];
let openLibraryCategory = null;
/** @type {{ instanceId: string, modelId: string, name: string, wrapper: THREE.Group, mesh: THREE.Object3D, color: number }[]} */
let loadedModels = [];
let activeInstanceId = null;
let instanceCounter = 0;
const gltfLoader = new GLTFLoader();
gltfLoader.setCrossOrigin('anonymous');
let modelLibrarySig = '';
let libraryThumbQueue = Promise.resolve();

const viewport = document.getElementById('studio-viewport');
const canvas = document.getElementById('studio-canvas');
const arVideo = document.getElementById('studio-ar-video');
const statusEl = document.getElementById('studio-status');
const hintStatusEl = document.getElementById('studio-hint-status');
const exportMenu = document.getElementById('export-menu');
const topActions = document.getElementById('studio-top-actions');
const humanSpeechEl = document.getElementById('studio-human-speech');
const humanFigureEl = document.getElementById('studio-human') || document.querySelector('.studio-human');
const humanActionsIdle = document.getElementById('human-actions-idle');
const humanActionsChoose = document.getElementById('human-actions-choose');
const humanActionsWrapup = document.getElementById('human-actions-wrapup');
const humanActionsRealFollowup = document.getElementById('human-actions-real-followup');
const realCamOverlay = document.getElementById('studio-real-cam');
const realCamVideo = document.getElementById('studio-real-cam-video');
const realFreezeEl = document.getElementById('studio-real-freeze');
const HUMAN_GREETING =
  '哎，你好呀。我是饽饽小匠，胶东花饽饽这边的。老辈揉面讲太极口诀，推、揉、翻、收，一口气做下来。你手上这面，力使得匀不匀、气排干净没、筋出来没，我都能帮你瞅瞅。等到塑形，哪儿鼓了、哪儿瘪了，我直说。这饽饽图的是什么口彩，我也能跟你唠。别跟别人捏得一个样，咱们慢慢来，把这门手艺摸热乎。';

let humanPhase = 'idle';
let humanSpeakTimer = 0;
let humanSpeakToken = 0;
let humanVoice = null;
let realReviewStream = null;
let lastRealRecognition = null;
let realReviewBusy = false;

let scene, camera, renderer, controls;
let board, boardEdge, doughGroup;
/** 工作台顶面世界坐标 Y（与 board 几何一致：center 0.06 + half height 0.06） */
const WORKBENCH_TOP_Y = 0.12;
/** 载入模型时的目标最大尺寸（米） */
const MODEL_FIT_SIZE = 1.15;
/** 单个模型在案板上的平移范围 */
const INSTANCE_PAN_X = 1.5;
const INSTANCE_PAN_Z = 1;
const INSTANCE_SCALE_MIN = 0.3;
const INSTANCE_SCALE_MAX = 3;
const INSTANCE_LIFT_MAX = 1.2;
/** 单击绕轴旋转的固定步进（度） */
const MODEL_ROTATE_STEP_DEG = 15;
let arMode = false;
let savedControlsState = null;
let savedHintCardHtml = null;
let savedDoughY = WORKBENCH_TOP_Y;
let lastSavedWorkId = null;
let arStream = null;
let currentColor = COLORS.eggYolk;

function refreshLucide() {
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

function createDoughMesh(type) {
  let geo;
  if (type === 'sphere') {
    geo = new THREE.SphereGeometry(0.55, 48, 32);
    geo.scale(1, 0.72, 1);
  } else {
    geo = new THREE.SphereGeometry(0.5, 32, 24);
  }
  const mat = new THREE.MeshStandardMaterial({
    color: currentColor,
    roughness: 0.85,
    metalness: 0.02
  });
  return new THREE.Mesh(geo, mat);
}

function disposeObject3D(obj) {
  if (!obj) return;
  obj.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
      else child.material.dispose();
    }
  });
}

function createInstanceId() {
  instanceCounter += 1;
  return 'inst_' + instanceCounter;
}

function getInstanceSpreadOffset(index) {
  const ring = Math.floor(index / 6) + 1;
  const slot = index % 6;
  const angle = (slot / 6) * Math.PI * 2;
  const radius = 0.28 * ring;
  return {
    x: Math.cos(angle) * radius,
    z: Math.sin(angle) * radius
  };
}

function findLibraryEntry(modelId) {
  return MODEL_LIBRARY.find((m) => m.id === modelId) || BUILTIN_MODELS.find((m) => m.id === modelId);
}

function getActiveLoadedModel() {
  return loadedModels.find((m) => m.instanceId === activeInstanceId) || null;
}

function setActiveInstance(instanceId) {
  activeInstanceId = instanceId;
  buildLoadedModelList();
  const rec = getActiveLoadedModel();
  if (rec) {
    setStatus('已选中：' + rec.name + ' · 配色仅作用于该模型');
  }
}

function clearAllLoadedModels() {
  if (!doughGroup) return;
  while (loadedModels.length) {
    const rec = loadedModels.pop();
    doughGroup.remove(rec.wrapper);
    disposeObject3D(rec.wrapper);
  }
  activeInstanceId = null;
  buildLoadedModelList();
}

function applyColorToObject(object, hex) {
  if (!object || hex == null) return;
  object.traverse((child) => {
    if (child.isMesh && child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((mat) => {
        if (mat.color) mat.color.setHex(hex);
      });
    }
  });
}

function sampleObjectColor(object) {
  let hex = null;
  if (!object) return hex;
  object.traverse((child) => {
    if (hex != null || !child.isMesh || !child.material) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    for (const mat of mats) {
      if (mat.color) {
        hex = mat.color.getHex();
        return;
      }
    }
  });
  return hex;
}

function isGlbEntry(entry) {
  return entry && entry.type === 'glb' && !!entry.glbUrl;
}

function alignModelToWorkbenchBase(object) {
  if (!object) return;
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  object.scale.multiplyScalar(MODEL_FIT_SIZE / maxDim);
  object.updateMatrixWorld(true);
  const fitted = new THREE.Box3().setFromObject(object);
  const center = fitted.getCenter(new THREE.Vector3());
  object.position.set(-center.x, -fitted.min.y, -center.z);
}

function applyModelScale(factor) {
  const active = getActiveLoadedModel();
  if (!active) {
    setStatus('请先选中一个模型再缩放');
    return;
  }
  const w = active.wrapper;
  w.scale.multiplyScalar(factor);
  clampInstanceTransform(w);
  setStatus(
    (factor > 1 ? '已放大：' : '已缩小：') +
      active.name +
      '（' +
      Math.round(w.scale.x * 100) +
      '%）'
  );
}

function applyModelRotation(axis) {
  const active = getActiveLoadedModel();
  if (!active) {
    setStatus('请先选中一个模型再旋转');
    return;
  }
  const rad = THREE.MathUtils.degToRad(MODEL_ROTATE_STEP_DEG);
  const w = active.wrapper;
  // 累加实例自身 Euler，不改相机 / OrbitControls
  if (axis === 'x') w.rotation.x += rad;
  else if (axis === 'y') w.rotation.y += rad;
  else if (axis === 'z') w.rotation.z += rad;
  const deg = {
    x: Math.round(THREE.MathUtils.radToDeg(w.rotation.x)),
    y: Math.round(THREE.MathUtils.radToDeg(w.rotation.y)),
    z: Math.round(THREE.MathUtils.radToDeg(w.rotation.z))
  };
  setStatus(
    '已绕' +
      String(axis).toUpperCase() +
      '轴旋转 ' +
      MODEL_ROTATE_STEP_DEG +
      '°：' +
      active.name +
      '（X' +
      deg.x +
      '° Y' +
      deg.y +
      '° Z' +
      deg.z +
      '°）'
  );
}

function clampInstanceTransform(wrapper) {
  if (!wrapper) return;
  wrapper.position.y = THREE.MathUtils.clamp(wrapper.position.y, 0, INSTANCE_LIFT_MAX);
  wrapper.position.x = THREE.MathUtils.clamp(wrapper.position.x, -INSTANCE_PAN_X, INSTANCE_PAN_X);
  wrapper.position.z = THREE.MathUtils.clamp(wrapper.position.z, -INSTANCE_PAN_Z, INSTANCE_PAN_Z);
  wrapper.scale.x = THREE.MathUtils.clamp(wrapper.scale.x, INSTANCE_SCALE_MIN, INSTANCE_SCALE_MAX);
  wrapper.scale.y = THREE.MathUtils.clamp(wrapper.scale.y, INSTANCE_SCALE_MIN, INSTANCE_SCALE_MAX);
  wrapper.scale.z = THREE.MathUtils.clamp(wrapper.scale.z, INSTANCE_SCALE_MIN, INSTANCE_SCALE_MAX);
}

function clampDoughOnWorkbench() {
  if (!doughGroup) return;
  doughGroup.scale.setScalar(1);
  if (!arMode) {
    doughGroup.position.set(0, WORKBENCH_TOP_Y, 0);
    savedDoughY = WORKBENCH_TOP_Y;
  }
  loadedModels.forEach((rec) => clampInstanceTransform(rec.wrapper));
}

function fitStudioModel(object) {
  alignModelToWorkbenchBase(object);
}

function bustMediaUrl(url, version) {
  if (!url || String(url).indexOf('data:') === 0) return url || '';
  var u = String(url);
  var v = version || Date.now();
  return u + (u.indexOf('?') >= 0 ? '&' : '?') + 'v=' + encodeURIComponent(v);
}

function librarySignature(list) {
  return (list || [])
    .map(function (m) {
      return [m.id, m.name, m.glbUrl, m.thumbnail, m.updatedAt || ''].join('~');
    })
    .join('|');
}

function categoryListSignature(list) {
  return (list || [])
    .map(function (c) {
      return [c.id, c.name, c.sortOrder || 0, c.updatedAt || ''].join('~');
    })
    .join('|');
}

function apiBase() {
  if (typeof window !== 'undefined' && window.ZJS && ZJS.USE_BACKEND && ZJS.API_BASE) {
    return ZJS.API_BASE.replace(/\/$/, '');
  }
  return '';
}

function mapApiStudioModel(m) {
  const glbUrl = ZJS.normalizeWorkImageUrl ? ZJS.normalizeWorkImageUrl(m.glbUrl) : m.glbUrl;
  const thumb = ZJS.normalizeWorkImageUrl ? ZJS.normalizeWorkImageUrl(m.thumbnail) : m.thumbnail;
  return {
    id: m.id,
    name: m.name,
    desc: m.desc || '',
    enabled: true,
    type: 'glb',
    glbUrl: glbUrl,
    thumbnail: thumb ? bustMediaUrl(thumb, m.updatedAt || m.id) : '',
    categoryId: m.categoryId || '',
    updatedAt: m.updatedAt || ''
  };
}

function mergeLibraryModels(list) {
  (list || []).forEach(function (m) {
    const i = MODEL_LIBRARY.findIndex((x) => x.id === m.id);
    if (i >= 0) MODEL_LIBRARY[i] = Object.assign({}, MODEL_LIBRARY[i], m);
    else MODEL_LIBRARY.push(m);
  });
}

function builtinHostCategory() {
  return MODEL_CATEGORIES.find(function (c) {
    return c.name === '传统花饽饽';
  }) || MODEL_CATEGORIES[0] || null;
}

function modelsForCategory(category) {
  const remote = MODEL_LIBRARY.filter(function (m) {
    return !m.builtin && m.categoryId === (category && category.id);
  });
  const host = builtinHostCategory();
  if (host && category && host.id === category.id) {
    return BUILTIN_MODELS.concat(remote);
  }
  return remote;
}

async function fetchCategories() {
  const fallback = DEFAULT_STUDIO_CATEGORIES.map(function (name, index) {
    return { id: 'local-' + index, name: name, sortOrder: index, local: true };
  });
  const base = apiBase();
  if (!base) return fallback;
  try {
    const res = await fetch(base + '/api/studio-model-categories?t=' + Date.now(), { cache: 'no-store' }).then((r) =>
      r.json()
    );
    if (res.ok && res.data && res.data.list && res.data.list.length) {
      return res.data.list.map(function (c) {
        return {
          id: c.id,
          name: c.name,
          sortOrder: c.sortOrder || 0,
          updatedAt: c.updatedAt || ''
        };
      });
    }
  } catch (e) {
    console.warn('[studio] 分类加载失败', e);
  }
  return fallback;
}

async function fetchModelsByCategory(category) {
  if (!category || category.local) {
    return modelsForCategory(category);
  }
  const base = apiBase();
  if (!base) return modelsForCategory(category);
  try {
    const res = await fetch(
      base + '/api/studio-models?categoryId=' + encodeURIComponent(category.id) + '&t=' + Date.now(),
      { cache: 'no-store' }
    ).then((r) => r.json());
    if (res.ok && res.data && res.data.list) {
      const mapped = res.data.list.map(mapApiStudioModel);
      mergeLibraryModels(mapped);
      return modelsForCategory(category);
    }
  } catch (e) {
    console.warn('[studio] 分类模型加载失败', e);
  }
  return modelsForCategory(category);
}

function waitFrame() {
  return new Promise(function (resolve) {
    requestAnimationFrame(function () {
      requestAnimationFrame(resolve);
    });
  });
}

async function renderGlbThumbnailDataUrl(glbUrl, size) {
  size = size || 256;
  if (!glbUrl || typeof THREE === 'undefined') return '';
  let renderer;
  let holder;
  let scene;
  try {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf3ebe0);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 200);
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
      alpha: false
    });
    renderer.setSize(size, size, false);
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0xf3ebe0, 1);
    holder = document.createElement('div');
    holder.style.cssText = 'position:fixed;left:-9999px;top:0;width:' + size + 'px;height:' + size + 'px;opacity:0;pointer-events:none;';
    holder.appendChild(renderer.domElement);
    document.body.appendChild(holder);
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const key = new THREE.DirectionalLight(0xfff4e8, 1);
    key.position.set(2.4, 4.2, 3.2);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xb8c4d4, 0.45);
    fill.position.set(-2.4, 1.4, -2.2);
    scene.add(fill);
    const gltf = await gltfLoader.loadAsync(glbUrl);
    const model = gltf.scene;
    model.updateMatrixWorld(true);
    model.traverse(function (child) {
      if (child.isMesh) {
        child.frustumCulled = false;
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(function (mat) {
          if (mat) mat.side = THREE.DoubleSide;
        });
      }
    });
    const box = new THREE.Box3().setFromObject(model);
    if (box.isEmpty()) return '';
    const sizeVec = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z, 0.001);
    model.scale.setScalar(1.6 / maxDim);
    model.updateMatrixWorld(true);
    box.setFromObject(model);
    model.position.sub(box.getCenter(new THREE.Vector3()));
    model.updateMatrixWorld(true);
    scene.add(model);
    const sphere = new THREE.Box3().setFromObject(model).getBoundingSphere(new THREE.Sphere());
    const fov = (camera.fov * Math.PI) / 180;
    const dist = (sphere.radius / Math.sin(fov / 2)) * 1.22;
    camera.position.set(dist * 0.72, dist * 0.48, dist * 0.92);
    camera.near = Math.max(dist / 100, 0.01);
    camera.far = dist * 20;
    camera.updateProjectionMatrix();
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    await waitFrame();
    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL('image/jpeg', 0.86);
    return dataUrl && dataUrl.length > 800 ? dataUrl : '';
  } catch (err) {
    console.warn('[studio] 模型缩略图生成失败', err);
    return '';
  } finally {
    if (holder && holder.parentNode) holder.parentNode.removeChild(holder);
    if (renderer) {
      renderer.dispose();
      const gl = renderer.getContext && renderer.getContext();
      const lose = gl && gl.getExtension && gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    }
  }
}

function applyLibraryThumb(modelId, url) {
  const rec = MODEL_LIBRARY.find((m) => m.id === modelId);
  if (rec) rec.thumbnail = url;
  const roots = [document.getElementById('library-dialog-list'), document.getElementById('model-list')];
  let btn = null;
  roots.forEach(function (list) {
    if (!list || btn) return;
    btn = list.querySelector('[data-model-id="' + modelId + '"]');
  });
  if (!btn) return;
  let img = btn.querySelector('.studio-model-card__thumb-img');
  const placeholder = btn.querySelector('.studio-model-card__thumb');
  if (!img) {
    img = document.createElement('img');
    img.className = 'studio-model-card__thumb-img';
    img.alt = '';
    if (placeholder) placeholder.replaceWith(img);
    else btn.insertBefore(img, btn.firstChild);
  }
  img.src = url;
}

async function ensureLibraryThumbnails() {
  const missing = MODEL_LIBRARY.filter((m) => m.type === 'glb' && m.glbUrl && !m.thumbnail);
  missing.forEach((entry) => {
    libraryThumbQueue = libraryThumbQueue
      .then(async () => {
        const latest = MODEL_LIBRARY.find((m) => m.id === entry.id);
        if (!latest || latest.thumbnail || !latest.glbUrl) return;
        const dataUrl = await renderGlbThumbnailDataUrl(latest.glbUrl);
        if (!dataUrl) return;
        applyLibraryThumb(entry.id, dataUrl);
        const base = window.ZJS && ZJS.API_BASE ? ZJS.API_BASE.replace(/\/$/, '') : '';
        if (!base || !entry.id) return;
        try {
          const res = await fetch(base + '/api/studio-models/' + encodeURIComponent(entry.id) + '/thumbnail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ thumbnailBase64: dataUrl })
          }).then((r) => r.json());
          const saved = res && res.data && res.data.thumbnail;
          if (saved) {
            const url = ZJS.normalizeWorkImageUrl ? ZJS.normalizeWorkImageUrl(saved) : saved;
            applyLibraryThumb(entry.id, bustMediaUrl(url, res.data.updatedAt || Date.now()));
          }
        } catch (e) {
          console.warn('[studio] 缩略图回写失败', e);
        }
      })
      .catch(function () {});
  });
  return libraryThumbQueue;
}

async function refreshModelLibrary() {
  const nextCats = await fetchCategories();
  const catSig = categoryListSignature(nextCats);
  if (catSig !== modelLibrarySig) {
    modelLibrarySig = catSig;
    MODEL_CATEGORIES = nextCats;
    buildCategoryList();
  }
  if (openLibraryCategory) {
    const latest = MODEL_CATEGORIES.find((c) => c.id === openLibraryCategory.id) || openLibraryCategory;
    openLibraryCategory = latest;
    const models = await fetchModelsByCategory(latest);
    renderLibraryDialogModels(models);
    await ensureLibraryThumbnails();
  }
}

async function createModelMeshFromEntry(entry) {
  if (entry.type === 'sphere' || entry.builtin) {
    const mesh = createDoughMesh('sphere');
    alignModelToWorkbenchBase(mesh);
    mesh.castShadow = true;
    applyColorToObject(mesh, currentColor);
    return mesh;
  }

  if (entry.type === 'glb' && entry.glbUrl) {
    const gltf = await gltfLoader.loadAsync(entry.glbUrl);
    const mesh = gltf.scene;
    fitStudioModel(mesh);
    mesh.traverse((c) => {
      if (c.isMesh) {
        c.castShadow = true;
        c.receiveShadow = true;
      }
    });
    return mesh;
  }

  const mesh = createDoughMesh('sphere');
  alignModelToWorkbenchBase(mesh);
  mesh.castShadow = true;
  applyColorToObject(mesh, currentColor);
  return mesh;
}

async function addStudioModel(entry) {
  if (!entry || !entry.enabled || !doughGroup) return;
  setStatus('正在加载：' + entry.name + '…');
  try {
    const mesh = await createModelMeshFromEntry(entry);
    const instanceId = createInstanceId();
    const wrapper = new THREE.Group();
    const spread = getInstanceSpreadOffset(loadedModels.length);
    wrapper.position.set(spread.x, 0, spread.z);
    wrapper.add(mesh);
    doughGroup.add(wrapper);
    loadedModels.push({
      instanceId,
      modelId: entry.id,
      name: entry.name,
      wrapper,
      mesh,
      color: isGlbEntry(entry) ? null : currentColor
    });
    setActiveInstance(instanceId);
    setStatus('已添加：' + entry.name + '（共 ' + loadedModels.length + ' 个）');
  } catch (e) {
    console.error('[studio] 模型加载失败', e);
    setStatus('加载失败：' + entry.name);
  }
}

function removeLoadedModel(instanceId) {
  const index = loadedModels.findIndex((m) => m.instanceId === instanceId);
  if (index < 0) return;
  const rec = loadedModels[index];
  doughGroup.remove(rec.wrapper);
  disposeObject3D(rec.wrapper);
  loadedModels.splice(index, 1);
  if (activeInstanceId === instanceId) {
    activeInstanceId = loadedModels.length
      ? loadedModels[loadedModels.length - 1].instanceId
      : null;
  }
  buildLoadedModelList();
  setStatus(
    loadedModels.length
      ? '已移除模型（剩余 ' + loadedModels.length + ' 个）'
      : '案板上暂无模型，请从右侧模型库添加'
  );
}

function buildLoadedModelList() {
  const list = document.getElementById('loaded-model-list');
  if (!list) return;
  list.innerHTML = '';
  if (!loadedModels.length) {
    const empty = document.createElement('p');
    empty.className = 'studio-loaded-empty';
    empty.textContent = '暂无模型，请从右侧花饽饽模型库拖到中间';
    list.appendChild(empty);
    return;
  }

  loadedModels.forEach((rec, index) => {
    const item = document.createElement('div');
    item.className =
      'studio-loaded-item' + (rec.instanceId === activeInstanceId ? ' is-active' : '');
    item.dataset.instanceId = rec.instanceId;

    const dot = document.createElement('span');
    dot.className = 'studio-loaded-item__dot';
    const dotColor = rec.color != null ? rec.color : sampleObjectColor(rec.mesh) ?? 0xcccccc;
    dot.style.backgroundColor = '#' + dotColor.toString(16).padStart(6, '0');

    const body = document.createElement('div');
    body.className = 'studio-loaded-item__body';
    const name = document.createElement('span');
    name.className = 'studio-loaded-item__name';
    name.textContent = rec.name;
    const meta = document.createElement('span');
    meta.className = 'studio-loaded-item__meta';
    meta.textContent = '第 ' + (index + 1) + ' 个';
    body.appendChild(name);
    body.appendChild(meta);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'studio-loaded-item__remove';
    removeBtn.setAttribute('aria-label', '删除 ' + rec.name);
    removeBtn.innerHTML = '<i data-lucide="trash-2"></i>';

    item.appendChild(dot);
    item.appendChild(body);
    item.appendChild(removeBtn);

    item.addEventListener('click', (e) => {
      if (e.target.closest('.studio-loaded-item__remove')) return;
      setActiveInstance(rec.instanceId);
    });
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeLoadedModel(rec.instanceId);
    });

    list.appendChild(item);
  });
  refreshLucide();
}

async function restoreStudioInstances(instances, fallbackScale) {
  clearAllLoadedModels();
  if (!instances || !instances.length) return;
  const defaultScale = fallbackScale ?? 1;
  for (const inst of instances) {
    const entry = findLibraryEntry(inst.modelId);
    if (!entry) continue;
    const mesh = await createModelMeshFromEntry(entry);
    if (inst.color != null) {
      applyColorToObject(mesh, inst.color);
    }
    const instanceId = createInstanceId();
    const wrapper = new THREE.Group();
    const offset = inst.offset || getInstanceSpreadOffset(loadedModels.length);
    wrapper.position.set(offset.x || 0, offset.y ?? 0, offset.z || 0);
    if (inst.scale && typeof inst.scale === 'object') {
      wrapper.scale.set(
        inst.scale.x ?? defaultScale,
        inst.scale.y ?? inst.scale.x ?? defaultScale,
        inst.scale.z ?? inst.scale.x ?? defaultScale
      );
    } else {
      wrapper.scale.setScalar(inst.scale ?? defaultScale);
    }
    if (inst.rotation) {
      wrapper.rotation.set(
        inst.rotation.x || 0,
        inst.rotation.y || 0,
        inst.rotation.z || 0
      );
    }
    clampInstanceTransform(wrapper);
    wrapper.add(mesh);
    doughGroup.add(wrapper);
    loadedModels.push({
      instanceId,
      modelId: entry.id,
      name: entry.name,
      wrapper,
      mesh,
      color: inst.color != null ? inst.color : isGlbEntry(entry) ? null : currentColor
    });
  }
  activeInstanceId = loadedModels.length ? loadedModels[loadedModels.length - 1].instanceId : null;
  buildLoadedModelList();
}

function setViewportBackgroundWhite() {
  scene.background = new THREE.Color(0xffffff);
  renderer.setClearColor(0xffffff, 1);
}

function setViewportBackgroundTransparent() {
  scene.background = null;
  renderer.setClearColor(0x000000, 0);
}

function initScene() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 2.8, 4.2);
  camera.lookAt(0, 0.4, 0);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  setViewportBackgroundWhite();

  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.target.set(0, 0.35, 0);
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.minDistance = 2;
  controls.maxDistance = 8;
  canvas.style.touchAction = 'none';
  setupSceneInteraction();

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const dir = new THREE.DirectionalLight(0xffffff, 0.85);
  dir.position.set(3, 6, 4);
  dir.castShadow = true;
  scene.add(dir);
  const fill = new THREE.DirectionalLight(0x8899aa, 0.35);
  fill.position.set(-2, 2, -3);
  scene.add(fill);

  const boardGeo = new THREE.BoxGeometry(4.2, 0.12, 2.8);
  board = new THREE.Mesh(
    boardGeo,
    new THREE.MeshStandardMaterial({ color: 0xfff3d6, roughness: 0.72, metalness: 0.01 })
  );
  board.position.y = 0.06;
  board.receiveShadow = true;
  scene.add(board);

  boardEdge = new THREE.Mesh(
    new THREE.BoxGeometry(4.35, 0.08, 2.95),
    new THREE.MeshStandardMaterial({ color: 0xeed9a8, roughness: 0.75, metalness: 0.01 })
  );
  boardEdge.position.y = 0.01;
  scene.add(boardEdge);

  doughGroup = new THREE.Group();
  doughGroup.position.set(0, WORKBENCH_TOP_Y, 0);
  scene.add(doughGroup);

  resize();
  window.addEventListener('resize', resize);
  animate();
}

function resize() {
  const w = viewport.clientWidth;
  const h = viewport.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

function applyColor(key) {
  const resolved = LEGACY_COLOR_KEYS[key] || key;
  currentColor = COLORS[resolved] || currentColor;
  const active = getActiveLoadedModel();
  if (active) {
    active.color = currentColor;
    applyColorToObject(active.mesh, currentColor);
    buildLoadedModelList();
  }
  document.querySelectorAll('[data-color]').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.color === resolved);
  });
}

function bindModelCard(btn, m) {
  if (!m.enabled) return;
  btn.draggable = true;
  btn.dataset.modelId = m.id;
  btn.addEventListener('click', () => addStudioModel(m));
  btn.addEventListener('dragstart', (e) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', m.id);
    e.dataTransfer.setData('application/x-zhijiansu-model', m.id);
    const dialog = document.getElementById('studio-library-dialog');
    if (dialog) dialog.classList.add('is-dragging-model');
  });
  btn.addEventListener('dragend', () => {
    const dialog = document.getElementById('studio-library-dialog');
    if (dialog) dialog.classList.remove('is-dragging-model');
  });
}

function createModelCard(m) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.disabled = !m.enabled;
  btn.className = 'studio-model-card';
  const thumbHtml = m.thumbnail
    ? '<img class="studio-model-card__thumb-img" src="' +
      m.thumbnail +
      '" alt="" loading="lazy" data-model-thumb="' +
      m.id +
      '">'
    : '<div class="studio-model-card__thumb" data-model-thumb="' + m.id + '"></div>';
  btn.innerHTML =
    thumbHtml +
    '<div class="min-w-0"><span class="studio-model-card__name">' +
    m.name +
    '</span>' +
    '<small class="studio-model-card__desc">' +
    (m.desc || '') +
    '</small></div>';
  bindModelCard(btn, m);
  const thumbImg = btn.querySelector('.studio-model-card__thumb-img');
  if (thumbImg) {
    thumbImg.addEventListener('error', function () {
      const rec = MODEL_LIBRARY.find((x) => x.id === m.id);
      if (rec) rec.thumbnail = '';
      ensureLibraryThumbnails();
    });
  }
  return btn;
}

function renderLibraryDialogModels(list) {
  const wrap = document.getElementById('library-dialog-list');
  if (!wrap) return;
  wrap.innerHTML = '';
  if (!list || !list.length) {
    const empty = document.createElement('p');
    empty.className = 'studio-loaded-empty';
    empty.textContent = '该分类暂无模型，请到后台上传并挂到此分类';
    wrap.appendChild(empty);
    return;
  }
  list.forEach(function (m) {
    wrap.appendChild(createModelCard(m));
  });
}

function closeLibraryDialog() {
  openLibraryCategory = null;
  const dialog = document.getElementById('studio-library-dialog');
  if (!dialog) return;
  dialog.classList.remove('is-open', 'is-dragging-model');
  dialog.setAttribute('aria-hidden', 'true');
}

async function openLibraryDialog(category) {
  openLibraryCategory = category;
  const dialog = document.getElementById('studio-library-dialog');
  const title = document.getElementById('library-dialog-title');
  if (title) title.textContent = category.name;
  if (dialog) {
    dialog.classList.add('is-open');
    dialog.setAttribute('aria-hidden', 'false');
  }
  renderLibraryDialogModels([]);
  const wrap = document.getElementById('library-dialog-list');
  if (wrap) {
    wrap.innerHTML = '<p class="studio-loaded-empty">正在加载模型…</p>';
  }
  const models = await fetchModelsByCategory(category);
  if (!openLibraryCategory || openLibraryCategory.id !== category.id) return;
  renderLibraryDialogModels(models);
  await ensureLibraryThumbnails();
}

function buildCategoryList() {
  const list = document.getElementById('model-list');
  if (!list) return;
  list.innerHTML = '';
  if (!MODEL_CATEGORIES.length) {
    const empty = document.createElement('p');
    empty.className = 'studio-loaded-empty';
    empty.textContent = '暂无分类';
    list.appendChild(empty);
    return;
  }
  MODEL_CATEGORIES.forEach(function (c, index) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'studio-category-card';
    btn.style.background = CATEGORY_CARD_COLORS[index % CATEGORY_CARD_COLORS.length];
    btn.dataset.categoryId = c.id;
    btn.textContent = c.name;
    btn.addEventListener('click', function () {
      openLibraryDialog(c);
    });
    list.appendChild(btn);
  });
}

function setupLibraryDialog() {
  const dialog = document.getElementById('studio-library-dialog');
  const closeBtn = document.getElementById('library-dialog-close');
  if (closeBtn) closeBtn.addEventListener('click', closeLibraryDialog);
  if (dialog) {
    dialog.addEventListener('click', function (e) {
      if (e.target === dialog) closeLibraryDialog();
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openLibraryCategory) closeLibraryDialog();
  });
}

function createColorGroupElement(group) {
  const section = document.createElement('div');
  section.className = 'studio-color-group';
  section.dataset.colorGroup = group.id;
  const title = document.createElement('p');
  title.className = 'studio-color-group__title';
  title.textContent = group.title;
  const desc = document.createElement('p');
  desc.className = 'studio-color-group__desc';
  desc.textContent = group.desc;
  section.appendChild(title);
  section.appendChild(desc);
  const row = document.createElement('div');
  row.className = 'studio-color-row';
  group.shades.forEach((shade) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.color = shade.key;
    btn.title = shade.ingredient;
    const darkText = shade.key === 'eggYolk' || shade.key === 'spinachLight' || shade.key === 'peaLight';
    btn.className =
      'studio-color-swatch ' + (darkText ? 'studio-color-swatch--dark-text' : 'studio-color-swatch--light-text');
    btn.style.backgroundColor = shade.css;
    btn.innerHTML =
      '<span>' + shade.label + '</span><span>' + shade.ingredient + '</span>';
    btn.addEventListener('click', () => applyColor(shade.key));
    row.appendChild(btn);
  });
  section.appendChild(row);
  return section;
}

function buildColorPalette() {
  const palette = document.getElementById('color-palette');
  if (!palette) return;
  palette.innerHTML = '';
  COLOR_GROUPS.forEach((group) => {
    palette.appendChild(createColorGroupElement(group));
  });
  applyColor('eggYolk');
}

function positionExportMenu() {
  const btn = document.getElementById('btn-export-toggle');
  if (!btn || !exportMenu) return;
  const rect = btn.getBoundingClientRect();
  exportMenu.style.top = rect.bottom + 6 + 'px';
  exportMenu.style.right = Math.max(8, window.innerWidth - rect.right) + 'px';
  exportMenu.style.left = 'auto';
}

function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportGLB() {
  const exporter = new GLTFExporter();
  exporter.parse(
    doughGroup,
    (result) => {
      const blob = result instanceof ArrayBuffer
        ? new Blob([result], { type: 'application/octet-stream' })
        : new Blob([JSON.stringify(result)], { type: 'application/json' });
      downloadBlob(blob, 'zhijiansu-dough.glb');
      setStatus('已导出 GLB');
    },
    (err) => {
      console.error(err);
      setStatus('GLB 导出失败');
    },
    { binary: true }
  );
}

function exportSTL() {
  const str = new STLExporter().parse(doughGroup);
  downloadBlob(new Blob([str], { type: 'text/plain' }), 'zhijiansu-dough.stl');
  setStatus('已导出 STL');
}

function setBoardVisible(visible) {
  if (board) board.visible = visible;
  if (boardEdge) boardEdge.visible = visible;
  const label = document.getElementById('studio-board-label');
  if (label) label.style.display = visible ? '' : 'none';
}

function setARControls(on) {
  if (!controls) return;
  if (on) {
    savedControlsState = {
      maxPolarAngle: controls.maxPolarAngle,
      minPolarAngle: controls.minPolarAngle,
      enablePan: controls.enablePan,
      enableZoom: controls.enableZoom,
      enableRotate: controls.enableRotate
    };
    controls.enableRotate = true;
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.maxPolarAngle = Math.PI;
    controls.minPolarAngle = 0;
  } else if (savedControlsState) {
    controls.maxPolarAngle = savedControlsState.maxPolarAngle;
    controls.minPolarAngle = savedControlsState.minPolarAngle;
    controls.enablePan = savedControlsState.enablePan;
    controls.enableZoom = savedControlsState.enableZoom;
    controls.enableRotate = savedControlsState.enableRotate;
    savedControlsState = null;
  }
}

function setARHintCard(on) {
  const hintCard = document.querySelector('.studio-hint-card');
  if (!hintCard) return;
  if (on) {
    if (!savedHintCardHtml) savedHintCardHtml = hintCard.innerHTML;
    hintCard.innerHTML =
      '<p class="studio-hint-card__title">' +
      '<i data-lucide="rotate-3d"></i> AR 查看</p>' +
      '<p class="studio-hint-card__text">空白处拖拽旋转 · 长按模型平移 · 双指或按钮缩放</p>' +
      '<p class="studio-hint-card__muted">摆好角度后点击「保存截图」</p>';
    refreshLucide();
  } else if (savedHintCardHtml) {
    hintCard.innerHTML = savedHintCardHtml;
    savedHintCardHtml = null;
    refreshLucide();
  }
}

function setARModelOnly(on) {
  setBoardVisible(!on);
  if (!doughGroup) return;
  if (on) {
    savedDoughY = doughGroup.position.y;
    doughGroup.position.y = Math.max(0.5, savedDoughY - 0.38);
  } else {
    doughGroup.position.y = savedDoughY;
  }
  loadedModels.forEach((rec) => {
    rec.mesh.traverse((c) => {
      if (c.isMesh) c.castShadow = !on;
    });
  });
}

function getStudioSnapshot() {
  return {
    color: currentColor,
    scale: { x: 1, y: 1, z: 1 },
    position: { x: 0, y: WORKBENCH_TOP_Y, z: 0 },
    model: 'round',
    instances: loadedModels.map((rec) => ({
      modelId: rec.modelId,
      color: rec.color,
      offset: {
        x: rec.wrapper.position.x,
        y: rec.wrapper.position.y,
        z: rec.wrapper.position.z
      },
      scale: {
        x: rec.wrapper.scale.x,
        y: rec.wrapper.scale.y,
        z: rec.wrapper.scale.z
      },
      rotation: {
        x: rec.wrapper.rotation.x,
        y: rec.wrapper.rotation.y,
        z: rec.wrapper.rotation.z
      }
    }))
  };
}

const LEGACY_COLOR_KEYS = {
  red: 'beetDark',
  yellow: 'eggYolk',
  blue: 'peaDark',
  green: 'spinachDark',
  greenLight: 'spinachLight',
  greenDark: 'spinachDark'
};

function colorKeyFromHex(hex) {
  const n = typeof hex === 'number' ? hex : parseInt(String(hex).replace('#', ''), 16);
  for (const [key, val] of Object.entries(COLORS)) {
    if (val === n) return key;
  }
  return 'eggYolk';
}

async function applyStudioSnapshot(snapshot) {
  if (!snapshot || !doughGroup) return;
  if (snapshot.color !== undefined) {
    currentColor = snapshot.color;
  }
  const paletteKey = colorKeyFromHex(snapshot.color ?? currentColor);
  document.querySelectorAll('[data-color]').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.color === paletteKey);
  });

  const legacyScale = snapshot.scale
    ? snapshot.scale.x ?? snapshot.scale.y ?? snapshot.scale.z ?? 1
    : 1;
  const legacyPos = snapshot.position || { x: 0, z: 0 };

  doughGroup.scale.setScalar(1);
  doughGroup.position.set(0, WORKBENCH_TOP_Y, 0);
  savedDoughY = WORKBENCH_TOP_Y;

  if (snapshot.instances && snapshot.instances.length) {
    await restoreStudioInstances(snapshot.instances, legacyScale);
  } else {
    await restoreStudioInstances(
      [
        {
          modelId: snapshot.model || 'round',
          color: snapshot.color ?? currentColor,
          offset: { x: legacyPos.x ?? 0, z: legacyPos.z ?? 0 },
          scale: legacyScale
        }
      ],
      legacyScale
    );
  }
  clampDoughOnWorkbench();
}

function getMyProfileUrl() {
  return typeof ZJS !== 'undefined' && ZJS.resolve
    ? ZJS.resolve('profile.html?id=me')
    : 'profile.html?id=me';
}

function goToMyProfile() {
  if (typeof ZJS !== 'undefined' && ZJS.replace) {
    ZJS.replace('profile.html?id=me');
  } else {
    window.location.replace(getMyProfileUrl());
  }
}

async function loadWorkForEdit(workId) {
  if (!Api || !workId) return;
  const uid = Api.getCurrentUserId();
  const work = await Api.getWork(workId);
  if (!work || work.userId !== uid) {
    alert('无法编辑该作品');
    location.href = getMyProfileUrl();
    return;
  }
  lastSavedWorkId = work.id;
  if (!work.studio) {
    setStatus('正在编辑：「' + work.title + '」（无模型快照，请重新捏制）');
    return;
  }
  await applyStudioSnapshot(work.studio);
  setStatus('正在编辑：「' + work.title + '」· 保存将更新该作品');
}

function captureWorkThumbnail() {
  if (!renderer || !scene || !camera || !canvas) return '';
  if (arMode) setARModelOnly(true);
  const prevBg = scene.background;
  const size = 360;
  try {
    scene.background = new THREE.Color(0xf3ebe0);
    renderer.setClearColor(0xf3ebe0, 1);
    renderer.render(scene, camera);
    const src = renderer.domElement || canvas;
    const cw = src.width || size;
    const ch = src.height || size;
    if (cw < 2 || ch < 2) return '';

    const thumb = document.createElement('canvas');
    thumb.width = size;
    thumb.height = size;
    const ctx = thumb.getContext('2d');
    ctx.fillStyle = '#f3ebe0';
    ctx.fillRect(0, 0, size, size);
    const scale = Math.min(size / cw, size / ch);
    const dw = cw * scale;
    const dh = ch * scale;
    const ox = (size - dw) / 2;
    const oy = (size - dh) / 2;
    ctx.drawImage(src, 0, 0, cw, ch, ox, oy, dw, dh);
    const dataUrl = thumb.toDataURL('image/jpeg', 0.86);
    if (dataUrl && dataUrl.length > 800) return dataUrl;
  } catch (e) {
    console.warn('[studio] 缩略图截取失败', e);
  } finally {
    if (prevBg) scene.background = prevBg;
    else setViewportBackgroundWhite();
  }
  try {
    renderer.render(scene, camera);
    const fallback = renderer.domElement.toDataURL('image/jpeg', 0.82);
    if (fallback && fallback.length > 800) return fallback;
  } catch (e2) {
    console.warn('[studio] 封面导出失败（可能被跨域贴图污染）', e2);
  }
  return '';
}

function getShareDialogEls() {
  return {
    dialog: document.getElementById('studio-share-dialog'),
    title: document.getElementById('share-title'),
    desc: document.getElementById('share-desc'),
    confirm: document.getElementById('share-confirm'),
    cancel: document.getElementById('share-cancel')
  };
}

function openShareDialog() {
  const els = getShareDialogEls();
  if (!els.dialog) return;
  const defaultTitle = 'DIY 面塑 · ' + new Date().toLocaleDateString('zh-CN');
  if (els.title) els.title.value = defaultTitle;
  if (els.desc) els.desc.value = '在指间塑数字化体验工作台捏制的面塑作品。';
  els.dialog.classList.add('is-open');
  els.dialog.setAttribute('aria-hidden', 'false');
  refreshLucide();
}

function closeShareDialog() {
  const els = getShareDialogEls();
  if (!els.dialog) return;
  els.dialog.classList.remove('is-open');
  els.dialog.setAttribute('aria-hidden', 'true');
}

function getSaveDialogEls() {
  return {
    dialog: document.getElementById('studio-save-dialog'),
    title: document.getElementById('save-draft-title'),
    confirm: document.getElementById('save-draft-confirm'),
    cancel: document.getElementById('save-draft-cancel')
  };
}

function openSaveDialog() {
  const els = getSaveDialogEls();
  if (!els.dialog) return;
  const defaultTitle = 'DIY 面塑 · ' + new Date().toLocaleDateString('zh-CN');
  if (els.title) els.title.value = defaultTitle;
  els.dialog.classList.add('is-open');
  els.dialog.setAttribute('aria-hidden', 'false');
  refreshLucide();
}

function closeSaveDialog() {
  const els = getSaveDialogEls();
  if (!els.dialog) return;
  els.dialog.classList.remove('is-open');
  els.dialog.setAttribute('aria-hidden', 'true');
}

function saveModelDraft() {
  if (typeof Api === 'undefined' || !Api.saveStudioWork) {
    alert('数据服务未加载');
    return;
  }
  openSaveDialog();
}

async function confirmSaveDraft() {
  if (typeof Api === 'undefined' || !Api.saveStudioWork) return;
  const els = getSaveDialogEls();
  const title = (els.title && els.title.value.trim()) || 'DIY 面塑作品';
  closeSaveDialog();
  setStatus('正在保存模型…');
  try {
    await new Promise(function (resolve) {
      requestAnimationFrame(function () {
        requestAnimationFrame(resolve);
      });
    });
    const thumb = captureWorkThumbnail();
    if (!thumb) {
      setStatus('保存失败');
      alert('无法生成作品封面，请确认 3D 场景已加载后重试');
      return;
    }
    const res = await Api.saveStudioWork({
      id: lastSavedWorkId || undefined,
      title: title,
      image: thumb,
      tag: '草稿',
      desc: '工作台保存的 DIY 面塑模型，可继续编辑或分享到展厅。',
      publish: false,
      studio: getStudioSnapshot()
    });
    if (res.ok) {
      lastSavedWorkId = res.workId;
      setStatus('保存成功，正在跳转到「我的」…');
      goToMyProfile();
      return;
    }
  } catch (e) {
    console.error(e);
    setStatus('保存失败');
    alert('保存失败，请重试');
  }
}

async function publishToGallery() {
  if (typeof Api === 'undefined' || !Api.saveStudioWork) {
    alert('数据服务未加载');
    return;
  }
  openShareDialog();
}

async function confirmShareToGallery() {
  const els = getShareDialogEls();
  const title = (els.title && els.title.value.trim()) || 'DIY 面塑作品';
  const desc = (els.desc && els.desc.value.trim()) || '来自数字化体验工作台的手作面塑。';
  closeShareDialog();
  setStatus('正在发布到数字化展厅…');
  try {
    await new Promise(function (resolve) {
      requestAnimationFrame(function () {
        requestAnimationFrame(resolve);
      });
    });
    const thumb = captureWorkThumbnail();
    if (!thumb) {
      setStatus('发布失败');
      alert('无法生成作品封面，请确认 3D 场景已加载后重试');
      return;
    }
    const res = await Api.saveStudioWork({
      id: lastSavedWorkId || undefined,
      title: title,
      image: thumb,
      tag: 'DIY体验',
      desc: desc,
      publish: true,
      studio: getStudioSnapshot()
    });
    if (res.ok) {
      lastSavedWorkId = res.workId;
      setStatus('已分享到数字化展厅，正在跳转…');
      var galleryPage = 'gallery.html?published=' + encodeURIComponent(res.workId);
      if (typeof ZJS !== 'undefined' && ZJS.replace) {
        ZJS.replace(galleryPage);
      } else {
        window.location.replace(galleryPage);
      }
      return;
    }
    setStatus('发布失败');
    alert(res.message || '发布失败，请重试');
  } catch (e) {
    console.error(e);
    setStatus('发布失败');
    alert('发布失败：' + (e.message || '请重试'));
  }
}

function setupSaveShareUI() {
  const btnSave = document.getElementById('btn-save-model');
  const btnShare = document.getElementById('btn-share-gallery');
  const shareEls = getShareDialogEls();
  const saveEls = getSaveDialogEls();

  if (btnSave) btnSave.addEventListener('click', saveModelDraft);
  if (btnShare) btnShare.addEventListener('click', publishToGallery);
  if (shareEls.confirm) shareEls.confirm.addEventListener('click', confirmShareToGallery);
  if (shareEls.cancel) shareEls.cancel.addEventListener('click', closeShareDialog);
  const cancelTop = document.getElementById('share-cancel-top');
  if (cancelTop) cancelTop.addEventListener('click', closeShareDialog);
  if (shareEls.dialog) {
    shareEls.dialog.addEventListener('click', (e) => {
      if (e.target === shareEls.dialog) closeShareDialog();
    });
  }
  if (saveEls.confirm) saveEls.confirm.addEventListener('click', confirmSaveDraft);
  if (saveEls.cancel) saveEls.cancel.addEventListener('click', closeSaveDialog);
  if (saveEls.dialog) {
    saveEls.dialog.addEventListener('click', (e) => {
      if (e.target === saveEls.dialog) closeSaveDialog();
    });
  }
  setupARSaveDialog();
}

function getARSaveDialogEls() {
  return {
    dialog: document.getElementById('studio-ar-save-dialog'),
    download: document.getElementById('ar-save-download'),
    portfolio: document.getElementById('ar-save-portfolio'),
    title: document.getElementById('ar-save-title'),
    titleField: document.getElementById('ar-save-title-field'),
    confirm: document.getElementById('ar-save-confirm'),
    cancel: document.getElementById('ar-save-cancel')
  };
}

function keepARPreviewLive() {
  if (!arMode || !arVideo || !arVideo.srcObject) return;
  if (arVideo.paused && !arVideo.ended) {
    arVideo.play().catch(() => {});
  }
}

function onARVideoPause() {
  keepARPreviewLive();
}

function waitForNextFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

function openARSaveDialog() {
  if (!arMode) return;
  const els = getARSaveDialogEls();
  if (!els.dialog) return;
  const defaultTitle = 'AR 面塑实景 · ' + new Date().toLocaleDateString('zh-CN');
  if (els.title) els.title.value = defaultTitle;
  if (els.download) els.download.checked = true;
  if (els.portfolio) els.portfolio.checked = true;
  syncARSaveTitleField();
  els.dialog.classList.add('is-open');
  els.dialog.setAttribute('aria-hidden', 'false');
  refreshLucide();
}

function closeARSaveDialog() {
  const els = getARSaveDialogEls();
  if (!els.dialog) return;
  els.dialog.classList.remove('is-open');
  els.dialog.setAttribute('aria-hidden', 'true');
}

function syncARSaveTitleField() {
  const els = getARSaveDialogEls();
  if (!els.titleField || !els.portfolio) return;
  els.titleField.style.display = els.portfolio.checked ? '' : 'none';
}

function captureARScreenshotBlob() {
  return new Promise((resolve) => {
    if (!arMode) {
      resolve(null);
      return;
    }
    setARModelOnly(true);
    renderer.render(scene, camera);
    const w = viewport.clientWidth;
    const h = viewport.clientHeight;
    const comp = document.createElement('canvas');
    comp.width = w;
    comp.height = h;
    const ctx = comp.getContext('2d');
    ctx.drawImage(arVideo, 0, 0, w, h);
    ctx.drawImage(canvas, 0, 0, w, h);
    comp.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function setupARSaveDialog() {
  const els = getARSaveDialogEls();
  if (els.cancel) els.cancel.addEventListener('click', closeARSaveDialog);
  if (els.portfolio) els.portfolio.addEventListener('change', syncARSaveTitleField);
  if (els.dialog) {
    els.dialog.addEventListener('click', (e) => {
      if (e.target === els.dialog) closeARSaveDialog();
    });
  }
  if (els.confirm) {
    els.confirm.addEventListener('click', confirmARSave);
  }
}

async function confirmARSave() {
  const els = getARSaveDialogEls();
  const doDownload = els.download && els.download.checked;
  const doPortfolio = els.portfolio && els.portfolio.checked;
  if (!doDownload && !doPortfolio) {
    alert('请至少选择一项：下载或保存至作品集');
    return;
  }
  if (doPortfolio && (typeof Api === 'undefined' || !Api.saveStudioWork)) {
    alert('数据服务未加载，无法保存至作品集');
    return;
  }
  closeARSaveDialog();
  setStatus('正在生成 AR 截图…');
  try {
    const blob = await captureARScreenshotBlob();
    if (!blob) {
      setStatus('截图失败');
      alert('无法生成 AR 截图，请确认 AR 模式已开启');
      return;
    }
    if (doDownload) {
      downloadBlob(blob, 'zhijiansu-ar-fusion.jpg');
    }
    if (doPortfolio) {
      const dataUrl = await blobToDataUrl(blob);
      const title =
        (els.title && els.title.value.trim()) ||
        'AR 面塑实景 · ' + new Date().toLocaleDateString('zh-CN');
      const res = await Api.saveStudioWork({
        title: title,
        image: dataUrl,
        tag: 'AR截图',
        workType: 'ar_snapshot',
        desc: '数字化体验 AR 模式拍摄的实景融合截图。',
        publish: false
      });
      if (!res.ok) {
        setStatus('保存失败');
        alert(res.message || '保存至作品集失败');
        return;
      }
    }
    if (doDownload && doPortfolio) {
      setStatus('已下载并保存至 DIY 作品集');
      alert('截图已下载，并已保存至「我的」DIY 作品集');
    } else if (doDownload) {
      setStatus('已下载 AR 截图');
    } else {
      setStatus('已保存至 DIY 作品集');
      alert('已保存至「我的」DIY 作品集，可在主页查看与发布');
    }
  } catch (e) {
    console.error(e);
    setStatus('操作失败');
    alert('操作失败：' + (e.message || '请重试'));
  }
}

async function startAR() {
  if (arMode) {
    stopAR();
    return;
  }
  if (humanPhase === 'camera') stopRealReviewCamera();
  try {
    arStream = await ZJS.Camera.requestVideoStream({ preferEnvironment: true });
    arVideo.srcObject = arStream;
    await arVideo.play();
    viewport.classList.add('ar-mode');
    document.getElementById('studio-app')?.classList.add('ar-mode');
    setViewportBackgroundTransparent();
    setARModelOnly(true);
    setARControls(true);
    setARHintCard(true);
    arMode = true;
    if (exportMenu) exportMenu.classList.remove('is-open');
    const btnAr = document.getElementById('btn-ar');
    btnAr.innerHTML = '<i data-lucide="x"></i><span>退出 AR</span>';
    refreshLucide();
    setStatus('AR 模式：摆放模型后点击「保存截图」');
    if (!document.getElementById('btn-ar-save')) {
      const b = document.createElement('button');
      b.type = 'button';
      b.id = 'btn-ar-save';
      b.className = 'studio-btn studio-btn--ghost';
      b.innerHTML = '<i data-lucide="camera"></i><span>保存截图</span>';
      b.addEventListener('click', openARSaveDialog);
      topActions.insertBefore(b, document.getElementById('btn-ar'));
      refreshLucide();
    }
  } catch (e) {
    const hint =
      ZJS.Camera && ZJS.Camera.friendlyCameraError
        ? ZJS.Camera.friendlyCameraError(e)
        : '请检查摄像头权限与设备';
    alert('无法启动 AR 摄像头：' + hint);
  }
}

function stopAR() {
  if (arStream) {
    arStream.getTracks().forEach((t) => t.stop());
    arStream = null;
  }
  arVideo.srcObject = null;
  viewport.classList.remove('ar-mode');
  document.getElementById('studio-app')?.classList.remove('ar-mode');
  setViewportBackgroundWhite();
  setARModelOnly(false);
  setARControls(false);
  setARHintCard(false);
  arMode = false;
  document.getElementById('btn-ar').innerHTML = '<i data-lucide="scan-line"></i><span>AR 体验</span>';
  refreshLucide();
  const arSave = document.getElementById('btn-ar-save');
  if (arSave) arSave.remove();
  setStatus('已退出 AR 模式');
}

function colorNameFromHex(hex) {
  const key = colorKeyFromHex(hex);
  for (let i = 0; i < COLOR_GROUPS.length; i++) {
    const shades = COLOR_GROUPS[i].shades;
    for (let j = 0; j < shades.length; j++) {
      if (shades[j].key === key) return COLOR_GROUPS[i].title + '「' + shades[j].label + '」';
    }
  }
  return '天然染';
}

function setHumanActions(phase) {
  humanPhase = phase;
  if (humanActionsIdle) humanActionsIdle.hidden = phase !== 'idle';
  if (humanActionsChoose) humanActionsChoose.hidden = phase !== 'choose';
  if (humanActionsWrapup) humanActionsWrapup.hidden = phase !== 'wrapup';
  if (humanActionsRealFollowup) humanActionsRealFollowup.hidden = phase !== 'realFollowup';
}

function stopHumanSpeech() {
  humanSpeakToken += 1;
  if (humanSpeakTimer) {
    clearTimeout(humanSpeakTimer);
    humanSpeakTimer = 0;
  }
  if (window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }
  if (humanFigureEl) humanFigureEl.classList.remove('is-speaking');
}

function pickHumanVoice() {
  if (!window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  if (!voices.length) return null;
  function score(v) {
    const n = ((v && v.name) || '') + ' ' + ((v && v.lang) || '');
    let s = 0;
    if (/zh|cmn|chinese|中文|普通话/i.test(n)) s += 12;
    if (/zh-CN|cmn-Hans|zh_CN/i.test((v && v.lang) || '')) s += 10;
    if (/female|女|ting|xiao|huihui|yaoyao|meijia|mei-jia|hanhan|yunxia|xiaoyan|xiaoyi|xiaoxiao/i.test(n)) {
      s += 16;
    }
    if (/Google/.test(n) && /Chinese|Mandarin|普通话|中文/.test(n)) s += 8;
    if (/Microsoft/.test(n)) s += 5;
    if (/enhanced|premium|neural|natural/i.test(n)) s += 6;
    if (/compact|eloquence|robot/i.test(n)) s -= 8;
    return s;
  }
  const ranked = voices.slice().sort(function (a, b) {
    return score(b) - score(a);
  });
  return ranked[0] && score(ranked[0]) > 0 ? ranked[0] : ranked[0] || null;
}

function ensureHumanVoice() {
  humanVoice = pickHumanVoice() || humanVoice;
  return humanVoice;
}

function toSpeakChunks(text) {
  const cleaned = String(text || '')
    .replace(/「|」|“|”/g, '')
    .replace(/\s*AI\s*/g, '')
    .replace(/\s+/g, '');
  const parts = [];
  cleaned.replace(/[^。！？；…]+[。！？；…]?/g, function (m) {
    const s = m.trim();
    if (s) parts.push(s);
    return m;
  });
  return parts.length ? parts : cleaned ? [cleaned] : [];
}

function speakChunk(chunk, index, total, onEnd, onFail) {
  const u = new SpeechSynthesisUtterance(chunk);
  u.lang = (humanVoice && humanVoice.lang) || 'zh-CN';
  if (humanVoice) u.voice = humanVoice;
  u.volume = 1;
  u.rate = 0.88 + (index % 3) * 0.03;
  u.pitch = 1.12 + (index % 2) * 0.04;
  u.onend = onEnd;
  u.onerror = onFail;
  window.speechSynthesis.speak(u);
}

function speakHuman(text, onDone) {
  const token = ++humanSpeakToken;
  const chunks = toSpeakChunks(text);
  function finish() {
    if (token !== humanSpeakToken) return;
    humanSpeakTimer = 0;
    if (humanFigureEl) humanFigureEl.classList.remove('is-speaking');
    if (typeof onDone === 'function') onDone();
  }
  if (!chunks.length) {
    finish();
    return;
  }
  if (!window.speechSynthesis) {
    humanSpeakTimer = window.setTimeout(finish, Math.min(24000, 1400 + String(text).length * 100));
    return;
  }
  try {
    window.speechSynthesis.cancel();
    ensureHumanVoice();
    let i = 0;
    function next() {
      if (token !== humanSpeakToken) return;
      if (i >= chunks.length) {
        finish();
        return;
      }
      const chunk = chunks[i];
      const idx = i;
      i += 1;
      speakChunk(
        chunk,
        idx,
        chunks.length,
        function () {
          if (token !== humanSpeakToken) return;
          const pause = chunk.length > 18 ? 420 : 260;
          humanSpeakTimer = window.setTimeout(next, pause);
        },
        function () {
          if (token !== humanSpeakToken) return;
          humanSpeakTimer = window.setTimeout(next, 80);
        }
      );
    }
    const totalMs = 1800 + String(text).length * 160;
    humanSpeakTimer = window.setTimeout(finish, Math.min(45000, totalMs));
    if (!humanVoice) {
      window.speechSynthesis.onvoiceschanged = function () {
        ensureHumanVoice();
      };
      window.setTimeout(function () {
        ensureHumanVoice();
        next();
      }, 180);
    } else {
      next();
    }
  } catch (e) {
    humanSpeakTimer = window.setTimeout(finish, 1600);
  }
}

function setHumanSpeech(text, speak, onDone) {
  if (humanSpeechEl) {
    if (text) {
      humanSpeechEl.hidden = false;
      humanSpeechEl.textContent = text;
    } else {
      humanSpeechEl.textContent = '';
      humanSpeechEl.hidden = true;
    }
  }
  if (speak && text) {
    if (humanFigureEl) {
      humanFigureEl.classList.remove('is-speaking');
      void humanFigureEl.offsetWidth;
      humanFigureEl.classList.add('is-speaking');
    }
    speakHuman(text, onDone);
  } else if (typeof onDone === 'function') {
    onDone();
  }
}

function folkMeaningForName(name) {
  const n = String(name || '');
  if (/鱼|锦鲤|鲤/.test(n)) return '哎，这鱼捏得好。胶东过年就爱摆这个，图个年年有余。';
  if (/桃|寿/.test(n)) return '寿桃这口彩正。给长辈贺寿，圆圆满满的，看着就喜庆。';
  if (/莲|荷/.test(n)) return '莲花取的是连年的意思。瓣要一层一层开，别糊成一团。';
  if (/凤|鸡|鸟/.test(n)) return '禽鸟这造型，办喜事常用，图个吉祥、往高处走。';
  if (/花|菊|梅/.test(n)) return '花瓣这活是细功夫。层次清楚了，才叫花饽饽，不是普通馒头。';
  return '胶东饽饽啊，讲究神似。像那么回事，口彩就立住了。';
}

function buildHumanReview() {
  if (!loadedModels.length) {
    return '我瞅了一眼，案板还空着哩。你先从右边把饽饽拖过来，捏出个样子。翻折、旋收有了，我再帮你看气排干净没。';
  }
  const names = loadedModels.map(function (m) {
    return m.name;
  });
  const unique = [];
  names.forEach(function (n) {
    if (unique.indexOf(n) < 0) unique.push(n);
  });
  const count = loadedModels.length;
  const dyed = loadedModels.filter(function (m) {
    return m.color != null;
  });
  const colorHint = dyed.length ? colorNameFromHex(dyed[dyed.length - 1].color) : '';
  const spread = loadedModels.some(function (m) {
    return Math.abs(m.wrapper.position.x) > 0.2 || Math.abs(m.wrapper.position.z) > 0.2;
  });
  const sizes = loadedModels.map(function (m) {
    return m.wrapper.scale.x;
  });
  const sizeSpread = Math.max.apply(null, sizes) - Math.min.apply(null, sizes);
  const lines = [];
  lines.push('来，我帮你看看这盘。');
  if (count === 1) {
    lines.push('这一件，' + unique[0] + '，轮廓倒是有了。');
    lines.push('就是翻折旋收还差一口气。边角再收一收，气才能排干净，面才筋。');
    lines.push(folkMeaningForName(unique[0]));
    lines.push(
      colorHint
        ? colorHint + '揉进去了，看着喜庆。可别光靠颜色撑，层次得做出来。'
        : '还是原色面团。加点甜菜红、南瓜黄，年味一下子就上来，也不跟别人一个样。'
    );
  } else {
    lines.push(
      '哟，案板上搁了 ' +
        count +
        ' 件，' +
        unique.slice(0, 3).join('、') +
        (unique.length > 3 ? '这些' : '') +
        '。热闹是热闹。'
    );
    lines.push('就是别挤成一堆。大小错开，才像过年那一桌全席饽饽。');
    lines.push(folkMeaningForName(unique[0]));
    lines.push(
      colorHint
        ? colorHint + '上了，好看。旋收再做干净点，筋度就够了。'
        : '颜色还单。红黄绿一配，才叫花饽饽，也不容易跟别人撞。'
    );
  }
  if (spread) lines.push('位置稍偏了点，往当中拢一拢，更像供桌上摆的。');
  if (sizeSpread > 0.35) lines.push('大小有对比，主次清楚，这点我喜欢。');
  lines.push('纹样清楚、口彩立住，慢慢捏，手就熟了。');
  return lines.join('');
}

const HUABOBO_MOTIFS = [
  {
    id: 'long',
    name: '龙',
    folk:
      '龙纹花饽饽多用于贺岁、祭神和男方礼席，取威严吉祥、风调雨顺。胶东讲究龙须、龙鳞一层一层刻出来，鳞片乱了口彩就散。龙凤成对时，龙在左、凤在右，这是老规矩。'
  },
  {
    id: 'feng',
    name: '凤',
    folk:
      '凤纹多见于婚嫁花饽饽，图祥瑞、美满。凤羽要有开合，尾巴散得开才像凤，不能捏成一只普通鸟。和龙配在一起叫龙凤呈祥，是胶东喜饽饽最常见的一对。'
  },
  {
    id: 'yu',
    name: '鱼',
    folk:
      '鱼取年年有余。过年蒸鱼饽饽、摆面鱼，图的是衣食丰盈。鱼身要有弧度，鳞片整齐，眼睛点得精神。胶东沿海人家还常拿它祭海、祭祖。'
  },
  {
    id: 'tao',
    name: '寿桃',
    folk:
      '桃是贺寿的。给长辈过寿蒸寿桃饽饽，圆、鼓、带桃尖，寓意福寿康宁。叶子贴在一侧，红尖一点，才像仙桃，不能捏成普通馒头。'
  },
  {
    id: 'lian',
    name: '莲花',
    folk:
      '莲花取连年、和美，婚礼上也图连生贵子。瓣要一层一层打开，芯要收住。胶东有的村子过节蒸莲蓬，籽粒点上，才算完整。'
  },
  {
    id: 'jubaopen',
    name: '聚宝盆',
    folk:
      '聚宝盆是招财进宝的造型，年节、开业、新居常用。盆口要圆、腹要鼓，边上可以贴元宝或钱纹。讲究的是聚气，口不能敞得太大。'
  },
  {
    id: 'yuanbao',
    name: '元宝',
    folk:
      '元宝饽饽图财运。两头翘、中间鼓，才像金元宝。新居搬家、开市、过年摆一盘，图的是家底厚、来年顺。'
  },
  {
    id: 'hua',
    name: '团花',
    folk:
      '团花、牡丹这类纹样图富贵圆满。花心要有层次，瓣要分得出前后。胶东花饽饽讲究「花开有心」，空心一团就没了讲究。'
  }
];

function captureElementFrame(el) {
  const srcW = el.videoWidth || el.naturalWidth || 640;
  const srcH = el.videoHeight || el.naturalHeight || 480;
  const maxW = 960;
  const scale = Math.min(1, maxW / Math.max(srcW, 1));
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.round(srcW * scale));
  c.height = Math.max(2, Math.round(srcH * scale));
  const ctx = c.getContext('2d');
  ctx.drawImage(el, 0, 0, c.width, c.height);
  return c;
}

function analyzeHuaboboStill(sourceEl) {
  const info = {
    samples: 0,
    warm: 0,
    gold: 0,
    green: 0,
    pink: 0,
    bright: 0,
    dark: 0,
    sat: 0,
    edges: 0,
    centerMass: 0,
    aspect: 1,
    hash: 1
  };
  try {
    const full = captureElementFrame(sourceEl);
    info.aspect = full.width / Math.max(full.height, 1);
    const c = document.createElement('canvas');
    const w = 96;
    const h = Math.max(48, Math.round(96 / info.aspect));
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.drawImage(full, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    const cx = w / 2;
    const cy = h / 2;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = (y * w + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        info.samples += 1;
        const mx = Math.max(r, g, b);
        const mn = Math.min(r, g, b);
        const sat = mx ? (mx - mn) / mx : 0;
        info.sat += sat;
        const lum = (r + g + b) / 3;
        if (lum > 168) info.bright += 1;
        if (lum < 70) info.dark += 1;
        if (r > g + 18 && r > b + 18) info.warm += 1;
        if (r > 150 && g > 110 && b < 120 && r - b > 40) info.gold += 1;
        if (g > r + 8 && g > b) info.green += 1;
        if (r > 150 && b > 110 && g < r - 10) info.pink += 1;
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy < (w * w) / 10 && lum < 200 && lum > 40) info.centerMass += 1;
        const iRight = (y * w + x + 1) * 4;
        const iDown = ((y + 1) * w + x) * 4;
        const lumR = (data[iRight] + data[iRight + 1] + data[iRight + 2]) / 3;
        const lumD = (data[iDown] + data[iDown + 1] + data[iDown + 2]) / 3;
        if (Math.abs(lum - lumR) + Math.abs(lum - lumD) > 48) info.edges += 1;
        info.hash = (info.hash * 33 + r + g * 3 + b * 7 + x * y) % 1000003;
      }
    }
  } catch (e) {
    console.warn('[studio] 实物图识别取样失败', e);
  }
  const n = Math.max(info.samples, 1);
  const ratios = {
    warm: info.warm / n,
    gold: info.gold / n,
    green: info.green / n,
    pink: info.pink / n,
    bright: info.bright / n,
    dark: info.dark / n,
    sat: info.sat / n,
    edges: info.edges / n,
    center: info.centerMass / n,
    aspect: info.aspect,
    hash: info.hash
  };
  const scores = {
    long: ratios.gold * 1.4 + ratios.warm * 0.6 + (ratios.aspect > 1.15 ? 0.25 : 0) + (ratios.edges > 0.12 ? 0.2 : 0),
    feng: ratios.pink * 1.3 + ratios.warm * 0.7 + ratios.gold * 0.4 + (ratios.aspect > 1.05 ? 0.15 : 0),
    yu: ratios.gold * 0.9 + (ratios.aspect > 1.25 ? 0.45 : 0) + ratios.edges * 0.8 + (ratios.green > 0.08 ? 0.1 : 0),
    tao: ratios.warm * 1.1 + (ratios.aspect < 0.95 ? 0.35 : 0) + ratios.center * 0.8 + (ratios.pink > 0.08 ? 0.2 : 0),
    lian: ratios.pink * 1.2 + ratios.green * 1.1 + (ratios.aspect < 1.08 ? 0.2 : 0) + ratios.center * 0.4,
    jubaopen: ratios.gold * 1.1 + (ratios.aspect > 0.95 && ratios.aspect < 1.25 ? 0.3 : 0) + ratios.center * 0.5,
    yuanbao: ratios.gold * 1.3 + (ratios.aspect > 1.2 ? 0.35 : 0) + (ratios.bright > 0.3 ? 0.15 : 0),
    hua: ratios.pink * 0.8 + ratios.warm * 0.5 + ratios.edges * 0.7 + (ratios.sat > 0.22 ? 0.2 : 0)
  };
  const seed = ratios.hash % 97;
  const ranked = HUABOBO_MOTIFS.map(function (m) {
    return { motif: m, score: (scores[m.id] || 0) + (seed % (m.id.length + 5)) / 80 };
  }).sort(function (a, b) {
    return b.score - a.score;
  });
  const motifs = [ranked[0].motif];
  if (ranked[1] && ranked[1].score > ranked[0].score * 0.72) motifs.push(ranked[1].motif);
  const craft =
    ratios.edges > 0.16 ? 'fine' : ratios.edges > 0.1 ? 'ok' : 'soft';
  const light = ratios.bright < 0.22 || ratios.dark > 0.28 ? 'dim' : ratios.bright > 0.55 ? 'harsh' : 'good';
  return { motifs: motifs, craft: craft, light: light, ratios: ratios, seed: seed };
}

function pickVariant(list, seed, salt) {
  if (!list || !list.length) return '';
  return list[Math.abs(seed + salt) % list.length];
}

function buildRealReview(rec) {
  const motifs = (rec && rec.motifs) || [];
  const names = motifs.map(function (m) {
    return m.name;
  });
  const main = names[0] || '团花';
  const second = names[1] || '';
  const seed = (rec && rec.seed) || 3;
  const craft = rec && rec.craft;
  const light = rec && rec.light;
  const warm = rec && rec.ratios ? rec.ratios.warm : 0;
  const gold = rec && rec.ratios ? rec.ratios.gold : 0;
  const lines = [];
  lines.push(
    pickVariant(
      [
        '这回评的是镜头里这件真饽饽，不是案板上的数字模型。画面定住了，我细瞅。',
        '好，实拍定格了。数字版是看 3D，这回我对着这张真饽饽照片说。',
        '行，真家伙拍下来了。我按画面里的造型、纹样给你评，跟点评数字模型不是一回事。'
      ],
      seed,
      1
    )
  );
  lines.push(
    second
      ? pickVariant(
          [
            '我认出来了，主纹是' + main + '，旁边还带着' + second + '的意思。',
            '造型往' + main + '上靠，' + second + '的影子也有。胶东饽饽常这么配。',
            '画面里' + main + '立住了，' + second + '做点缀，口彩就丰富了。'
          ],
          seed,
          2
        )
      : pickVariant(
          [
            '这件我看成' + main + '。轮廓有了，神似比形似要紧。',
            '纹样往' + main + '上走。一眼能认出来，这才叫花饽饽。',
            '造型是' + main + '。胶东人看饽饽，先认口彩，再看做工。'
          ],
          seed,
          3
        )
  );
  if (craft === 'fine') {
    lines.push(
      pickVariant(
        [
          '做工这边，翻折、旋收比较利落，边缘清楚，纹样没糊成一团，这点好。',
          '刀口、剪纹还干净。层次分开了，远看也立得住。',
          '细处下了功夫。鳞片也好、花瓣也好，能数出前后，这才像手艺。'
        ],
        seed,
        4
      )
    );
    lines.push(
      pickVariant(
        [
          '不足也有：气若再排一排，表面还能更光、更筋，不像刚出锅就塌。',
          '还差一口气。主纹再鼓一点，配饰再收一点，主次更清楚。',
          '好看是好看，边角再抿一抿，才不像急着出锅的。'
        ],
        seed,
        5
      )
    );
  } else if (craft === 'ok') {
    lines.push(
      pickVariant(
        [
          '整体能看。' + main + '的意思在，可层次还浅，远看像，近看有点糊。',
          '中等手艺。轮廓立住了，细纹还软，剪刻再深一点就精神了。',
          '能认出来，这已经及格。就是翻折的边还圆，该方的方，该尖的尖。'
        ],
        seed,
        6
      )
    );
    lines.push(
      pickVariant(
        [
          '不足在旋收。气排不干净，蒸完容易胖、容易糊纹。手上再稳一稳。',
          '染色和造型还没咬死。纹样清楚了，颜色才帮得上忙，别反过来。',
          '再练一练推揉翻收。面筋够了，' + main + '才不会瘪。'
        ],
        seed,
        7
      )
    );
  } else {
    lines.push(
      pickVariant(
        [
          '造型还含糊。' + main + '的意思要靠纹样说话，现在边太软，像普通馒头。',
          '神似不够。花饽饽忌讳圆囵一块，该有的棱、瓣、鳞得刻出来。',
          '一眼还认不太准。主纹再夸张一点，口彩才站得住。'
        ],
        seed,
        8
      )
    );
    lines.push(
      pickVariant(
        [
          '先把翻折、旋收做干净。气排出来，面才筋，纹样才贴得住。',
          '别急着上色。形没有，颜色盖不住。刀、剪、按，三下就有层次。',
          '不足明显在层次。一层一层做，' + main + '才会从面里「长」出来。'
        ],
        seed,
        9
      )
    );
  }
  if (warm > 0.16 || gold > 0.1) {
    lines.push(
      pickVariant(
        [
          '色走得喜庆，红黄一衬，年味就出来了。别把主纹盖死就行。',
          '染色够味。胶东饽饽就爱这股红火，可留一点面本色，才有体积。',
          '颜色帮了造型。再注意深浅过渡，' + main + '会更精神。'
        ],
        seed,
        10
      )
    );
  } else {
    lines.push(
      pickVariant(
        [
          '这件偏素。素也成，全靠纹样吃饭，所以层次更不能省。',
          '原色面也有味道。要是再点一点甜菜红、南瓜黄，口彩更响。',
          '素净倒耐看。就怕远看没精神，主纹再鼓一点就好。'
        ],
        seed,
        11
      )
    );
  }
  if (light === 'dim') {
    lines.push('光暗了点，细纹我看不全。下次正面打亮再拍，评得更准。');
  } else if (light === 'harsh') {
    lines.push('光太冲，高光把纹样洗白了。侧一点光，凹凸才清楚。');
  }
  lines.push(
    pickVariant(
      [
        '真饽饽就这回事：认得出纹样，做得有层次，摆上桌才像那么回事。',
        '数字模型捏两下就成，真面得靠手上的劲。你这件有底了，接着练。',
        '评完了。想听这纹样图什么口彩，就点「讲解民俗寓意」。'
      ],
      seed,
      12
    )
  );
  return lines.join('');
}

function buildFolkTalk(rec) {
  const motifs = (rec && rec.motifs) || [];
  if (!motifs.length) {
    return '胶东花饽饽图的是口彩。龙凤鱼桃莲花元宝，各有各的讲究。你这件再拍清楚点，我能对着纹样细说。';
  }
  const parts = ['对着这张定格的真饽饽，我把纹样的讲究给你掰开。'];
  motifs.forEach(function (m) {
    parts.push(m.name + '。' + m.folk);
  });
  if (motifs.length > 1) {
    parts.push(
      '两样配在一起，图的是口彩叠加，别抢戏。主纹大、配纹小，供桌上才好看。'
    );
  }
  parts.push('习俗上，什么节、什么人、什么席，用哪一样饽饽，老辈心里都有谱。你捏的时候先想清楚送给谁。');
  return parts.join('');
}

function afterDigitalReviewSpoken() {
  if (humanPhase === 'idle') return;
  setHumanActions('wrapup');
  setStatus('数字版点评完成，可继续或结束');
  if (hintStatusEl) hintStatusEl.textContent = '继续点评 3D 模型，或结束交互';
}

function afterRealReviewSpoken() {
  if (humanPhase === 'idle') return;
  setHumanActions('realFollowup');
  setStatus('实物点评完成，可听民俗寓意或结束评价');
  if (hintStatusEl) hintStatusEl.textContent = '讲解民俗寓意，或结束本次实物评价';
}

function stopRealReviewCamera() {
  if (realReviewStream) {
    realReviewStream.getTracks().forEach(function (t) {
      t.stop();
    });
    realReviewStream = null;
  }
  if (realCamVideo) realCamVideo.srcObject = null;
  if (realCamOverlay) realCamOverlay.hidden = true;
  if (viewport) viewport.classList.remove('is-real-shooting');
}

function clearRealFreeze() {
  if (realFreezeEl) {
    realFreezeEl.hidden = true;
    realFreezeEl.removeAttribute('src');
    realFreezeEl.classList.remove('is-settled');
  }
  if (viewport) viewport.classList.remove('is-real-frozen');
  lastRealRecognition = null;
}

function resetHumanIdle() {
  realReviewBusy = false;
  stopHumanSpeech();
  stopRealReviewCamera();
  clearRealFreeze();
  setHumanSpeech('', false);
  setHumanActions('idle');
  if (humanFigureEl) humanFigureEl.classList.remove('is-speaking');
  setStatus('数字人已待机');
  if (hintStatusEl) hintStatusEl.textContent = '可再次开始数字人交互';
}

function startHumanSession() {
  stopRealReviewCamera();
  clearRealFreeze();
  setHumanActions('greeting');
  setHumanSpeech(HUMAN_GREETING, true, function () {
    if (humanPhase === 'idle') return;
    setHumanActions('choose');
    setStatus('请选择点评数字版或真实实物');
    if (hintStatusEl) hintStatusEl.textContent = '选择一种点评方式';
  });
}

function reviewDigitalWork() {
  clearRealFreeze();
  stopRealReviewCamera();
  setHumanActions('reviewing');
  const text = buildHumanReview();
  setStatus(loadedModels.length ? '正在点评数字版花饽饽（3D 模型）' : '案板为空，已给出提示');
  if (hintStatusEl) hintStatusEl.textContent = '数字版：点评案板上的 3D 模型';
  setHumanSpeech(text, true, afterDigitalReviewSpoken);
}

async function startRealReviewCamera() {
  if (realReviewBusy) return;
  clearRealFreeze();
  setHumanActions('camera');
  if (arMode) stopAR();
  if (!window.ZJS || !ZJS.Camera) {
    setHumanSpeech('这摄像头还没准备好。你刷新一下页面，咱们再试。', true, function () {
      setHumanActions('choose');
    });
    return;
  }
  try {
    realReviewStream = await ZJS.Camera.requestVideoStream({ preferEnvironment: true });
    if (realCamVideo) {
      realCamVideo.srcObject = realReviewStream;
      realCamVideo.muted = true;
      realCamVideo.setAttribute('playsinline', 'true');
      try {
        await realCamVideo.play();
      } catch (e) {}
    }
    if (realCamOverlay) realCamOverlay.hidden = false;
    if (viewport) viewport.classList.add('is-real-shooting');
    setStatus('摄像头已开启：对准真实花饽饽，点「确定」拍摄');
    if (hintStatusEl) hintStatusEl.textContent = '实物点评：拍摄真饽饽，不是 3D 模型';
    setHumanSpeech('把真饽饽对着镜头，摆正了点「确定」。我按实拍图认造型、评做工。', true);
  } catch (e) {
    const hint =
      ZJS.Camera && ZJS.Camera.friendlyCameraError
        ? ZJS.Camera.friendlyCameraError(e)
        : e.message || '无法打开摄像头';
    setHumanSpeech('摄像头没打开。' + hint + ' 你允许一下权限，或者先评数字版也行。', true, function () {
      if (humanPhase !== 'idle') setHumanActions('choose');
    });
  }
}

function cancelRealReviewCamera() {
  stopRealReviewCamera();
  setHumanActions('choose');
  setStatus('已取消实物拍摄');
  if (hintStatusEl) hintStatusEl.textContent = '选择点评数字版或真实实物';
}

function settleRealFreezePhoto(dataUrl) {
  return new Promise(function (resolve) {
    if (!realFreezeEl || !dataUrl) {
      resolve();
      return;
    }
    realFreezeEl.classList.remove('is-settled');
    realFreezeEl.src = dataUrl;
    realFreezeEl.hidden = false;
    if (viewport) viewport.classList.add('is-real-frozen');
    void realFreezeEl.offsetWidth;
    window.setTimeout(function () {
      realFreezeEl.classList.add('is-settled');
    }, 40);
    window.setTimeout(resolve, 820);
  });
}

async function confirmRealReviewShot() {
  if (realReviewBusy) return;
  if (!realCamVideo || !realCamVideo.srcObject) {
    setHumanSpeech('画面还没出来。你对着饽饽再点一次确定。', true);
    return;
  }
  realReviewBusy = true;
  setHumanActions('reviewing');
  setStatus('正在捕获实拍图…');
  try {
    if (realCamVideo.readyState < 2) {
      await waitForNextFrame();
    }
    const frame = captureElementFrame(realCamVideo);
    const dataUrl = frame.toDataURL('image/jpeg', 0.9);
    lastRealRecognition = analyzeHuaboboStill(realCamVideo);
    stopRealReviewCamera();
    await settleRealFreezePhoto(dataUrl);
    setStatus('正在识别造型与纹样…');
    const text = buildRealReview(lastRealRecognition);
    setHumanSpeech(text, true, function () {
      realReviewBusy = false;
      afterRealReviewSpoken();
    });
  } catch (e) {
    realReviewBusy = false;
    console.warn('[studio] 实物拍摄失败', e);
    setHumanSpeech('这张没拍住。你对着饽饽再来一次确定。', true, function () {
      startRealReviewCamera();
    });
  }
}

function explainRealFolk() {
  if (humanPhase === 'idle') return;
  const text = buildFolkTalk(lastRealRecognition);
  setStatus('正在讲解民俗寓意');
  setHumanSpeech(text, true, function () {
    if (humanPhase === 'idle') return;
    setHumanActions('realFollowup');
  });
}

function setupHumanInteraction() {
  const startBtn = document.getElementById('btn-human-start');
  const digitalBtn = document.getElementById('btn-human-digital');
  const realBtn = document.getElementById('btn-human-real');
  const continueBtn = document.getElementById('btn-human-continue');
  const endBtn = document.getElementById('btn-human-end');
  const folkBtn = document.getElementById('btn-human-folk');
  const realEndBtn = document.getElementById('btn-human-real-end');
  const confirmCam = document.getElementById('btn-real-cam-confirm');
  const cancelCam = document.getElementById('btn-real-cam-cancel');
  if (startBtn) startBtn.addEventListener('click', startHumanSession);
  if (digitalBtn) digitalBtn.addEventListener('click', reviewDigitalWork);
  if (realBtn) realBtn.addEventListener('click', startRealReviewCamera);
  if (continueBtn) {
    continueBtn.addEventListener('click', function () {
      stopHumanSpeech();
      clearRealFreeze();
      setHumanActions('choose');
      setStatus('请选择点评数字版或真实实物');
    });
  }
  if (endBtn) endBtn.addEventListener('click', resetHumanIdle);
  if (folkBtn) folkBtn.addEventListener('click', explainRealFolk);
  if (realEndBtn) realEndBtn.addEventListener('click', resetHumanIdle);
  if (confirmCam) confirmCam.addEventListener('click', confirmRealReviewShot);
  if (cancelCam) cancelCam.addEventListener('click', cancelRealReviewCamera);
  if (window.speechSynthesis) {
    ensureHumanVoice();
    window.speechSynthesis.onvoiceschanged = function () {
      ensureHumanVoice();
    };
  }
  resetHumanIdle();
}

const interactPointer = new THREE.Vector2();
const interactRaycaster = new THREE.Raycaster();
const interactRight = new THREE.Vector3();
const interactForward = new THREE.Vector3();
const LONG_PRESS_MS = 220;
const DRAG_START_PX = 8;
const MODEL_SCALE_STEP = 1.12;

let interactDrag = null;
let interactPressTimer = 0;
let interactPressStart = null;
let pinchState = null;
let orbitWasEnabled = true;

function eventClientPos(e, index) {
  if (e.touches && e.touches.length) {
    const t = e.touches[index || 0];
    return { x: t.clientX, y: t.clientY };
  }
  if (e.changedTouches && e.changedTouches.length) {
    const t = e.changedTouches[index || 0];
    return { x: t.clientX, y: t.clientY };
  }
  return { x: e.clientX, y: e.clientY };
}

function setInteractPointer(e, index) {
  const rect = canvas.getBoundingClientRect();
  const p = eventClientPos(e, index);
  interactPointer.x = ((p.x - rect.left) / rect.width) * 2 - 1;
  interactPointer.y = -((p.y - rect.top) / rect.height) * 2 + 1;
}

function findLoadedRecordFromObject(obj) {
  let cur = obj;
  while (cur) {
    for (let i = 0; i < loadedModels.length; i++) {
      const rec = loadedModels[i];
      if (rec.wrapper === cur || rec.mesh === cur) return rec;
    }
    cur = cur.parent;
  }
  return null;
}

function hitLoadedModelAtEvent(e) {
  if (!camera || !loadedModels.length) return null;
  setInteractPointer(e, 0);
  interactRaycaster.setFromCamera(interactPointer, camera);
  const meshes = [];
  loadedModels.forEach(function (rec) {
    rec.wrapper.traverse(function (child) {
      if (child.isMesh) meshes.push(child);
    });
  });
  const hits = interactRaycaster.intersectObjects(meshes, true);
  if (!hits.length) return null;
  const rec = findLoadedRecordFromObject(hits[0].object);
  if (!rec) return null;
  return { rec: rec, point: hits[0].point };
}

function setOrbitEnabled(on) {
  if (!controls) return;
  controls.enabled = on;
}

function beginModelTranslate(rec, hitPoint, clientX, clientY, vertical) {
  setActiveInstance(rec.instanceId);
  setOrbitEnabled(false);
  interactDrag = {
    rec: rec,
    startX: clientX,
    startY: clientY,
    startPos: rec.wrapper.position.clone(),
    grabY: rec.wrapper.position.y,
    vertical: !!vertical,
    moving: true
  };
  if (viewport) viewport.classList.add('is-model-drag');
  setStatus('平移「' + rec.name + '」· 左右/前后/上下' + (vertical ? '（已锁定上下）' : ''));
}

function applyModelTranslate(e) {
  if (!interactDrag || !interactDrag.rec) return;
  const rec = interactDrag.rec;
  const p = eventClientPos(e, 0);
  const shift = !!(e.shiftKey || interactDrag.vertical);
  const dx = p.x - interactDrag.startX;
  const dy = p.y - interactDrag.startY;
  const gain = 0.008;

  camera.getWorldDirection(interactForward);
  interactForward.y = 0;
  if (interactForward.lengthSq() < 0.0001) interactForward.set(0, 0, 1);
  interactForward.normalize();
  interactRight.set(-interactForward.z, 0, interactForward.x).normalize();

  rec.wrapper.position.copy(interactDrag.startPos);
  if (shift) {
    rec.wrapper.position.y = interactDrag.grabY - dy * gain;
  } else {
    rec.wrapper.position.x =
      interactDrag.startPos.x + interactRight.x * dx * gain + interactForward.x * dy * gain;
    rec.wrapper.position.z =
      interactDrag.startPos.z + interactRight.z * dx * gain + interactForward.z * dy * gain;
    rec.wrapper.position.y = interactDrag.grabY - dy * gain * 0.35;
  }
  clampInstanceTransform(rec.wrapper);
}

function endModelTranslate() {
  if (interactPressTimer) {
    clearTimeout(interactPressTimer);
    interactPressTimer = 0;
  }
  interactPressStart = null;
  if (interactDrag) {
    interactDrag = null;
    if (viewport) viewport.classList.remove('is-model-drag');
    setOrbitEnabled(true);
  }
}

function pinchDistance(e) {
  if (!e.touches || e.touches.length < 2) return 0;
  return Math.hypot(
    e.touches[0].clientX - e.touches[1].clientX,
    e.touches[0].clientY - e.touches[1].clientY
  );
}

function startPinch(e) {
  const hit = hitLoadedModelAtEvent(e);
  const rec = (hit && hit.rec) || getActiveLoadedModel();
  if (!rec) return;
  setActiveInstance(rec.instanceId);
  orbitWasEnabled = controls ? controls.enabled : true;
  setOrbitEnabled(false);
  if (controls) controls.enableZoom = false;
  pinchState = {
    rec: rec,
    startDist: pinchDistance(e),
    startScale: rec.wrapper.scale.x
  };
  setStatus('双指缩放「' + rec.name + '」');
}

function movePinch(e) {
  if (!pinchState || !pinchState.startDist) return;
  const dist = pinchDistance(e);
  if (!dist) return;
  const factor = dist / pinchState.startDist;
  const s = pinchState.startScale * factor;
  pinchState.rec.wrapper.scale.setScalar(s);
  clampInstanceTransform(pinchState.rec.wrapper);
}

function endPinch() {
  if (!pinchState) return;
  pinchState = null;
  if (controls) controls.enableZoom = true;
  setOrbitEnabled(true);
}

function setupSceneInteraction() {
  if (!canvas) return;

  const scaleBtns = document.querySelector('.studio-scale-btns');
  const up = document.getElementById('btn-model-scale-up');
  const down = document.getElementById('btn-model-scale-down');
  const rotateX = document.getElementById('btn-model-rotate-x');
  const rotateY = document.getElementById('btn-model-rotate-y');
  const rotateZ = document.getElementById('btn-model-rotate-z');
  if (scaleBtns) {
    scaleBtns.addEventListener('pointerdown', function (e) {
      e.stopPropagation();
    });
  }
  if (up) {
    up.addEventListener('click', function (e) {
      e.stopPropagation();
      applyModelScale(MODEL_SCALE_STEP);
    });
  }
  if (down) {
    down.addEventListener('click', function (e) {
      e.stopPropagation();
      applyModelScale(1 / MODEL_SCALE_STEP);
    });
  }
  if (rotateX) {
    rotateX.addEventListener('click', function (e) {
      e.stopPropagation();
      applyModelRotation('x');
    });
  }
  if (rotateY) {
    rotateY.addEventListener('click', function (e) {
      e.stopPropagation();
      applyModelRotation('y');
    });
  }
  if (rotateZ) {
    rotateZ.addEventListener('click', function (e) {
      e.stopPropagation();
      applyModelRotation('z');
    });
  }

  canvas.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'touch') return;
    if (e.button !== 0) return;
    const hit = hitLoadedModelAtEvent(e);
    if (!hit) return;
    interactPressStart = {
      rec: hit.rec,
      point: hit.point.clone(),
      x: e.clientX,
      y: e.clientY,
      shift: e.shiftKey
    };
    interactPressTimer = window.setTimeout(function () {
      if (!interactPressStart) return;
      beginModelTranslate(
        interactPressStart.rec,
        interactPressStart.point,
        interactPressStart.x,
        interactPressStart.y,
        interactPressStart.shift
      );
    }, LONG_PRESS_MS);
  });

  canvas.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    if (interactDrag && interactDrag.moving) {
      e.preventDefault();
      applyModelTranslate(e);
      return;
    }
    if (interactPressStart) {
      const dist = Math.hypot(e.clientX - interactPressStart.x, e.clientY - interactPressStart.y);
      if (dist > DRAG_START_PX) {
        if (interactPressTimer) {
          clearTimeout(interactPressTimer);
          interactPressTimer = 0;
        }
        beginModelTranslate(
          interactPressStart.rec,
          interactPressStart.point,
          interactPressStart.x,
          interactPressStart.y,
          e.shiftKey || interactPressStart.shift
        );
        interactPressStart = null;
        applyModelTranslate(e);
      }
    }
  });

  window.addEventListener('pointerup', function () {
    if (interactPressStart && !interactDrag) {
      setActiveInstance(interactPressStart.rec.instanceId);
    }
    endModelTranslate();
  });
  window.addEventListener('pointercancel', endModelTranslate);

  canvas.addEventListener(
    'touchstart',
    function (e) {
      if (e.touches.length >= 2) {
        e.preventDefault();
        endModelTranslate();
        startPinch(e);
        return;
      }
      const hit = hitLoadedModelAtEvent(e);
      if (!hit) return;
      const p = eventClientPos(e, 0);
      interactPressStart = {
        rec: hit.rec,
        point: hit.point.clone(),
        x: p.x,
        y: p.y,
        shift: false
      };
      interactPressTimer = window.setTimeout(function () {
        if (!interactPressStart) return;
        beginModelTranslate(
          interactPressStart.rec,
          interactPressStart.point,
          interactPressStart.x,
          interactPressStart.y,
          false
        );
      }, LONG_PRESS_MS);
    },
    { passive: false }
  );

  canvas.addEventListener(
    'touchmove',
    function (e) {
      if (e.touches.length >= 2) {
        e.preventDefault();
        if (!pinchState) startPinch(e);
        else movePinch(e);
        return;
      }
      if (interactDrag && interactDrag.moving) {
        e.preventDefault();
        applyModelTranslate(e);
        return;
      }
      if (interactPressStart) {
        const p = eventClientPos(e, 0);
        const dist = Math.hypot(p.x - interactPressStart.x, p.y - interactPressStart.y);
        if (dist > DRAG_START_PX) {
          if (interactPressTimer) {
            clearTimeout(interactPressTimer);
            interactPressTimer = 0;
          }
          beginModelTranslate(
            interactPressStart.rec,
            interactPressStart.point,
            interactPressStart.x,
            interactPressStart.y,
            false
          );
          interactPressStart = null;
          applyModelTranslate(e);
        }
      }
    },
    { passive: false }
  );

  canvas.addEventListener('touchend', function (e) {
    if (e.touches.length < 2) endPinch();
    if (e.touches.length === 0) {
      if (interactPressStart && !interactDrag) {
        setActiveInstance(interactPressStart.rec.instanceId);
      }
      endModelTranslate();
    }
  });
  canvas.addEventListener('touchcancel', function () {
    endPinch();
    endModelTranslate();
  });
}

function setupLibraryDrop() {
  if (!viewport) return;
  ['dragenter', 'dragover'].forEach(function (type) {
    viewport.addEventListener(type, function (e) {
      if (!e.dataTransfer) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      viewport.classList.add('is-drop-target');
    });
  });
  viewport.addEventListener('dragleave', function (e) {
    if (!viewport.contains(e.relatedTarget)) {
      viewport.classList.remove('is-drop-target');
    }
  });
  viewport.addEventListener('drop', function (e) {
    e.preventDefault();
    viewport.classList.remove('is-drop-target');
    const id =
      (e.dataTransfer && e.dataTransfer.getData('application/x-zhijiansu-model')) ||
      (e.dataTransfer && e.dataTransfer.getData('text/plain')) ||
      '';
    const entry = findLibraryEntry(id);
    if (entry && entry.enabled) {
      addStudioModel(entry).then(function () {
        if (humanPhase !== 'idle' && humanSpeechEl && !humanSpeechEl.hidden) {
          humanSpeechEl.textContent = '「' + entry.name + '」已放到案板上。需要点评时选「点评数字版花饽饽」。';
        }
      });
    }
  });
}

document.getElementById('btn-export-toggle').addEventListener('click', () => {
  positionExportMenu();
  exportMenu.classList.toggle('is-open');
});

exportMenu.querySelectorAll('button').forEach((btn) => {
  btn.addEventListener('click', () => {
    exportMenu.classList.remove('is-open');
    if (btn.dataset.format === 'glb') exportGLB();
    if (btn.dataset.format === 'stl') exportSTL();
  });
});

document.getElementById('btn-ar').addEventListener('click', startAR);

document.addEventListener('click', (e) => {
  if (!exportMenu.contains(e.target) && e.target.id !== 'btn-export-toggle' && !e.target.closest('#btn-export-toggle')) {
    exportMenu.classList.remove('is-open');
  }
});

async function boot() {
  MODEL_CATEGORIES = await fetchCategories();
  modelLibrarySig = categoryListSignature(MODEL_CATEGORIES);
  MODEL_LIBRARY = BUILTIN_MODELS.slice();
  buildCategoryList();
  buildColorPalette();
  initScene();
  buildLoadedModelList();
  setupLibraryDrop();
  setupLibraryDialog();
  setupHumanInteraction();
  setInterval(refreshModelLibrary, 8000);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') refreshModelLibrary();
  });
  window.addEventListener('focus', refreshModelLibrary);
  const editId = typeof ZJS !== 'undefined' ? ZJS.getQuery('edit') : null;
  if (editId) {
    await loadWorkForEdit(editId);
  } else {
    setStatus('从右侧选择分类，把花饽饽拖到中间案板');
  }
  setupSaveShareUI();
  refreshLucide();
}

if (canRunStudio()) {
  boot();
}
