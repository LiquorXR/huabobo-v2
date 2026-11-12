const express = require('express');
const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');

/**
 * 数字人 AI 链路（火山方舟 Ark，OpenAI 兼容接口；密钥只在服务端）
 * - POST /api/vision/identify  Body: { image: dataURL(jpeg/png) }
 *   → { ok:true, data:{ motif, craft, light } }（motif 为 8 个造型 id 之一）
 * - POST /api/review/text      Body: { context: { kind, motifs[], craft, light, extra? } }
 *   → { ok:true, data:{ text } }（可直接朗读的口播稿）
 * 任一环节失败返回非 ok，前端自动回退本地规则 + 本地话术。
 */
const router = express.Router();

const MOTIF_IDS = ['long', 'feng', 'yu', 'tao', 'lian', 'jubaopen', 'yuanbao', 'hua'];
const CRAFTS = ['fine', 'ok', 'soft'];
const LIGHTS = ['dim', 'harsh', 'good'];
const UPSTREAM_TIMEOUT_MS = 25000;
const MAX_IMAGE_CHARS = 8 * 1024 * 1024;
const MAX_CONTEXT_CHARS = 4000;
const MIN_INTERVAL_MS = 1500;

const lastHitByIp = new Map();
setInterval(function () {
  const cutoff = Date.now() - 5 * 60 * 1000;
  lastHitByIp.forEach(function (t, key) {
    if (t < cutoff) lastHitByIp.delete(key);
  });
}, 60 * 1000).unref();

function arkCfg() {
  return {
    apiKey: process.env.ARK_API_KEY || '',
    baseUrl: (process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/$/, ''),
    visionModel: process.env.ARK_VISION_MODEL || '',
    textModel: process.env.ARK_TEXT_MODEL || ''
  };
}

function throttle(req, res, tag) {
  const ip = req.ip || (req.connection && req.connection.remoteAddress) || 'unknown';
  const now = Date.now();
  if (now - (lastHitByIp.get(tag + ':' + ip) || 0) < MIN_INTERVAL_MS) {
    res.status(429).json({ ok: false, message: '请求太频繁' });
    return false;
  }
  lastHitByIp.set(tag + ':' + ip, now);
  return true;
}

function extractJson(text) {
  const s = String(text || '').trim();
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1].trim() : s;
  return JSON.parse(body);
}

async function arkChat(cfg, model, messages, maxTokens, temperature) {
  const controller = new AbortController();
  const timer = setTimeout(function () {
    controller.abort();
  }, UPSTREAM_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(cfg.baseUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + cfg.apiKey,
        'X-Request-Id': crypto.randomUUID()
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        max_tokens: maxTokens,
        temperature: temperature,
        response_format: { type: 'json_object' }
      }),
      signal: controller.signal
    });
  } catch (e) {
    clearTimeout(timer);
    const err = new Error('AI 服务连接失败');
    err.status = 502;
    throw err;
  }
  clearTimeout(timer);
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    const err = new Error('AI 服务返回异常');
    err.status = 502;
    throw err;
  }
  if (!res.ok) {
    const err = new Error((data && (data.message || data.error)) || 'AI 服务异常');
    err.status = 502;
    throw err;
  }
  const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!content || typeof content !== 'string') {
    const err = new Error('AI 服务无有效返回');
    err.status = 502;
    throw err;
  }
  return content;
}

const VISION_SYSTEM = [
  '你是胶东花饽饽造型识别器。只看图片，从以下 8 类里选出最像的 1 个：',
  'long=龙形饽饽（长条盘龙、有爪有须）；feng=凤形（禽鸟、有翅有冠）；yu=鱼形（鱼身鱼尾）；',
  'tao=寿桃形（圆润桃形、带桃尖）；lian=莲花/牡丹花形（层叠花瓣）；',
  'jubaopen=聚宝盆形（盆状、口大肚圆）；yuanbao=元宝形（两头翘、中间鼓）；',
  'hua=团花纹样（平面圆形花纹）。',
  '同时评估：craft 面纹路（fine=细腻清晰 / ok=一般 / soft=模糊）；light 光线（dim=偏暗 / harsh=过曝 / good=合适）。',
  '只输出纯 JSON，不要解释：{"motif":"<id>","craft":"<fine|ok|soft>","light":"<dim|harsh|good>"}。'
].join('\n');

