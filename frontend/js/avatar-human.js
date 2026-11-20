/**
 * 指间塑 — 数字人实时姿态引擎
 *
 * 模型来自后台「数字人管理」当前启用项，前端不内置默认模型。
 * 模型需 Mixamo 兼容骨骼（允许 mixamorig: 前缀），且没有动画轨道/口型 morph，
 * 因此动作全部由本模块过程化生成。
 *
 * 方案：
 *   1. 手臂用「世界方向瞄准」——直接指定上臂 / 前臂要指向哪里，
 *      比调欧拉角直观，也不受 T-pose 绑定姿态影响；
 *   2. 脊柱 / 头 / 颈用骨骼局部欧拉小角度叠加在静止姿态上；
 *   3. 状态之间按指数平滑过渡（TAU），切换不会跳帧；
 *   4. 挥手 / 点头做成带包络的一次性手势，可叠在任意状态之上。
 *
 * 用法：
 *   const avatar = createHumanAvatar({ canvas, modelUrl });
 *   await avatar.ready;
 *   avatar.setState('thinking' | 'speaking' | 'idle');
 *   avatar.gesture('wave' | 'nod');
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const DEG = Math.PI / 180;
const UP = new THREE.Vector3(0, 1, 0);

/** 取景：胯部到头顶上方留白，挥手时指尖（最高 1.68m）也不会被裁掉 */
const FRAME_TOP = 1.90;
const FRAME_BOTTOM = 0.52;
/** 取景最小可视宽度（米），窄面板时不至于把人裁掉手臂 */
const FRAME_MIN_WIDTH = 0.92;

/** 骨骼名归一化：Mixamo 允许 mixamorig: / Armature| 前缀，也兼容常见 Blender 命名 */
const BONE_ALIASES = {
  hips: 'hips',
  hip: 'hips',
  pelvis: 'hips',

  spine: 'spine',
  spine0: 'spine',

  spine1: 'spine1',
  spine01: 'spine1',
  spine001: 'spine1',

  spine2: 'spine2',
  spine02: 'spine2',
  spine002: 'spine2',
  chest: 'spine2',
  upperchest: 'spine2',

  neck: 'neck',
  head: 'head',

  leftshoulder: 'shoulderL',
  lshoulder: 'shoulderL',
  shoulderl: 'shoulderL',
  claviclel: 'shoulderL',
  leftclavicle: 'shoulderL',

  rightshoulder: 'shoulderR',
  rshoulder: 'shoulderR',
  shoulderr: 'shoulderR',
  clavicler: 'shoulderR',
  rightclavicle: 'shoulderR',

  leftarm: 'armL',
  leftupperarm: 'armL',
  upperarml: 'armL',
  lupperarm: 'armL',
  arml: 'armL',
  larm: 'armL',

  rightarm: 'armR',
  rightupperarm: 'armR',
  upperarmr: 'armR',
  rupperarm: 'armR',
  armr: 'armR',
  rarm: 'armR',

  leftforearm: 'foreL',
  leftlowerarm: 'foreL',
  lowerarml: 'foreL',
  lforearm: 'foreL',
  forearml: 'foreL',

  rightforearm: 'foreR',
  rightlowerarm: 'foreR',
  lowerarmr: 'foreR',
  rforearm: 'foreR',
  forearmr: 'foreR',

  lefthand: 'handL',
  lhand: 'handL',
  handl: 'handL',
  leftwrist: 'handL',

  righthand: 'handR',
  rhand: 'handR',
  handr: 'handR',
  rightwrist: 'handR'
};

const BONE_KEYS = [
  'hips',
  'spine',
  'spine1',
  'spine2',
  'neck',
  'head',
  'shoulderL',
  'shoulderR',
  'armL',
  'armR',
  'foreL',
  'foreR',
  'handL',
  'handR'
];

const REQUIRED_BONES = [
  'hips',
  'spine',
  'spine1',
  'spine2',
  'neck',
  'head',
  'armL',
  'armR',
  'foreL',
  'foreR'
];

function canonicalBoneKey(name) {
  const raw = String(name || '')
    .split(/[:|/]/)
    .pop()
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
  return BONE_ALIASES[raw] || '';
}

