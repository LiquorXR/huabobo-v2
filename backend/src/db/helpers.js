const crypto = require('crypto');

function newId() {
  return crypto.randomBytes(12).toString('hex');
}

function nowMs() {
  return Date.now();
}

function parseJsonArray(raw, fallback) {
  if (Array.isArray(raw)) return raw;
  if (raw == null || raw === '') return fallback !== undefined ? fallback : [];
  try {
    const v = JSON.parse(String(raw));
    return Array.isArray(v) ? v : fallback !== undefined ? fallback : [];
  } catch (e) {
    return fallback !== undefined ? fallback : [];
  }
}

function parseJsonObject(raw, fallback) {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (raw == null || raw === '') return fallback !== undefined ? fallback : {};
  try {
    const v = JSON.parse(String(raw));
    return v && typeof v === 'object' && !Array.isArray(v)
      ? v
      : fallback !== undefined
        ? fallback
        : {};
  } catch (e) {
    return fallback !== undefined ? fallback : {};
  }
}

function stringifyJson(value, fallback) {
  if (value == null) return fallback !== undefined ? fallback : '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch (e) {
    return fallback !== undefined ? fallback : '';
  }
}

module.exports = { newId, nowMs, parseJsonArray, parseJsonObject, stringifyJson };
