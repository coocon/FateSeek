import { request } from '../../utils/request';
import { config } from '../../config/env';
import { getBaziInfo } from '../../utils/util';

interface IPageData {
  params: {
    name: string;
    birthDateTime: string;
    region: string[];
    isLunar: boolean;
    gender: string;
  };
  birthDateTime: string;
  isLunar: boolean;
  region: string[];
  baziInfo: {
    year: { gan: string; zhi: string };
    month: { gan: string; zhi: string };
    day: { gan: string; zhi: string };
    time: { gan: string; zhi: string };
  };
  content: string;
  reasoningContent: string;
  reasoningContentMarkdown: string;
  fullContentMarkdown: string;
  showThinking: boolean;
  thinking: boolean;
  analysisSteps: string[];
  requestTask: WechatMiniprogram.RequestTask | null;
  userScrolling: boolean;
  autoScroll: boolean;
  touchStartY: number;
}

interface IPageInstance {
  data: IPageData;
  onLoad: (options: Record<string, string>) => void;
  startAnalysis: (params: {
    name: string;
    gender: string;
    bazi: any;
    birthDateTime: string;
    region: string[];
    isLunar: boolean;
  }) => Promise<void>;
  handleChunk: (chunk: string) => void;
  handleError: () => void;
  toggleThinking: () => void;
  handleTouchStart: (e: WechatMiniprogram.TouchEvent) => void;
  handleTouchMove: (e: WechatMiniprogram.TouchEvent) => void;
  onPageScroll: () => void;
  onUnload: () => void;
}

interface StreamResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      content?: string;
      role?: string;
    };
    finish_reason: null | string;
  }>;
}

interface DeltaContent {
  choices: Array<{
    delta: {
      content?: string;
    };
  }>;
}

interface ChunkData {
  content: string;
  reasoningContent: string;
  isLast: boolean;
  raw: {
    content: string;
    reasoningContent: string;
  };
}

// 添加一个简单的 UTF-8 解码函数
const decodeUtf8 = (bytes: Uint8Array): string => {
  let result = '';
  let i = 0;
  while (i < bytes.length) {
    let byte = bytes[i];
    if (byte < 0x80) {
      // 1字节字符
      result += String.fromCharCode(byte);
      i++;
    } else if (byte < 0xE0) {
      // 2字节字符
      const byte2 = bytes[i + 1];
      result += String.fromCharCode(((byte & 0x1F) << 6) | (byte2 & 0x3F));
      i += 2;
    } else if (byte < 0xF0) {
      // 3字节字符
      const byte2 = bytes[i + 1];
      const byte3 = bytes[i + 2];
      result += String.fromCharCode(
        ((byte & 0x0F) << 12) |
        ((byte2 & 0x3F) << 6) |
        (byte3 & 0x3F)
      );
      i += 3;
    } else {
      // 4字节字符（用两个UTF-16代理对表示）
      const byte2 = bytes[i + 1];
      const byte3 = bytes[i + 2];
      const byte4 = bytes[i + 3];
      let codepoint = ((byte & 0x07) << 18) |
                     ((byte2 & 0x3F) << 12) |
                     ((byte3 & 0x3F) << 6) |
                     (byte4 & 0x3F);
      codepoint -= 0x10000;
      result += String.fromCharCode(
        (codepoint >> 10) + 0xD800,
        (codepoint & 0x3FF) + 0xDC00
      );
      i += 4;
    }
  }
  return result;
};

