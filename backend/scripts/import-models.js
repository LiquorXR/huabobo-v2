/**
 * 批量导入 assets/model-library 下的 GLB 到模型库（DB 记录 + 文件落盘）
 * 用法：
 *   npm run import:models                        # 默认 ../assets/model-library -> 分类「模型库」
 *   npm run import:models -- ../other/dir --category=天空元素
 *   npm run import:models -- --category=非遗手艺   # 用默认目录，指定分类
 * 可重复执行：同名（同分类）自动跳过；.obj 等非 GLB 会列出并跳过（播放器只认 GLB）。
 */
const fs = require('fs');
const path = require('path');
const { eq, and, sql } = require('drizzle-orm');

const DEFAULT_CATEGORY = '模型库';

function parseArgs(argv) {
  const out = { dir: null, category: null };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--category=')) out.category = a.slice('--category='.length).trim();
    else if (!a.startsWith('--')) out.dir = a;
  }
  return out;
}

function walk(dir, out) {
  out = out || [];
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return out;
  }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else if (ent.isFile()) out.push(full);
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const srcDir = args.dir
    ? path.resolve(process.cwd(), args.dir)
    : path.resolve(process.cwd(), '..', 'assets', 'model-library');
  if (!fs.existsSync(srcDir) || !fs.statSync(srcDir).isDirectory()) {
    console.error('模型来源目录不存在：' + srcDir);
    process.exit(1);
  }

  const { connectDb } = require('../src/db/client');
  await connectDb();
  const dbm = require('../src/db/client');
  const { newId, nowMs, stringifyJson } = require('../src/db/helpers');
  const { ensureStudioCategories } = require('../src/utils/studioCategories');
  const config = require('../src/config');
  await ensureStudioCategories();

  const { studioModels, studioModelCategories } = dbm.schema;
  const categoryName = args.category || DEFAULT_CATEGORY;
  let catRows = await dbm.db
    .select()
    .from(studioModelCategories)
    .where(eq(studioModelCategories.name, categoryName))
    .limit(1);
  let category = catRows[0];
  if (!category) {
    const now = nowMs();
    const maxRows = await dbm.db
      .select({ m: sql`max(${studioModelCategories.sortOrder})`.mapWith(Number) })
      .from(studioModelCategories);
    const maxSort = maxRows[0] && maxRows[0].m != null ? maxRows[0].m : -1;
    category = {
      id: newId(),
      name: categoryName,
      sortOrder: maxSort + 1,
      enabled: true,
      createdAt: now,
      updatedAt: now
    };
    await dbm.db.insert(studioModelCategories).values(category);
    console.log('[import] 新建分类：' + categoryName);
  }

  const destDir = path.join(config.uploadDir, 'models', 'library');
  fs.mkdirSync(destDir, { recursive: true });

  const files = walk(srcDir).sort();
  let imported = 0;
  let skipped = 0;
  const skippedNonGlb = [];
  for (const full of files) {
    const ext = path.extname(full).toLowerCase();
    const base = path.basename(full, path.extname(full)).trim();
    if (!base) {
      skipped += 1;
      continue;
    }
    if (ext !== '.glb') {
      skipped += 1;
      skippedNonGlb.push(path.relative(srcDir, full));
      continue;
    }
    const existing = await dbm.db
      .select({ id: studioModels.id })
      .from(studioModels)
      .where(and(eq(studioModels.name, base), eq(studioModels.categoryId, category.id)))
      .limit(1);
    if (existing.length) {
      skipped += 1;
      continue;
    }
    // 同一分类下已有同名（不同子目录同名文件）：自动加序号
    let name = base;
    let n = 2;
    for (;;) {
      const dup = await dbm.db
        .select({ id: studioModels.id })
        .from(studioModels)
        .where(and(eq(studioModels.name, name), eq(studioModels.categoryId, category.id)))
        .limit(1);
      if (!dup.length) break;
      name = base + '（' + n + '）';
      n += 1;
    }
    const id = newId();
    const filename = id + '.glb';
    fs.copyFileSync(full, path.join(destDir, filename));
    const now = nowMs();
    await dbm.db.insert(studioModels).values({
      id: id,
      name: name,
      desc: '批量导入：' + path.relative(srcDir, full).split(path.sep).join('/'),
      glbUrl: '/uploads/models/library/' + filename,
      thumbnail: '',
      categoryId: category.id,
      sortOrder: 0,
      enabled: true,
      createdAt: now,
      updatedAt: now
    });
    imported += 1;
    console.log('[import] +' + name);
  }

  console.log('[import] 完成：新增 ' + imported + '，跳过 ' + skipped + '（含已存在）');
  if (skippedNonGlb.length) {
    console.log('[import] 非 GLB 已跳过（播放器仅支持 GLB）：');
    skippedNonGlb.slice(0, 20).forEach(function (f) {
      console.log('  - ' + f);
    });
    if (skippedNonGlb.length > 20) console.log('  …等共 ' + skippedNonGlb.length + ' 个');
  }
  console.log('[import] 缩略图会在工作台首次打开该模型时自动生成补齐');
  process.exit(0);
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
