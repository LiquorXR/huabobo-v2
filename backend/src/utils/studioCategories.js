const { eq, sql } = require('drizzle-orm');
const dbm = require('../db/client');
const { newId, nowMs } = require('../db/helpers');
const { DEFAULT_STUDIO_CATEGORIES } = require('../constants/studioCategories');

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
  return fallback;
}

module.exports = { ensureStudioCategories };
