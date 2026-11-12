/**
 * 与前端 news.html、db-seed.js 一致的初始新闻 / 合作艺人数据
 */
const { eq, sql } = require('drizzle-orm');
const dbm = require('./db/client');
const { newId, nowMs, stringifyJson } = require('./db/helpers');

const INITIAL_NEWS = [
  {
    title: '指间塑文化传播平台正式上线',
    image: 'images/news-1.jpg',
    summary:
      '以「年轻态传播胶东花饽饽」为使命，平台同步开放数字化体验预约与手艺人合作通道，欢迎各界关注。',
    content:
      '<p>指间塑平台今日正式上线，以「年轻态传播胶东花饽饽」为使命，同步开放数字化体验预约与手艺人合作通道，欢迎各界关注。</p>',
    publishedAt: new Date('2026-05-18')
  },
  {
    title: '胶东花饽饽专题展亮相非遗博览会',
    image: 'images/news-2.jpg',
    summary:
      '指间塑携合作手艺人代表作及 AR 互动装置参展，现场吸引超万人次体验，社交媒体话题阅读量破百万。',
    content:
      '<p>指间塑携合作手艺人代表作及 AR 互动装置亮相非遗博览会，现场吸引超万人次体验，社交媒体话题阅读量破百万。</p>',
    publishedAt: new Date('2026-04-22')
  },
  {
    title: '春季校园公益行启动 · 首站威海',
    image: 'images/news-3.jpg',
    summary:
      '「指尖上的非遗」走进 6 所中小学，孩子们完成人生第一只面塑作品，数字化课件获教师好评。',
    content:
      '<p>「指尖上的非遗」春季校园公益行启动，首站威海，走进 6 所中小学，孩子们完成人生第一只面塑作品，数字化课件获教师好评。</p>',
    publishedAt: new Date('2026-03-10')
  }
];

const INITIAL_ARTISANS = [
  {
    name: '王德厚',
    title: '省级非遗传承人 · 烟台',
    bio: '从业四十余年，专攻祝寿、婚嫁大型花饽饽组合。手法沉稳、造型饱满，龙凤、寿桃等经典纹样在其手中既有传统韵味，又兼顾当代审美。',
    image: 'images/artisan-1.jpg',
    tags: ['寿桃系列', '龙凤呈祥', '祝寿组合', '从业 40 年'],
    sortOrder: 1,
    contact: {
      shopName: '德厚花饽饽坊',
      address: '山东省烟台市芝罘区所城里大街 18 号（示例）',
      hours: '周二至周日 9:00—17:30（周一休息）',
      main: '定制祝寿饽饽、婚嫁组合、节庆礼盒、研学体验预约',
      note: '大型组合需提前 7—15 天预订，支持同城配送（烟台市区）',
      phone: ''
    },
    wechat: {
      id: 'wxid_wangdehou',
      qr: 'images/wechat-wang.jpg',
      tip: '咨询定制请备注「指间塑」'
    },
    portfolio: [
      { title: '九龙祝寿饽饽', desc: '九条蟠龙环绕寿桃，常用于高寿宴席。', image: 'images/work-wang-1.jpg' },
      { title: '百寿图组合', desc: '百枚小寿桃拼成寿字大图。', image: 'images/work-wang-2.jpg' },
      { title: '龙凤呈祥糕', desc: '婚嫁场景经典款，象征佳偶天成。', image: 'images/work-wang-3.jpg' }
    ]
  },
  {
    name: '李桂芬',
    title: '民间面塑艺人 · 威海',
    bio: '从业近三十年，擅长花鸟、鱼虫、节庆小品等中小型花饽饽，以细腻剪纹与天然植物染料上色见长。',
    image: 'images/artisan-2.jpg',
    tags: ['花鸟小品', '植物染料', '公益课堂', '从业 28 年'],
    sortOrder: 2,
    contact: {
      shopName: '指尖花园花饽饽工作室',
      address: '山东省威海市环翠区文化中路 56 号（示例）',
      hours: '每日 10:00—18:00',
      main: '节庆小品、亲子体验、社区定制、花鸟题材礼盒',
      note: '支持周末亲子班、团体预约',
      phone: ''
    },
    wechat: {
      id: 'li_guifen_huabobo',
      qr: 'images/wechat-li.jpg',
      tip: '预约体验课请备注「指间塑」'
    },
    portfolio: [
      { title: '锦鲤迎春', desc: '春节热销款，年年有余。', image: 'images/work-li-1.jpg' },
      { title: '牡丹富贵糕', desc: '婚庆、乔迁馈赠佳品。', image: 'images/work-li-2.jpg' },
      { title: '新春福字饽饽', desc: '迷你福字系列。', image: 'images/work-li-3.jpg' }
    ]
  },
  {
    name: '张海涛',
    title: '青年传承人 · 青岛',
    bio: '师承胶东多位民间面塑艺人，专注花饽饽国潮化表达，擅长文创礼盒与品牌联名。',
    image: 'images/artisan-3.jpg',
    tags: ['国潮联名', '文创礼盒', '快闪定制', '从业 12 年'],
    sortOrder: 3,
    contact: {
      shopName: '海涛面塑 · 国潮饽饽铺',
      address: '山东省青岛市市南区香港中路 88 号（示例）',
      hours: '周三至周一 11:00—20:00（周二休息）',
      main: '文创礼盒、品牌联名、快闪活动定制、企业伴手礼',
      note: '接受全国邮寄，企业订单请提前沟通设计稿',
      phone: ''
    },
    wechat: {
      id: 'zhang_ht_miansu',
      qr: 'images/wechat-zhang.jpg',
      tip: '商务合作请备注「指间塑+用途」'
    },
    portfolio: [
      { title: 'IP 联名礼盒系列', desc: '适合年轻送礼场景。', image: 'images/work-zhang-1.jpg' },
      { title: '龙年限定款', desc: '生肖主题立体龙造型。', image: 'images/work-zhang-2.jpg' },
      { title: '快闪店定制款', desc: '支持 LOGO 定制。', image: 'images/work-zhang-3.jpg' }
    ]
  }
];

