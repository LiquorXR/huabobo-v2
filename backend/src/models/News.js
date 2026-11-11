const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    image: { type: String, default: '' },
    summary: { type: String, default: '', maxlength: 500 },
    content: { type: String, default: '', maxlength: 20000 },
    publishedAt: { type: Date, required: true }
  },
  { timestamps: true }
);

newsSchema.set('toJSON', {
  transform: function (_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('News', newsSchema);
