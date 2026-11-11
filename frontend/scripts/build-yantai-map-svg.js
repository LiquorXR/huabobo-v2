/**
 * 生成模块② 烟台市完整区县 SVG
 * 运行: node scripts/build-yantai-map-svg.js
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

/** adcode → huayang-yantai.js 中的 data-district */
const TARGET = {
  370602: { id: 'zhifu', name: '芝罘区' },
  370611: { id: 'fushan', name: '福山区' },
  370612: { id: 'muping', name: '牟平区' },
  370613: { id: 'laishan', name: '莱山区' },
  370614: { id: 'penglai', name: '蓬莱区' },
  370681: { id: 'longkou', name: '龙口市' },
  370682: { id: 'laiyang', name: '莱阳市' },
  370683: { id: 'laizhou', name: '莱州市' },
  370685: { id: 'zhaoyuan', name: '招远市' },
  370686: { id: 'qixia', name: '栖霞市' },
  370687: { id: 'haiyang', name: '海阳市' }
};

const W = 820;
const H = 720;
const PAD = 40;

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

function ringsFromGeom(geom) {
  const out = [];
  if (!geom) return out;
  if (geom.type === 'Polygon') out.push(geom.coordinates[0]);
  else if (geom.type === 'MultiPolygon') geom.coordinates.forEach((p) => out.push(p[0]));
  return out;
}

function ringArea(ring) {
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return Math.abs(a) / 2;
}

function mainRing(geom) {
  const rings = ringsFromGeom(geom);
  return rings.sort((a, b) => ringArea(b) - ringArea(a))[0] || [];
}

function simplifyRing(ring, maxPts) {
  if (ring.length <= maxPts) return ring;
  const step = Math.ceil(ring.length / maxPts);
  const s = [];
  for (let i = 0; i < ring.length; i += step) s.push(ring[i]);
  const last = ring[ring.length - 1];
  if (s[s.length - 1][0] !== last[0] || s[s.length - 1][1] !== last[1]) s.push(last);
  return s;
}

function ringToPath(ring) {
  return (
    ring.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') + ' Z'
  );
}

function centroid(ring) {
  let x = 0;
  let y = 0;
  ring.forEach((p) => {
    x += p[0];
    y += p[1];
  });
  return [x / ring.length, y / ring.length];
}

(async () => {
  const geo = await get('https://geo.datav.aliyun.com/areas_v3/bound/370600_full.json');
  const items = [];

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const f of geo.features) {
    const adcode = f.properties && f.properties.adcode;
    const meta = TARGET[adcode];
    if (!meta) continue;
    const ring = simplifyRing(mainRing(f.geometry), 120);
    if (!ring.length) continue;
    ring.forEach(([x, y]) => {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    });
    items.push({ adcode, meta, ring });
  }

  if (items.length !== 11) {
    console.warn('Expected 11 districts, got', items.length);
  }

  const bw = maxX - minX;
  const bh = maxY - minY;
  const scale = Math.min((W - PAD * 2) / bw, (H - PAD * 2) / bh);
  const tx = PAD - minX * scale + (W - PAD * 2 - bw * scale) / 2;
  const ty = PAD + (H - PAD * 2 - bh * scale) / 2;
  const tr = (x, y) => [x * scale + tx, ty + (maxY - y) * scale];

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" id="yantai-bun-map">\n`;
  svg += `<defs><filter id="yantai-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>\n`;
  svg += `<rect class="yantai-ocean" width="${W}" height="${H}" rx="24"/>\n`;

  svg += `<g class="yantai-land-base" aria-hidden="true">\n`;
  items.forEach((it) => {
    const ring = it.ring.map(([x, y]) => tr(x, y));
    svg += `  <path class="yantai-land-fill" d="${ringToPath(ring)}"/>\n`;
  });
  svg += `</g>\n`;

  svg += `<g class="yantai-frame" aria-hidden="true">\n`;
  items.forEach((it) => {
    const ring = it.ring.map(([x, y]) => tr(x, y));
    svg += `  <path class="yantai-frame-stroke" d="${ringToPath(ring)}"/>\n`;
  });
  svg += `</g>\n`;

  items.forEach((it) => {
    const ring = it.ring.map(([x, y]) => tr(x, y));
    const [cx, cy] = tr(...centroid(it.ring));
    const labelSize = it.meta.name.length > 3 ? 11 : 12;
    svg += `<g class="yantai-district" data-district="${it.meta.id}" role="button" tabindex="0" aria-label="${it.meta.name}">\n`;
    svg += `  <path class="district-shape" d="${ringToPath(ring)}"/>\n`;
    svg += `  <text class="district-label" x="${cx.toFixed(1)}" y="${(cy + 4).toFixed(1)}" text-anchor="middle" font-size="${labelSize}">${it.meta.name}</text>\n`;
    svg += `</g>\n`;
  });

  svg += `</svg>\n`;

  const outPath = path.join(__dirname, '../images/yantai-map-full.svg');
  fs.writeFileSync(outPath, svg);
  console.log('Wrote', outPath, svg.length, 'bytes', items.length, 'districts');
})();