function toMs(d) {
  if (!d) return Date.now();
  const t = d instanceof Date ? d.getTime() : new Date(d).getTime();
  return Number.isNaN(t) ? Date.now() : t;
}

async function ensureSeedContent() {
  const { news, artisans, aboutPages } = dbm.schema;

  for (const item of INITIAL_NEWS) {
    const rows = await dbm.db.select().from(news).where(eq(news.title, item.title)).limit(1);
    const now = nowMs();
    if (rows[0]) {
      await dbm.db
        .update(news)
        .set({
          image: item.image,
          summary: item.summary,
          content: item.content,
          publishedAt: toMs(item.publishedAt),
          updatedAt: now
        })
        .where(eq(news.id, rows[0].id));
    } else {
      await dbm.db.insert(news).values({
        id: newId(),
        title: item.title,
        image: item.image,
        summary: item.summary,
        content: item.content,
        publishedAt: toMs(item.publishedAt),
        createdAt: now,
        updatedAt: now
      });
    }
  }

  for (const item of INITIAL_ARTISANS) {
    const rows = await dbm.db
      .select()
      .from(artisans)
      .where(eq(artisans.name, item.name))
      .limit(1);
    const now = nowMs();
    const contact = item.contact || {};
    const wechat = item.wechat || {};
    if (rows[0]) {
      const existing = rows[0];
      await dbm.db
        .update(artisans)
        .set({
          title: item.title,
          bio: item.bio,
          image: item.image,
          tags: stringifyJson(item.tags || []),
          sortOrder: item.sortOrder || 0,
          portfolio: existing.portfolio && existing.portfolio !== '[]' ? existing.portfolio : stringifyJson(item.portfolio || []),
          contact:
            existing.contact && existing.contact !== '{}'
              ? existing.contact
              : stringifyJson({
                  shopName: contact.shopName || '',
                  address: contact.address || '',
                  hours: contact.hours || '',
                  main: contact.main || '',
                  note: contact.note || '',
                  phone: contact.phone || ''
                }),
          wechat:
            existing.wechat && existing.wechat !== '{}'
              ? existing.wechat
              : stringifyJson({ id: wechat.id || '', qr: wechat.qr || '', tip: wechat.tip || '' }),
          updatedAt: now
        })
        .where(eq(artisans.id, existing.id));
    } else {
      await dbm.db.insert(artisans).values({
        id: newId(),
        name: item.name,
        title: item.title,
        bio: item.bio,
        image: item.image,
        tags: stringifyJson(item.tags || []),
        sortOrder: item.sortOrder || 0,
        portfolio: stringifyJson(item.portfolio || []),
        contact: stringifyJson({
          shopName: contact.shopName || '',
          address: contact.address || '',
          hours: contact.hours || '',
          main: contact.main || '',
          note: contact.note || '',
          phone: contact.phone || ''
        }),
        wechat: stringifyJson({ id: wechat.id || '', qr: wechat.qr || '', tip: wechat.tip || '' }),
        createdAt: now,
        updatedAt: now
      });
    }
  }

  const { ensureStudioCategories } = require('./utils/studioCategories');
  await ensureStudioCategories();

  const newsCountRows = await dbm.db.select({ n: sql`count(*)`.mapWith(Number) }).from(news);
  const artisanCountRows = await dbm.db
    .select({ n: sql`count(*)`.mapWith(Number) })
    .from(artisans);
  const newsCount = newsCountRows[0] ? newsCountRows[0].n : 0;
  const artisanCount = artisanCountRows[0] ? artisanCountRows[0].n : 0;

  const { getDefaultAboutData } = require('./constants/aboutDefaults');
  const aboutExists = await dbm.db.select().from(aboutPages).limit(1);
  if (!aboutExists.length) {
    const defaults = getDefaultAboutData();
    const now = nowMs();
    await dbm.db.insert(aboutPages).values({
      id: newId(),
      key: 'main',
      heroTitle: defaults.heroTitle || '',
      heroSubtitle: defaults.heroSubtitle || '',
      introTitle: defaults.introTitle || '',
      introText: defaults.introText || '',
      introImage: defaults.introImage || '',
      values: stringifyJson(defaults.values || []),
      printSectionTitle: defaults.printSectionTitle || '',
      printSectionDesc: defaults.printSectionDesc || '',
      printWorks: stringifyJson(defaults.printWorks || []),
      joinTitle: defaults.joinTitle || '',
      joinText: defaults.joinText || '',
      contact: stringifyJson(defaults.contact || {}),
      createdAt: now,
      updatedAt: now
    });
  }

  return { newsCount, artisanCount };
}

module.exports = { INITIAL_NEWS, INITIAL_ARTISANS, ensureSeedContent };
