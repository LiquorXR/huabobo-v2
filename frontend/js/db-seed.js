/**
 * 种子数据（模拟数据库初始数据，上线后由后端 API 替代）
 */
window.DB_SEED = {
  users: [
    {
      id: 'u_me',
      type: 'member',
      handle: '@指尖创客',
      name: '指尖创客',
      bio: '登录后在此查看与管理你在「数字化体验」中创作并发布的作品。',
      joinDate: '2026-01',
      avatar: 'images/author-user-me.jpg'
    },
    {
      id: 'u1',
      type: 'member',
      handle: '@小胶东',
      name: '小胶东',
      bio: '土生土长的胶东姑娘，在指间塑数字化体验里捏出第一件锦鲤饽饽，从此爱上花饽饽 DIY。偏爱吉祥寓意与节庆主题。',
      joinDate: '2026-03',
      avatar: 'images/author-user-1.jpg'
    },
    {
      id: 'u2',
      type: 'member',
      handle: '@面面驾驶人',
      name: '面面驾驶人',
      bio: '为家人学做花饽饽的新手，专注祝寿、寿桃题材，希望把祝福捏进每一只饽饽里。',
      joinDate: '2026-02',
      avatar: 'images/author-user-2.jpg'
    },
    {
      id: 'u3',
      type: 'member',
      handle: '@国潮青年',
      name: '国潮青年',
      bio: '文创爱好者，喜欢把传统纹样做成国潮风礼盒设计，常发布联名创意方案。',
      joinDate: '2026-01',
      avatar: 'images/author-user-3.jpg'
    },
    {
      id: 'u4',
      type: 'member',
      handle: '@捏面小妹',
      name: '捏面小妹',
      bio: '威海在校大学生，课余钻研花鸟小品，作品风格清新，适合拍照分享。',
      joinDate: '2026-02',
      avatar: 'images/author-user-4.jpg'
    },
    {
      id: 'u5',
      type: 'member',
      handle: '@胶州新娘',
      name: '胶州新娘',
      bio: '筹备婚礼中，用数字化工具预演婚庆饽饽摆盘，记录从设计到定制的全过程。',
      joinDate: '2025-12',
      avatar: 'images/author-user-5.jpg'
    },
    {
      id: 'u6',
      type: 'member',
      handle: '@兔兔打工',
      name: '兔兔打工',
      bio: '职场人业余创作，中秋、元宵等节日主题居多，想把饽饽做成同事伴手礼。',
      joinDate: '2026-01',
      avatar: 'images/author-user-6.jpg'
    },
    {
      id: 'u7',
      type: 'member',
      handle: '@花开胶东',
      name: '花开胶东',
      bio: '练习剪纹中，已发布 12 件数字化作品，擅长牡丹、花卉等题材。',
      joinDate: '2025-11',
      avatar: 'images/author-user-7.jpg'
    },
    {
      id: 'u8',
      type: 'member',
      handle: '@亲子工作室',
      name: '亲子工作室',
      bio: '亲子教育机构账号，带孩子体验 DIY 面塑，作品充满童趣。',
      joinDate: '2026-02',
      avatar: 'images/author-user-8.jpg'
    },
    {
      id: 'u9',
      type: 'member',
      handle: '@年味制造局',
      name: '年味制造局',
      bio: '专注春节、年会场景饽饽方案，擅长组合式福字墙与企业伴手礼设计。',
      joinDate: '2025-10',
      avatar: 'images/author-user-9.jpg'
    },
    {
      id: 'a1',
      type: 'artisan',
      handle: '@王德厚',
      name: '王德厚',
      title: '省级非遗传承人 · 烟台',
      bio: '从业四十余年，专攻祝寿、婚嫁大型花饽饽组合。手法沉稳、造型饱满，龙凤、寿桃等经典纹样在其手中既有传统韵味，又兼顾当代审美。',
      joinDate: '1986',
      avatar: 'images/artisan-1.jpg',
      tags: ['寿桃系列', '龙凤呈祥', '祝寿组合', '从业 40 年'],
      shop: {
        name: '德厚花饽饽坊',
        address: '山东省烟台市芝罘区所城里大街 18 号（示例）',
        hours: '周二至周日 9:00—17:30（周一休息）',
        main: '定制祝寿饽饽、婚嫁组合、节庆礼盒、研学体验预约',
        note: '大型组合需提前 7—15 天预订，支持同城配送（烟台市区）'
      },
      wechat: { id: 'wxid_wangdehou', qr: 'images/wechat-wang.jpg', tip: '咨询定制请备注「指间塑」' },
      portfolio: [
        { title: '九龙祝寿饽饽', desc: '九条蟠龙环绕寿桃，常用于高寿宴席。', image: 'images/work-wang-1.jpg' },
        { title: '百寿图组合', desc: '百枚小寿桃拼成寿字大图。', image: 'images/work-wang-2.jpg' },
        { title: '龙凤呈祥糕', desc: '婚嫁场景经典款，象征佳偶天成。', image: 'images/work-wang-3.jpg' }
      ]
    },
    {
      id: 'a2',
      type: 'artisan',
      handle: '@李桂芬',
      name: '李桂芬',
      title: '民间面塑艺人 · 威海',
      bio: '从业近三十年，擅长花鸟、鱼虫、节庆小品等中小型花饽饽，以细腻剪纹与天然植物染料上色见长。',
      joinDate: '1998',
      avatar: 'images/artisan-2.jpg',
      tags: ['花鸟小品', '植物染料', '公益课堂', '从业 28 年'],
      shop: {
        name: '指尖花园花饽饽工作室',
        address: '山东省威海市环翠区文化中路 56 号（示例）',
        hours: '每日 10:00—18:00',
        main: '节庆小品、亲子体验、社区定制、花鸟题材礼盒',
        note: '支持周末亲子班、团体预约'
      },
      wechat: { id: 'li_guifen_huabobo', qr: 'images/wechat-li.jpg', tip: '预约体验课请备注「指间塑」' },
      portfolio: [
        { title: '锦鲤迎春', desc: '春节热销款，年年有余。', image: 'images/work-li-1.jpg' },
        { title: '牡丹富贵糕', desc: '婚庆、乔迁馈赠佳品。', image: 'images/work-li-2.jpg' },
        { title: '新春福字饽饽', desc: '迷你福字系列。', image: 'images/work-li-3.jpg' }
      ]
    },
    {
      id: 'a3',
      type: 'artisan',
      handle: '@张海涛',
      name: '张海涛',
      title: '青年传承人 · 青岛',
      bio: '师承胶东多位民间面塑艺人，专注花饽饽国潮化表达，擅长文创礼盒与品牌联名。',
      joinDate: '2014',
      avatar: 'images/artisan-3.jpg',
      tags: ['国潮联名', '文创礼盒', '快闪定制', '从业 12 年'],
      shop: {
        name: '海涛面塑 · 国潮饽饽铺',
        address: '山东省青岛市市南区香港中路 88 号（示例）',
        hours: '周三至周一 11:00—20:00（周二休息）',
        main: '文创礼盒、品牌联名、快闪活动定制、企业伴手礼',
        note: '接受全国邮寄，企业订单请提前沟通设计稿'
      },
      wechat: { id: 'zhang_ht_miansu', qr: 'images/wechat-zhang.jpg', tip: '商务合作请备注「指间塑+用途」' },
      portfolio: [
        { title: 'IP 联名礼盒系列', desc: '适合年轻送礼场景。', image: 'images/work-zhang-1.jpg' },
        { title: '龙年限定款', desc: '生肖主题立体龙造型。', image: 'images/work-zhang-2.jpg' },
        { title: '快闪店定制款', desc: '支持 LOGO 定制。', image: 'images/work-zhang-3.jpg' }
      ]
    }
  ],
  works: [
    { id: 'w1', userId: 'u1', title: '锦鲤跃春', image: 'images/gallery-work-1.jpg', tag: '节庆系列', desc: 'DIY 捏制的锦鲤造型，取「年年有余」之意。', publishedAt: '2026-05-12', status: 'published' },
    { id: 'w2', userId: 'u2', title: '寿桃福满', image: 'images/gallery-work-2.jpg', tag: '祝寿系列', desc: '为姥姥八十大寿设计的三分寿桃组合。', publishedAt: '2026-05-08', status: 'published' },
    { id: 'w3', userId: 'u3', title: '龙年吉祥盘', image: 'images/gallery-work-3.jpg', tag: '国潮创意', desc: '龙纹盘饰 + 祥云底托，国潮风十足。', publishedAt: '2026-04-28', status: 'published' },
    { id: 'w4', userId: 'u4', title: '樱花福袋', image: 'images/gallery-work-4.jpg', tag: '节庆系列', desc: '春日限定小品，樱花与福袋结合。', publishedAt: '2026-04-15', status: 'published' },
    { id: 'w5', userId: 'u5', title: '婚礼双凤', image: 'images/gallery-work-5.jpg', tag: '婚庆系列', desc: '双凤戏牡丹，寓意和和美美。', publishedAt: '2026-04-02', status: 'published' },
    { id: 'w6', userId: 'u6', title: '萌兔迎秋', image: 'images/gallery-work-6.jpg', tag: '节庆系列', desc: '中秋主题萌系玉兔。', publishedAt: '2026-03-20', status: 'published' },
    { id: 'w7', userId: 'u7', title: '牡丹富贵', image: 'images/gallery-work-7.jpg', tag: '国潮创意', desc: '多层牡丹花瓣练习作。', publishedAt: '2026-03-08', status: 'published' },
    { id: 'w8', userId: 'u8', title: '海底童梦', image: 'images/gallery-work-8.jpg', tag: '节庆系列', desc: '亲子共创海底主题拼盘。', publishedAt: '2026-02-18', status: 'published' },
    { id: 'w9', userId: 'u9', title: '春节福字墙', image: 'images/gallery-work-9.jpg', tag: '节庆系列', desc: '九宫福字迷你饽饽组合。', publishedAt: '2026-01-25', status: 'published' },
    { id: 'w_m1', userId: 'u_me', title: '踏青小花饽饽', image: 'images/my-work-1.jpg', tag: '已发布', desc: '春日踏青主题小花饽饽。', publishedAt: '2026-05-15', status: 'published' },
    { id: 'w_m2', userId: 'u_me', title: '迷你寿桃试作', image: 'images/my-work-2.jpg', tag: '已发布', desc: '第一次捏制的迷你寿桃。', publishedAt: '2026-04-20', status: 'published' },
    { id: 'w_m3', userId: 'u_me', title: '福字书签饽饽', image: 'images/my-work-3.jpg', tag: '已发布', desc: '书签造型迷你福字饽饽。', publishedAt: '2026-03-28', status: 'published' },
    { id: 'w_draft', userId: 'u_me', title: '未命名草稿', image: 'images/my-work-1.jpg', tag: '草稿', desc: '尚未发布的 DIY 作品。', publishedAt: '', status: 'draft' }
  ]
};