/** A-pose 基准：手臂方向（世界坐标，角色面朝 +Z，左手在 +X） */
const A_L = [0.34, -1, 0.06];
const A_R = [-0.34, -1, 0.06];
const F_L = [0.12, -1, 0.14];
const F_R = [-0.12, -1, 0.14];

/** 状态平滑时间常数（秒），越小切换越快 */
const TAU = 0.14;
/** 渲染帧率上限，小面板没必要跑满 60 */
const MAX_FPS = 30;

const STATES = {
  idle: true,
  thinking: true,
  speaking: true,
  listening: true
};

/* ---------- 小工具 ---------- */

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smoothstep(edge0, edge1, x) {
  const span = edge1 - edge0;
  const t = clamp01(span === 0 ? (x >= edge1 ? 1 : 0) : (x - edge0) / span);
  return t * t * (3 - 2 * t);
}

function set3(arr, x, y, z) {
  arr[0] = x;
  arr[1] = y;
  arr[2] = z;
}

function useStatePose() {
  return {
    hips: [0, 0, 0],
    spine: [0, 0, 0],
    spine1: [0, 0, 0],
    spine2: [0, 0, 0],
    neck: [0, 0, 0],
    head: [0, 0, 0],
    armL: A_L.slice(),
    armR: A_R.slice(),
    foreL: F_L.slice(),
    foreR: F_R.slice(),
    twistL: 0,
    twistR: 0
  };
}

/** 把 base 姿势重置成静止基准（每个状态函数开头调用） */
function resetPose(p) {
  set3(p.hips, 0, 0, 0);
  set3(p.spine, 0, 0, 0);
  set3(p.spine1, 0, 0, 0);
  set3(p.spine2, 0, 0, 0);
  set3(p.neck, 0, 0, 0);
  set3(p.head, 0, 0, 0);
  set3(p.armL, A_L[0], A_L[1], A_L[2]);
  set3(p.armR, A_R[0], A_R[1], A_R[2]);
  set3(p.foreL, F_L[0], F_L[1], F_L[2]);
  set3(p.foreR, F_R[0], F_R[1], F_R[2]);
  p.twistL = 0;
  p.twistR = 0;
}

function lerpPose(from, to, k) {
  for (let i = 0; i < 3; i++) {
    from.hips[i] += (to.hips[i] - from.hips[i]) * k;
    from.spine[i] += (to.spine[i] - from.spine[i]) * k;
    from.spine1[i] += (to.spine1[i] - from.spine1[i]) * k;
    from.spine2[i] += (to.spine2[i] - from.spine2[i]) * k;
    from.neck[i] += (to.neck[i] - from.neck[i]) * k;
    from.head[i] += (to.head[i] - from.head[i]) * k;
    from.armL[i] += (to.armL[i] - from.armL[i]) * k;
    from.armR[i] += (to.armR[i] - from.armR[i]) * k;
    from.foreL[i] += (to.foreL[i] - from.foreL[i]) * k;
    from.foreR[i] += (to.foreR[i] - from.foreR[i]) * k;
  }
  from.twistL += (to.twistL - from.twistL) * k;
  from.twistR += (to.twistR - from.twistR) * k;
}

/** out = mix(out, pose, w)：手势叠加用 */
function mixPose(out, pose, w) {
  if (w <= 0) return;
  for (let i = 0; i < 3; i++) {
    out.hips[i] += (pose.hips[i] - out.hips[i]) * w;
    out.spine[i] += (pose.spine[i] - out.spine[i]) * w;
    out.spine1[i] += (pose.spine1[i] - out.spine1[i]) * w;
    out.spine2[i] += (pose.spine2[i] - out.spine2[i]) * w;
    out.neck[i] += (pose.neck[i] - out.neck[i]) * w;
    out.head[i] += (pose.head[i] - out.head[i]) * w;
    out.armL[i] += (pose.armL[i] - out.armL[i]) * w;
    out.armR[i] += (pose.armR[i] - out.armR[i]) * w;
    out.foreL[i] += (pose.foreL[i] - out.foreL[i]) * w;
    out.foreR[i] += (pose.foreR[i] - out.foreR[i]) * w;
  }
  out.twistL += (pose.twistL - out.twistL) * w;
  out.twistR += (pose.twistR - out.twistR) * w;
}

