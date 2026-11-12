const express = require('express');
const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');

/**
 * 数字人语音（豆包 TTS 大模型）
 * POST /api/tts/speak  Body: { text }
 * 成功返回 audio/mpeg 二进制；失败返回 JSON {ok:false}，前端自动回退浏览器 speechSynthesis。
 *
 * 需要 env（见 .env.example）:
 *   DOUBAO_TTS_API_KEY      控制台 API Key（付费 token，绝不暴露给前端）
 *   DOUBAO_TTS_RESOURCE_ID  默认 seed-tts-2.0
 *   DOUBAO_TTS_SPEAKER      控制台音色库选定的 speaker ID（锁死 40 岁女声的关键）
 */
const router = express.Router();

const TTS_URL = 'https://openspeech.bytedance.com/api/v3/tts/unidirectional';
const MAX_TEXT_LEN = 800;
const MIN_INTERVAL_MS = 800;
const UPSTREAM_TIMEOUT_MS = 20000;

const lastHitByIp = new Map();
setInterval(function () {
  // 防止 Map 无限增长：只保留最近 5 分钟
  const cutoff = Date.now() - 5 * 60 * 1000;
  lastHitByIp.forEach(function (t, ip) {
    if (t < cutoff) lastHitByIp.delete(ip);
  });
}, 60 * 1000).unref();

function ttsConfig() {
  return {
    apiKey: process.env.DOUBAO_TTS_API_KEY || '',
    resourceId: process.env.DOUBAO_TTS_RESOURCE_ID || 'seed-tts-2.0',
    speaker: process.env.DOUBAO_TTS_SPEAKER || ''
  };
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
    if (!cfg.apiKey || !cfg.speaker) {
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

    let upstream;
    try {
      upstream = await fetch(TTS_URL, {
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
        const text = await upstream.text();
        detail = String(text || '').slice(0, 300);
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
    res.send(audio);
  })
);

module.exports = router;
