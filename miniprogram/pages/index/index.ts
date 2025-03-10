import { request } from '../../utils/request';
import { config } from '../../config/env';
import { agreementContent } from '../../data/agreement';

interface IPageData {
  name: string;
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  birthDateTime: string;
  region: string[];
  isLunar: boolean;
  loading: boolean;
  gender: string;
  dateTimeArray: string[][];
  dateTimeIndex: number[];
  showAgreementModal: boolean;
  agreementContent: string;
}

Page({
    data: {
      name: '天命人',
      year: '',
      month: '',
      day: '',
      hour: '',
      minute: '',
      birthDateTime: '',
      region: ['北京市', '北京市', '海淀区'],
      isLunar: true,
      loading: false,
      gender: 'male',
      dateTimeArray: [],
      dateTimeIndex: [0, 0, 0, 0, 0],
      showAgreementModal: false,
      agreementContent: agreementContent,
    } as IPageData,
  
    onLoad() {
      // 初始化日期时间选择器数据
      this.initDateTimePicker();
    },

    // 初始化日期时间选择器
    initDateTimePicker() {
      const years: string[] = [];
      const months: string[] = [];
      const days: string[] = [];
      const hours: string[] = [];
      const minutes: string[] = [];

      // 年份范围：1925-2025
      for (let i = 1925; i <= 2025; i++) {
        years.push(i + '年');
      }

      // 月份
      for (let i = 1; i <= 12; i++) {
        months.push(i.toString().padStart(2, '0') + '月');
      }

      // 日期
      for (let i = 1; i <= 31; i++) {
        days.push(i.toString().padStart(2, '0') + '日');
      }

      // 小时
      for (let i = 0; i < 24; i++) {
        hours.push(i.toString().padStart(2, '0') + '时');
      }

      // 分钟
      for (let i = 0; i < 60; i++) {
        minutes.push(i.toString().padStart(2, '0') + '分');
      }

      // 设置默认时间：1990年6月15日 12点30分
      const defaultYear = '1988年';
      const defaultMonth = '05月';
      const defaultDay = '11日';
      const defaultHour = '10时';
      const defaultMinute = '00分';

      const yearIndex = years.findIndex(y => y === defaultYear);
      const monthIndex = months.findIndex(m => m === defaultMonth);
      const dayIndex = days.findIndex(d => d === defaultDay);
      const hourIndex = hours.findIndex(h => h === defaultHour);
      const minuteIndex = minutes.findIndex(m => m === defaultMinute);

      this.setData({
        dateTimeArray: [years, months, days, hours, minutes],
        dateTimeIndex: [yearIndex, monthIndex, dayIndex, hourIndex, minuteIndex]
      });

      this.updateDateTime();
    },

    // 更新日期时间显示
    updateDateTime() {
      const { dateTimeArray, dateTimeIndex } = this.data;
      if (dateTimeArray.length === 0) return;

      const year = dateTimeArray[0][dateTimeIndex[0]].replace('年', '');
      const month = dateTimeArray[1][dateTimeIndex[1]].replace('月', '');
      const day = dateTimeArray[2][dateTimeIndex[2]].replace('日', '');
      const hour = dateTimeArray[3][dateTimeIndex[3]].replace('时', '');
      const minute = dateTimeArray[4][dateTimeIndex[4]].replace('分', '');

      this.setData({
        year,
        month,
        day,
        hour,
        minute,
        birthDateTime: `${year}-${month}-${day} ${hour}:${minute}`
      });
    },

    // 日期时间选择器列变化
    onDateTimeColumnChange(e: WechatMiniprogram.PickerColumnChange) {
      const { column, value } = e.detail;
      const { dateTimeIndex, dateTimeArray } = this.data;
      const newIndex = [...dateTimeIndex];
      newIndex[column] = value;

      // 如果修改了年或月，需要更新日期的最大值
      if (column === 0 || column === 1) {
        const year = parseInt(dateTimeArray[0][newIndex[0]].replace('年', ''));
        const month = parseInt(dateTimeArray[1][newIndex[1]].replace('月', ''));
        const maxDays = new Date(year, month, 0).getDate();
        const days: string[] = [];
        
        for (let i = 1; i <= maxDays; i++) {
          days.push(i.toString().padStart(2, '0') + '日');
        }

        // 如果当前选择的日期超过了最大天数，调整为最后一天
        if (newIndex[2] >= days.length) {
          newIndex[2] = days.length - 1;
        }

        this.setData({
          dateTimeArray: [
            dateTimeArray[0],
            dateTimeArray[1],
            days,
            dateTimeArray[3],
            dateTimeArray[4]
          ],
          dateTimeIndex: newIndex
        });
      } else {
        this.setData({ dateTimeIndex: newIndex });
      }

      this.updateDateTime();
    },

    // 日期时间选择器值变化
    onDateTimeChange(e: WechatMiniprogram.PickerChange) {
      const newIndex = e.detail.value as number[];
      this.setData({ dateTimeIndex: newIndex });
      this.updateDateTime();
    },

    // 姓名输入处理
    onNameInput(e: WechatMiniprogram.Input) {
      this.setData({
        name: e.detail.value
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

    // 切换性别
    onGenderSwitch(e: WechatMiniprogram.TouchEvent) {
      const gender = e.currentTarget.dataset.gender;
      if (this.data.gender !== gender) {  // 只在不同值时才更新
        this.setData({ gender });
      }
    },
  
    async handleSubmit() {
      const { name, birthDateTime, region, isLunar, gender } = this.data;
      
      if (!name || !birthDateTime || !region[0]) {
        wx.showToast({ 
          title: '请填写完整的姓名、出生日期时间和地区信息', 
          icon: 'none' 
        });
        return;
      }
  
      this.setData({ loading: true });
  
      try {
        console.log('准备跳转，参数：', {
          name,
          birthDateTime,
          region,
          isLunar,
          gender
        });

        const params = encodeURIComponent(JSON.stringify({
          name,
          birthDateTime,
          region,
          isLunar,
          gender
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
    },

    // 显示协议弹窗
    showAgreement() {
      this.setData({
        showAgreementModal: true
      });
    },

    // 隐藏协议弹窗
    hideAgreement() {
      this.setData({
        showAgreementModal: false
      });
    },
});