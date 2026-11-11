const mongoose = require('mongoose');

const studioModelCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    sortOrder: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true }
  },
  { timestamps: true }
);

studioModelCategorySchema.index({ name: 1 }, { unique: true });
studioModelCategorySchema.index({ sortOrder: 1, createdAt: -1 });

studioModelCategorySchema.set('toJSON', {
  transform: function (_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('StudioModelCategory', studioModelCategorySchema);
