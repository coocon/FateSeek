// app.ts
const towxml = require('./towxml/index');

App<IAppOption>({
  globalData: {},
  towxml,
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 登录
    wx.login({
      success: res => {
        console.log(res.code)
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      },
    })
  },
  onError(err) {
    console.error('App Error:', err)
  },
  // 添加未处理Promise拒绝的监听器
  onUnhandledRejection(res) {
    console.error('Unhandled Promise Rejection:', res.reason)
  }
})