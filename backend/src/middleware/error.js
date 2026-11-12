function errorHandler(err, req, res, _next) {
  console.error('[error]', err);
  if (err.name === 'CastError') {
    return res.status(400).json({ ok: false, message: '参数无效' });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ ok: false, message: err.message });
  }
  if (
    err.code === '23505' ||
    err.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
    (err.message && err.message.indexOf('UNIQUE constraint failed') >= 0)
  ) {
    return res.status(409).json({ ok: false, message: '数据已存在（如用户名重复）' });
  }
  if (err.message && (err.message.indexOf('仅支持图片') >= 0 || err.code === 'LIMIT_FILE_SIZE')) {
    return res.status(400).json({ ok: false, message: err.message || '文件过大或格式不正确' });
  }
  if (
    err.name === 'MulterError' ||
    (err.message && (err.message.indexOf('Unexpected field') >= 0 || err.code === 'LIMIT_UNEXPECTED_FILE'))
  ) {
    return res.status(400).json({
      ok: false,
      message:
        '上传字段不被服务器识别。请更新后台 src/middleware/upload.js、src/routes/artisans.js 后重启 Node'
    });
  }
  res.status(err.status || 500).json({
    ok: false,
    message: err.message || '服务器错误'
  });
}

module.exports = errorHandler;
