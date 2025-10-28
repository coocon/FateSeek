import { AuthManager, UserInfo } from '../../utils/auth';

Page({
  data: {
    userInfo: null,
    isLoggedIn: false,
    isLoading: false
  },

  onLoad() {
    this.checkLoginStatus();
  },

  onShow() {
    this.checkLoginStatus();
  },

  // 检查登录状态
  checkLoginStatus() {
    const isLoggedIn = AuthManager.isLoggedIn();
    const userInfo = AuthManager.getUserInfo();

    this.setData({
      isLoggedIn,
      userInfo
    });

    // 如果有Token但验证失败，清除登录状态
    if (isLoggedIn && userInfo) {
      AuthManager.checkTokenValidity().then((isValid) => {
        if (!isValid) {
          this.handleLogoutSilent();
        }
      });
    }
  },

  // 静默退出登录
  handleLogoutSilent() {
    AuthManager.logout();
    this.setData({
      isLoggedIn: false,
      userInfo: null
    });
  },

  navigateToHistory() {
    wx.navigateTo({
      url: '/pages/history/history'
    });
  },

  navigateToFavorites() {
    wx.navigateTo({
      url: '/pages/favorites/favorites'
    });
  },

  navigateToVIP() {
    wx.navigateTo({
      url: '/pages/vip/vip'
    });
  },

  // 处理登录
  async handleLogin() {
    if (this.data.isLoading) {
      return;
    }

    this.setData({ isLoading: true });

    try {
      const result = await AuthManager.wechatLogin();

      if (result.success && result.data) {
        wx.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 2000
        });

        // 更新页面状态
        this.setData({
          isLoggedIn: true,
          userInfo: result.data.user,
          isLoading: false
        });

      } else {
        wx.showToast({
          title: result.message || '登录失败',
          icon: 'none',
          duration: 3000
        });

        this.setData({ isLoading: false });
      }

    } catch (error) {
      console.error('登录过程出错:', error);
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none',
        duration: 3000
      });

      this.setData({ isLoading: false });
    }
  },

  // 处理退出登录
  handleLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？退出后需要重新登录才能使用完整功能。',
      confirmText: '确定退出',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.performLogout();
        }
      }
    });
  },

  // 执行退出登录
  performLogout() {
    AuthManager.logout();

    this.setData({
      isLoggedIn: false,
      userInfo: null
    });

    wx.showToast({
      title: '已退出登录',
      icon: 'success',
      duration: 2000
    });
  }
}); 