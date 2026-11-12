/**
 * 写入与前端一致的新闻、合作艺人及演示数据
 * 运行：npm run seed
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { eq, sql } = require('drizzle-orm');
const { connectDb } = require('./db/client');
const dbm = require('./db/client');
const { newId, nowMs } = require('./db/helpers');
const { ensureSeedContent } = require('./seedContent');

async function seed() {
  await connectDb();
  const { users, works } = dbm.schema;

  const result = await ensureSeedContent();
  console.log('[seed] 新闻条数:', result.newsCount, '合作艺人:', result.artisanCount);

  const demoPhone = '13800000001';
  let userRows = await dbm.db.select().from(users).where(eq(users.phone, demoPhone)).limit(1);
  let user = userRows[0];
  if (!user) {
    const now = nowMs();
    user = {
      id: newId(),
      phone: demoPhone,
      passwordHash: await bcrypt.hash('123456', 10),
      nickname: '演示用户',
      handle: '@演示用户',
      avatar: 'images/author-user-me.jpg',
      bio: '',
      type: 'member',
      joinDate: '2026-01',
      createdAt: now,
      updatedAt: now
    };
    await dbm.db.insert(users).values(user);
    console.log('[seed] 创建演示用户', demoPhone, '/ 123456');
  }

  const workCountRows = await dbm.db.select({ n: sql`count(*)`.mapWith(Number) }).from(works);
  const workCount = workCountRows[0] ? workCountRows[0].n : 0;
  if (workCount === 0) {
    const now = nowMs();
    await dbm.db.insert(works).values([
      {
        id: newId(),
        userId: user.id,
        title: '锦鲤跃春',
        image: 'images/gallery-work-1.jpg',
        tag: '节庆系列',
        desc: 'DIY 捏制的锦鲤造型',
        publishedAt: new Date('2026-05-12').getTime(),
        status: 'published',
        workType: 'model',
        createdAt: now,
        updatedAt: now
      },
      {
        id: newId(),
        userId: user.id,
        title: '寿桃福满',
        image: 'images/gallery-work-2.jpg',
        tag: '祝寿系列',
        desc: '寿桃组合',
        publishedAt: new Date('2026-05-08').getTime(),
        status: 'published',
        workType: 'model',
        createdAt: now,
        updatedAt: now
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
