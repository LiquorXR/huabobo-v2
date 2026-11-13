const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const asyncHandler = require('../utils/asyncHandler');

/**
 * 数字人语音（统一 OpenAI 音频接口格式）
 * POST /api/tts/speak  Body: { text }
 * 成功返回音频二进制；失败返回 JSON {ok:false}，前端自动回退浏览器 speechSynthesis。
 *
 * 配置（统一 OPENAI_*，ZHIPU_* 作兼容别名）：
 *    OPENAI_API_KEY / OPENAI_BASE_URL（任一 OpenAI 兼容站）
 *    OPENAI_TTS_MODEL / OPENAI_TTS_VOICE / OPENAI_TTS_SPEED（+ 扩展 OPENAI_TTS_VOLUME）
 * 调 OpenAI 兼容的 POST {base}/audio/speech（model/input/voice/response_format/speed）。
 */
const router = express.Router();

const MAX_TEXT_LEN = 800;
const MIN_INTERVAL_MS = 800;
const UPSTREAM_TIMEOUT_MS = 20000;
const TTS_SAMPLE_RATE = 24000; // 智谱 TTS 固定 24kHz / 16bit / 单声道

const lastHitByIp = new Map();
// 同一会话的分句并发 burst 配额：batchId 在 60s 内最多 10 次，不占用 800ms 全局限流
const batchHits = new Map();
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
  batchHits.forEach(function (rec, id) {
    if (!rec || Date.now() - rec.first > 60 * 1000) batchHits.delete(id);
  });
}, 60 * 1000).unref();

