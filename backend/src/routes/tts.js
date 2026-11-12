const express = require('express');
const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');

/**
 * 数字人语音（单 Key 优先 + 老配置兼容）
 * POST /api/tts/speak  Body: { text }
 * 成功返回音频二进制；失败返回 JSON {ok:false}，前端自动回退浏览器 speechSynthesis。
 *
 * 优先级：
 * 1) ZHIPU_API_KEY（单 Key 通吃识图+文案+语音，推荐）
 *    ZHIPU_BASE_URL  默认 https://open.bigmodel.cn/api/paas/v4
 *    ZHIPU_TTS_MODEL 默认 glm-tts
 *    ZHIPU_TTS_VOICE 默认 tongtong（彤彤女声；可选 chuichui/xiaochen/jam/kazi/douji/luodo/复刻音色）
 *    ZHIPU_TTS_SPEED 默认 1.0（范围 0.5-2）
 *    ZHIPU_TTS_VOLUME 默认 1.0（范围 0.1-10）
 *    返回 wav 二进制
 * 2) DOUBAO_TTS_*（老配置：豆包 seed-tts 私有流式协议，返回 mp3）
 */
const router = express.Router();

const DOUBAO_TTS_URL = 'https://openspeech.bytedance.com/api/v3/tts/unidirectional';
const MAX_TEXT_LEN = 800;
const MIN_INTERVAL_MS = 800;
const UPSTREAM_TIMEOUT_MS = 20000;

const lastHitByIp = new Map();
function clampNum(v, def, min, max) {
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
}
setInterval(function () {  // 防止 Map 无限增长：只保留最近 5 分钟
  const cutoff = Date.now() - 5 * 60 * 1000;
  lastHitByIp.forEach(function (t, ip) {
    if (t < cutoff) lastHitByIp.delete(ip);
  });
}, 60 * 1000).unref();

function ttsConfig() {
  if (process.env.ZHIPU_API_KEY) {
    return {
      provider: 'zhipu',
      apiKey: process.env.ZHIPU_API_KEY || '',
      baseUrl: (process.env.ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4').replace(/\/$/, ''),
      model: process.env.ZHIPU_TTS_MODEL || 'glm-tts',
      voice: process.env.ZHIPU_TTS_VOICE || 'tongtong',
      speed: clampNum(process.env.ZHIPU_TTS_SPEED, 1.0, 0.5, 2),
      volume: clampNum(process.env.ZHIPU_TTS_VOLUME, 1.0, 0.1, 10)
    };
  }
  return {
    provider: 'doubao',
    apiKey: process.env.DOUBAO_TTS_API_KEY || '',
    resourceId: process.env.DOUBAO_TTS_RESOURCE_ID || 'seed-tts-2.0',
    speaker: process.env.DOUBAO_TTS_SPEAKER || ''
  };
}

async function speakZhipu(cfg, text, signal) {
  const upstream = await fetch(cfg.baseUrl + '/audio/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + cfg.apiKey,
      'X-Request-Id': crypto.randomUUID()
    },
    body: JSON.stringify({
      model: cfg.model,
      input: text,
      voice: cfg.voice,
      response_format: 'wav',
      speed: cfg.speed,
      volume: cfg.volume
    }),
    signal: signal
  });
  const ct = String(upstream.headers.get('content-type') || '');
  if (!upstream.ok) {
    let detail = '';
    try {
      detail = String(await upstream.text()).slice(0, 300);
    } catch (e) {}
    console.error('[tts-zhipu] upstream HTTP', upstream.status, detail);
    const err = new Error('语音服务异常' + (detail ? '：' + detail : ''));
    err.status = 502;
    throw err;
  }
  // 正常返回 wav/pcm 二进制；异常时可能返回 JSON 错误
  if (ct.indexOf('application/json') >= 0) {
    let detail = '';
    try {
      detail = String(await upstream.text()).slice(0, 300);
    } catch (e) {}
    const err = new Error('语音合成失败' + (detail ? '：' + detail : ''));
    err.status = 502;
    throw err;
  }
  const ab = await upstream.arrayBuffer();
  const audio = Buffer.from(ab);
  if (!audio.length) {
    const err = new Error('语音合成无音频');
    err.status = 502;
    throw err;
  }
  return { audio: audio, contentType: ct.indexOf('pcm') >= 0 ? 'audio/pcm' : 'audio/wav' };
}

