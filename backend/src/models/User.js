const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    nickname: { type: String, default: '新用户', trim: true },
    handle: { type: String, trim: true },
    avatar: { type: String, default: 'images/author-user-me.jpg' },
    bio: { type: String, default: '' },
    type: { type: String, enum: ['member', 'artisan'], default: 'member' },
    joinDate: { type: String, default: '' }
  },
  { timestamps: true }
);

userSchema.virtual('id').get(function () {
  return this._id.toString();
});

userSchema.set('toJSON', {
  virtuals: true,
  transform: function (_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
