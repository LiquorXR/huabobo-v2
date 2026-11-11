const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema(
  {
    workId: { type: mongoose.Schema.Types.ObjectId, ref: 'Work', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

likeSchema.index({ workId: 1, userId: 1 }, { unique: true });
likeSchema.index({ workId: 1 });

likeSchema.set('toJSON', {
  transform: function (_doc, ret) {
    ret.id = ret._id.toString();
    if (ret.workId) ret.workId = ret.workId.toString();
    if (ret.userId) ret.userId = ret.userId.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Like', likeSchema);
