const express = require('express');
const AboutPage = require('../models/AboutPage');
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
  const o = doc.toJSON ? doc.toJSON() : doc;
  return {
    id: o.id,
    heroTitle: o.heroTitle,
    heroSubtitle: o.heroSubtitle,
    introTitle: o.introTitle,
    introText: o.introText,
    introImage: publicUrl(o.introImage),
    values: o.values || [],
    printSectionTitle: o.printSectionTitle,
    printSectionDesc: o.printSectionDesc,
    printWorks: (o.printWorks || []).slice(0, MAX_PRINT_WORKS).map(function (w) {
      return {
        title: w.title || '',
        desc: w.desc || '',
        image: publicUrl(w.image)
      };
    }),
    joinTitle: o.joinTitle,
    joinText: o.joinText,
    contact: {
      email: (o.contact && o.contact.email) || '',
      wechat: (o.contact && o.contact.wechat) || '',
      address: (o.contact && o.contact.address) || '',
      hours: (o.contact && o.contact.hours) || '',
      note: (o.contact && o.contact.note) || ''
    },
    updatedAt: o.updatedAt
  };
}

async function getOrCreateAbout() {
  let doc = await AboutPage.findOne({ key: ABOUT_KEY });
  if (!doc) {
    doc = await AboutPage.create(Object.assign({ key: ABOUT_KEY }, getDefaultAboutData()));
  }
  return doc;
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
    const doc = await getOrCreateAbout();
    const body = req.body || {};

    if (body.heroTitle !== undefined) doc.heroTitle = String(body.heroTitle).trim();
    if (body.heroSubtitle !== undefined) doc.heroSubtitle = String(body.heroSubtitle);
    if (body.introTitle !== undefined) doc.introTitle = String(body.introTitle).trim();
    if (body.introText !== undefined) doc.introText = String(body.introText);
    if (body.printSectionTitle !== undefined) doc.printSectionTitle = String(body.printSectionTitle).trim();
    if (body.printSectionDesc !== undefined) doc.printSectionDesc = String(body.printSectionDesc);
    if (body.joinTitle !== undefined) doc.joinTitle = String(body.joinTitle).trim();
    if (body.joinText !== undefined) doc.joinText = String(body.joinText);
    if (body.values !== undefined) doc.values = parseValues(body.values);

    if (body.contact !== undefined) {
      try {
        const c = typeof body.contact === 'string' ? JSON.parse(body.contact) : body.contact;
        doc.contact = doc.contact || {};
        if (c.email !== undefined) doc.contact.email = String(c.email).trim();
        if (c.wechat !== undefined) doc.contact.wechat = String(c.wechat).trim();
        if (c.address !== undefined) doc.contact.address = String(c.address).trim();
        if (c.hours !== undefined) doc.contact.hours = String(c.hours).trim();
        if (c.note !== undefined) doc.contact.note = String(c.note);
      } catch (e2) {
        return res.status(400).json({ ok: false, message: '联系方式格式错误' });
      }
    }

    if (req.files && req.files.introImage && req.files.introImage[0]) {
      doc.introImage = '/uploads/about/' + req.files.introImage[0].filename;
    } else if (body.introImageKeep !== undefined) {
      doc.introImage = normalizeAssetPath(body.introImageKeep);
    }

    if (body.printWorks !== undefined) {
      var parsed = parsePrintWorks(body);
      var uploads = (req.files && req.files.printWorkImages) || [];
      var uploadIdx = 0;
      doc.printWorks = parsed.map(function (w) {
        var image = normalizeAssetPath(w.image || '');
        if (w.hasNewFile && uploads[uploadIdx]) {
          image = '/uploads/about/works/' + uploads[uploadIdx].filename;
          uploadIdx += 1;
        }
        return { title: w.title, desc: w.desc, image: image };
      });
    }

    await doc.save();
    res.json({ ok: true, data: mapAbout(doc) });
  })
);

module.exports = { publicRouter: router, adminRouter: admin };
