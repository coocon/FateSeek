Page({
  data: {
    articles: [
      {
        id: 1,
        title: '八字基础知识',
        desc: '了解八字的基本概念和组成部分',
        date: '2024-03-20'
      },
      {
        id: 2,
        title: '五行相生相克',
        desc: '深入理解五行之间的关系',
        date: '2024-03-19'
      }
    ]
  },

  onArticleTap(e: any) {
    const { id } = e.currentTarget.dataset;
    // TODO: 跳转到文章详情页
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  }
}); 