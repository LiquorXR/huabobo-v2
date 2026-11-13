const express = require('express');
const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');

/**
 * 数字人 AI 链路（统一 OpenAI 兼容接口；密钥只在服务端）
 * 单模型：OPENAI_MODEL 识图点评共用（VISION/TEXT 作兼容别名）
 * 思考开关：OPENAI_THINKING=enabled（thinking 对象，4.6v 系）/ low 等档位（reasoning_effort，5.x 系）/ 留空关闭
 * 降级链（400 时逐级去掉）：reasoning_effort → thinking 对象 → response_format
 * - POST /api/vision/identify  Body: { image: dataURL(jpeg/png) }
 *   → { ok:true, data:{ motif, confidence, top2, craft, light, suggestRetake } }
 * - POST /api/review/text      Body: { context: { kind, motifs[], craft, light, title?, extra? } }
 *   → { ok:true, data:{ text } }
 * 任一环节失败返回非 ok，前端自动回退本地规则 + 本地话术。
 */
const router = express.Router();

const MOTIF_IDS = ['long', 'feng', 'yu', 'tao', 'lian', 'jubaopen', 'yuanbao', 'hua', 'unknown'];
const MOTIF_IDS_STRICT = ['long', 'feng', 'yu', 'tao', 'lian', 'jubaopen', 'yuanbao', 'hua'];
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

// 识图结果缓存：同图二次识别零 token（内存 LRU，上限 500 条）
const visionCache = new Map();
const VISION_CACHE_MAX = 500;
function visionCacheKey(image) {
  return crypto.createHash('sha256').update(String(image)).digest('hex');
}
function visionCacheGet(key) {
  const hit = visionCache.get(key);
  if (!hit) return null;
  visionCache.delete(key);
  visionCache.set(key, hit);
  return hit;
}
function visionCacheSet(key, value) {
  if (visionCache.has(key)) visionCache.delete(key);
  visionCache.set(key, value);
  while (visionCache.size > VISION_CACHE_MAX) {
    const oldest = visionCache.keys().next().value;
    visionCache.delete(oldest);
  }
}

function llmCfg() {
  // 统一 OpenAI 格式：OPENAI_* 优先，ZHIPU_*/ARK_* 作兼容别名
  // 单模型：OPENAI_MODEL 识图点评共用；VISION/TEXT 仅作兼容别名
  const hasAnyKey = process.env.OPENAI_API_KEY || process.env.ZHIPU_API_KEY || process.env.ARK_API_KEY;
  if (!hasAnyKey) {
    return { provider: 'none', apiKey: '', baseUrl: '', visionModel: '', textModel: '', reasoningEffort: '', thinking: '' };
  }
  const useOpenai = !!process.env.OPENAI_API_KEY;
  const useZhipu = !useOpenai && !!process.env.ZHIPU_API_KEY;
  const singleModel =
    process.env.OPENAI_MODEL ||
    process.env.OPENAI_VISION_MODEL ||
    process.env.OPENAI_TEXT_MODEL ||
    process.env.ZHIPU_VISION_MODEL ||
    process.env.ZHIPU_TEXT_MODEL ||
    process.env.ARK_VISION_MODEL ||
    process.env.ARK_TEXT_MODEL ||
    (useZhipu ? 'glm-5.3-flash' : '');
  // 思考开关：enabled → thinking 对象（4.6v 系）；low 等档位 → reasoning_effort（5.x 系）；留空关闭
  const thinkingRaw = String(
    process.env.OPENAI_THINKING || process.env.OPENAI_REASONING_EFFORT || process.env.ZHIPU_REASONING_EFFORT || ''
  ).trim();
  return {
    provider: useOpenai ? 'openai' : useZhipu ? 'zhipu' : 'ark',
    apiKey: process.env.OPENAI_API_KEY || process.env.ZHIPU_API_KEY || process.env.ARK_API_KEY || '',
    baseUrl: (
      process.env.OPENAI_BASE_URL ||
      process.env.ZHIPU_BASE_URL ||
      process.env.ARK_BASE_URL ||
      'https://open.bigmodel.cn/api/paas/v4'
    ).replace(/\/$/, ''),
    visionModel: singleModel,
    textModel: singleModel,
    reasoningEffort: thinkingRaw && thinkingRaw !== 'enabled' ? thinkingRaw : '',
    thinking: thinkingRaw === 'enabled' ? 'enabled' : ''
  };
}

