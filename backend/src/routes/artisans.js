const express = require('express');
const { eq, desc, asc } = require('drizzle-orm');
const dbm = require('../db/client');
const { newId, nowMs, parseJsonArray, parseJsonObject, stringifyJson } = require('../db/helpers');
const { requireAdmin } = require('../middleware/auth');
const requireDb = require('../middleware/requireDb');
const { uploadArtisanFiles } = require('../middleware/upload');
const asyncHandler = require('../utils/asyncHandler');
const { publicUrl } = require('../utils/url');

const router = express.Router();

function uploadArtisanMiddleware(req, res, next) {
  uploadArtisanFiles(req, res, function (err) {
    if (err) {
      var msg = err.message || '文件上传失败';
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        msg = '上传字段不匹配，请更新后台 upload.js、artisans.js 并重启 Node';
      }
      return res.status(400).json({ ok: false, message: msg });
    }
    next();
  });
}

function storedUploadPath(raw) {
  if (!raw) return '';
  var s = String(raw).trim();
  var i = s.indexOf('/uploads/');
  if (i >= 0) return s.slice(i);
  if (s.indexOf('/images/') === 0) return s.slice(1);
  return s;
}

function mapPortfolio(list) {
  return (list || []).map(function (p) {
    var stored = storedUploadPath(p.image);
    return {
      title: p.title || '',
      desc: p.desc || '',
      image: publicUrl(stored),
      imagePath: stored
    };
  });
}

function mapContact(c) {
  c = c || {};
  return {
    shopName: c.shopName || '',
    address: c.address || '',
    hours: c.hours || '',
    main: c.main || '',
    note: c.note || '',
    phone: c.phone || ''
  };
}

function mapWechat(w) {
  if (!w || (!w.id && !w.qr)) return null;
  return {
    id: w.id || '',
    tip: w.tip || '',
    qr: publicUrl(storedUploadPath(w.qr) || w.qr)
  };
}

function mapArtisan(doc, detailed) {
  if (!doc) return null;
  const portfolio = parseJsonArray(doc.portfolio);
  const contact = parseJsonObject(doc.contact);
  const wechat = parseJsonObject(doc.wechat, null);
  const base = {
    id: doc.id,
    name: doc.name,
    title: doc.title,
    bio: doc.bio,
    image: publicUrl(storedUploadPath(doc.image) || doc.image),
    tags: parseJsonArray(doc.tags),
    sortOrder: doc.sortOrder
  };
  if (!detailed) return base;
  return Object.assign(base, {
    imagePath: storedUploadPath(doc.image) || doc.image || '',
    wechatQrPath: storedUploadPath(wechat && wechat.qr) || (wechat && wechat.qr) || '',
    portfolio: mapPortfolio(portfolio),
    contact: mapContact(contact),
    wechat: mapWechat(wechat)
  });
}

function parseTags(raw) {
  if (!raw) return [];
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (e) {
    return String(raw)
      .split(/[,，]/)
      .map(function (t) {
        return t.trim();
      })
      .filter(Boolean);
  }
}

function parsePortfolio(raw, files) {
  var items = [];
  try {
    items = JSON.parse(raw || '[]');
  } catch (e) {
    items = [];
  }
  if (!Array.isArray(items)) items = [];
  var uploads = (files && files.portfolioImages) || [];
  var uploadIdx = 0;
  return items
    .map(function (item) {
      var image = storedUploadPath(item.image || '');
      if (item.newImage === '1' || item.newImage === true) {
        if (uploads[uploadIdx]) {
          image = '/uploads/artisans/works/' + uploads[uploadIdx].filename;
          uploadIdx += 1;
        }
      }
      return {
        title: String(item.title || '').trim(),
        desc: String(item.desc || '').trim(),
        image: image
      };
    })
    .filter(function (item) {
      return item.title || item.image;
    });
}

function applyArtisanFields(doc, body, files) {
  if (body.name) doc.name = String(body.name).trim();
  if (body.title !== undefined) doc.title = body.title;
  if (body.bio !== undefined) doc.bio = body.bio;
  if (body.sortOrder !== undefined) doc.sortOrder = parseInt(body.sortOrder, 10) || 0;
  if (body.tags !== undefined) doc.tags = stringifyJson(parseTags(body.tags));

  if (body.portfolio !== undefined) {
    doc.portfolio = stringifyJson(parsePortfolio(body.portfolio, files));
  }

  var contact = parseJsonObject(doc.contact);
  if (body.contactShopName !== undefined) contact.shopName = body.contactShopName;
  if (body.contactAddress !== undefined) contact.address = body.contactAddress;
  if (body.contactHours !== undefined) contact.hours = body.contactHours;
  if (body.contactMain !== undefined) contact.main = body.contactMain;
  if (body.contactNote !== undefined) contact.note = body.contactNote;
  if (body.contactPhone !== undefined) contact.phone = body.contactPhone;
  doc.contact = stringifyJson(contact);

  var wechat = parseJsonObject(doc.wechat);
  if (body.wechatId !== undefined) wechat.id = body.wechatId;
  if (body.wechatTip !== undefined) wechat.tip = body.wechatTip;

  if (files && files.wechatQr && files.wechatQr[0]) {
    wechat.qr = '/uploads/artisans/wechat/' + files.wechatQr[0].filename;
  } else if (body.wechatQrKeep !== undefined && body.wechatQrKeep !== '') {
    wechat.qr = storedUploadPath(body.wechatQrKeep);
  }
  doc.wechat = stringifyJson(wechat);

  if (files && files.image && files.image[0]) {
    doc.image = '/uploads/artisans/' + files.image[0].filename;
  } else if (body.imageKeep !== undefined && body.imageKeep !== '') {
    doc.image = storedUploadPath(body.imageKeep);
  }
  doc.updatedAt = nowMs();
  return doc;
}

