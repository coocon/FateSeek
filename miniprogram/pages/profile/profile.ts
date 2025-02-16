Page({
  data: {
    userInfo: null,
    hasUserInfo: false
  },

  onLoad() {
    // 检查是否已经授权
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.userInfo']) {
          this.getUserInfo();
        }
      }
    });
  },

  getUserInfo() {
    wx.getUserInfo({
      success: (res) => {
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        });
      }
    });
  }
}); 