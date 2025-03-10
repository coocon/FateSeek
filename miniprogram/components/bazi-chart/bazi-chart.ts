import { calculateBazi } from '../../utils/util';

interface IBaziChartData {
  solarDate: string;
  isLunar: boolean;
  yearStar: string;
  monthStar: string;
  dayStar: string;
  timeStar: string;
  yearGan: string;
  monthGan: string;
  dayGan: string;
  timeGan: string;
  yearGanClass: string;
  monthGanClass: string;
  dayGanClass: string;
  timeGanClass: string;
  yearZhi: string;
  monthZhi: string;
  dayZhi: string;
  timeZhi: string;
  yearZhiClass: string;
  monthZhiClass: string;
  dayZhiClass: string;
  timeZhiClass: string;
  yearHiddenGan: Array<{value: string, class: string}>;
  monthHiddenGan: Array<{value: string, class: string}>;
  dayHiddenGan: Array<{value: string, class: string}>;
  timeHiddenGan: Array<{value: string, class: string}>;
  yearDeputyStars: string[];
  monthDeputyStars: string[];
  dayDeputyStars: string[];
  timeDeputyStars: string[];
}

type WuXingType = 'wood' | 'fire' | 'earth' | 'metal' | 'water';
type TianGanType = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸';
type DiZhiType = '子' | '丑' | '寅' | '卯' | '辰' | '巳' | '午' | '未' | '申' | '酉' | '戌' | '亥';

// 五行对应关系
const WuXing: Record<TianGanType | DiZhiType, WuXingType> = {
  '甲': 'wood',
  '乙': 'wood',
  '丙': 'fire',
  '丁': 'fire',
  '戊': 'earth',
  '己': 'earth',
  '庚': 'metal',
  '辛': 'metal',
  '壬': 'water',
  '癸': 'water',
  '子': 'water',
  '丑': 'earth',
  '寅': 'wood',
  '卯': 'wood',
  '辰': 'earth',
  '巳': 'fire',
  '午': 'fire',
  '未': 'earth',
  '申': 'metal',
  '酉': 'metal',
  '戌': 'earth',
  '亥': 'water'
};

Component({
  properties: {
    birthDateTime: {
      type: String,
      value: ''
    },
    isLunar: {
      type: Boolean,
      value: false
    },
    region: {
      type: Array,
      value: []
    }
  },

  data: {
    solarDate: '',
    isLunar: false,
    yearStar: '',
    monthStar: '',
    dayStar: '',
    timeStar: '',
    yearGan: '',
    monthGan: '',
    dayGan: '',
    timeGan: '',
    yearGanClass: '',
    monthGanClass: '',
    dayGanClass: '',
    timeGanClass: '',
    yearZhi: '',
    monthZhi: '',
    dayZhi: '',
    timeZhi: '',
    yearZhiClass: '',
    monthZhiClass: '',
    dayZhiClass: '',
    timeZhiClass: '',
    yearHiddenGan: [],
    monthHiddenGan: [],
    dayHiddenGan: [],
    timeHiddenGan: [],
    yearDeputyStars: [],
    monthDeputyStars: [],
    dayDeputyStars: [],
    timeDeputyStars: []
  } as IBaziChartData,

  observers: {
    'birthDateTime, isLunar, region': function(birthDateTime: string, isLunar: boolean, region: string[]) {
      if (birthDateTime && region.length > 0) {
        this.calculateBaziData(birthDateTime, isLunar, region);
      }
    }
  },

  methods: {
    calculateBaziData(birthDateTime: string, isLunar: boolean, region: string[]) {
      // 解析出生日期时间
      const [date, time] = birthDateTime.split(' ');
      const [year, month, day] = date.split('-');
      const [hour, minute] = time.split(':');
      
      // 获取经纬度（这里使用示例值，实际应该根据地区获取）
      const latitude = 31.23; // 示例：上海
      const longitude = 121.47;

      // 计算八字
      const moment = require('moment');
      const birthTime = moment(`${year}-${month}-${day} ${hour}:${minute}`);
      const bazi = calculateBazi(birthTime, latitude, longitude);

      // 更新数据
      this.setData({
        solarDate: `${year}年${month}月${day}日 ${hour}:${minute}`,
        isLunar,
        yearGan: bazi.year.gan,
        yearGanClass: WuXing[bazi.year.gan as TianGanType],
        monthGan: bazi.month.gan,
        monthGanClass: WuXing[bazi.month.gan as TianGanType],
        dayGan: bazi.day.gan,
        dayGanClass: WuXing[bazi.day.gan as TianGanType],
        timeGan: bazi.time.gan,
        timeGanClass: WuXing[bazi.time.gan as TianGanType],
        yearZhi: bazi.year.zhi,
        yearZhiClass: WuXing[bazi.year.zhi as DiZhiType],
        monthZhi: bazi.month.zhi,
        monthZhiClass: WuXing[bazi.month.zhi as DiZhiType],
        dayZhi: bazi.day.zhi,
        dayZhiClass: WuXing[bazi.day.zhi as DiZhiType],
        timeZhi: bazi.time.zhi,
        timeZhiClass: WuXing[bazi.time.zhi as DiZhiType],
        // 这里可以添加更多的计算，如藏干、主星、副星等
      });
    }
  }
}); 