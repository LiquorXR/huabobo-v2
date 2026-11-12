/**
 * 一次性导数：MongoDB → PostgreSQL / SQLite（保留 ObjectId 十六进制作 TEXT 主键）
 * 运行（新库为空时执行，可重复跑，已存在的 id 会跳过）：
 *   node scripts/mongo-to-sql.js "mongodb://USER:PASS@127.0.0.1:27017/mydb?authSource=mydb" "postgres://USER:PASS@127.0.0.1:5432/mydb"
 * 目标 DATABASE_URL 也可写 file:./dev.db（一般不需要往 SQLite 导线上数据，仅调试用）
 */
const { MongoClient, ObjectId } = require('mongodb');

async function main() {
  const mongoUri = process.argv[2];
  const targetUrl = process.argv[3];
  if (!mongoUri || !targetUrl) {
    console.error('用法: node scripts/mongo-to-sql.js "<MONGODB_URI>" "<DATABASE_URL>"');
    process.exit(1);
  }
  process.env.DATABASE_URL = targetUrl;
  delete require.cache[require.resolve('../src/config')];
  const config = require('../src/config');
  if (config.databaseUrl !== targetUrl) {
    console.error('目标 DATABASE_URL 未生效，检查参数');
    process.exit(1);
  }

  const { connectDb } = require('../src/db/client');
  const dbm = require('../src/db/client');
  const { nowMs, stringifyJson } = require('../src/db/helpers');
  await connectDb();
  const { schema, db } = dbm;
  const { eq } = require('drizzle-orm');

  const mongo = new MongoClient(mongoUri);
  await mongo.connect();
  const mdb = mongo.db();
  console.log('[export] mongo 已连接');

  const hex = (v) => (v instanceof ObjectId ? v.toHexString() : v == null ? null : String(v));
  const ms = (v, fallback) => {
    if (v instanceof Date) return v.getTime();
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    return fallback !== undefined ? fallback : Date.now();
  };
  const str = (v, d) => (v == null ? d || '' : String(v));

  async function upsert(table, rows) {
    let inserted = 0;
    for (const row of rows) {
      const r = await db
        .insert(table)
        .values(row)
        .onConflictDoNothing({ target: table.id });
      const n = Array.isArray(r) ? r.length : r && r.rowCount !== undefined ? r.rowCount : 1;
      if (n > 0) inserted += 1;
    }
    return { total: rows.length, inserted };
  }

  async function dump(collName) {
    const docs = await mdb.collection(collName).find({}).toArray();
    console.log(`[export] ${collName}: ${docs.length} 条`);
    return docs;
  }

  // users
  // users（旧库 phone 即登录名，原样迁入 username；现网用户用原手机号登录）
  for (const u of await dump('users')) {
    await upsert(schema.users, [
      {
        id: hex(u._id),
        username: str(u.username || u.phone),
        passwordHash: str(u.passwordHash),
        nickname: str(u.nickname, '新用户'),
        handle: str(u.handle, ''),
        avatar: str(u.avatar, 'images/author-user-me.jpg'),
        bio: str(u.bio, ''),
        type: u.type || 'member',
        joinDate: str(u.joinDate, ''),
        createdAt: ms(u.createdAt),
        updatedAt: ms(u.updatedAt)
      }
    ]);
  }
  // artisans
  for (const a of await dump('artisans')) {
    await upsert(schema.artisans, [
      {
        id: hex(a._id),
        name: str(a.name),
        title: str(a.title, ''),
        bio: str(a.bio, ''),
        image: str(a.image, ''),
        tags: stringifyJson(a.tags || []),
        sortOrder: a.sortOrder || 0,
        portfolio: stringifyJson(a.portfolio || []),
        contact: stringifyJson(a.contact || {}),
        wechat: stringifyJson(a.wechat || {}),
        createdAt: ms(a.createdAt),
        updatedAt: ms(a.updatedAt)
      }
    ]);
  }
  // news
  for (const n of await dump('news')) {
    await upsert(schema.news, [
      {
        id: hex(n._id),
        title: str(n.title),
        image: str(n.image, ''),
        summary: str(n.summary, ''),
        content: str(n.content, ''),
        publishedAt: ms(n.publishedAt),
        createdAt: ms(n.createdAt),
        updatedAt: ms(n.updatedAt)
      }
    ]);
  }
  // studio categories (先导，保证外键目标存在）
  const catId = async (v) => (v == null ? null : hex(v));
  for (const c of await dump('studiomodelcategories')) {
    await upsert(schema.studioModelCategories, [
      {
        id: hex(c._id),
        name: str(c.name),
        sortOrder: c.sortOrder || 0,
        enabled: c.enabled !== false,
        createdAt: ms(c.createdAt),
        updatedAt: ms(c.updatedAt)
      }
    ]);
  }
  // works
  for (const w of await dump('works')) {
    await upsert(schema.works, [
      {
        id: hex(w._id),
        userId: hex(w.userId),
        title: str(w.title),
        image: str(w.image, ''),
        tag: str(w.tag, ''),
        desc: str(w.desc, ''),
        publishedAt: w.publishedAt ? ms(w.publishedAt) : null,
        status: w.status || 'draft',
        workType: w.workType || 'model',
        createdAt: ms(w.createdAt),
        updatedAt: ms(w.updatedAt)
      }
    ]);
  }
  // studio models
  for (const m of await dump('studiomodels')) {
    await upsert(schema.studioModels, [
      {
        id: hex(m._id),
        name: str(m.name),
        desc: str(m.desc, ''),
        glbUrl: str(m.glbUrl),
        thumbnail: str(m.thumbnail, ''),
        categoryId: await catId(m.categoryId),
        sortOrder: m.sortOrder || 0,
        enabled: m.enabled !== false,
        createdAt: ms(m.createdAt),
        updatedAt: ms(m.updatedAt)
      }
    ]);
  }
  // comments / likes
  for (const c of await dump('comments')) {
    await upsert(schema.comments, [
      {
        id: hex(c._id),
        workId: hex(c.workId),
        userId: hex(c.userId),
        text: str(c.text),
        createdAt: ms(c.createdAt),
        updatedAt: ms(c.updatedAt)
      }
    ]);
  }
  for (const l of await dump('likes')) {
    await upsert(schema.likes, [{ id: hex(l._id), workId: hex(l.workId), userId: hex(l.userId), createdAt: ms(l.createdAt) }]);
  }
  // about
  for (const a of await dump('aboutpages')) {
    await upsert(schema.aboutPages, [
      {
        id: hex(a._id),
        key: str(a.key, 'main'),
        heroTitle: str(a.heroTitle, ''),
        heroSubtitle: str(a.heroSubtitle, ''),
        introTitle: str(a.introTitle, ''),
        introText: str(a.introText, ''),
        introImage: str(a.introImage, ''),
        values: stringifyJson(a.values || []),
        printSectionTitle: str(a.printSectionTitle, ''),
        printSectionDesc: str(a.printSectionDesc, ''),
        printWorks: stringifyJson(a.printWorks || []),
        joinTitle: str(a.joinTitle, ''),
        joinText: str(a.joinText, ''),
        contact: stringifyJson(a.contact || {}),
        createdAt: ms(a.createdAt),
        updatedAt: ms(a.updatedAt)
      }
    ]);
  }

  await mongo.close();
  console.log('[export] 完成（重复执行安全，已存在 id 自动跳过）');
  process.exit(0);
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
