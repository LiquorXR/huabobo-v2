const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config');
const { connectDb, isDbReady } = require('./db/client');
const { ensureSeedContent } = require('./seedContent');
const { ensureUploadDirs, getUploadStats } = require('./utils/uploads');
const errorHandler = require('./middleware/error');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const newsRoutes = require('./routes/news');
const usersRoutes = require('./routes/users');
const artisansRoutes = require('./routes/artisans');
const worksRoutes = require('./routes/works');
const commentsRoutes = require('./routes/comments');
const engagementRoutes = require('./routes/engagement');
const aboutRoutes = require('./routes/about');
const studioModelsRoutes = require('./routes/studioModels');
const studioModelCategoriesRoutes = require('./routes/studioModelCategories');

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.options('*', cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true, limit: '8mb' }));

ensureUploadDirs(config.uploadDir);

function allowUploadCors(_req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Timing-Allow-Origin', '*');
  next();
}

app.use('/uploads', allowUploadCors, express.static(config.uploadDir));
app.use('/api/uploads', allowUploadCors, express.static(config.uploadDir));
app.use('/admin', express.static(path.join(__dirname, '..', 'public', 'admin')));

app.get('/api/health', function (_req, res) {
  var uploadStats = getUploadStats(config.uploadDir);
  res.json({
    ok: true,
    service: 'zhijiansu-backend',
    time: new Date().toISOString(),
    db: isDbReady() ? 'connected' : 'disconnected',
    uploadDir: uploadStats.dir,
    uploadFileCount: uploadStats.fileCount
  });
});

app.use('/api', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/news', newsRoutes.publicRouter);
app.use('/api/admin/news', newsRoutes.adminRouter);
app.use('/api/users', usersRoutes.publicRouter);
app.use('/api/admin/users', usersRoutes.adminRouter);
app.use('/api/artisans', artisansRoutes.publicRouter);
app.use('/api/admin/artisans', artisansRoutes.adminRouter);
app.use('/api/works', worksRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/engagement', engagementRoutes);
app.use('/api/about', aboutRoutes.publicRouter);
app.use('/api/admin/about', aboutRoutes.adminRouter);
app.use('/api/studio-models', studioModelsRoutes.publicRouter);
app.use('/api/admin/studio-models', studioModelsRoutes.adminRouter);
app.use('/api/studio-model-categories', studioModelCategoriesRoutes.publicRouter);
app.use('/api/admin/studio-model-categories', studioModelCategoriesRoutes.adminRouter);
app.use('/api/tts', require('./routes/tts'));

app.use(function (_req, res) {
  res.status(404).json({ ok: false, message: '接口不存在' });
});

app.use(errorHandler);

async function start() {
  var host = '0.0.0.0';
  var uploadStats = getUploadStats(config.uploadDir);
  app.listen(config.port, host, function () {
    console.log('[server] 指间塑后台已监听 http://' + host + ':' + config.port);
    console.log('[server] 管理后台 http://8.160.184.132:' + config.port + '/admin/');
    console.log('[server] 管理员登录 POST /api/admin/login');
    console.log('[server] 默认管理员:', config.adminUsername);
    console.log('[server] 上传目录:', uploadStats.dir, '（文件数:', uploadStats.fileCount + '）');
    if (uploadStats.fileCount === 0) {
      console.warn(
        '[server] 提示: uploads 目录为空。若曾上传过图片/模型，请检查 UPLOAD_DIR 是否指向正确路径，或更新代码时勿删除 uploads 文件夹。'
      );
    }
  });

  try {
    await connectDb();
    const seeded = await ensureSeedContent();
    console.log(
      '[seed] 初始内容已就绪 — 新闻',
      seeded.newsCount,
      '条，合作艺人',
      seeded.artisanCount,
      '位（与前端示例一致）'
    );
  } catch (err) {
    console.error('[db] 数据库连接失败（读写接口将返回 503，请检查 DATABASE_URL）:', err.message);
  }
}

start().catch(function (err) {
  console.error('[server] 启动失败', err);
  process.exit(1);
});
