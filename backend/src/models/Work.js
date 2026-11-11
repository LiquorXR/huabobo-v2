const mongoose = require('mongoose');

const workSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    image: { type: String, default: '' },
    tag: { type: String, default: '' },
    desc: { type: String, default: '' },
    publishedAt: { type: Date },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    /** model=3D 模型作品；ar_snapshot=AR 实景截图 */
    workType: { type: String, enum: ['model', 'ar_snapshot'], default: 'model' }
  },
  { timestamps: true }
);

workSchema.set('toJSON', {
  transform: function (_doc, ret) {
    ret.id = ret._id.toString();
    if (ret.userId) ret.userId = ret.userId.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Work', workSchema);
