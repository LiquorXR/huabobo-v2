const express = require('express');
const { eq } = require('drizzle-orm');
const dbm = require('../db/client');
const { newId, nowMs, parseJsonArray, parseJsonObject, stringifyJson } = require('../db/helpers');
const { requireAdmin } = require('../middleware/auth');
const requireDb = require('../middleware/requireDb');
const { uploadAboutFiles } = require('../middleware/upload');
const asyncHandler = require('../utils/asyncHandler');
const { publicUrl } = require('../utils/url');
const { getDefaultAboutData } = require('../constants/aboutDefaults');

const router = express.Router();
const ABOUT_KEY = 'main';
const MAX_PRINT_WORKS = 5;

function mapAbout(doc) {
  if (!doc) return null;
  const contact = parseJsonObject(doc.contact);
  return {
    id: doc.id,
    heroTitle: doc.heroTitle,
    heroSubtitle: doc.heroSubtitle,
    introTitle: doc.introTitle,
    introText: doc.introText,
    introImage: publicUrl(doc.introImage),
    values: parseJsonArray(doc.values),
    printSectionTitle: doc.printSectionTitle,
    printSectionDesc: doc.printSectionDesc,
    printWorks: parseJsonArray(doc.printWorks)
      .slice(0, MAX_PRINT_WORKS)
      .map(function (w) {
        return {
          title: w.title || '',
          desc: w.desc || '',
          image: publicUrl(w.image)
        };
      }),
    joinTitle: doc.joinTitle,
    joinText: doc.joinText,
    contact: {
      email: (contact && contact.email) || '',
      wechat: (contact && contact.wechat) || '',
      address: (contact && contact.address) || '',
      hours: (contact && contact.hours) || '',
      note: (contact && contact.note) || ''
    },
    updatedAt: doc.updatedAt
  };
}

async function getOrCreateAbout() {
  const { aboutPages } = dbm.schema;
  const rows = await dbm.db.select().from(aboutPages).where(eq(aboutPages.key, ABOUT_KEY)).limit(1);
  if (rows[0]) return rows[0];
  const now = nowMs();
  const defaults = getDefaultAboutData();
  const row = {
    id: newId(),
    key: ABOUT_KEY,
    heroTitle: defaults.heroTitle || '',
    heroSubtitle: defaults.heroSubtitle || '',
    introTitle: defaults.introTitle || '',
    introText: defaults.introText || '',
    introImage: defaults.introImage || '',
    values: stringifyJson(defaults.values || []),
    printSectionTitle: defaults.printSectionTitle || '',
    printSectionDesc: defaults.printSectionDesc || '',
    printWorks: stringifyJson((defaults.printWorks || []).slice(0, MAX_PRINT_WORKS)),
    joinTitle: defaults.joinTitle || '',
    joinText: defaults.joinText || '',
    contact: stringifyJson(defaults.contact || {}),
    createdAt: now,
    updatedAt: now
  };
  await dbm.db.insert(aboutPages).values(row);
  return row;
}

