import {Solar, Lunar} from './lunar';



// 这个函数是正确的
export function getBaziInfo(birthDateTime: string, isLunar: boolean = false) {
  // 解析出生日期时间
  const [date, time] = birthDateTime.split(' ');
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);

  let lunar = null;
  if (isLunar) {
    lunar = Lunar.fromYmdHms(year, month, day, hour, minute, 0);
  }
  else {
    // 创建阳历对象
    const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
    // 获取农历对象
    lunar = solar.getLunar();
  }
  
  // 获取八字信息
  const eightChar = lunar.getEightChar();
  
  // 返回八字信息
  return {
    year: {
      gan: eightChar.getYearGan(),
      zhi: eightChar.getYearZhi()
    },
    month: {
      gan: eightChar.getMonthGan(),
      zhi: eightChar.getMonthZhi()
    },
    day: {
      gan: eightChar.getDayGan(),
      zhi: eightChar.getDayZhi()
    },
    time: {
      gan: eightChar.getTimeGan(),
      zhi: eightChar.getTimeZhi()
    }
  };
}





