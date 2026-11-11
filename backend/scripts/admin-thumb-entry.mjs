import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

function disposeObject3D(obj) {
  if (!obj) return;
  obj.traverse(function (child) {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) child.material.forEach(function (m) { m.dispose(); });
      else child.material.dispose();
    }
  });
}

function waitFrame() {
  return new Promise(function (resolve) {
    requestAnimationFrame(function () {
      requestAnimationFrame(resolve);
    });
  });
}

function canvasToPngBlob(canvas) {
  return new Promise(function (resolve, reject) {
    try {
      var dataUrl = canvas.toDataURL('image/png');
      var match = dataUrl.match(/^data:image\/png;base64,(.+)$/);
      if (!match) {
        reject(new Error('缩略图导出失败'));
        return;
      }
      var binary = atob(match[1]);
      var len = binary.length;
      var arr = new Uint8Array(len);
      for (var i = 0; i < len; i++) arr[i] = binary.charCodeAt(i);
      resolve(new Blob([arr], { type: 'image/png' }));
    } catch (err) {
      canvas.toBlob(
        function (b) {
          if (b && b.size) resolve(b);
          else reject(err || new Error('缩略图导出失败'));
        },
        'image/png',
        0.92
      );
    }
  });
}

async function generateModelThumbnailFromGlb(file, size) {
  size = size || 320;
  var url = URL.createObjectURL(file);
  var renderer;
  var scene;
  var holder;
  try {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf3ebe0);

    var camera = new THREE.PerspectiveCamera(38, 1, 0.01, 200);
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setSize(size, size, false);
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0xf3ebe0, 1);

    holder = document.createElement('div');
    holder.setAttribute('aria-hidden', 'true');
    holder.style.cssText =
      'position:fixed;left:-9999px;top:0;width:' + size + 'px;height:' + size + 'px;overflow:hidden;pointer-events:none;opacity:0;';
    holder.appendChild(renderer.domElement);
    document.body.appendChild(holder);

    scene.add(new THREE.AmbientLight(0xffffff, 0.78));
    var key = new THREE.DirectionalLight(0xfff4e8, 1.05);
    key.position.set(2.4, 4.2, 3.2);
    scene.add(key);
    var fill = new THREE.DirectionalLight(0xb8c4d4, 0.48);
    fill.position.set(-2.4, 1.4, -2.2);
    scene.add(fill);
    var rim = new THREE.DirectionalLight(0xffffff, 0.28);
    rim.position.set(0, 3, -4);
    scene.add(rim);

    var loader = new GLTFLoader();
    loader.setCrossOrigin('anonymous');
    var gltf = await loader.loadAsync(url);
    var model = gltf.scene;
    model.updateMatrixWorld(true);
    model.traverse(function (child) {
      if (child.isMesh) {
        child.frustumCulled = false;
        child.castShadow = false;
        child.receiveShadow = false;
        var mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(function (mat) {
          if (!mat) return;
          mat.side = THREE.DoubleSide;
          if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
        });
      }
    });

    var box = new THREE.Box3().setFromObject(model);
    if (box.isEmpty()) {
      throw new Error('模型几何为空，无法生成缩略图');
    }
    var sizeVec = box.getSize(new THREE.Vector3());
    var maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z, 0.001);
    model.scale.setScalar(1.6 / maxDim);
    model.updateMatrixWorld(true);
    box.setFromObject(model);
    var center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    model.updateMatrixWorld(true);
    scene.add(model);

    var sphere = new THREE.Box3().setFromObject(model).getBoundingSphere(new THREE.Sphere());
    var fov = (camera.fov * Math.PI) / 180;
    var dist = (sphere.radius / Math.sin(fov / 2)) * 1.22;
    camera.position.set(dist * 0.72, dist * 0.48, dist * 0.92);
    camera.near = Math.max(dist / 100, 0.01);
    camera.far = dist * 20;
    camera.updateProjectionMatrix();
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    await waitFrame();
    renderer.render(scene, camera);

    var blob = await canvasToPngBlob(renderer.domElement);
    if (!blob || !blob.size) throw new Error('缩略图为空');
    return blob;
  } finally {
    URL.revokeObjectURL(url);
    if (holder && holder.parentNode) holder.parentNode.removeChild(holder);
    if (renderer) {
      renderer.dispose();
      var gl = renderer.getContext && renderer.getContext();
      var lose = gl && gl.getExtension && gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    }
    if (scene) disposeObject3D(scene);
  }
}

globalThis.AdminModelThumb = {
  ready: true,
  error: null,
  bootPromise: null,
  generateModelThumbnailFromGlb: generateModelThumbnailFromGlb
};