function normalizeAssetPath(raw) {
  if (!raw) return '';
  var s = String(raw).trim();
  var ui = s.indexOf('/uploads/');
  if (ui >= 0) return s.slice(ui);
  var ii = s.indexOf('/images/');
  if (ii >= 0) return s.slice(ii);
  if (/^uploads\//.test(s)) return '/' + s;
  if (/^images\//.test(s)) return s;
  return s;
}

function parseValues(raw) {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (!raw) return [];
  return String(raw)
    .split(/[,，]/)
    .map(function (s) {
      return s.trim();
    })
    .filter(Boolean);
}

function parsePrintWorks(body) {
  if (!body.printWorks) return [];
  try {
    var list = typeof body.printWorks === 'string' ? JSON.parse(body.printWorks) : body.printWorks;
    if (!Array.isArray(list)) return [];
    return list.slice(0, MAX_PRINT_WORKS).map(function (w) {
      return {
        title: (w && w.title) || '',
        desc: (w && w.desc) || '',
        image: normalizeAssetPath((w && w.image) || ''),
        hasNewFile: !!(w && w.hasNewFile)
      };
    });
  } catch (e) {
    return [];
  }
}

/** GET /api/about — 关于我们（公开） */
router.get(
  '/',
  requireDb,
  asyncHandler(async function (_req, res) {
    const doc = await getOrCreateAbout();
    res.json({ ok: true, data: mapAbout(doc) });
  })
);

const admin = express.Router();
admin.use(requireAdmin);
admin.use(requireDb);

/** GET /api/admin/about */
admin.get(
  '/',
  asyncHandler(async function (_req, res) {
    const doc = await getOrCreateAbout();
    res.json({ ok: true, data: mapAbout(doc) });
  })
);

/** PUT /api/admin/about — 保存关于我们 */
admin.put(
  '/',
  function (req, res, next) {
    uploadAboutFiles(req, res, function (err) {
      if (err) {
        return res.status(400).json({ ok: false, message: err.message || '上传失败' });
      }
      next();
    });
  },
  asyncHandler(async function (req, res) {
    const { aboutPages } = dbm.schema;
    const doc = await getOrCreateAbout();
    const body = req.body || {};
    const patch = { updatedAt: nowMs() };

    if (body.heroTitle !== undefined) patch.heroTitle = String(body.heroTitle).trim();
    if (body.heroSubtitle !== undefined) patch.heroSubtitle = String(body.heroSubtitle);
    if (body.introTitle !== undefined) patch.introTitle = String(body.introTitle).trim();
    if (body.introText !== undefined) patch.introText = String(body.introText);
    if (body.printSectionTitle !== undefined) patch.printSectionTitle = String(body.printSectionTitle).trim();
    if (body.printSectionDesc !== undefined) patch.printSectionDesc = String(body.printSectionDesc);
    if (body.joinTitle !== undefined) patch.joinTitle = String(body.joinTitle).trim();
    if (body.joinText !== undefined) patch.joinText = String(body.joinText);
    if (body.values !== undefined) patch.values = stringifyJson(parseValues(body.values));

    if (body.contact !== undefined) {
      try {
        const c = typeof body.contact === 'string' ? JSON.parse(body.contact) : body.contact;
        const contact = parseJsonObject(doc.contact);
        if (c.email !== undefined) contact.email = String(c.email).trim();
        if (c.wechat !== undefined) contact.wechat = String(c.wechat).trim();
        if (c.address !== undefined) contact.address = String(c.address).trim();
        if (c.hours !== undefined) contact.hours = String(c.hours).trim();
        if (c.note !== undefined) contact.note = String(c.note);
        patch.contact = stringifyJson(contact);
      } catch (e2) {
        return res.status(400).json({ ok: false, message: '联系方式格式错误' });
      }
    }

    if (req.files && req.files.introImage && req.files.introImage[0]) {
      patch.introImage = '/uploads/about/' + req.files.introImage[0].filename;
    } else if (body.introImageKeep !== undefined) {
      patch.introImage = normalizeAssetPath(body.introImageKeep);
    }

    if (body.printWorks !== undefined) {
      var parsed = parsePrintWorks(body);
      var uploads = (req.files && req.files.printWorkImages) || [];
      var uploadIdx = 0;
      patch.printWorks = stringifyJson(
        parsed.map(function (w) {
          var image = normalizeAssetPath(w.image || '');
          if (w.hasNewFile && uploads[uploadIdx]) {
            image = '/uploads/about/works/' + uploads[uploadIdx].filename;
            uploadIdx += 1;
          }
          return { title: w.title, desc: w.desc, image: image };
        })
      );
    }

    await dbm.db.update(aboutPages).set(patch).where(eq(aboutPages.id, doc.id));
    res.json({ ok: true, data: mapAbout(Object.assign({}, doc, patch)) });
  })
);

module.exports = { publicRouter: router, adminRouter: admin };