router.post(
  '/speak',
  asyncHandler(async function (req, res) {
    const text = String((req.body && req.body.text) || '').trim();
    if (!text) {
      return res.status(400).json({ ok: false, message: '文本不能为空' });
    }
    if (text.length > MAX_TEXT_LEN) {
      return res.status(400).json({ ok: false, message: '文本过长，请分段朗读' });
    }

    const cfg = ttsConfig();
    if (cfg.provider === 'zhipu' && !cfg.apiKey) {
      return res.status(503).json({ ok: false, message: '语音服务未配置' });
    }
    if (cfg.provider === 'doubao' && (!cfg.apiKey || !cfg.speaker)) {
      return res.status(503).json({ ok: false, message: '语音服务未配置' });
    }

    // 简单节流：同 IP 两次请求至少间隔，避免 token 被刷爆
    const ip =
      req.ip || (req.connection && req.connection.remoteAddress) || 'unknown';
    const now = Date.now();
    if (now - (lastHitByIp.get(ip) || 0) < MIN_INTERVAL_MS) {
      return res.status(429).json({ ok: false, message: '请求太频繁' });
    }
    lastHitByIp.set(ip, now);

    const controller = new AbortController();
    const timer = setTimeout(function () {
      controller.abort();
    }, UPSTREAM_TIMEOUT_MS);

    try {
      if (cfg.provider === 'zhipu') {
        let out;
        try {
          out = await speakZhipu(cfg, text, controller.signal);
        } catch (e) {
          clearTimeout(timer);
          if (e && e.status === 502) return res.status(502).json({ ok: false, message: e.message });
          return res.status(502).json({ ok: false, message: '语音服务连接失败' });
        }
        clearTimeout(timer);
        res.set('Content-Type', out.contentType);
        res.set('Content-Length', String(out.audio.length));
        res.set('Cache-Control', 'no-store');
        res.set('X-TTS-Provider', 'zhipu');
        return res.send(out.audio);
      }

      let upstream;
      try {
        upstream = await fetch(DOUBAO_TTS_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Connection: 'keep-alive',
            'X-Api-Key': cfg.apiKey,
            'X-Api-Resource-Id': cfg.resourceId,
            'X-Api-Request-Id': crypto.randomUUID()
          },
          body: JSON.stringify({
            req_params: {
              text: text,
              speaker: cfg.speaker,
              audio_params: { format: 'mp3', sample_rate: 24000 }
            }
          }),
          signal: controller.signal
        });
      } catch (e) {
        clearTimeout(timer);
        return res.status(502).json({ ok: false, message: '语音服务连接失败' });
      }
      clearTimeout(timer);

      if (!upstream.ok) {
        let detail = '';
        try {
          const t = await upstream.text();
          detail = String(t || '').slice(0, 300);
          console.error('[tts] upstream HTTP', upstream.status, detail);
        } catch (e) {}
        return res.status(502).json({ ok: false, message: '语音服务异常' + (detail ? '：' + detail : '') });
      }

      // chunked JSON 行流：{"code":0,"data":"<base64>"} … {"code":20000000} 结束
      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      let rest = '';
      const chunks = [];
      let failed = null;
      let finished = false;
      try {
        while (!finished && !failed) {
          const step = await reader.read();
          if (step.done) break;
          rest += decoder.decode(step.value, { stream: true });
          const lines = rest.split('\n');
          rest = lines.pop();
          for (const line of lines) {
            const s = line.trim();
            if (!s) continue;
            let msg;
            try {
              msg = JSON.parse(s);
            } catch (e) {
              continue;
            }
            if (msg.code === 20000000) {
              finished = true;
              rest = '';
              break;
            }
            if (msg.code !== 0) {
              failed = msg.message || '语音合成失败';
              break;
            }
            if (msg.data) chunks.push(Buffer.from(msg.data, 'base64'));
          }
        }
        if (rest.trim()) {
          try {
            const tail = JSON.parse(rest.trim());
            if (tail.code !== 0 && tail.code !== 20000000) failed = tail.message || failed;
            else if (tail.data) chunks.push(Buffer.from(tail.data, 'base64'));
          } catch (e) {
            /* 忽略尾部残行 */
          }
        }
      } catch (e) {
        return res.status(502).json({ ok: false, message: '语音流读取失败' });
      } finally {
        try {
          reader.releaseLock();
        } catch (e) {
          /* ignore */
        }
      }

      if (failed) {
        return res.status(502).json({ ok: false, message: failed });
      }
      const audio = Buffer.concat(chunks);
      if (!audio.length) {
        return res.status(502).json({ ok: false, message: '语音合成无音频' });
      }
      res.set('Content-Type', 'audio/mpeg');
      res.set('Content-Length', String(audio.length));
      res.set('Cache-Control', 'no-store');
      res.set('X-TTS-Provider', 'doubao');
      res.send(audio);
    } catch (e) {
      clearTimeout(timer);
      return res.status(502).json({ ok: false, message: '语音服务异常' });
    }
  })
);

module.exports = router;
