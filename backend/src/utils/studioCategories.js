const StudioModelCategory = require('../models/StudioModelCategory');
const StudioModel = require('../models/StudioModel');
const { DEFAULT_STUDIO_CATEGORIES } = require('../constants/studioCategories');

async function ensureStudioCategories() {
  const count = await StudioModelCategory.countDocuments();
  if (count === 0) {
    await StudioModelCategory.insertMany(
      DEFAULT_STUDIO_CATEGORIES.map(function (name, index) {
        return { name: name, sortOrder: index, enabled: true };
      })
    );
  }

  const fallback =
    (await StudioModelCategory.findOne({ name: '传统花饽饽' })) ||
    (await StudioModelCategory.findOne().sort({ sortOrder: 1, createdAt: 1 }));
  if (!fallback) return fallback;

  await StudioModel.updateMany(
    { $or: [{ categoryId: { $exists: false } }, { categoryId: null }] },
    { $set: { categoryId: fallback._id } }
  );
  return fallback;
}

module.exports = { ensureStudioCategories };
