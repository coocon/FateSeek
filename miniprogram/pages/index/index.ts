import { request } from '../../utils/request';
import { config } from '../../config/env';

Page({
    data: {
      birthday: '1990-01-01',
      birthTime: '10:00',
      region: ['北京市', '北京市', '海淀区'],
      isLunar: false, // 是否农历
      loading: false,
    },
  
    // 生日选择器变化
    onBirthdayChange(e: WechatMiniprogram.PickerChange) {
      try {
        this.setData({ birthday: e.detail.value });
      } catch (err) {
        console.error('Birthday change error:', err);
      }
    },

    // 出生时间选择
    onTimeChange(e: WechatMiniprogram.PickerChange) {
      this.setData({
        birthTime: e.detail.value
      });
    },

    // 地区选择器变化
    onRegionChange(e: WechatMiniprogram.PickerChange) {
      this.setData({
        region: e.detail.value
      });
    },

    // 切换农历/公历
    onCalendarSwitch() {
      this.setData({
        isLunar: !this.data.isLunar
      });
    },
  
    async handleSubmit() {
      const { birthday, birthTime, region, isLunar } = this.data;
      
      if (!birthday || !birthTime || !region[0]) {
        wx.showToast({ 
          title: '请填写完整的出生日期、时间和地区信息', 
          icon: 'none' 
        });
        return;
      }
  
      this.setData({ loading: true });
  
      try {
        console.log('准备跳转，参数：', {
          birthday,
          birthTime,
          region,
          isLunar
        });

        const params = encodeURIComponent(JSON.stringify({
          birthday,
          birthTime,
          region,
          isLunar
        }));

        wx.navigateTo({
          url: `/pages/result/result?params=${params}`,
          success: () => {
            console.log('跳转成功');
          },
          fail: (err) => {
            console.error('跳转失败:', err);
            wx.showToast({
              title: '页面跳转失败',
              icon: 'none'
            });
          }
        });
      } catch (error) {
        console.error('操作失败:', error);
        wx.showToast({
          title: '操作失败，请重试',
          icon: 'none'
        });
      } finally {
        this.setData({ loading: false });
      }
    },

    onError(err: any) {
      console.error('Page Error:', err);
    }
});