/**
 * 生成模块①完整中国地图 SVG（全国省份底图 + 六省可点击）
 * 运行: node scripts/build-china-map-svg.js
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const TARGET = {
  620000: { id: 'gansu', name: '甘肃' },
  610000: { id: 'shaanxi', name: '陕西' },
  140000: { id: 'shanxi', name: '山西' },
  130000: { id: 'hebei', name: '河北' },
  410000: { id: 'henan', name: '河南' },
  370000: { id: 'shandong', name: '山东', sublabel: '胶东' }
};

const W = 900;
const H = 780;
const PAD = 36;

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
  const geo = await get('https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json');
  const items = [];

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const f of geo.features) {
    const adcode = f.properties && f.properties.adcode;
    if (!adcode || adcode === 100000) continue;
    const ring = mainRing(f.geometry);
    if (!ring.length) continue;
    const isTarget = TARGET[adcode];
    const simplified = simplifyRing(ring, isTarget ? 140 : 80);
    simplified.forEach(([x, y]) => {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    });
    items.push({
      adcode,
      name: (f.properties.name || '').replace(/省|市|自治区|特别行政区|壮族|回族|维吾尔/g, ''),
      ring: simplified,
      target: isTarget
    });
  }

  const bw = maxX - minX;
  const bh = maxY - minY;
  const scale = Math.min((W - PAD * 2) / bw, (H - PAD * 2) / bh);
  const tx = PAD - minX * scale + (W - PAD * 2 - bw * scale) / 2;
  const ty = PAD + (H - PAD * 2 - bh * scale) / 2;
  const tr = (x, y) => [x * scale + tx, ty + (maxY - y) * scale];

  let cMinX = Infinity;
  let cMinY = Infinity;
  let cMaxX = -Infinity;
  let cMaxY = -Infinity;
  const trackRing = (ring) => {
    ring.forEach(([px, py]) => {
      cMinX = Math.min(cMinX, px);
      cMinY = Math.min(cMinY, py);
      cMaxX = Math.max(cMaxX, px);
      cMaxY = Math.max(cMaxY, py);
    });
  };

  const tightPad = 8;
  const vbX = () => cMinX - tightPad;
  const vbY = () => cMinY - tightPad;
  const vbW = () => cMaxX - cMinX + tightPad * 2;
  const vbH = () => cMaxY - cMinY + tightPad * 2;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" id="china-bun-map">\n`;
  svg += `<defs><filter id="region-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>\n`;
  svg += `<rect class="map-ocean" width="${W}" height="${H}" rx="24"/>\n`;
  svg += `<g class="map-china-bg" aria-hidden="true">\n`;

  items
    .filter((it) => !it.target)
    .sort((a, b) => ringArea(b.ring) - ringArea(a.ring))
    .forEach((it) => {
      const ring = it.ring.map(([x, y]) => tr(x, y));
      trackRing(ring);
      svg += `  <path class="map-bg-province" data-adcode="${it.adcode}" d="${ringToPath(ring)}"/>\n`;
    });

  svg += `</g>\n`;
  svg += `<g class="map-china-frame" aria-hidden="true">\n`;
  items
    .sort((a, b) => ringArea(a.ring) - ringArea(b.ring))
    .forEach((it) => {
      const ring = it.ring.map(([x, y]) => tr(x, y));
      trackRing(ring);
      svg += `  <path class="map-frame-stroke" d="${ringToPath(ring)}"/>\n`;
    });
  svg += `</g>\n`;

  const targetOrder = [620000, 140000, 610000, 130000, 410000, 370000];
  targetOrder.forEach((adcode) => {
    const meta = TARGET[adcode];
    const it = items.find((x) => x.adcode === adcode);
    if (!it || !meta) return;
    const ring = it.ring.map(([x, y]) => tr(x, y));
    trackRing(ring);
    const [cx, cy] = tr(...centroid(it.ring));
    const core = meta.id === 'shandong' ? ' map-region--core' : '';
    svg += `<g class="map-region${core}" data-region="${meta.id}" role="button" tabindex="0" aria-label="${meta.name}">\n`;
    svg += `  <path class="region-shape" d="${ringToPath(ring)}"/>\n`;
    svg += `  <text class="region-label" x="${cx.toFixed(1)}" y="${(cy + (meta.sublabel ? -8 : 4)).toFixed(1)}" text-anchor="middle">${meta.name}</text>\n`;
    if (meta.sublabel) {
      svg += `  <text class="region-sublabel" x="${cx.toFixed(1)}" y="${(cy + 10).toFixed(1)}" text-anchor="middle">${meta.sublabel}</text>\n`;
    }
    svg += `</g>\n`;
  });

  svg += `</svg>\n`;

  const vx = vbX();
  const vy = vbY();
  const vw = vbW();
  const vh = vbH();
  svg = svg.replace(
    /viewBox="0 0 900 780"/,
    `viewBox="${vx.toFixed(1)} ${vy.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}"`
  );
  svg = svg.replace(
    /<rect class="map-ocean" width="900" height="780" rx="24"\/>/,
    `<rect class="map-ocean" x="${vx.toFixed(1)}" y="${vy.toFixed(1)}" width="${vw.toFixed(1)}" height="${vh.toFixed(1)}" rx="16"/>`
  );

  const outDir = path.join(__dirname, '../images');
  fs.writeFileSync(path.join(outDir, 'china-map-full.svg'), svg);
  console.log('Wrote china-map-full.svg', svg.length, 'bytes', items.length, 'regions');
})();