function copyPose(dst, src) {
  lerpPose(dst, src, 1);
}

/* ---------- 各状态的过程化姿势 ---------- */

/** 等待：呼吸 + 重心微晃 + 轻微环顾 */
function poseIdle(p, t) {
  resetPose(p);
  const breath = Math.sin(t * 1.5);
  const sway = Math.sin(t * 0.42);
  p.spine1[0] = 0.5 + 0.9 * breath;
  p.spine2[0] = 0.8 * breath;
  p.spine[2] = 0.45 * sway;
  p.spine1[2] = 0.35 * sway;
  p.neck[0] = -0.6 * breath;
  p.head[0] = -1.2 + 0.7 * Math.sin(t * 0.73 + 1.1);
  p.head[1] = 1.8 * Math.sin(t * 0.31);
  p.head[2] = -1.0 * sway + 0.8;
  p.armL[0] += 0.025 * Math.sin(t * 0.9);
  p.armR[0] -= 0.025 * Math.sin(t * 0.9 + 0.6);
  p.foreL[2] += 0.02 * Math.sin(t * 0.67);
  p.foreR[2] -= 0.02 * Math.sin(t * 0.67 + 0.4);
}

/** 思考：歪头、略低头，右手抬到下巴附近 */
function poseThinking(p, t) {
  resetPose(p);
  const breath = Math.sin(t * 1.35);
  p.spine1[0] = 1.6 + 0.6 * breath;
  p.spine2[0] = 0.4 * breath;
  p.spine2[1] = -3.0;
  p.neck[1] = 4.0;
  p.head[0] = -5.5 + 1.2 * Math.sin(t * 0.9);
  p.head[1] = 5.0;
  p.head[2] = 8.5 + 1.0 * Math.sin(t * 0.62);
  set3(p.armR, -0.52, -0.72, 0.30);
  set3(p.foreR, 0.62, 0.76, 0.24);
  p.twistR = -12;
  p.armL[0] += 0.02 * breath;
}

/** 说话：点头（多频叠加模拟语句节奏）+ 身前手势比划 */
function poseSpeaking(p, t) {
  resetPose(p);
  const env = 0.55 + 0.45 * Math.sin(t * 1.15);
  const nod = Math.sin(t * 6.1) * 0.62 + Math.sin(t * 9.7 + 0.8) * 0.28;
  const g1 = Math.sin(t * 1.9);
  const g2 = Math.sin(t * 2.9 + 0.9);
  p.spine1[0] = 1.2 + 0.8 * Math.sin(t * 2.6);
  p.spine2[0] = 0.5 * Math.sin(t * 2.6 + 0.4);
  p.spine[2] = 0.5 * Math.sin(t * 0.9);
  p.neck[0] = 1.2 + 1.4 * nod * env;
  p.head[0] = -2.6 + 2.0 * nod * env;
  p.head[1] = 3.2 * Math.sin(t * 0.57);
  p.head[2] = 1.2 + 1.6 * Math.sin(t * 0.83 + 0.5);
  // 肘落在腰侧、小臂前抬外摊、掌心朝上（掌心朝向由前臂扭转角决定，实测 -120°）
  set3(p.armR, -0.26 - 0.03 * g1, -1, 0.02);
  set3(p.foreR, -0.62 - 0.04 * g1, 0.34 + 0.05 * g1, 0.70 + 0.05 * g1);
  p.twistR = -120;
  set3(p.armL, 0.26 + 0.03 * g2, -1, 0.02);
  set3(p.foreL, 0.62 + 0.04 * g2, 0.34 + 0.05 * g2, 0.70 + 0.05 * g2);
  p.twistL = 120;
}

/** 倾听：比等待更静，偶尔点头 */
function poseListening(p, t) {
  poseIdle(p, t);
  const beat = Math.max(0, Math.sin(t * 1.05));
  p.head[0] += -3.2 * Math.pow(beat, 6);
  p.head[1] += 3.0;
  p.spine2[1] = 1.5;
}

const STATE_FNS = {
  idle: poseIdle,
  thinking: poseThinking,
  speaking: poseSpeaking,
  listening: poseListening
};

/* ---------- 一次性手势 ---------- */

