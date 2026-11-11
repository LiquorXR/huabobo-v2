/**
 * 写入与前端一致的新闻、合作艺人及演示数据
 * 运行：npm run seed
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDb } = require('./db');
const User = require('./models/User');
const Work = require('./models/Work');
const { ensureSeedContent } = require('./seedContent');

async function seed() {
  await connectDb();

  const result = await ensureSeedContent();
  console.log('[seed] 新闻条数:', result.newsCount, '合作艺人:', result.artisanCount);

  const demoPhone = '13800000001';
  let user = await User.findOne({ phone: demoPhone });
  if (!user) {
    user = await User.create({
      phone: demoPhone,
      passwordHash: await bcrypt.hash('123456', 10),
      nickname: '演示用户',
      handle: '@演示用户',
      joinDate: '2026-01'
    });
    console.log('[seed] 创建演示用户', demoPhone, '/ 123456');
  }

  const workCount = await Work.countDocuments();
  if (workCount === 0) {
    await Work.create([
      {
        userId: user._id,
        title: '锦鲤跃春',
        image: 'images/gallery-work-1.jpg',
        tag: '节庆系列',
        desc: 'DIY 捏制的锦鲤造型',
        publishedAt: new Date('2026-05-12'),
        status: 'published'
      },
      {
        userId: user._id,
        title: '寿桃福满',
        image: 'images/gallery-work-2.jpg',
        tag: '祝寿系列',
        desc: '寿桃组合',
        publishedAt: new Date('2026-05-08'),
        status: 'published'
      }
    ]);
    console.log('[seed] 写入示例展厅作品');
  }

  console.log('[seed] 完成');
  process.exit(0);
}

seed().catch(function (e) {
  console.error(e);
  process.exit(1);
});