// 文本 hash 音频缓存：相同文案二次点评 0 等待（落盘 uploads/tts-cache，上限 500 个）
function ttsCacheDir() {
  const d = path.join(config.uploadDir, 'tts-cache');
  try {
    fs.mkdirSync(d, { recursive: true });
  } catch (e) {}
  return d;
}
function ttsCacheKey(cfg, text) {
  return crypto
    .createHash('sha256')
    .update([cfg.model, cfg.voice, cfg.speed, text].join('|'))
    .digest('hex');
}
function ttsCacheGet(key) {
  try {
    const p = path.join(ttsCacheDir(), key + '.wav');
    if (fs.existsSync(p)) return fs.readFileSync(p);
  } catch (e) {}
  return null;
}
function ttsCacheSet(key, audio) {
  try {
    const dir = ttsCacheDir();
    fs.writeFileSync(path.join(dir, key + '.wav'), audio);
    const files = fs.readdirSync(dir).filter(function (f) { return /\.wav$/.test(f); });
    if (files.length > 500) {
      const withT = files
        .map(function (f) {
          try {
            return { f: f, t: fs.statSync(path.join(dir, f)).mtimeMs };
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean)
        .sort(function (a, b) { return a.t - b.t; });
      for (let i = 0; i < withT.length - 500; i++) {
        try { fs.unlinkSync(path.join(dir, withT[i].f)); } catch (e) {}
      }
    }
  } catch (e) {}
}

function pcm16ToWavBuffer(pcm, sampleRate) {
  const rate = sampleRate || TTS_SAMPLE_RATE;
  const dataLen = pcm.length;
  const buf = Buffer.alloc(44 + dataLen);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataLen, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28); // byte rate: 16bit mono
  buf.writeUInt16LE(2, 32); // block align
  buf.writeUInt16LE(16, 34); // bits per sample
  buf.write('data', 36);
  buf.writeUInt32LE(dataLen, 40);
  pcm.copy(buf, 44);
  return buf;
}

function hasRiffWavHeader(audio) {
  return (
    audio && audio.length > 12 &&
    audio[0] === 0x52 && audio[1] === 0x49 && audio[2] === 0x46 && audio[3] === 0x46 && // RIFF
    audio[8] === 0x57 && audio[9] === 0x41 && audio[10] === 0x56 && audio[11] === 0x45 // WAVE
  );
}

// 浏览器 <audio> 播不了裸 PCM（会解码失败/杂音）：
// 上游若返回 pcm（智谱默认格式）或缺 RIFF 头，一律包成 wav 再下发，前端只收到 audio/wav。
function ensureWav(audio, contentType) {
  const ct = String(contentType || '').toLowerCase();
  if (ct.indexOf('pcm') >= 0) {
    return { audio: pcm16ToWavBuffer(audio), contentType: 'audio/wav' };
  }
  if (ct.indexOf('wav') >= 0 || ct.indexOf('wave') >= 0 || ct.indexOf('octet-stream') >= 0) {
    if (hasRiffWavHeader(audio)) return { audio: audio, contentType: 'audio/wav' };
    return { audio: pcm16ToWavBuffer(audio), contentType: 'audio/wav' };
  }
  return { audio: audio, contentType: String(contentType || 'audio/wav') };
}

// 智谱 TTS 会在正音前塞几段 550Hz 左右的纯音"嘟"声（实测：多段、每段约 0.1-0.5s，
// 峰值恒定、rms/峰值≈0.707，段间为全数字静音；watermark_enabled=false 也去不掉）。
// 人声正式开始前把这段"头部伪影"裁掉，否则每次播放开头都先"嘟嘟"两声。
// 只动文件头：找不到"稳定纯音串+其后实实在在的人声"就原样返回，绝不伤及正文。
function trimLeadingBeep(wavBuffer) {
  try {
    if (!wavBuffer || wavBuffer.length < 60) return wavBuffer;
    if (wavBuffer.toString('ascii', 0, 4) !== 'RIFF' || wavBuffer.toString('ascii', 8, 12) !== 'WAVE') {
      return wavBuffer;
    }
    // 定位 data 块（跳过 fmt 之后可能存在的扩展块）
    let dataAt = -1;
    for (let o = 12; o + 8 <= wavBuffer.length; o += 1) {
      if (wavBuffer.toString('ascii', o, o + 4) === 'data') {
        dataAt = o + 8;
        break;
      }
    }
    if (dataAt < 0) return wavBuffer;
    const channels = wavBuffer.readUInt16LE(22);
    const sampleRate = wavBuffer.readUInt32LE(24);
    const bits = wavBuffer.readUInt16LE(34);
    if (channels !== 1 || bits !== 16 || !sampleRate || sampleRate < 8000 || sampleRate > 96000) {
      return wavBuffer;
    }
    const total = Math.floor((wavBuffer.length - dataAt) / 2);
    if (total < sampleRate / 5) return wavBuffer; // 太短，不折腾
    const frameLen = Math.floor(sampleRate / 50); // 20ms 一帧
    const maxFrames = Math.min(Math.ceil(total / frameLen), Math.floor((sampleRate * 3) / frameLen)); // 最多看 3s
    // 第一遍：给每一帧打标签 silence(0) / tone(1) / other(2)
    const tags = new Array(maxFrames);
    const peaks = new Array(maxFrames);
    for (let f = 0; f < maxFrames; f += 1) {
      const start = f * frameLen;
      const end = Math.min(start + frameLen, total);
      let peak = 0;
      let sum = 0;
      let zcr = 0;
      let prev = wavBuffer.readInt16LE(dataAt + start * 2);
      for (let i = start; i < end; i += 1) {
        const v = wavBuffer.readInt16LE(dataAt + i * 2);
        const a = v < 0 ? -v : v;
        if (a > peak) peak = a;
        sum += v * v;
        if ((v >= 0) !== (prev >= 0)) zcr += 1;
        prev = v;
      }
      const n = end - start;
      const rms = Math.sqrt(sum / n);
      peaks[f] = peak;
      if (peak < 80) {
        tags[f] = 0;
      } else if (peak >= 800 && Math.abs(rms / peak - 0.7071) <= 0.12 && zcr >= 4 && zcr <= 320) {
        tags[f] = 1;
      } else {
        tags[f] = 2;
      }
    }
    // 找"稳定纯音串"：连续≥4 帧 tone 且峰值起伏≤10%（人声元音做不到这么稳，可与歌唱声区分）
    const beepRuns = [];
    let f = 0;
    while (f < maxFrames) {
      if (tags[f] !== 1) {
        f += 1;
        continue;
      }
      let g = f;
      let pmin = peaks[f];
      let pmax = peaks[f];
      while (g < maxFrames && tags[g] === 1) {
        if (peaks[g] < pmin) pmin = peaks[g];
        if (peaks[g] > pmax) pmax = peaks[g];
        g += 1;
      }
      if (g - f >= 4 && pmax - pmin <= pmax * 0.1) {
        beepRuns.push({ start: f, end: g });
      }
      f = g;
    }
    if (!beepRuns.length) return wavBuffer; // 开头没有纯音串，原样返回
    // 找"实实在在的人声起点"：连续 8 帧 other（160ms 真内容，纯音过渡帧凑不够这么长）
    let speechFrame = -1;
    for (let s = 0; s + 8 <= maxFrames; s += 1) {
      let ok = true;
      for (let k = 0; k < 8; k += 1) {
        if (tags[s + k] !== 2) {
          ok = false;
          break;
        }
      }
      if (ok) {
        speechFrame = s;
        break;
      }
    }
    if (speechFrame < 0) return wavBuffer; // 3s 内没找到人声，原样返回
    // 纯音串必须全部落在人声起点之前，否则可能是歌唱声，不裁
    for (let r = 0; r < beepRuns.length; r += 1) {
      if (beepRuns[r].end > speechFrame) return wavBuffer;
    }
    let cutSamples = speechFrame * frameLen - Math.floor(sampleRate * 0.03); // 留 30ms 预卷，保住轻声音头
    if (cutSamples <= 0) return wavBuffer;
    const cutBytes = cutSamples * 2;
    if (dataAt + cutBytes >= wavBuffer.length) return wavBuffer;
    return pcm16ToWavBuffer(wavBuffer.slice(dataAt + cutBytes), sampleRate);
  } catch (e) {
    return wavBuffer;
  }
}

function ttsConfig() {
  // 统一 OpenAI 格式：OPENAI_* 优先，ZHIPU_* 兼容别名
  const apiKey = process.env.OPENAI_API_KEY || process.env.ZHIPU_API_KEY || '';
  const baseUrl = (
    process.env.OPENAI_BASE_URL ||
    process.env.ZHIPU_BASE_URL ||
    'https://open.bigmodel.cn/api/paas/v4'
  ).replace(/\/$/, '');
  return {
    provider: process.env.OPENAI_API_KEY ? 'openai' : 'zhipu',
    apiKey: apiKey,
    baseUrl: baseUrl,
    model: process.env.OPENAI_TTS_MODEL || process.env.ZHIPU_TTS_MODEL || 'glm-tts',
    voice: process.env.OPENAI_TTS_VOICE || process.env.ZHIPU_TTS_VOICE || 'tongtong',
    speed: clampNum(process.env.OPENAI_TTS_SPEED || process.env.ZHIPU_TTS_SPEED, 1.0, 0.5, 2),
    // volume 非 OpenAI 标准字段（智谱扩展），400 时自动去掉重试
    volume: clampNum(process.env.OPENAI_TTS_VOLUME || process.env.ZHIPU_TTS_VOLUME, 1.0, 0.1, 10)
  };
}

async function speakOpenai(cfg, text, signal, withVolume) {
  const body = {
    model: cfg.model,
    input: text,
    voice: cfg.voice,
    response_format: 'wav',
    speed: cfg.speed
  };
  if (withVolume) body.volume = cfg.volume;
  const upstream = await fetch(cfg.baseUrl + '/audio/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + cfg.apiKey,
      'X-Request-Id': crypto.randomUUID()
    },
    body: JSON.stringify(body),
    signal: signal
  });
  const ct = String(upstream.headers.get('content-type') || '');
  if (!upstream.ok) {
    let detail = '';
    try {
      detail = String(await upstream.text()).slice(0, 300);
    } catch (e) {}
    console.error('[tts] upstream HTTP', upstream.status, detail);
    const err = new Error('语音服务异常' + (detail ? '：' + detail : ''));
    err.status = upstream.status === 400 ? 400 : 502;
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
    if (!cfg.apiKey) {
      return res.status(503).json({ ok: false, message: '语音服务未配置' });
    }

    // 音频缓存命中直接返回：不计限流、不调上游
    const cacheKey = ttsCacheKey(cfg, text);
    const hit = ttsCacheGet(cacheKey);
    if (hit && hit.length) {
      res.set('Content-Type', 'audio/wav');
      res.set('Content-Length', String(hit.length));
      res.set('Cache-Control', 'public, max-age=86400');
      res.set('X-TTS-Provider', cfg.provider);
      res.set('X-TTS-Cache', 'hit');
      return res.send(hit);
    }

    // 简单节流：同 IP 两次请求至少间隔，避免 token 被刷爆；
    // 同一会话的分句并发（带 batch）走 burst 配额，不占用全局限流
    const ip =
      req.ip || (req.connection && req.connection.remoteAddress) || 'unknown';
    const batchId = String((req.body && req.body.batch) || '').slice(0, 40);
    let inBatch = false;
    if (batchId) {
      const nowB = Date.now();
      let rec = batchHits.get(batchId);
      if (!rec || nowB - rec.first > 60 * 1000) rec = { count: 0, first: nowB };
      rec.count += 1;
      batchHits.set(batchId, rec);
      if (rec.count <= 10) {
        inBatch = true;
      } else {
        res.set('Retry-After', '1');
        return res.status(429).json({ ok: false, message: '请求太频繁' });
      }
    }
    if (!inBatch) {
      const now = Date.now();
      if (now - (lastHitByIp.get(ip) || 0) < MIN_INTERVAL_MS) {
        res.set('Retry-After', '1');
        return res.status(429).json({ ok: false, message: '请求太频繁' });
      }
      lastHitByIp.set(ip, now);
    }

    const controller = new AbortController();
    const timer = setTimeout(function () {
      controller.abort();
    }, UPSTREAM_TIMEOUT_MS);

    try {
      // 统一 OpenAI 音频接口；volume 为扩展字段，400 则去掉重试一次
      let out;
      try {
        out = await speakOpenai(cfg, text, controller.signal, true);
      } catch (e) {
        if (e && e.status === 400) {
          out = await speakOpenai(cfg, text, controller.signal, false);
        } else {
          throw e;
        }
      }
      clearTimeout(timer);
      const wav = ensureWav(out.audio, out.contentType);
      const clean = trimLeadingBeep(wav.audio);
      ttsCacheSet(cacheKey, clean);
      res.set('Content-Type', wav.contentType);
      res.set('Content-Length', String(clean.length));
      res.set('Cache-Control', 'public, max-age=86400');
      res.set('X-TTS-Provider', cfg.provider);
      res.set('X-TTS-Cache', 'miss');
      return res.send(clean);
    } catch (e) {
      clearTimeout(timer);
      if (e && e.status === 502) return res.status(502).json({ ok: false, message: e.message });
      return res.status(502).json({ ok: false, message: '语音服务连接失败' });
    }
  })
);

module.exports = router;
// 单测用：不影响 router 本体
module.exports.ttsTestUtils = { pcm16ToWavBuffer: pcm16ToWavBuffer, hasRiffWavHeader: hasRiffWavHeader, ensureWav: ensureWav, trimLeadingBeep: trimLeadingBeep };
