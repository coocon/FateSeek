import { config } from '../config/env';

// 封装请求方法
export const request = (options: WechatMiniprogram.RequestOption) => {
  const baseOptions = {
    ...options,
    header: {
      ...options.header,
      'Authorization': `Bearer ${config.SILICON_API_KEY}`,
      'Content-Type': 'application/json'
    }
  };

  return new Promise((resolve, reject) => {
    wx.request({
      ...baseOptions,
      success: (res) => {
        console.log('API Response:', res.data);
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject(new Error(`Request failed with status ${res.statusCode}`));
        }
      },
      fail: (err) => {
        console.error('Request failed:', err);
        reject(err);
      }
    });
  });
}; 