const processChunk = (chunk: any, apiConfig: any, onProgress: (data: ChunkData) => void) => {
    if (!chunk || !chunk.data) {
      return false;
    }
  
    try {
      // 使用自定义的解码函数替代 TextDecoder
      const text = decodeUtf8(new Uint8Array(chunk.data));
      
      const lines = text.split('\n');
      let hasProgress = false;
      let isLast = false;
      let content = '';
      let reasoningContent = '';
  
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        // 检查是否是结束标记
        if (trimmed === 'data: [DONE]') {
          isLast = true;
          hasProgress = true;
          break;
        }
  
        // 只处理 data: 开头的行
        if (!trimmed.startsWith('data: ')) continue;
  
        try {
          // 处理可能的不完整JSON
          let jsonStr = trimmed.slice(6);
          // 确保JSON字符串是完整的
          if (!jsonStr.endsWith('}')) {
            continue; // 跳过不完整的JSON
          }
          
          const data = JSON.parse(jsonStr);
          
          // 检查是否是最后一个数据块
          if (data.choices?.[0]?.finish_reason === 'stop') {
            isLast = true;
          }
          
          // 提取增量内容
          const delta = data.choices?.[0]?.delta;
          if (!delta) continue;
  
          // 累积内容
          if (delta.content) {
            content += delta.content;
          }
          if (delta.reasoning_content) {
            reasoningContent += delta.reasoning_content;
          }
          
          hasProgress = true;
        } catch (e) {
          console.warn('解析JSON数据失败:', e, '原始数据:', trimmed);
          continue; // 继续处理下一行
        }
      }
      
      // 如果有内容或是最后一块，触发回调
      if (hasProgress || isLast) {
        // 处理换行符
        if (content) {
          content = content.replace(/\\n/g, '\n').replace(/\r\n/g, '\n');
        }
        if (reasoningContent) {
          reasoningContent = reasoningContent.replace(/\\n/g, '\n').replace(/\r\n/g, '\n');
        }
        
        const progressData: ChunkData = {
          content: content || '',
          reasoningContent: reasoningContent || '',
          isLast: isLast,
          raw: { content, reasoningContent }
        };
        
        onProgress(progressData);
      }
      
      return hasProgress || isLast;
    } catch (error) {
      console.error('处理数据块失败:', error, '原始数据:', chunk);
      return false;
    }
}

// 将节流函数移到 Page 外部
const throttle = (fn: Function, wait: number) => {
  let lastTime = 0;
  return function(this: any, ...args: any[]) {
    const now = Date.now();
    if (now - lastTime >= wait) {
      fn.apply(this, args);
      lastTime = now;
    }
  }
};

