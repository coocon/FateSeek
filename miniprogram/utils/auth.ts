// 用户登录和认证相关功能

export interface UserInfo {
  id: string;
  openid: string;
  unionid?: string;
  nickName: string;
  avatarUrl: string;
  gender: number;
  city: string;
  province: string;
  country: string;
  language: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data?: {
    user: UserInfo;
    token: string;
  };
}

export class AuthManager {

  // 登录接口地址
  private static readonly LOGIN_URL = 'https://apis.cooconsbit.com/fateseek/api/weChatMp/login';

  // 本地存储键名
  private static readonly STORAGE_KEYS = {
    USER_INFO: 'userInfo',
    TOKEN: 'userToken',
    OPENID: 'openid',
    IS_LOGGED_IN: 'isLoggedIn'
  };

  // 检查登录状态
  static isLoggedIn(): boolean {
    return wx.getStorageSync(this.STORAGE_KEYS.IS_LOGGED_IN) || false;
  }

  // 获取用户信息
  static getUserInfo(): UserInfo | null {
    try {
      return wx.getStorageSync(this.STORAGE_KEYS.USER_INFO) || null;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      return null;
    }
  }

  // 获取Token
  static getToken(): string {
    return wx.getStorageSync(this.STORAGE_KEYS.TOKEN) || '';
  }

  // 获取OpenID
  static getOpenid(): string {
    return wx.getStorageSync(this.STORAGE_KEYS.OPENID) || '';
  }

  // 保存登录信息
  private static saveLoginInfo(userInfo: UserInfo, token: string): void {
    try {
      wx.setStorageSync(this.STORAGE_KEYS.USER_INFO, userInfo);
      wx.setStorageSync(this.STORAGE_KEYS.TOKEN, token);
      wx.setStorageSync(this.STORAGE_KEYS.OPENID, userInfo.openid);
      wx.setStorageSync(this.STORAGE_KEYS.IS_LOGGED_IN, true);
    } catch (error) {
      console.error('保存登录信息失败:', error);
    }
  }

  // 清除登录信息
  static clearLoginInfo(): void {
    try {
      wx.removeStorageSync(this.STORAGE_KEYS.USER_INFO);
      wx.removeStorageSync(this.STORAGE_KEYS.TOKEN);
      wx.removeStorageSync(this.STORAGE_KEYS.OPENID);
      wx.setStorageSync(this.STORAGE_KEYS.IS_LOGGED_IN, false);
    } catch (error) {
      console.error('清除登录信息失败:', error);
    }
  }

  // 微信登录
  static async wechatLogin(): Promise<LoginResponse> {
    try {
      // 1. 获取微信登录凭证
      const loginResult = await this.getWechatCode();
      if (!loginResult.success) {
        return {
          success: false,
          message: '获取微信登录凭证失败'
        };
      }

      // 2. 获取用户信息授权
      const userInfoResult = await this.getUserProfile();
      if (!userInfoResult.success) {
        return {
          success: false,
          message: userInfoResult.message
        };
      }

      // 3. 调用登录接口
      const loginData = {
        code: loginResult.code,
        userInfo: userInfoResult.userInfo
      };

      const response = await this.requestLogin(loginData);

      if (response.success && response.data) {
        // 保存登录信息
        this.saveLoginInfo(response.data.user, response.data.token);

        return {
          success: true,
          message: '登录成功',
          data: response.data
        };
      } else {
        return {
          success: false,
          message: response.message || '登录失败'
        };
      }

    } catch (error) {
      console.error('微信登录失败:', error);
      return {
        success: false,
        message: '登录过程中发生错误'
      };
    }
  }

  // 获取微信登录凭证
  private static async getWechatCode(): Promise<{ success: boolean; code?: string; message?: string }> {
    return new Promise((resolve) => {
      wx.login({
        success: (res) => {
          if (res.code) {
            resolve({
              success: true,
              code: res.code
            });
          } else {
            resolve({
              success: false,
              message: '获取登录凭证失败'
            });
          }
        },
        fail: (error) => {
          console.error('wx.login失败:', error);
          resolve({
            success: false,
            message: '微信登录接口调用失败'
          });
        }
      });
    });
  }

  // 获取用户信息
  private static async getUserProfile(): Promise<{ success: boolean; userInfo?: any; message?: string }> {
    return new Promise((resolve) => {
      // 先检查是否已经授权
      wx.getSetting({
        success: (settingRes) => {
          if (settingRes.authSetting['scope.userInfo']) {
            // 已经授权，直接获取用户信息
            wx.getUserInfo({
              success: (userRes) => {
                resolve({
                  success: true,
                  userInfo: userRes.userInfo
                });
              },
              fail: (error) => {
                console.error('获取用户信息失败:', error);
                resolve({
                  success: false,
                  message: '获取用户信息失败'
                });
              }
            });
          } else {
            // 未授权，需要用户授权
            wx.getUserProfile({
              desc: '用于完善用户资料',
              success: (userRes) => {
                resolve({
                  success: true,
                  userInfo: userRes.userInfo
                });
              },
              fail: (error) => {
                console.error('用户授权失败:', error);
                resolve({
                  success: false,
                  message: '用户取消授权'
                });
              }
            });
          }
        },
        fail: (error) => {
          console.error('获取设置失败:', error);
          resolve({
            success: false,
            message: '获取用户设置失败'
          });
        }
      });
    });
  }

  // 请求登录接口
  private static async requestLogin(loginData: any): Promise<LoginResponse> {
    return new Promise((resolve) => {
      wx.request({
        url: this.LOGIN_URL,
        method: 'POST',
        data: loginData,
        header: {
          'Content-Type': 'application/json'
        },
        success: (res) => {
          if (res.statusCode === 200) {
            const data = res.data as any;
            resolve({
              success: data.success || false,
              message: data.message || '登录接口调用完成',
              data: data.data
            });
          } else {
            resolve({
              success: false,
              message: `登录接口返回错误: ${res.statusCode}`
            });
          }
        },
        fail: (error) => {
          console.error('登录接口调用失败:', error);
          resolve({
            success: false,
            message: '网络请求失败，请检查网络连接'
          });
        }
      });
    });
  }

  // 退出登录
  static logout(): void {
    this.clearLoginInfo();

    // 可以在这里调用退出登录接口（如果需要的话）
    console.log('用户已退出登录');
  }

  // 检查Token是否有效
  static async checkTokenValidity(): Promise<boolean> {
    const token = this.getToken();
    if (!token) {
      return false;
    }

    // 这里可以添加Token验证逻辑
    // 比如调用接口验证Token是否有效
    try {
      // 简单检查：如果有Token且用户信息存在，认为有效
      const userInfo = this.getUserInfo();
      return !!userInfo;
    } catch (error) {
      console.error('检查Token有效性失败:', error);
      return false;
    }
  }
}