/** 打招呼挥手：右臂抬到侧平举，前臂竖起摆动 3 下 */
function poseWave(p, tau) {
  resetPose(p);
  const osc = Math.sin(tau * Math.PI * 2 * 1.55);
  set3(p.armR, -0.92, -0.10 + 0.06 * osc, 0.14);
  set3(p.foreR, -0.08 + 0.36 * osc, 1.0, 0.12);
  p.twistR = -10;
  p.spine2[1] = -4.0;
  p.neck[1] = 3.0;
  p.head[1] = 4.5;
  p.head[2] = 5.0;
  p.head[0] = -1.5 + 1.5 * Math.sin(tau * 3.2);
  p.armL[0] += 0.03;
}

const WAVE_DURATION = 2.7;

/** 点头应答：两下，用于「确认 / 认同」 */
function poseNod(p, tau) {
  resetPose(p);
  const env = Math.sin(Math.PI * clamp01(tau / 1.15));
  const nod = Math.sin(tau * Math.PI * 2 * 1.85);
  p.head[0] = -1.0 + 11 * nod * env;
  p.neck[0] = 4 * nod * env;
  p.spine1[0] = 1.0 * env;
}

const NOD_DURATION = 1.15;

const GESTURES = {
  wave: { pose: poseWave, duration: WAVE_DURATION, in: 0.45, out: 0.55 },
  nod: { pose: poseNod, duration: NOD_DURATION, in: 0.12, out: 0.25 }
};

/* ---------- 主入口 ---------- */