/** GET /api/artisans — 合作艺人列表（公开） */
router.get(
  '/',
  requireDb,
  asyncHandler(async function (_req, res) {
    const { artisans } = dbm.schema;
    const items = await dbm.db
      .select()
      .from(artisans)
      .orderBy(asc(artisans.sortOrder), desc(artisans.createdAt));
    res.json({
      ok: true,
      data: items.map(function (doc) {
        return mapArtisan(doc, false);
      })
    });
  })
);

/** GET /api/artisans/:id — 详情（公开，含作品与联系方式） */
router.get(
  '/:id',
  requireDb,
  asyncHandler(async function (req, res) {
    const { artisans } = dbm.schema;
    const rows = await dbm.db.select().from(artisans).where(eq(artisans.id, req.params.id)).limit(1);
    const doc = rows[0];
    if (!doc) return res.status(404).json({ ok: false, message: '艺人不存在' });
    res.json({ ok: true, data: mapArtisan(doc, true) });
  })
);

const admin = express.Router();
admin.use(requireAdmin);
admin.use(requireDb);

/** POST /api/admin/artisans — 新增 */
admin.post(
  '/',
  uploadArtisanMiddleware,
  asyncHandler(async function (req, res) {
    const { name } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ ok: false, message: '姓名不能为空' });
    }
    const { artisans } = dbm.schema;
    const now = nowMs();
    const doc = {
      id: newId(),
      name: '',
      title: '',
      bio: '',
      image: '',
      tags: '[]',
      sortOrder: 0,
      portfolio: '[]',
      contact: '{}',
      wechat: '{}',
      createdAt: now,
      updatedAt: now
    };
    applyArtisanFields(doc, req.body, req.files);
    if (!doc.image && req.body.image) doc.image = req.body.image;
    await dbm.db.insert(artisans).values(doc);
    res.status(201).json({ ok: true, data: mapArtisan(doc, true) });
  })
);

/** PUT /api/admin/artisans/:id — 更新 */
admin.put(
  '/:id',
  uploadArtisanMiddleware,
  asyncHandler(async function (req, res) {
    const { artisans } = dbm.schema;
    const rows = await dbm.db
      .select()
      .from(artisans)
      .where(eq(artisans.id, req.params.id))
      .limit(1);
    const doc = rows[0];
    if (!doc) return res.status(404).json({ ok: false, message: '艺人不存在' });
    applyArtisanFields(doc, req.body, req.files);
    const { id, createdAt, ...patch } = doc;
    await dbm.db.update(artisans).set(patch).where(eq(artisans.id, id));
    res.json({ ok: true, data: mapArtisan(Object.assign({}, doc), true) });
  })
);

/** POST /api/admin/artisans/:id — 更新（兼容部分环境 PUT 上传异常） */
admin.post(
  '/:id',
  uploadArtisanMiddleware,
  asyncHandler(async function (req, res) {
    const { artisans } = dbm.schema;
    const rows = await dbm.db
      .select()
      .from(artisans)
      .where(eq(artisans.id, req.params.id))
      .limit(1);
    const doc = rows[0];
    if (!doc) return res.status(404).json({ ok: false, message: '艺人不存在' });
    applyArtisanFields(doc, req.body, req.files);
    const { id, createdAt, ...patch } = doc;
    await dbm.db.update(artisans).set(patch).where(eq(artisans.id, id));
    res.json({ ok: true, data: mapArtisan(Object.assign({}, doc), true) });
  })
);

/** DELETE /api/admin/artisans/:id */
admin.delete(
  '/:id',
  asyncHandler(async function (req, res) {
    const { artisans } = dbm.schema;
    const rows = await dbm.db
      .select()
      .from(artisans)
      .where(eq(artisans.id, req.params.id))
      .limit(1);
    if (!rows.length) return res.status(404).json({ ok: false, message: '艺人不存在' });
    await dbm.db.delete(artisans).where(eq(artisans.id, req.params.id));
    res.json({ ok: true, message: '已删除' });
  })
);

module.exports = { publicRouter: router, adminRouter: admin };
