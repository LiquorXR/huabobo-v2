const mongoose = require('mongoose');

const printWorkSchema = new mongoose.Schema(
  {
    title: { type: String, default: '' },
    desc: { type: String, default: '' },
    image: { type: String, default: '' }
  },
  { _id: false }
);

const aboutPageSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: 'main', index: true },
    heroTitle: { type: String, default: '关于我们' },
    heroSubtitle: { type: String, default: '' },
    introTitle: { type: String, default: '平台简介' },
    introText: { type: String, default: '' },
    introImage: { type: String, default: '' },
    values: { type: [String], default: [] },
    printSectionTitle: { type: String, default: '可打印作品展示' },
    printSectionDesc: { type: String, default: '' },
    printWorks: { type: [printWorkSchema], default: [] },
    joinTitle: { type: String, default: '加入我们' },
    joinText: { type: String, default: '' },
    contact: {
      email: { type: String, default: '' },
      wechat: { type: String, default: '' },
      address: { type: String, default: '' },
      hours: { type: String, default: '' },
      note: { type: String, default: '' }
    }
  },
  { timestamps: true }
);

aboutPageSchema.set('toJSON', {
  transform: function (_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('AboutPage', aboutPageSchema);