// 保持旧函数名兼容（老代码/测试可能引用）
function arkCfg() {
  return llmCfg();
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

async function arkChat(cfg, model, messages, maxTokens, temperature, opts) {
  const wantJson = !opts || opts.json !== false;
  // 智谱/方舟均为 OpenAI 兼容；智谱部分视觉模型对 response_format 较严格，失败自动降级重试一次
  // glm-5.x 推理模型另带 reasoning_effort 降思考档（low 经实测有效），老模型不支持会自动降级去掉
  async function post(useJsonFormat, useReasoning, useThinking) {
    const controller = new AbortController();
    const timer = setTimeout(function () {
      controller.abort();
    }, UPSTREAM_TIMEOUT_MS);
    try {
      const body = {
        model: model,
        messages: messages,
        max_tokens: maxTokens,
        temperature: temperature
      };
      if (useJsonFormat) body.response_format = { type: 'json_object' };
      if (useReasoning && cfg.reasoningEffort) body.reasoning_effort = cfg.reasoningEffort;
      if (useThinking && cfg.thinking === 'enabled') body.thinking = { type: 'enabled' };
      const res = await fetch(cfg.baseUrl + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + cfg.apiKey,
          'X-Request-Id': crypto.randomUUID()
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timer);
      return res;
    } catch (e) {
      clearTimeout(timer);
      const err = new Error('AI 服务连接失败');
      err.status = 502;
      throw err;
    }
  }
  async function readContent(res) {
    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      const err = new Error('AI 服务返回异常');
      err.status = 502;
      throw err;
    }
    if (!res.ok) {
      const msg =
        (data && (data.message || (data.error && (data.error.message || data.error)) || data.msg)) ||
        ('HTTP ' + res.status);
      const err = new Error(String(msg).slice(0, 200) || 'AI 服务异常');
      err.status = 502;
      err.upstreamStatus = res.status;
      err.upstreamBody = data;
      throw err;
    }
    const content =
      data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!content || typeof content !== 'string') {
      const err = new Error('AI 服务无有效返回');
      err.status = 502;
      throw err;
    }
    return content;
  }

  // 400 逐级降级：reasoning_effort → thinking 对象 → response_format（按报错信息判断，无信息时也逐级试一次）
  let useR = !!cfg.reasoningEffort;
  let useT = cfg.thinking === 'enabled';
  let useJ = wantJson;
  let res = await post(useJ, useR, useT);
  for (let i = 0; i < 3 && !res.ok && res.status === 400; i++) {
    let peek = '';
    try {
      peek = await res.clone().text();
    } catch (e) {
      /* 忽略 peek 失败 */
    }
    const mentionsJson = /response_format|json_object/i.test(peek);
    const mentionsOther = /thinking|reasoning/i.test(peek);
    if (useR && (mentionsOther || !mentionsJson)) {
      useR = false;
    } else if (useT && (mentionsOther || !mentionsJson)) {
      useT = false;
    } else if (useJ && mentionsJson) {
      useJ = false;
    } else {
      break;
    }
    res = await post(useJ, useR, useT);
  }
  return readContent(res);
}

const VISION_SYSTEM = [
  '你是胶东花饽饽造型识别器。只看图片，从以下 9 类里选出最像的 1 个：',
  'long=龙形饽饽（长条盘龙、有爪有须）；feng=凤形（禽鸟、有翅有冠）；yu=鱼形（鱼身鱼尾）；',
  'tao=寿桃形（圆润桃形、带桃尖）；lian=莲花/牡丹花形（层叠花瓣）；',
  'jubaopen=聚宝盆形（盆状、口大肚圆）；yuanbao=元宝形（两头翘、中间鼓）；',
  'hua=团花纹样（平面圆形花纹）；unknown=非花饽饽或看不清（模糊/遮挡/过暗过曝/非面塑）。',
  '同时评估：craft 面纹路（fine=细腻清晰 / ok=一般 / soft=模糊）；light 光线（dim=偏暗 / harsh=过曝 / good=合适）。',
  '同时给出 confidence 置信度 0-1（看不清/多候选时压低），以及 top2 第二候选 id 数组（无则空数组）。',
  '只输出纯 JSON，不要解释：{"motif":"<id|unknown>","confidence":0.85,"top2":[],"craft":"<fine|ok|soft>","light":"<dim|harsh|good>"}。'
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
    // 缓存命中直接返回，不计限流、不调上游
    const cacheKey = visionCacheKey(image);
    const cached = visionCacheGet(cacheKey);
    if (cached) {
      return res.json({ ok: true, data: Object.assign({ cached: true }, cached) });
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
      600,
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
    var confidence = Number(parsed.confidence);
    if (!isFinite(confidence)) confidence = parsed.motif === 'unknown' ? 0.4 : 0.7;
    confidence = Math.min(1, Math.max(0, confidence));
    var top2 = Array.isArray(parsed.top2) ? parsed.top2.filter(function (m) { return MOTIF_IDS_STRICT.indexOf(m) >= 0; }).slice(0, 2) : [];
    var craft = CRAFTS.indexOf(parsed.craft) >= 0 ? parsed.craft : 'ok';
    var light = LIGHTS.indexOf(parsed.light) >= 0 ? parsed.light : 'good';
    var suggestRetake = parsed.motif === 'unknown' || confidence < 0.55 || (craft === 'soft' && light !== 'good');
    var result = {
      motif: parsed.motif,
      confidence: Math.round(confidence * 100) / 100,
      top2: top2,
      craft: craft,
      light: light,
      suggestRetake: !!suggestRetake
    };
    visionCacheSet(cacheKey, result);
    res.json({
      ok: true,
      data: result
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
      1200,
      0.7,
      { json: false }
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
