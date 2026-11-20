const fs = require('fs');

/**
 * GLB 骨骼检查：只读文件头 + JSON chunk，不把整份模型读进内存。
 * 数字人必须使用 Mixamo 兼容骨骼命名（允许 mixamorig: / Armature| 前缀）。
 */
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

function canonicalBoneKey(name) {
  const raw = String(name || '')
    .split(/[:|/]/)
    .pop()
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
  return BONE_ALIASES[raw] || '';
}

function readGlbJson(filePath) {
  const headerSize = 20;
  const fd = fs.openSync(filePath, 'r');
  try {
    const header = Buffer.alloc(headerSize);
    const headerRead = fs.readSync(fd, header, 0, headerSize, 0);
    if (headerRead < headerSize) {
      throw new Error('模型文件不完整');
    }
    if (header.toString('ascii', 0, 4) !== 'glTF') {
      throw new Error('不是有效的 GLB 文件');
    }
    const version = header.readUInt32LE(4);
    if (version !== 2) {
      throw new Error('仅支持 glTF 2.0 的 GLB 文件');
    }
    const jsonLength = header.readUInt32LE(12);
    const jsonType = header.toString('ascii', 16, 20);
    if (jsonType !== 'JSON') {
      throw new Error('GLB 缺少 JSON 数据块');
    }
    if (!jsonLength || jsonLength > 8 * 1024 * 1024) {
      throw new Error('GLB JSON 数据块异常');
    }
    const jsonBuffer = Buffer.alloc(jsonLength);
    const jsonRead = fs.readSync(fd, jsonBuffer, 0, jsonLength, headerSize);
    if (jsonRead < jsonLength) {
      throw new Error('GLB JSON 数据块不完整');
    }
    let text = jsonBuffer.toString('utf8').replace(/^\uFEFF/, '');
    text = text.replace(/\u0000+$/g, '').trim();
    return { version, json: JSON.parse(text) };
  } finally {
    fs.closeSync(fd);
  }
}

function inspectGlbFile(filePath) {
  const parsed = readGlbJson(filePath);
  const json = parsed.json || {};
  const nodes = Array.isArray(json.nodes) ? json.nodes : [];
  const skins = Array.isArray(json.skins) ? json.skins : [];

  if (!skins.length) {
    const err = new Error('模型未绑定骨骼：请在 Blender/3ds Max 中完成骨骼绑定后再导出 GLB');
    err.status = 400;
    throw err;
  }

  const boneNames = [];
  const seen = Object.create(null);
  skins.forEach(function (skin) {
    const joints = Array.isArray(skin && skin.joints) ? skin.joints : [];
    joints.forEach(function (index) {
      const node = nodes[index];
      const name = node && node.name ? String(node.name) : '';
      if (name && !seen[name]) {
        seen[name] = true;
        boneNames.push(name);
      }
    });
  });

  const canonical = Object.create(null);
  boneNames.forEach(function (name) {
    const key = canonicalBoneKey(name);
    if (key && !canonical[key]) canonical[key] = name;
  });

  const missing = REQUIRED_BONES.filter(function (key) {
    return !canonical[key];
  });

  return {
    version: parsed.version,
    boneCount: boneNames.length,
    boneNames: boneNames,
    canonicalBones: canonical,
    missing: missing,
    compatible: missing.length === 0
  };
}

module.exports = {
  REQUIRED_BONES,
  canonicalBoneKey,
  inspectGlbFile
};
