/** 关于我们默认内容（与前端 about.html 示例一致） */
function getDefaultAboutData() {
  return {
    heroTitle: '关于我们',
    heroSubtitle:
      '指间塑，取自「指尖塑造文化」——我们相信，一团面里，塑得出胶东的烟火，也塑得出下一代的认同。',
    introTitle: '平台简介',
    introText:
      '指间塑是专注于胶东花饽饽文化传播的公益向平台，面向年轻群体与教育机构，整合数字化体验、手艺人资源、公益实践与资讯传播，让非遗从「听说过」变成「玩过、晒过、爱过」。\n\n我们不做单页堆砌的展示，而是希望通过可参与、可分享、可延续的项目，构建花饽饽文化的长效传播生态。',
    introImage: 'images/about-team.jpg',
    values: ['年轻态', '数字化', '手艺人优先', '公益向善', '胶东根脉'],
    printSectionTitle: '可打印作品展示',
    printSectionDesc:
      '在平台完成 DIY 花饽饽设计后，可将作品提交给我们进行实体打印。以下为部分可打印作品示例，供您参考风格与效果。',
    printWorks: [
      {
        title: '寿桃祝福',
        desc: '经典祝寿造型，适合长辈贺寿场景。',
        image: 'images/work-wang-1.jpg'
      },
      {
        title: '花鸟小品',
        desc: '精致花鸟纹样，色彩柔和。',
        image: 'images/work-wang-2.jpg'
      },
      {
        title: '龙凤呈祥',
        desc: '婚嫁喜庆组合，寓意美满。',
        image: 'images/work-wang-3.jpg'
      },
      {
        title: '生肖限定',
        desc: '生肖主题立体造型，年轻送礼首选。',
        image: 'images/work-zhang-2.jpg'
      },
      {
        title: '节庆礼盒',
        desc: '节日伴手礼规格，支持定制包装。',
        image: 'images/work-zhang-3.jpg'
      }
    ],
    joinTitle: '加入我们',
    joinText:
      '我们需要热爱传统文化的内容运营、视觉设计、数字化开发伙伴，也欢迎高校社团与文创品牌洽谈联名。把简历与作品发至上方邮箱，标题注明「应聘 / 合作 + 姓名」。',
    contact: {
      email: 'hello@zhijiansu.cn',
      wechat: 'zhijiansu_official',
      address: '山东省烟台市（示例）',
      hours: '周一至周五 9:00—18:00',
      note: '合作、采访、志愿服务欢迎联系（示例信息，请替换为真实联系方式）。'
    }
  };
}

module.exports = { getDefaultAboutData };
