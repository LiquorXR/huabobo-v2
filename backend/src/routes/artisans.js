const express = require('express');
const Artisan = require('../models/Artisan');
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

function markArtisanModified(doc) {
  doc.markModified('portfolio');
  doc.markModified('contact');
  doc.markModified('wechat');
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
  const o = doc.toJSON ? doc.toJSON() : doc;
  const base = {
    id: o.id,
    name: o.name,
    title: o.title,
    bio: o.bio,
    image: publicUrl(storedUploadPath(o.image) || o.image),
    tags: o.tags || [],
    sortOrder: o.sortOrder
  };
  if (!detailed) return base;
  return Object.assign(base, {
    imagePath: storedUploadPath(o.image) || o.image || '',
    wechatQrPath: storedUploadPath(o.wechat && o.wechat.qr) || (o.wechat && o.wechat.qr) || '',
    portfolio: mapPortfolio(o.portfolio),
    contact: mapContact(o.contact),
    wechat: mapWechat(o.wechat)
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
  if (body.tags !== undefined) doc.tags = parseTags(body.tags);

  if (body.portfolio !== undefined) {
    doc.portfolio = parsePortfolio(body.portfolio, files);
  }

  doc.contact = doc.contact || {};
  if (body.contactShopName !== undefined) doc.contact.shopName = body.contactShopName;
  if (body.contactAddress !== undefined) doc.contact.address = body.contactAddress;
  if (body.contactHours !== undefined) doc.contact.hours = body.contactHours;
  if (body.contactMain !== undefined) doc.contact.main = body.contactMain;
  if (body.contactNote !== undefined) doc.contact.note = body.contactNote;
  if (body.contactPhone !== undefined) doc.contact.phone = body.contactPhone;

  doc.wechat = doc.wechat || {};
  if (body.wechatId !== undefined) doc.wechat.id = body.wechatId;
  if (body.wechatTip !== undefined) doc.wechat.tip = body.wechatTip;

  if (files && files.wechatQr && files.wechatQr[0]) {
    doc.wechat.qr = '/uploads/artisans/wechat/' + files.wechatQr[0].filename;
  } else if (body.wechatQrKeep !== undefined && body.wechatQrKeep !== '') {
    doc.wechat.qr = storedUploadPath(body.wechatQrKeep);
  }

  if (files && files.image && files.image[0]) {
    doc.image = '/uploads/artisans/' + files.image[0].filename;
  } else if (body.imageKeep !== undefined && body.imageKeep !== '') {
    doc.image = storedUploadPath(body.imageKeep);
  }
}

/** GET /api/artisans — 合作艺人列表（公开） */
router.get(
  '/',
  asyncHandler(async function (_req, res) {
    const items = await Artisan.find().sort({ sortOrder: 1, createdAt: -1 });
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
  asyncHandler(async function (req, res) {
    const doc = await Artisan.findById(req.params.id);
    if (!doc) return res.status(404).json({ ok: false, message: '艺人不存在' });
    res.json({ ok: true, data: mapArtisan(doc, true) });
  })
);

const admin = express.Router();
admin.use(requireAdmin);
admin.use(requireDb);

function saveWithTimeout(doc, ms) {
  return Promise.race([
    doc.save(),
    new Promise(function (_resolve, reject) {
      setTimeout(function () {
        reject(new Error('数据库保存超时，请检查 MongoDB 是否正常'));
      }, ms || 15000);
    })
  ]);
}

/** POST /api/admin/artisans — 新增 */
admin.post(
  '/',
  uploadArtisanMiddleware,
  asyncHandler(async function (req, res) {
    const { name } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ ok: false, message: '姓名不能为空' });
    }
    const doc = new Artisan();
    applyArtisanFields(doc, req.body, req.files);
    if (!doc.image && req.body.image) doc.image = req.body.image;
    markArtisanModified(doc);
    await saveWithTimeout(doc);
    res.status(201).json({ ok: true, data: mapArtisan(doc, true) });
  })
);

/** PUT /api/admin/artisans/:id — 更新 */
admin.put(
  '/:id',
  uploadArtisanMiddleware,
  asyncHandler(async function (req, res) {
    const doc = await Artisan.findById(req.params.id);
    if (!doc) return res.status(404).json({ ok: false, message: '艺人不存在' });
    applyArtisanFields(doc, req.body, req.files);
    markArtisanModified(doc);
    await saveWithTimeout(doc);
    res.json({ ok: true, data: mapArtisan(doc, true) });
  })
);

/** POST /api/admin/artisans/:id — 更新（兼容部分环境 PUT 上传异常） */
admin.post(
  '/:id',
  uploadArtisanMiddleware,
  asyncHandler(async function (req, res) {
    const doc = await Artisan.findById(req.params.id);
    if (!doc) return res.status(404).json({ ok: false, message: '艺人不存在' });
    applyArtisanFields(doc, req.body, req.files);
    markArtisanModified(doc);
    await saveWithTimeout(doc);
    res.json({ ok: true, data: mapArtisan(doc, true) });
  })
);

/** DELETE /api/admin/artisans/:id */
admin.delete(
  '/:id',
  asyncHandler(async function (req, res) {
    const doc = await Artisan.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ ok: false, message: '艺人不存在' });
    res.json({ ok: true, message: '已删除' });
  })
);

module.exports = { publicRouter: router, adminRouter: admin };
