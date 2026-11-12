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
const TTS_SAMPLE_RATE = 24000; // 智谱 TTS 固定 24kHz / 16bit / 单声道

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
      res.set('Retry-After', '1');
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
        const wav = ensureWav(out.audio, out.contentType);
        const clean = trimLeadingBeep(wav.audio);
        res.set('Content-Type', wav.contentType);
        res.set('Content-Length', String(clean.length));
        res.set('Cache-Control', 'no-store');
        res.set('X-TTS-Provider', 'zhipu');
        return res.send(clean);
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
// 单测用：不影响 router 本体
module.exports.ttsTestUtils = { pcm16ToWavBuffer: pcm16ToWavBuffer, hasRiffWavHeader: hasRiffWavHeader, ensureWav: ensureWav, trimLeadingBeep: trimLeadingBeep };
