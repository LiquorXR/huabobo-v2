const config = require('../config');

function publicUrl(path) {
  if (!path) return '';
  if (/^data:/i.test(path)) return path;
  if (/^https?:\/\//i.test(path)) return path;
  const p = path.startsWith('/') ? path : '/' + path;
  if (p.indexOf('/images/') === 0) {
    return config.frontendBaseUrl + p;
  }
  if (p.indexOf('/uploads/') === 0) {
    return config.publicBaseUrl + p;
  }
  return config.publicBaseUrl + p;
}

function formatDate(d) {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toISOString().slice(0, 10);
}

function formatDateTime(d) {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toISOString();
}

module.exports = { publicUrl, formatDate, formatDateTime };
