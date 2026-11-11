const mongoose = require('mongoose');

const studioModelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    desc: { type: String, default: '' },
    glbUrl: { type: String, required: true },
    thumbnail: { type: String, default: '' },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudioModelCategory', default: null, index: true },
    sortOrder: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true }
  },
  { timestamps: true }
);

studioModelSchema.set('toJSON', {
  transform: function (_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('StudioModel', studioModelSchema);
