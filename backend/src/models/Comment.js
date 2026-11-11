const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    workId: { type: mongoose.Schema.Types.ObjectId, ref: 'Work', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

commentSchema.set('toJSON', {
  transform: function (_doc, ret) {
    ret.id = ret._id.toString();
    if (ret.workId) ret.workId = ret.workId.toString();
    if (ret.userId) ret.userId = ret.userId.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Comment', commentSchema);
