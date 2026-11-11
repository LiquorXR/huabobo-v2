const mongoose = require('mongoose');

const portfolioItemSchema = new mongoose.Schema(
  {
    title: { type: String, default: '' },
    desc: { type: String, default: '' },
    image: { type: String, default: '' }
  },
  { _id: false }
);

const artisanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    title: { type: String, default: '' },
    bio: { type: String, default: '' },
    image: { type: String, default: '' },
    tags: [{ type: String }],
    sortOrder: { type: Number, default: 0 },
    portfolio: [portfolioItemSchema],
    contact: {
      shopName: { type: String, default: '' },
      address: { type: String, default: '' },
      hours: { type: String, default: '' },
      main: { type: String, default: '' },
      note: { type: String, default: '' },
      phone: { type: String, default: '' }
    },
    wechat: {
      id: { type: String, default: '' },
      qr: { type: String, default: '' },
      tip: { type: String, default: '' }
    }
  },
  { timestamps: true }
);

artisanSchema.set('toJSON', {
  transform: function (_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Artisan', artisanSchema);