Page<IPageData, IPageInstance>({
  data: {
    params: {
      name: '',
      birthDateTime: '',
      region: [],
      isLunar: false,
      gender: 'male'
    },
    birthDateTime: '',
    isLunar: false,
    region: [],
    baziInfo: {
      year: { gan: '', zhi: '' },
      month: { gan: '', zhi: '' },
      day: { gan: '', zhi: '' },
      time: { gan: '', zhi: '' }
    },
    content: '',
    reasoningContent: '',
    reasoningContentMarkdown: '',
    fullContentMarkdown: '',
    showThinking: false,
    thinking: false,
    analysisSteps: [],
    requestTask: null,
    userScrolling: false,
    autoScroll: true,
    touchStartY: 0
  },

  onLoad(options: Record<string, string>) {
    if (options.params) {
      try {
        const params = JSON.parse(decodeURIComponent(options.params));
        this.setData({ 
          params,
          // 直接传递给bazi-chart组件的属性
          birthDateTime: params.birthDateTime,
          isLunar: params.isLunar,
          region: params.region
        });
        
        // 计算八字
        
        // 根据地区获取经纬度（这里使用示例坐标，实际应该根据地区获取）
        interface Coordinate {
          latitude: number;
          longitude: number;
        }
        
        interface CityCoordinates {
          [key: string]: Coordinate;
        }
        
        const coordinates: CityCoordinates = {
          '北京': { latitude: 39.9042, longitude: 116.4074 },
          '上海': { latitude: 31.2304, longitude: 121.4737 },
          '广州': { latitude: 23.1291, longitude: 113.2644 }
        };
        
        // 获取城市的经纬度，如果没有则使用默认值（上海坐标）
        const defaultCoord: Coordinate = { latitude: 31.2304, longitude: 121.4737 };
        const city = params.region[1] || '上海';
        const coord = coordinates[city] || defaultCoord;
        
        // 计算八字
        const bazi = getBaziInfo(params.birthDateTime, params.isLunar);
        
        // 设置八字信息
        this.setData({
          baziInfo: {
            year: { gan: bazi.year.gan, zhi: bazi.year.zhi },
            month: { gan: bazi.month.gan, zhi: bazi.month.zhi },
            day: { gan: bazi.day.gan, zhi: bazi.day.zhi },
            time: { gan: bazi.time.gan, zhi: bazi.time.zhi }
          }
        }, () => {
          // 打印八字信息
          console.log('=== 生辰八字信息 ===');
          console.log(`姓名: ${params.name}`);
          console.log(`性别: ${params.gender === 'male' ? '男' : '女'}`);
          console.log(`出生时间: ${params.birthDateTime}`);
          console.log(`出生地点: ${params.region.join(' ')}`);
          console.log(`历法: ${params.isLunar ? '农历' : '公历'}`);
          console.log('\n=== 八字详情 ===');
          console.log(`年柱: ${bazi.year.gan}${bazi.year.zhi}`);
          console.log(`月柱: ${bazi.month.gan}${bazi.month.zhi}`);
          console.log(`日柱: ${bazi.day.gan}${bazi.day.zhi}`);
          console.log(`时柱: ${bazi.time.gan}${bazi.time.zhi}`);
          console.log('================\n');
          // 添加分析步骤
          this.setData({
            analysisSteps: [
              `1. 基本信息解析完成`,
              `2. 计算真太阳时：根据经度 ${coord.longitude} 调整时间`,
              `3. 确定年柱：${bazi.year.gan}${bazi.year.zhi}`,
              `4. 确定月柱：${bazi.month.gan}${bazi.month.zhi}`,
              `5. 确定日柱：${bazi.day.gan}${bazi.day.zhi}`,
              `6. 确定时柱：${bazi.time.gan}${bazi.time.zhi}`,
              `7. 八字计算完成，开始分析...`
            ]
          });

          // 在八字信息设置完成后，开始分析
          this.startAnalysis({
            name: params.name,
            gender: params.gender,
            bazi: bazi,
            birthDateTime: params.birthDateTime,
            region: params.region,
            isLunar: params.isLunar
          });
        });
      } catch (error) {
        console.error('参数解析错误:', error);
        wx.showToast({
          title: '参数错误',
          icon: 'none',
          duration: 2000
        });
      }
    } else {
      wx.showToast({
        title: '缺少必要参数',
        icon: 'none',
        duration: 2000
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 2000);
    }
  },

  async startAnalysis(params: {
    name: string;
    gender: string;
    bazi: any;
    birthDateTime: string;
    region: string[];
    isLunar: boolean;
  }) {
    try {
      // 重置状态
      this.setData({ 
        thinking: true,
        content: '',
        reasoningContent: '',
        showThinking: false
      });
      
      console.log('开始分析, 参数:', params);
      
      const prompt = `请根据以下信息进行八字分析。首先输出"思考过程："，然后详细说明分析推理过程。完成推理后，输出完整的分析结果：

姓名: ${params.name}
性别: ${params.gender === 'male' ? '男' : '女'}
出生日期时间: ${params.birthDateTime}
出生地点: ${params.region.join(' ')}
历法: ${params.isLunar ? '农历' : '公历'}

八字信息：
年柱: ${params.bazi.year.gan}${params.bazi.year.zhi}
月柱: ${params.bazi.month.gan}${params.bazi.month.zhi}
日柱: ${params.bazi.day.gan}${params.bazi.day.zhi}
时柱: ${params.bazi.time.gan}${params.bazi.time.zhi}

请从以下几个方面进行分析：
1. 命主身旺弱分析
2. 五行喜忌分析
3. 事业方向建议
4. 健康建议
5. 财运分析
6. 感情分析

注意：
- 分析要客观理性，避免过于绝对化的判断
- 多提供积极正面的建议
- 建议要具体可行，便于实践
- 分析要有理有据，解释清楚原因
- 避免迷信色彩，强调个人努力的重要性`;

      console.log('发送请求:', config.SILICON_API_URL);
      
      // 使用微信请求API
      const requestTask = wx.request({
        url: `${config.SILICON_API_URL}/chat/completions`,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.SILICON_API_KEY}`
        },
        data: {
          model: config.SILICON_MODEL,
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          stream: true,
          ...config.MODEL_PARAMS
        },
        enableChunked: true, // 关闭分块传输
        responseType: 'text',
        success: (res) => {
          console.log('请求成功:', res.statusCode);
          // 处理完整响应
          if (typeof res.data === 'string') {
            const lines = res.data.split('\n');
            let content = '';
            let reasoningContent = '';
            
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data: ') || trimmed === 'data: [DONE]') continue;
              
              try {
                const jsonStr = trimmed.slice(6);
                const data = JSON.parse(jsonStr);
                const text = data.choices?.[0]?.delta?.content || '';
                console.log('收到内容:', text);
                
                if (text.includes('思考过程：') || reasoningContent.length > 0) {
                  reasoningContent += text;
                } else {
                  content += text;
                }
              } catch (e) {
                console.warn('解析数据失败:', e);
              }
            }
            
            // 一次性更新所有内容
            this.setData({
              content: content,
              reasoningContent: reasoningContent,
              showThinking: reasoningContent.length > 0,
              thinking: false
            });
            
            console.log('分析完成');
          }
        },
        fail: (error) => {
          console.error('请求失败:', error);
          this.handleError();
        }
      });
      // 处理流式数据
      requestTask.onChunkReceived = this.handleChunk;

      this.setData({ requestTask });
    } catch (error) {
      console.error('分析失败:', error);
      this.handleError();
    }
  },

  handleChunk(chunk: WechatMiniprogram.OnChunkReceivedListenerResult | any) {
    try {
      // 对于流式响应，chunk 是一个包含 data 属性的对象
      let text = '';
      
      if (typeof chunk === 'string') {
        // 字符串类型的 chunk 直接处理
        text = chunk;
      } else if (chunk && chunk.data) {
        // 对象类型的 chunk 需要解析 data 属性
        if (typeof chunk.data === 'string') {
          text = chunk.data;
        } else if (chunk.data instanceof ArrayBuffer) {
          text = decodeUtf8(new Uint8Array(chunk.data));
        } else {
          // 处理其他可能的类型
          console.log('未知的数据类型:', typeof chunk.data);
          return;
        }
      } else {
        // 如果没有识别到有效数据，直接返回
        return;
      }
      
      // 处理流式数据
      const lines = text.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        
        // 处理 [DONE] 标记
        if (trimmed === 'data: [DONE]') {
          console.log('流式传输完成');
          this.setData({ thinking: false });
          continue;
        }

        try {
          const jsonStr = trimmed.slice(6); // 移除 'data: ' 前缀
          if (!jsonStr.trim() || !jsonStr.includes('{')) continue;
          
          const data = JSON.parse(jsonStr);
          const delta = data.choices?.[0]?.delta;
          
          if (delta?.content) {
            const content = delta.content;
            console.log('收到内容:', content);
            
            // 检查是否包含思考过程标记
            if (content.includes('思考过程：') || this.data.reasoningContent.length > 0) {
              // 更新思考内容
              this.setData({
                reasoningContent: this.data.reasoningContent + content,
                showThinking: true
              });
              console.log('更新思考内容:', this.data.reasoningContent);
            } else {
              // 更新分析结果
              this.setData({
                content: this.data.content + content
              });
              console.log('更新分析结果:', this.data.content);
            }
          }
          
          // 检查是否完成
          if (data.choices?.[0]?.finish_reason === 'stop') {
            this.setData({ thinking: false });
            console.log('分析完成');
          }
        } catch (e) {
          console.warn('解析JSON数据失败:', e, '原始数据:', trimmed);
        }
      }
    } catch (error) {
      console.error('处理数据块失败:', error);
    }
  },

  handleError() {
    this.setData({
      thinking: false,
      content: '抱歉，分析过程出现错误，请稍后重试。'
    });
    wx.showToast({
      title: '分析失败',
      icon: 'none'
    });
  },

  toggleThinking() {
    this.setData({
      showThinking: !this.data.showThinking
    });
  },

  handleTouchStart(e: WechatMiniprogram.TouchEvent) {
    this.setData({
      touchStartY: e.touches[0].clientY
    });
  },

  handleTouchMove(e: WechatMiniprogram.TouchEvent) {
    const touchMoveY = e.touches[0].clientY;
    const moveDistance = Math.abs(touchMoveY - this.data.touchStartY);
    
    if (moveDistance > 50 && this.data.autoScroll) {
      this.setData({ autoScroll: false });
    }
  },

  onPageScroll() {
    if (!this.data.userScrolling) {
      this.setData({ userScrolling: true });
      
      setTimeout(() => {
        this.setData({ userScrolling: false });
      }, 150);
    }
  },

  onUnload() {
    if (this.data.requestTask) {
      this.data.requestTask.abort();
    }
  }
});

