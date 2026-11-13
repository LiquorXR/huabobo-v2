const { eq, sql } = require('drizzle-orm');
const dbm = require('../db/client');
const { newId, nowMs } = require('../db/helpers');
const { DEFAULT_STUDIO_CATEGORIES, REQUIRED_STUDIO_CATEGORIES } = require('../constants/studioCategories');

function parseCategoryIds(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(function (x) { return String(x).trim(); }).filter(Boolean);
  var s = String(raw).trim();
  if (!s) return [];
  if (s[0] === '[') {
    try {
      var arr = JSON.parse(s);
      if (Array.isArray(arr)) return arr.map(function (x) { return String(x).trim(); }).filter(Boolean);
    } catch (e) { return []; }
    return [];
  }
  return s.split(/[，,;；\s]+/).map(function (x) { return x.trim(); }).filter(Boolean);
}

async function ensureStudioCategories() {
  const { studioModelCategories, studioModels } = dbm.schema;
  const countRows = await dbm.db
    .select({ n: sql`count(*)`.mapWith(Number) })
    .from(studioModelCategories);
  if (!countRows[0] || countRows[0].n === 0) {
    const now = nowMs();
    await dbm.db.insert(studioModelCategories).values(
      DEFAULT_STUDIO_CATEGORIES.map(function (name, index) {
        return { id: newId(), name: name, sortOrder: index, enabled: true, createdAt: now, updatedAt: now };
      })
    );
  }
  // 客户指定 4 类必须存在（老库只播种一次，这里补缺）
  var existing = await dbm.db.select().from(studioModelCategories);
  var names = {};
  existing.forEach(function (c) { names[c.name] = c; });
  var missing = (REQUIRED_STUDIO_CATEGORIES || []).filter(function (n) { return !names[n]; });
  if (missing.length) {
    const now = nowMs();
    var baseOrder = existing.length;
    await dbm.db.insert(studioModelCategories).values(
      missing.map(function (name, i) {
        return { id: newId(), name: name, sortOrder: baseOrder + i, enabled: true, createdAt: now, updatedAt: now };
      })
    );
    existing = await dbm.db.select().from(studioModelCategories);
  }

  const withTraditional = await dbm.db
    .select()
    .from(studioModelCategories)
    .where(eq(studioModelCategories.name, '传统花饽饽'))
    .limit(1);
  let fallback = withTraditional[0];
  if (!fallback) {
    const first = await dbm.db
      .select()
      .from(studioModelCategories)
      .orderBy(studioModelCategories.sortOrder, studioModelCategories.createdAt)
      .limit(1);
    fallback = first[0];
  }
  if (!fallback) return fallback;

  await dbm.db
    .update(studioModels)
    .set({ categoryId: fallback.id, updatedAt: nowMs() })
    .where(sql`${studioModels.categoryId} IS NULL`);
  // 回填多分类字段：老数据 category_ids 为空时用单分类补齐（列不存在时跳过，由 client 启动迁移补列后下次生效）
  try {
    var allModels = await dbm.db.select({ id: studioModels.id, categoryId: studioModels.categoryId, categoryIds: studioModels.categoryIds }).from(studioModels);
    for (var i = 0; i < allModels.length; i++) {
      var m = allModels[i];
      var ids = parseCategoryIds(m.categoryIds);
      if (!ids.length && m.categoryId) {
        await dbm.db.update(studioModels).set({ categoryIds: JSON.stringify([m.categoryId]), updatedAt: nowMs() }).where(eq(studioModels.id, m.id));
      }
    }
  } catch (e) {
    console.warn('[db] studio category_ids 回填跳过', e.message);
  }
  return fallback;
}

module.exports = { ensureStudioCategories, parseCategoryIds };
