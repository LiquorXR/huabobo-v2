/**
 * 中英双语（localStorage: zhijiansu_lang）
 */
(function () {
  var STORAGE_KEY = 'zhijiansu_lang';

  var STRINGS = {
    zh: {
      lang: { zh: '中文', en: 'EN', switch: '切换语言' },
      nav: {
        home: '首页',
        huayang: '馒有花样',
        digital: '数字化体验',
        gallery: '数字化展厅',
        artisans: '合作手艺人',
        charity: '公益案例',
        news: '新闻资讯',
        about: '关于我们',
        mine: '我的',
        login: '登录',
        register: '注册',
        menu: '打开菜单'
      },
      brand: { name: '指间塑', tag: '胶东花饽饽' },
      footer: {
        tagline: '胶东花饽饽文化传播平台',
        taglineLong: '胶东花饽饽文化传播平台\n让非遗被看见、被喜欢、被传承。',
        explore: '探索',
        more: '更多',
        copy: '© 2026 指间塑',
        copyLong: '© 2026 指间塑 · 胶东花饽饽文化传播平台'
      },
      meta: {
        index: '指间塑 — 胶东花饽饽文化传播平台',
        digital: '数字化体验 — 指间塑',
        gallery: '数字化展厅 — 指间塑',
        artisans: '合作手艺人 — 指间塑',
        charity: '公益案例 — 指间塑',
        news: '新闻资讯 — 指间塑',
        about: '关于我们 — 指间塑',
        login: '登录 — 指间塑',
        register: '注册 — 指间塑',
        profile: '用户主页 — 指间塑',
        work: '作品详情 — 指间塑'
      },
      carousel: { prev: '上一张', next: '下一张', label: '精选展示', dot: '第 {n} 张' },
      engage: {
        empty: '暂无留言，来说第一句吧',
        loginTip: '登录后可留言。<a href="login.html">去登录</a>',
        placeholder: '写下留言…',
        submit: '发送留言',
        detail: '详情',
        loginConfirm: '请先登录后再{action}。\n\n点击「确定」前往登录页。',
        like: '点赞',
        comment: '留言',
        fail: '留言失败'
      },
      index: {
        c1: { tag: '指尖非遗', title: '一团面，塑万千气象', desc: '胶东花饽饽——可食用的艺术品，把祝福捏进每一道纹路里。' },
        c2: { tag: '节庆礼仪', title: '红白喜事，饽饽传情', desc: '婚嫁、寿宴、年节……一口饽饽，一整套胶东人的祝福体系。' },
        c3: { tag: '匠心传承', title: '老手艺人，新表达', desc: '指间塑连接匠人与年轻人，让手艺被看见、被喜欢、被传承。' },
        c4: { tag: '数字焕新', title: 'AR · 3D · 虚拟展厅', desc: '从灶台到屏幕，用科技打开非遗的另一种打开方式。' },
        hero: {
          badge: '非遗 · 新表达',
          titleHtml: '把<strong><em>胶东花饽饽</em></strong><br>捏进年轻人的生活里',
          lead: '指间塑是一个面向 Z 世代的胶东花饽饽文化传播平台。我们用更潮的视觉、更轻的叙事，让这门指尖上的非遗，从乡间灶台走进你的屏幕与日常。',
          cta1: '开启数字化体验 →',
          cta2: '了解平台',
          float: '<strong>3000+ 年</strong>面食文化在胶东大地的延续与焕新'
        },
        what: { title: '什么是花饽饽？', desc: '花饽饽是流行于胶东地区的传统面塑艺术，以面粉为原料，经揉、捏、剪、刻、染等工序，塑成花鸟鱼兽、吉祥寓意等造型，常用于节庆、婚嫁、寿宴等场合，既是食物，更是承载祝福的「可食艺术品」。' },
        f1: { title: '文化渊源', p1: '胶东临海、民风淳朴，面食文化源远流长。花饽饽与祭祀、年节、人生礼仪紧密相连，是乡土记忆与家族情感的重要载体。', p2: '从「祭神面」到今日的非遗项目，它记录着一方水土的审美与生活哲学。' },
        f2: { title: '制作工艺', p1: '好饽饽离不开好面：和面、醒发、揉光，再到一手一剪的塑形。手艺人凭经验控制湿度与火候，图案讲究对称、饱满、寓意吉祥。', p2: '每一件作品都是时间与耐心的结晶，指尖的温度比任何机器都更懂面团的性格。' },
        f3: { title: '为什么年轻人该了解它？', p1: '它不只是「姥姥家的馒头」，更是可打卡、可收藏、可设计的国潮美学资源。指间塑用数字化、故事化、联名化的方式，让传统真正「活」在当代社交语境里。', p2: '了解花饽饽，等于打开一扇通往胶东民俗、手作精神与慢生活审美的窗。' },
        atlas: { title: '花饽饽图鉴', desc: '一眼认全经典造型与寓意，入门不费脑。' },
        card1: { tag: '寿礼', title: '寿桃饽饽', desc: '象征长寿安康，祝寿宴席上的经典主角，粉嫩圆润，喜气满满。' },
        card2: { tag: '吉祥', title: '鲤鱼跃龙门', desc: '寓意年年有余、仕途顺利，鱼鳞纹理是考验手艺的细节高光。' },
        card3: { tag: '节庆', title: '节庆摆盘', desc: '春节、元宵、婚庆场景中的组合陈列，一口饽饽，一整套祝福体系。' }
      },
      digital: {
        hero: { title: '数字化体验', desc: '用 AR、3D 与虚拟展厅，把花饽饽从灶台搬到你的手机里——看得清、玩得转、晒得出圈。', cta: '开始体验' },
        e1: { title: 'AR 实景扫描', desc: '扫描实物或海报，屏幕里即时浮现立体花饽饽与工艺解说，适合线下展览与校园活动。' },
        e2: { title: '3D 纹样鉴赏', desc: '360° 旋转查看鱼鳞、花瓣等细节，缩放对比不同流派造型，像逛博物馆一样逛饽饽。' },
        e3: { title: '虚拟非遗展厅', desc: '线上漫步胶东民俗场景，按时间线了解节庆用饽饽的演变，支持分享打卡链接。' },
        preview: { title: '体验预览', desc: '以下为平台规划中的三大数字化模块示意，正式素材上线后可替换图片。' },
        f1: { title: 'AR 扫描 · 一秒入戏', p1: '打开指间塑小程序或 H5，对准展陈二维码，花饽饽故事与制作步骤以动画形式叠加在现实画面上。', p2: '年轻人最爱的「拍一拍就懂」，降低非遗理解门槛。' },
        f2: { title: '高精度 3D 模型库', p1: '联合手艺人完成代表性作品的数字化采集，保留指尖纹理与色彩层次，供设计二次创作与教学使用。' },
        f3: { title: '虚拟展厅 · 随时逛', p1: '不受地域限制，沉浸式浏览婚嫁、寿宴、春节等主题展区，配合语音导览，像追剧一样追非遗。' },
        startConfirm: '体验 3D 面塑 DIY 工作台需要先登录或注册。\n\n点击「确定」前往登录页。'
      },
      gallery: {
        hero: { title: '数字化展厅', desc: '注册用户在「数字化体验」中 DIY 完成的作品，发布到社区后集中展示于此。点击作者可进入其 DIY 作品集主页。', cta: '我也要 DIY 创作 →' },
        searchLabel: '搜索作品或作者',
        searchPlaceholder: '输入作品名称或作者昵称，如：锦鲤、小胶东',
        searchClear: '清空搜索',
        loading: '正在加载社区作品…',
        empty: '暂无已发布作品',
        emptySearch: '未找到与「{q}」相关的作品或作者',
        countAll: '共 {n} 件作品',
        countZero: '共 0 件作品',
        countFound: '找到 {n} 件作品（共 {t} 件）'
      },
      artisans: {
        hero: { title: '合作手艺人', desc: '每一位手艺人都是「活档案」。指间塑与他们并肩，让老手艺被记录、被尊重、被更多人看见。' },
        more: '查看详情 →'
      },
      charity: {
        hero: { title: '公益案例', desc: '文化向善。指间塑把花饽饽带进学校、社区与乡村，让传承不只停留在镜头里。' },
        s1: '合作学校', s2: '公益场次', s3: '参与青少年', s4: '乡村工坊扶持',
        cases: { title: '典型案例', desc: '用真实行动连接传统与当下，每一张照片背后都是一堂课、一次陪伴、一份祝福。' },
        c1: { tag: '教育', title: '「指尖上的非遗」校园行', desc: '走进烟台、威海等地中小学，手艺人现场示范，学生体验捏塑小鱼与寿桃，配套数字化课件巩固学习成果。' },
        c2: { tag: '社区', title: '重阳敬老 · 送饽饽送温暖', desc: '联合社区志愿者为老人定制祝寿花饽饽，青年学员参与配送与陪伴，让传统礼仪在日常邻里中延续。' },
        c3: { tag: '乡村', title: '乡村工坊数字化扶持计划', desc: '为偏远地区工坊提供 3D 拍摄、电商素材与品牌故事包装培训，帮助手艺人获得稳定订单与尊严收入。' }
      },
      news: {
        hero: { title: '新闻资讯', desc: '平台动态、非遗政策、展览活动与跨界联名，一站式掌握花饽饽圈的新鲜事。' },
        n1: { title: '指间塑文化传播平台正式上线', desc: '以「年轻态传播胶东花饽饽」为使命，平台同步开放数字化体验预约与手艺人合作通道，欢迎各界关注。' },
        n2: { title: '胶东花饽饽专题展亮相非遗博览会', desc: '指间塑携合作手艺人代表作及 AR 互动装置参展，现场吸引超万人次体验，社交媒体话题阅读量破百万。' },
        n3: { title: '春季校园公益行启动 · 首站威海', desc: '「指尖上的非遗」走进 6 所中小学，孩子们完成人生第一只面塑作品，数字化课件获教师好评。' }
      },
      about: {
        hero: { title: '关于我们', desc: '指间塑，取自「指尖塑造文化」——我们相信，一团面里，塑得出胶东的烟火，也塑得出下一代的认同。' },
        intro: { title: '平台简介', p1: '指间塑是专注于胶东花饽饽文化传播的公益向平台，面向年轻群体与教育机构，整合数字化体验、手艺人资源、公益实践与资讯传播，让非遗从「听说过」变成「玩过、晒过、爱过」。', p2: '我们不做单页堆砌的展示，而是希望通过可参与、可分享、可延续的项目，构建花饽饽文化的长效传播生态。' },
        v1: '年轻态', v2: '数字化', v3: '手艺人优先', v4: '公益向善', v5: '胶东根脉',
        contact: { title: '联系我们', desc: '合作、采访、志愿服务欢迎联系（示例信息，请替换为真实联系方式）。', email: '邮箱', wechat: '微信', addr: '地址', hours: '工作时间' },
        join: { title: '加入我们', p: '我们需要热爱传统文化的内容运营、视觉设计、数字化开发伙伴，也欢迎高校社团与文创品牌洽谈联名。把简历与作品发至上方邮箱，标题注明「应聘 / 合作 + 姓名」。', a1: '查看手艺人合作 →', a2: '了解公益项目 →' }
      },
      login: {
        title: '登录',
        desc: '登录后可进入 3D 面塑 DIY 工作台（拖拽模型、数字人点评、模型导出、AR 融合）。',
        username: '用户名', password: '密码', usernamePh: '请输入用户名', passPh: '请输入密码', submit: '登录',
        noAccount: '还没有账号？', goRegister: '去注册'
      },
      register: {
        title: '注册',
        desc: '注册仅将账号写入数据库，不会生成任何静态网页；登录后通过统一主页模板展示您的 DIY 作品集。',
        nick: '昵称', username: '用户名', password: '密码', nickPh: '请输入昵称', usernamePh: '请输入用户名', passPh: '请设置密码', submit: '注册',
        hasAccount: '已有账号？', goLogin: '去登录'
      },
      profile: {
        edit: '编辑', delete: '删除', deleteConfirm: '确定删除「{title}」？删除后无法恢复。',
        mySpace: ' · 我的花饽饽 DIY 空间', creator: ' · DIY 创作者',
        join: '加入于 ', published: ' · 已发布 ', works: ' 件',
        cta: '去数字化体验创作', ctaOther: '我也要 DIY 创作',
        myWorks: '我的 DIY 作品集', theirWorks: 'TA 的 DIY 作品集',
        noWorks: '暂无已发布作品。', back: '← 返回数字化展厅',
        drafts: '草稿箱', draftsDesc: '还有 {n} 件未完成发布。',
        noDrafts: '暂无草稿。',
        clearAll: '清空我的作品与草稿',
        clearAllConfirm: '确定清空你在工作台保存、发布的全部作品和草稿？清空后无法恢复，展厅中你的 DIY 作品也会移除。',
        clearDone: '已清空 {n} 件作品与草稿。',
        shareGallery: '分享到展厅',
        shareGalleryUpdate: '更新展厅'
      }
    },
    en: {
      lang: { zh: '中文', en: 'EN', switch: 'Language' },
      nav: {
        home: 'Home',
        huayang: 'Bun Stories',
        digital: 'Digital',
        gallery: 'Gallery',
        artisans: 'Artisans',
        charity: 'Charity',
        news: 'News',
        about: 'About',
        mine: 'My Profile',
        login: 'Log in',
        register: 'Sign up',
        menu: 'Open menu'
      },
      brand: { name: 'Zhijiansu', tag: 'Jiaodong Huabobo' },
      footer: {
        tagline: 'Jiaodong flower-bun culture platform',
        taglineLong: 'Jiaodong flower-bun culture platform\nSee it, love it, pass it on.',
        explore: 'Explore',
        more: 'More',
        copy: '© 2026 Zhijiansu',
        copyLong: '© 2026 Zhijiansu · Jiaodong Huabobo Platform'
      },
      meta: {
        index: 'Zhijiansu — Jiaodong Huabobo Culture',
        digital: 'Digital Experience — Zhijiansu',
        gallery: 'Digital Gallery — Zhijiansu',
        artisans: 'Partner Artisans — Zhijiansu',
        charity: 'Charity — Zhijiansu',
        news: 'News — Zhijiansu',
        about: 'About — Zhijiansu',
        login: 'Log in — Zhijiansu',
        register: 'Sign up — Zhijiansu',
        profile: 'Profile — Zhijiansu',
        work: 'Work — Zhijiansu'
      },
      carousel: { prev: 'Previous', next: 'Next', label: 'Featured', dot: 'Slide {n}' },
      engage: {
        empty: 'No comments yet. Be the first!',
        loginTip: 'Log in to comment. <a href="login.html">Log in</a>',
        placeholder: 'Write a comment…',
        submit: 'Post',
        detail: 'Details',
        loginConfirm: 'Please log in to {action}.\n\nClick OK to go to the login page.',
        like: 'like',
        comment: 'comment',
        fail: 'Comment failed'
      },
      index: {
        c1: { tag: 'Heritage', title: 'One dough, endless forms', desc: 'Jiaodong huabobo—edible art carrying blessings in every curve.' },
        c2: { tag: 'Rituals', title: 'Feasts & ceremonies', desc: 'Weddings, birthdays, festivals—each bun is part of a blessing tradition.' },
        c3: { tag: 'Craft', title: 'Masters, new voices', desc: 'Zhijiansu connects artisans and youth so skills are seen and shared.' },
        c4: { tag: 'Digital', title: 'AR · 3D · Virtual gallery', desc: 'From kitchen to screen—tech opens new ways to experience heritage.' },
        hero: {
          badge: 'Heritage · Reimagined',
          titleHtml: 'Bringing <strong><em>Jiaodong huabobo</em></strong><br>into Gen Z daily life',
          lead: 'Zhijiansu is a Gen Z-focused platform for Jiaodong flower-bun culture—fresh visuals and light storytelling bring this finger heritage from village kitchens to your screen.',
          cta1: 'Start digital experience →',
          cta2: 'About the platform',
          float: '<strong>3000+ years</strong> of noodle culture on the Jiaodong coast'
        },
        what: { title: 'What is huabobo?', desc: 'Huabobo is traditional dough sculpture in Jiaodong—shaped, cut, and colored into auspicious forms for festivals, weddings, and family rites. Food and art in one.' },
        f1: { title: 'Cultural roots', p1: 'Coastal Jiaodong has long flour-food traditions; huabobo ties to rites, seasons, and family memory.', p2: 'From ritual offerings to listed heritage—it reflects local aesthetics and life philosophy.' },
        f2: { title: 'How it is made', p1: 'Good dough, rest, knead, then shape by hand and tool. Masters control humidity and heat; motifs aim for balance and luck.', p2: 'Every piece takes time; hands read the dough better than machines.' },
        f3: { title: 'Why youth should care', p1: 'More than grandma\'s buns—it is guochao aesthetics you can post, collect, and remix. We digitize stories so tradition lives online.', p2: 'Knowing huabobo opens a window to Jiaodong folkways and slow craft.' },
        atlas: { title: 'Huabobo atlas', desc: 'Classic shapes and meanings at a glance.' },
        card1: { tag: 'Longevity', title: 'Peach buns', desc: 'Symbols of health and long life—stars of birthday feasts.' },
        card2: { tag: 'Luck', title: 'Carp leaping', desc: 'Abundance and success; scale texture shows real skill.' },
        card3: { tag: 'Festival', title: 'Festival display', desc: 'Spring, wedding, holiday spreads—one tray, many blessings.' }
      },
      digital: {
        hero: { title: 'Digital experience', desc: 'AR, 3D, and virtual galleries bring huabobo from the stove to your phone—clear, playful, shareable.', cta: 'Start experience' },
        e1: { title: 'AR scan', desc: 'Scan objects or posters to see 3D huabobo and craft stories—great for exhibitions and schools.' },
        e2: { title: '3D patterns', desc: 'Rotate and zoom fish scales, petals, and more—like a museum in your hand.' },
        e3: { title: 'Virtual hall', desc: 'Walk Jiaodong folk scenes online and share your visit.' },
        preview: { title: 'Preview', desc: 'Planned digital modules below; assets may be replaced when live.' },
        f1: { title: 'AR · instant immersion', p1: 'Open our mini app or H5, scan a booth QR, and watch stories overlay the real world.', p2: 'Snap-to-learn lowers the barrier to heritage.' },
        f2: { title: 'High-fidelity 3D library', p1: 'Digitized master works keep texture and color for design and teaching.' },
        f3: { title: 'Virtual gallery · anytime', p1: 'Browse wedding, birthday, and Spring Festival themes with audio guides.' },
        startConfirm: 'DIY studio requires an account.\n\nClick OK to log in or sign up.'
      },
      gallery: {
        hero: { title: 'Digital gallery', desc: 'DIY works from registered users, published to the community. Tap an author to view their portfolio.', cta: 'Create my DIY work →' },
        searchLabel: 'Search works or authors',
        searchPlaceholder: 'Title or author, e.g. carp, Xiaojiaodong',
        searchClear: 'Clear search',
        loading: 'Loading community works…',
        empty: 'No published works yet',
        emptySearch: 'No works or authors matching "{q}"',
        countAll: '{n} works',
        countZero: '0 works',
        countFound: '{n} of {t} works'
      },
      artisans: {
        hero: { title: 'Partner artisans', desc: 'Each artisan is a living archive—we document, respect, and amplify their craft.' },
        more: 'View profile →'
      },
      charity: {
        hero: { title: 'Charity', desc: 'Culture for good—schools, communities, and villages, not only on camera.' },
        s1: 'Partner schools', s2: 'Charity events', s3: 'Youth participants', s4: 'Rural studios supported',
        cases: { title: 'Case studies', desc: 'Real actions linking tradition and today—each photo is a class, a visit, a blessing.' },
        c1: { tag: 'Education', title: 'Heritage in schools', desc: 'Artisans teach fish and peach shapes in Yantai & Weihai schools with digital courseware.' },
        c2: { tag: 'Community', title: 'Double Ninth care', desc: 'Custom longevity buns for elders with youth delivery and companionship.' },
        c3: { tag: 'Rural', title: 'Rural studio digital plan', desc: '3D capture, e-commerce assets, and brand training for stable income.' }
      },
      news: {
        hero: { title: 'News', desc: 'Platform updates, heritage policy, events, and collabs—stay in the loop.' },
        n1: { title: 'Zhijiansu platform goes live', desc: 'Mission: youth-friendly Jiaodong huabobo—digital booking and artisan partnerships open.' },
        n2: { title: 'Huabobo show at heritage expo', desc: 'AR installations drew 10k+ visits; social reads passed one million.' },
        n3: { title: 'Spring school charity · Weihai', desc: 'Six schools, first dough sculpture for many kids—teachers praised digital lessons.' }
      },
      about: {
        hero: { title: 'About us', desc: 'Zhijiansu—shaping culture at the fingertips. One dough holds Jiaodong life and the next generation\'s pride.' },
        intro: { title: 'Overview', p1: 'A public-good platform for Jiaodong huabobo—digital play, artisans, charity, and news so heritage is tried, shared, and loved.', p2: 'We build a lasting ecology, not static brochure pages.' },
        v1: 'Youth-first', v2: 'Digital', v3: 'Artisans first', v4: 'Charity', v5: 'Jiaodong roots',
        contact: { title: 'Contact', desc: 'Partnerships, press, volunteering (sample info—replace with real contacts).', email: 'Email', wechat: 'WeChat', addr: 'Address', hours: 'Hours' },
        join: { title: 'Join us', p: 'We welcome content, design, and dev talent plus campus and brand collabs. Email CV/portfolio with subject "Apply / Partner + name".', a1: 'Artisan partners →', a2: 'Charity projects →' }
      },
      login: {
        title: 'Log in',
        desc: 'Access the 3D DIY studio—drag models, digital-human review, export, AR fusion.',
        username: 'Username', password: 'Password', usernamePh: 'Username', passPh: 'Password', submit: 'Log in',
        noAccount: 'No account yet?', goRegister: 'Sign up'
      },
      register: {
        title: 'Sign up',
        desc: 'Account is stored in the database only—no static pages generated. Your portfolio uses one profile template.',
        nick: 'Nickname', username: 'Username', password: 'Password', nickPh: 'Nickname', usernamePh: 'Username', passPh: 'Set password', submit: 'Sign up',
        hasAccount: 'Have an account?', goLogin: 'Log in'
      },
      profile: {
        edit: 'Edit', delete: 'Delete', deleteConfirm: 'Delete "{title}"? This cannot be undone.',
        mySpace: ' · My DIY space', creator: ' · DIY creator',
        join: 'Joined ', published: ' · Published ', works: ' works',
        cta: 'Start creating', ctaOther: 'I want to DIY too',
        myWorks: 'My DIY portfolio', theirWorks: 'DIY portfolio',
        noWorks: 'No published works yet.', back: '← Back to gallery',
        drafts: 'Drafts', draftsDesc: '{n} draft(s) not published.',
        noDrafts: 'No drafts.',
        clearAll: 'Clear my works & drafts',
        clearAllConfirm: 'Clear all works and drafts saved from the studio? This cannot be undone and removes your DIY items from the gallery.',
        clearDone: 'Cleared {n} work(s) and draft(s).'
      }
    }
  };

  var NAV_HREF = {
    'index.html': 'nav.home',
    'huayang.html': 'nav.huayang',
    'digital.html': 'nav.digital',
    'gallery.html': 'nav.gallery',
    'artisans.html': 'nav.artisans',
    'charity.html': 'nav.charity',
    'news.html': 'nav.news',
    'about.html': 'nav.about',
    'huayang.html': 'nav.huayang'
  };

  function getLang() {
    var s = null;
    try {
      s = localStorage.getItem(STORAGE_KEY);
    } catch (e) {}
    if (s !== 'en' && s !== 'zh') {
      try {
        s = sessionStorage.getItem(STORAGE_KEY);
      } catch (e2) {}
    }
    return s === 'en' ? 'en' : 'zh';
  }

  function saveLang(lang) {
    var v = lang === 'en' ? 'en' : 'zh';
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch (e) {}
    try {
      sessionStorage.setItem(STORAGE_KEY, v);
    } catch (e2) {}
  }

  function navFile(href) {
    var h = (href || '').toLowerCase();
    var m = h.match(/([^/?#]+\.html)/);
    return m ? m[1] : h.split('?')[0].split('#')[0];
  }

  function resolve(obj, key) {
    var parts = key.split('.');
    var v = obj;
    for (var i = 0; i < parts.length; i++) {
      if (v == null) return null;
      v = v[parts[i]];
    }
    return v;
  }

  function format(str, vars) {
    if (!str || !vars) return str;
    return String(str).replace(/\{(\w+)\}/g, function (_, k) {
      return vars[k] != null ? vars[k] : '';
    });
  }

  function t(key, vars) {
    var lang = getLang();
    var val = resolve(STRINGS[lang], key) || resolve(STRINGS.zh, key) || key;
    return format(val, vars);
  }

  function getPageId() {
    var p = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    p = p.split('?')[0].split('#')[0];
    if (p === '' || p === '/') return 'index';
    return p.replace(/\.html$/, '') || 'index';
  }

  function applyAttr(el, attr, key, vars) {
    if (!el) return;
    el.setAttribute(attr, t(key, vars));
  }

  function applyText(el, key, vars, html) {
    if (!el) return;
    var val = t(key, vars);
    if (html) el.innerHTML = val.replace(/\n/g, '<br>');
    else el.textContent = val;
  }

  var PAGE_MAP = {
    index: [
      ['.hero-carousel', 'carousel.label', 'aria'],
      ['.carousel-btn.prev', 'carousel.prev', 'aria'],
      ['.carousel-btn.next', 'carousel.next', 'aria'],
      ['.carousel-slide:nth-child(1) .tag', 'index.c1.tag'],
      ['.carousel-slide:nth-child(1) h2', 'index.c1.title'],
      ['.carousel-slide:nth-child(1) .carousel-caption p', 'index.c1.desc'],
      ['.carousel-slide:nth-child(2) .tag', 'index.c2.tag'],
      ['.carousel-slide:nth-child(2) h2', 'index.c2.title'],
      ['.carousel-slide:nth-child(2) .carousel-caption p', 'index.c2.desc'],
      ['.carousel-slide:nth-child(3) .tag', 'index.c3.tag'],
      ['.carousel-slide:nth-child(3) h2', 'index.c3.title'],
      ['.carousel-slide:nth-child(3) .carousel-caption p', 'index.c3.desc'],
      ['.carousel-slide:nth-child(4) .tag', 'index.c4.tag'],
      ['.carousel-slide:nth-child(4) h2', 'index.c4.title'],
      ['.carousel-slide:nth-child(4) .carousel-caption p', 'index.c4.desc'],
      ['.hero-badge', 'index.hero.badge'],
      ['.hero h1', 'index.hero.titleHtml', 'html'],
      ['.hero-lead', 'index.hero.lead'],
      ['.hero-actions .btn-primary', 'index.hero.cta1'],
      ['.hero-actions .btn-outline', 'index.hero.cta2'],
      ['.hero-float', 'index.hero.float', 'html'],
      ['main .section:nth-of-type(1) .section-title', 'index.what.title'],
      ['main .section:nth-of-type(1) > .container > .section-desc', 'index.what.desc'],
      ['main .section:nth-of-type(1) .feature-row:nth-child(3) h3', 'index.f1.title'],
      ['main .section:nth-of-type(1) .feature-row:nth-child(3) p:nth-of-type(1)', 'index.f1.p1'],
      ['main .section:nth-of-type(1) .feature-row:nth-child(3) p:nth-of-type(2)', 'index.f1.p2'],
      ['main .section:nth-of-type(1) .feature-row:nth-child(4) h3', 'index.f2.title'],
      ['main .section:nth-of-type(1) .feature-row:nth-child(4) p:nth-of-type(1)', 'index.f2.p1'],
      ['main .section:nth-of-type(1) .feature-row:nth-child(4) p:nth-of-type(2)', 'index.f2.p2'],
      ['main .section:nth-of-type(1) .feature-row:nth-child(5) h3', 'index.f3.title'],
      ['main .section:nth-of-type(1) .feature-row:nth-child(5) p:nth-of-type(1)', 'index.f3.p1'],
      ['main .section:nth-of-type(1) .feature-row:nth-child(5) p:nth-of-type(2)', 'index.f3.p2'],
      ['main .section-alt .section-title', 'index.atlas.title'],
      ['main .section-alt .section-desc', 'index.atlas.desc'],
      ['main .section-alt .card:nth-child(1) .card-tag', 'index.card1.tag'],
      ['main .section-alt .card:nth-child(1) h3', 'index.card1.title'],
      ['main .section-alt .card:nth-child(1) .card-body p', 'index.card1.desc'],
      ['main .section-alt .card:nth-child(2) .card-tag', 'index.card2.tag'],
      ['main .section-alt .card:nth-child(2) h3', 'index.card2.title'],
      ['main .section-alt .card:nth-child(2) .card-body p', 'index.card2.desc'],
      ['main .section-alt .card:nth-child(3) .card-tag', 'index.card3.tag'],
      ['main .section-alt .card:nth-child(3) h3', 'index.card3.title'],
      ['main .section-alt .card:nth-child(3) .card-body p', 'index.card3.desc']
    ],
    digital: [
      ['.page-hero h1', 'digital.hero.title'],
      ['.page-hero p', 'digital.hero.desc'],
      ['#btn-start-diy', 'digital.hero.cta'],
      ['.experience-card:nth-child(1) h3', 'digital.e1.title'],
      ['.experience-card:nth-child(1) p', 'digital.e1.desc'],
      ['.experience-card:nth-child(2) h3', 'digital.e2.title'],
      ['.experience-card:nth-child(2) p', 'digital.e2.desc'],
      ['.experience-card:nth-child(3) h3', 'digital.e3.title'],
      ['.experience-card:nth-child(3) p', 'digital.e3.desc'],
      ['.section-alt .section-title', 'digital.preview.title'],
      ['.section-alt .section-desc', 'digital.preview.desc'],
      ['.section-alt .feature-row:nth-child(3) h3', 'digital.f1.title'],
      ['.section-alt .feature-row:nth-child(3) p:nth-of-type(1)', 'digital.f1.p1'],
      ['.section-alt .feature-row:nth-child(3) p:nth-of-type(2)', 'digital.f1.p2'],
      ['.section-alt .feature-row:nth-child(4) h3', 'digital.f2.title'],
      ['.section-alt .feature-row:nth-child(4) p', 'digital.f2.p1'],
      ['.section-alt .feature-row:nth-child(5) h3', 'digital.f3.title'],
      ['.section-alt .feature-row:nth-child(5) p', 'digital.f3.p1']
    ],
    gallery: [
      ['.page-hero h1', 'gallery.hero.title'],
      ['.page-hero p', 'gallery.hero.desc'],
      ['.page-hero-cta', 'gallery.hero.cta'],
      ['.gallery-search-label', 'gallery.searchLabel'],
      ['#gallery-search-input', 'gallery.searchPlaceholder', 'placeholder'],
      ['#gallery-search-clear', 'gallery.searchClear', 'aria']
    ],
    artisans: [['.page-hero h1', 'artisans.hero.title'], ['.page-hero p', 'artisans.hero.desc']],
    charity: [
      ['main .page-hero h1', 'charity.hero.title'],
      ['main .page-hero p', 'charity.hero.desc'],
      ['main .charity-stats .stat-box:nth-child(1) .label', 'charity.s1'],
      ['main .charity-stats .stat-box:nth-child(2) .label', 'charity.s2'],
      ['main .charity-stats .stat-box:nth-child(3) .label', 'charity.s3'],
      ['main .charity-stats .stat-box:nth-child(4) .label', 'charity.s4'],
      ['main .charity-stats ~ .section-title', 'charity.cases.title'],
      ['main .charity-stats ~ .section-desc', 'charity.cases.desc'],
      ['main .card-grid .card:nth-child(1) .card-tag', 'charity.c1.tag'],
      ['main .card-grid .card:nth-child(1) h3', 'charity.c1.title'],
      ['main .card-grid .card:nth-child(1) .card-body p', 'charity.c1.desc'],
      ['main .card-grid .card:nth-child(2) .card-tag', 'charity.c2.tag'],
      ['main .card-grid .card:nth-child(2) h3', 'charity.c2.title'],
      ['main .card-grid .card:nth-child(2) .card-body p', 'charity.c2.desc'],
      ['main .card-grid .card:nth-child(3) .card-tag', 'charity.c3.tag'],
      ['main .card-grid .card:nth-child(3) h3', 'charity.c3.title'],
      ['main .card-grid .card:nth-child(3) .card-body p', 'charity.c3.desc']
    ],
    news: [
      ['main .page-hero h1', 'news.hero.title'],
      ['main .page-hero p', 'news.hero.desc'],
      ['main .news-list .news-item:nth-child(1) h3', 'news.n1.title'],
      ['main .news-list .news-item:nth-child(1) p', 'news.n1.desc'],
      ['main .news-list .news-item:nth-child(2) h3', 'news.n2.title'],
      ['main .news-list .news-item:nth-child(2) p', 'news.n2.desc'],
      ['main .news-list .news-item:nth-child(3) h3', 'news.n3.title'],
      ['main .news-list .news-item:nth-child(3) p', 'news.n3.desc']
    ],
    about: [
      ['.page-hero h1', 'about.hero.title'],
      ['.page-hero p', 'about.hero.desc'],
      ['.section:nth-of-type(1) .section-title', 'about.intro.title'],
      ['.section:nth-of-type(1) p:nth-of-type(1)', 'about.intro.p1'],
      ['.section:nth-of-type(1) p:nth-of-type(2)', 'about.intro.p2'],
      ['.value-pill:nth-child(1)', 'about.v1'],
      ['.value-pill:nth-child(2)', 'about.v2'],
      ['.value-pill:nth-child(3)', 'about.v3'],
      ['.value-pill:nth-child(4)', 'about.v4'],
      ['.value-pill:nth-child(5)', 'about.v5'],
      ['.section-alt .about-grid > div:first-child .section-title', 'about.contact.title'],
      ['.section-alt .about-grid > div:first-child .section-desc', 'about.contact.desc'],
      ['.section-alt .about-grid > div:last-child .section-title', 'about.join.title'],
      ['.section-alt .about-grid > div:last-child p', 'about.join.p'],
      ['.section-alt a.btn-outline', 'about.join.a1'],
      ['.section-alt a.btn-primary', 'about.join.a2']
    ],
    login: [
      ['.section-title', 'login.title'],
      ['.section-desc', 'login.desc'],
      ['#login-form label:nth-child(1) span', 'login.username'],
      ['#login-form label:nth-child(2) span', 'login.password'],
      ['#login-form input[name="username"]', 'login.usernamePh', 'placeholder'],
      ['#login-form input[name="password"]', 'login.passPh', 'placeholder'],
      ['#login-form button', 'login.submit']
    ],
    register: [
      ['.section-title', 'register.title'],
      ['.section-desc', 'register.desc'],
      ['#register-form label:nth-child(1) span', 'register.nick'],
      ['#register-form label:nth-child(2) span', 'register.username'],
      ['#register-form label:nth-child(3) span', 'register.password'],
      ['#register-form input[name="nickname"]', 'register.nickPh', 'placeholder'],
      ['#register-form input[name="username"]', 'register.usernamePh', 'placeholder'],
      ['#register-form input[name="password"]', 'register.passPh', 'placeholder'],
      ['#register-form button', 'register.submit']
    ]
  };

  function applyDataAttributes() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (key) el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-html');
      if (key) el.innerHTML = t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      if (key) el.placeholder = t(key);
    });
    document.querySelectorAll('[data-i18n-alt]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-alt');
      if (key) el.alt = t(key);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-aria');
      if (key) el.setAttribute('aria-label', t(key));
    });
  }

  function applyChrome() {
    document.querySelectorAll('.main-nav a').forEach(function (a) {
      var key = NAV_HREF[navFile(a.getAttribute('href'))];
      if (key) a.textContent = t(key);
    });
    var mine = document.querySelector('.nav-mine');
    if (mine) mine.textContent = t('nav.mine');
    var login = document.querySelector('.btn-login');
    var reg = document.querySelector('.btn-register');
    if (login) login.textContent = t('nav.login');
    if (reg) reg.textContent = t('nav.register');
    var toggle = document.querySelector('.nav-toggle');
    if (toggle) toggle.setAttribute('aria-label', t('nav.menu'));
    var bname = document.querySelector('.brand-name');
    var btag = document.querySelector('.brand-tag');
    if (bname) bname.textContent = t('brand.name');
    if (btag) btag.textContent = t('brand.tag');
    var logo = document.querySelector('.brand-logo');
    if (logo) logo.alt = t('brand.name') + ' Logo';

    document.querySelectorAll('.footer-col').forEach(function (col, idx) {
      var h = col.querySelector('h4');
      if (h) h.textContent = t(idx === 0 ? 'footer.explore' : 'footer.more');
      col.querySelectorAll('a').forEach(function (a) {
        var key = NAV_HREF[navFile(a.getAttribute('href'))];
        if (key) a.textContent = t(key);
      });
    });
    var fb = document.querySelector('.footer-brand p');
    if (fb) {
      if (fb.innerHTML.indexOf('<br>') >= 0) fb.innerHTML = t('footer.taglineLong').replace(/\n/g, '<br>');
      else fb.textContent = t('footer.tagline');
    }
    var fbn = document.querySelector('.footer-brand .brand-name');
    if (fbn) fbn.textContent = t('brand.name');
    var bottom = document.querySelector('.footer-bottom p');
    if (bottom) {
      bottom.textContent =
        bottom.textContent.indexOf('·') >= 0 ? t('footer.copyLong') : t('footer.copy');
    }
  }

  function applyPageMap(page) {
    var items = PAGE_MAP[page] || [];
    items.forEach(function (row) {
      var sel = row[0];
      var key = row[1];
      var mode = row[2];
      var el = document.querySelector(sel);
      if (!el) return;
      if (mode === 'aria') applyAttr(el, 'aria-label', key);
      else if (mode === 'placeholder') el.placeholder = t(key);
      else if (mode === 'html') el.innerHTML = t(key);
      else el.textContent = t(key);
    });
  }

  function applyLoginRegisterExtras(page) {
    document.querySelectorAll('main .container p').forEach(function (el) {
      if (page === 'login' && el.querySelector('a[href="register.html"]')) {
        el.innerHTML =
          t('login.noAccount') +
          ' <a href="register.html" style="color: var(--primary); font-weight: 600;">' +
          t('login.goRegister') +
          '</a>';
      }
      if (page === 'register' && el.querySelector('a[href="login.html"]')) {
        el.innerHTML =
          t('register.hasAccount') +
          ' <a href="login.html" style="color: var(--primary); font-weight: 600;">' +
          t('register.goLogin') +
          '</a>';
      }
    });
  }

  function applyI18n() {
    var lang = getLang();
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
    var page = getPageId();
    var metaKey = 'meta.' + (page === 'index' ? 'index' : page);
    var profileHasUser =
      page === 'profile' &&
      document.getElementById('profile-root') &&
      document.querySelector('.author-profile-header h1');
    if (!profileHasUser && resolve(STRINGS[lang], metaKey)) document.title = t(metaKey);
    applyChrome();
    applyDataAttributes();
    applyPageMap(page);
    applyLoginRegisterExtras(page);
    updateLangButtons();
    window.dispatchEvent(new CustomEvent('zhijiansu:langchange', { detail: { lang: lang } }));
  }

  function updateLangButtons() {
    var lang = getLang();
    document.querySelectorAll('.lang-btn').forEach(function (btn) {
      var on = btn.getAttribute('data-lang') === lang;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function injectLangSwitcher() {
    var inner = document.querySelector('.header-inner');
    if (!inner) return;

    if (!inner.querySelector('.header-leading') && inner.querySelector('.lang-switch')) {
      var existingLang = inner.querySelector('.lang-switch');
      var existingBrand = inner.querySelector('.brand');
      var group = document.createElement('div');
      group.className = 'header-leading';
      group.appendChild(existingLang);
      if (existingBrand && existingBrand.parentNode === inner) group.appendChild(existingBrand);
      inner.insertBefore(group, inner.firstChild);
      return;
    }

    if (inner.querySelector('.lang-switch')) return;

    var brand = inner.querySelector('.brand');
    var leading = document.createElement('div');
    leading.className = 'header-leading';

    var wrap = document.createElement('div');
    wrap.className = 'lang-switch';
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', t('lang.switch'));
    var cur = getLang();
    wrap.innerHTML =
      '<button type="button" class="lang-btn' +
      (cur === 'zh' ? ' is-active' : '') +
      '" data-lang="zh">' +
      t('lang.zh') +
      '</button><button type="button" class="lang-btn' +
      (cur === 'en' ? ' is-active' : '') +
      '" data-lang="en">' +
      t('lang.en') +
      '</button>';

    leading.appendChild(wrap);
    if (brand) leading.appendChild(brand);
    inner.insertBefore(leading, inner.firstChild);
    wrap.querySelectorAll('.lang-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var next = btn.getAttribute('data-lang');
        if (next === getLang()) return;
        saveLang(next);
        applyI18n();
      });
    });
  }

  function setLang(lang) {
    saveLang(lang);
    applyI18n();
  }

  window.ZJS = window.ZJS || {};
  ZJS.t = t;
  ZJS.getLang = getLang;
  ZJS.setLang = setLang;
  ZJS.applyI18n = applyI18n;

  function bootI18n() {
    injectLangSwitcher();
    applyI18n();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootI18n);
  } else {
    bootI18n();
  }

  window.addEventListener('pageshow', function (e) {
    if (e.persisted) applyI18n();
  });
})();