export function createHumanAvatar(options) {
  const opts = options || {};
  const canvas = opts.canvas;
  const modelUrl = opts.modelUrl || '';

  const api = {
    ready: null,
    isReady: false,
    canvas: canvas,
    setState: setState,
    gesture: gesture,
    clearGestures: clearGestures,
    setPaused: setPaused,
    dispose: dispose,
    resize: resize
  };

  if (!canvas || !modelUrl) {
    api.setState = function () {};
    api.gesture = function () {};
    api.clearGestures = function () {};
    api.setPaused = function () {};
    api.dispose = function () {};
    api.resize = function () {};
    api.ready = Promise.resolve(false);
    return api;
  }

  let renderer = null;
  let scene = null;
  let camera = null;
  let root = null;
  const bones = {};
  let boneByKey = Object.create(null);
  const restQuat = new WeakMap();
  let rafId = 0;
  let lastFrame = 0;
  let clock = 0;
  let paused = false;
  let disposed = false;
  let wantState = 'idle';
  let sizedW = 0;
  let sizedH = 0;
  const gestures = [];

  const target = useStatePose();
  const smooth = useStatePose();
  const gesturePose = useStatePose();

  // 复用临时对象，避免每帧产生垃圾
  const _euler = new THREE.Euler();
  const _quat = new THREE.Quaternion();
  const _quatTwist = new THREE.Quaternion();
  const _worldQuat = new THREE.Quaternion();
  const _dir = new THREE.Vector3();

  function setState(name) {
    if (!STATES[name]) return;
    wantState = name;
  }

  function gesture(name) {
    const def = GESTURES[name];
    if (!def) return;
    gestures.push({ def: def, t: 0 });
    if (gestures.length > 3) gestures.splice(0, gestures.length - 3);
  }

  /** 立刻中断所有一次性手势（例如挥手还没收完就开始新一轮点评） */
  function clearGestures() {
    gestures.length = 0;
  }

  function setPaused(on) {
    paused = !!on;
    lastFrame = 0;
  }

  function resize() {
    if (!renderer || disposed) return;
    const w = Math.round(canvas.clientWidth);
    const h = Math.round(canvas.clientHeight);
    if (w <= 1 || h <= 1) return;
    if (w === sizedW && h === sizedH) return;
    sizedW = w;
    sizedH = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    frameCamera();
    camera.updateProjectionMatrix();
  }

  function frameCamera() {
    const vExtent = FRAME_TOP - FRAME_BOTTOM;
    const centerY = (FRAME_TOP + FRAME_BOTTOM) / 2;
    const halfFov = (camera.fov * DEG) / 2;
    const distV = vExtent / 2 / Math.tan(halfFov);
    const visibleWidth = vExtent * camera.aspect;
    const distH = visibleWidth >= FRAME_MIN_WIDTH
      ? 0
      : FRAME_MIN_WIDTH / 2 / (Math.tan(halfFov) * camera.aspect);
    const dist = Math.max(distV, distH);
    camera.position.set(0, centerY + 0.10, dist);
    camera.lookAt(0, centerY + 0.02, 0);
  }

  /** 不同 GLB 的身高/单位/原点不一致：统一缩放到 1.8m，脚底落地，水平居中 */
  function fitHumanModel() {
    if (!root) return;
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3());
    const height = Math.max(size.y, 0.001);
    root.scale.multiplyScalar(1.8 / height);
    root.updateMatrixWorld(true);
    box.setFromObject(root);
    root.position.y -= box.min.y;
    root.position.x -= (box.min.x + box.max.x) / 2;
    root.position.z -= (box.min.z + box.max.z) / 2;
    root.updateMatrixWorld(true);
  }

  /** 按归一化后的骨骼名建立索引，兼容 mixamorig: / Armature| 等前缀 */
  function indexBones() {
    boneByKey = Object.create(null);
    root.traverse(function (child) {
      if (child.isBone || child.type === 'Bone') {
        const key = canonicalBoneKey(child.name);
        if (key && !boneByKey[key]) boneByKey[key] = child;
      }
    });
  }

  /** 欧拉小角度叠加：局部 rest * euler */
  function applyEuler(bone, deg) {
    if (!bone) return;
    if (!deg[0] && !deg[1] && !deg[2]) {
      bone.quaternion.copy(restQuat.get(bone));
      return;
    }
    _euler.set(deg[0] * DEG, deg[1] * DEG, deg[2] * DEG, 'XYZ');
    bone.quaternion.copy(restQuat.get(bone)).multiply(_quat.setFromEuler(_euler));
  }

  /** 世界方向瞄准：让骨骼自身 +Y 轴对准 dir（世界坐标） */
  function applyAim(bone, dir, twistDeg) {
    if (!bone) return;
    const rest = restQuat.get(bone);
    bone.quaternion.copy(rest);
    // 父级可能刚被摆过姿态，先刷新到世界矩阵
    bone.updateWorldMatrix(true, false);
    bone.getWorldQuaternion(_worldQuat);
    _dir.set(dir[0], dir[1], dir[2]);
    if (_dir.lengthSq() < 1e-8) return;
    _dir.applyQuaternion(_worldQuat.invert()).normalize();
    _quat.setFromUnitVectors(UP, _dir);
    if (twistDeg) {
      _quat.multiply(_quatTwist.setFromAxisAngle(UP, twistDeg * DEG));
    }
    bone.quaternion.copy(rest).multiply(_quat);
  }

  function applyPose(p) {
    applyEuler(bones.hips, p.hips);
    applyEuler(bones.spine, p.spine);
    applyEuler(bones.spine1, p.spine1);
    applyEuler(bones.spine2, p.spine2);
    applyEuler(bones.neck, p.neck);
    applyEuler(bones.head, p.head);
    applyAim(bones.armL, p.armL, p.twistL);
    applyAim(bones.foreL, p.foreL, p.twistL);
    applyAim(bones.armR, p.armR, p.twistR);
    applyAim(bones.foreR, p.foreR, p.twistR);
  }

  function updateGestures(dt) {
    for (let i = gestures.length - 1; i >= 0; i--) {
      gestures[i].t += dt;
      if (gestures[i].t >= gestures[i].def.duration) gestures.splice(i, 1);
    }
  }

  /** 状态姿势 + 手势叠加 → target */
  function buildTarget(t) {
    const fn = STATE_FNS[wantState] || poseIdle;
    fn(target, t);
    for (let i = 0; i < gestures.length; i++) {
      const g = gestures[i];
      const def = g.def;
      const weight = smoothstep(0, def.in, g.t) * (1 - smoothstep(def.duration - def.out, def.duration, g.t));
      if (weight <= 0.001) continue;
      def.pose(gesturePose, g.t);
      mixPose(target, gesturePose, weight);
    }
  }

  function tick(now) {
    if (disposed) return;
    rafId = requestAnimationFrame(tick);
    if (paused) return;
    if (document.visibilityState === 'hidden') return;
    if (lastFrame && now - lastFrame < 1000 / MAX_FPS - 1) return;
    const dt = lastFrame ? Math.min(0.1, (now - lastFrame) / 1000) : 0.016;
    lastFrame = now;
    clock += dt;

    updateGestures(dt);
    buildTarget(clock);
    lerpPose(smooth, target, 1 - Math.exp(-dt / TAU));
    applyPose(smooth);

    resize();
    renderer.render(scene, camera);
  }

  function onResize() {
    resize();
  }

  function load() {
    return new Promise(function (resolve) {
      let gltfLoader;
      try {
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(30, 0.8, 0.1, 20);
        renderer = new THREE.WebGLRenderer({
          canvas: canvas,
          alpha: true,
          antialias: true,
          powerPreference: 'low-power'
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor(0x000000, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
      } catch (e) {
        console.warn('[avatar] WebGL 初始化失败，返回 false 由调用方处理', e);
        resolve(false);
        return;
      }

      // 模型以贴图自发光为主，灯光只影响将来的 PBR 版本
      scene.add(new THREE.AmbientLight(0xffffff, 1.4));
      const hemi = new THREE.HemisphereLight(0xffffff, 0xa89880, 1.1);
      scene.add(hemi);
      const key = new THREE.DirectionalLight(0xfff4e8, 1.1);
      key.position.set(1.6, 2.6, 2.4);
      scene.add(key);

      gltfLoader = new GLTFLoader();
      gltfLoader.load(
        modelUrl,
        function (gltf) {
          root = gltf.scene;
          root.traverse(function (child) {
            if (child.isMesh) {
              child.frustumCulled = false;
              const mats = Array.isArray(child.material) ? child.material : [child.material];
              mats.forEach(function (mat) {
                if (!mat) return;
                mat.side = THREE.DoubleSide;
                mat.toneMapped = false;
              });
            }
          });
          scene.add(root);
          fitHumanModel();
          indexBones();

          const missing = REQUIRED_BONES.filter(function (key) {
            return !boneByKey[key];
          });
          if (missing.length) {
            console.warn('[avatar] 骨骼不兼容，缺少：' + missing.join(', '));
            dispose();
            resolve(false);
            return;
          }

          BONE_KEYS.forEach(function (key) {
            bones[key] = boneByKey[key] || null;
          });
          root.traverse(function (child) {
            if (child.isBone || child.type === 'Bone') restQuat.set(child, child.quaternion.clone());
          });
          Object.keys(bones).forEach(function (key) {
            const bone = bones[key];
            if (bone && !restQuat.has(bone)) restQuat.set(bone, bone.quaternion.clone());
          });

          copyPose(smooth, target);
          applyPose(smooth);
          resize();

          if (window.ResizeObserver) {
            resizeObserver = new ResizeObserver(onResize);
            resizeObserver.observe(canvas);
          } else {
            window.addEventListener('resize', onResize);
          }
          document.addEventListener('visibilitychange', onVisibility);
          lastFrame = 0;
          rafId = requestAnimationFrame(tick);
          api.isReady = true;
          resolve(true);
        },
        undefined,
        function (err) {
          console.warn('[avatar] 数字人模型加载失败，返回 false', err);
          dispose();
          resolve(false);
        }
      );
    });
  }

  let resizeObserver = null;

  function onVisibility() {
    lastFrame = 0;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    } else {
      window.removeEventListener('resize', onResize);
    }
    document.removeEventListener('visibilitychange', onVisibility);
    if (root) {
      scene.remove(root);
      root.traverse(function (child) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach(function (m) {
            if (!m) return;
            // 贴图挂在 map / normalMap / roughnessMap 等不同槽位，统一扫一遍
            Object.keys(m).forEach(function (key) {
              const value = m[key];
              if (value && value.isTexture) value.dispose();
            });
            m.dispose();
          });
        }
      });
      root = null;
    }
    if (renderer) {
      renderer.dispose();
      const gl = renderer.getContext && renderer.getContext();
      const lose = gl && gl.getExtension && gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
      renderer = null;
    }
  }

  api.ready = load();
  // 调试 / 自动标定用：拿到骨骼对象直接读世界坐标
  if (opts.debug) api.bones = bones;
  return api;
}