router.post(
  '/vision/identify',
  asyncHandler(async function (req, res) {
    const image = String((req.body && req.body.image) || '');
    if (!image) {
      return res.status(400).json({ ok: false, message: '缺少图片' });
    }
    if (image.length > MAX_IMAGE_CHARS) {
      return res.status(400).json({ ok: false, message: '图片过大' });
    }
    if (!/^data:image\/(jpeg|png);base64,/i.test(image)) {
      return res.status(400).json({ ok: false, message: '仅支持 jpeg/png 图片' });
    }
    if (!throttle(req, res, 'vision')) return;
    const cfg = arkCfg();
    if (!cfg.apiKey || !cfg.visionModel) {
      return res.status(503).json({ ok: false, message: '识图服务未配置' });
    }
    const content = await arkChat(
      cfg,
      cfg.visionModel,
      [
        { role: 'system', content: VISION_SYSTEM },
        {
          role: 'user',
          content: [
            { type: 'text', text: '请识别这张面塑照片。' },
            { type: 'image_url', image_url: { url: image } }
          ]
        }
      ],
      200,
      0.1
    );
    let parsed;
    try {
      parsed = extractJson(content);
    } catch (e) {
      return res.status(502).json({ ok: false, message: '识别结果解析失败' });
    }
    if (!parsed || MOTIF_IDS.indexOf(parsed.motif) < 0) {
      return res.status(502).json({ ok: false, message: '识别结果无效' });
    }
    res.json({
      ok: true,
      data: {
        motif: parsed.motif,
        craft: CRAFTS.indexOf(parsed.craft) >= 0 ? parsed.craft : 'ok',
        light: LIGHTS.indexOf(parsed.light) >= 0 ? parsed.light : 'good'
      }
    });
  })
);

const REVIEW_SYSTEM = [
  '你是指间塑的 AI 非遗数字人「饽饽小匠」，一位热情实在、懂胶东花饽饽的老师傅。',
  '根据给定的造型识别结果，用第一人称口语点评，80-150 个字：先肯定一句，再点一个具体优点（造型/纹路/配色三选一），',
  '最后给一个可动手的小建议。只输出朗读稿正文，不要标题、不要 markdown、不要表情符号、不要分点序号。',
  '如果 motifs 为 unknown（数字工作台场景），按 title/extra 里描述的模型点评，绝不编造具体的纹样名称。'
].join('\n');

router.post(
  '/review/text',
  asyncHandler(async function (req, res) {
    const context = (req.body && req.body.context) || {};
    if (!context || typeof context !== 'object') {
      return res.status(400).json({ ok: false, message: '缺少点评上下文' });
    }
    if (JSON.stringify(context).length > MAX_CONTEXT_CHARS) {
      return res.status(400).json({ ok: false, message: '上下文过长' });
    }
    if (!throttle(req, res, 'review')) return;
    const cfg = arkCfg();
    if (!cfg.apiKey || !cfg.textModel) {
      return res.status(503).json({ ok: false, message: '点评服务未配置' });
    }
    const motifs = Array.isArray(context.motifs)
      ? context.motifs.filter(function (m) {
          return MOTIF_IDS.indexOf(m) >= 0;
        })
      : [];
    const facts = {
      kind: context.kind === 'digital' ? 'digital' : 'real',
      motifs: motifs.length ? motifs : ['unknown'],
      craft: CRAFTS.indexOf(context.craft) >= 0 ? context.craft : 'ok',
      light: LIGHTS.indexOf(context.light) >= 0 ? context.light : 'good',
      title: String(context.title || '').slice(0, 40),
      extra: String(context.extra || '').slice(0, 200)
    };
    const content = await arkChat(
      cfg,
      cfg.textModel,
      [
        { role: 'system', content: REVIEW_SYSTEM },
        { role: 'user', content: '点评对象信息（JSON）：' + JSON.stringify(facts) }
      ],
      400,
      0.7
    );
    const text = String(content || '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/[#*>\-]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 600);
    if (!text) {
      return res.status(502).json({ ok: false, message: '点评文案为空' });
    }
    res.json({ ok: true, data: { text: text } });
  })
);

module.exports = router;
