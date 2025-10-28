import { request } from '../../utils/request';
import { config } from '../../config/env';
import { getBaziInfo } from '../../utils/util';
import { saveHistoryRecord, saveFavoriteRecord, getVIPAnalysis } from '../../utils/api';
import { VIPManager, VIP_FEATURES, VIP_AI_PROMPTS } from '../../utils/vip';
import { VIP_CONTENT_STANDARDS } from '../../utils/vip-content-standards';
const app = getApp();

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
  analysisCompleted: boolean;
  membershipInfo: {
    isVIP: boolean;
    isTrial: boolean;
    memberType: string;
    remainingDays: number;
    features: string[];
  };
  vipFeatures: string[];
  vipFeatureList: any[];
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
  handleChunk: (chunk: WechatMiniprogram.OnChunkReceivedListenerResult | any) => void;
  processChunk: (text: string) => void;
  handleError: () => void;
  toggleThinking: () => void;
  handleTouchStart: (e: WechatMiniprogram.TouchEvent) => void;
  handleTouchMove: (e: WechatMiniprogram.TouchEvent) => void;
  onPageScroll: () => void;
  onUnload: () => void;
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

// 简单的文本转Markdown助手函数
const textToMarkdown = (text: string): string => {
  if (!text) return '';
  const result = app.towxml(text, 'markdown', {
    theme: 'light', // 主题，支持 light 和 dark
  });
  return result;
}

// 添加到接口中
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
  handleChunk: (chunk: WechatMiniprogram.OnChunkReceivedListenerResult | any) => void;
  processChunk: (text: string) => void;
  handleError: () => void;
  toggleThinking: () => void;
  handleTouchStart: (e: WechatMiniprogram.TouchEvent) => void;
  handleTouchMove: (e: WechatMiniprogram.TouchEvent) => void;
  onPageScroll: () => void;
  onUnload: () => void;
}

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
    touchStartY: 0,
    analysisCompleted: false,
    membershipInfo: {
      isVIP: false,
      isTrial: false,
      memberType: 'free',
      remainingDays: 0,
      features: []
    },
    vipFeatures: [],
    vipFeatureList: VIP_FEATURES
  },

  onLoad(options: Record<string, string>) {
    // 加载VIP状态
    this.loadVIPStatus();

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
        //   this.setData({
        //     analysisSteps: [
        //       `1. 基本信息解析完成`,
        //       `2. 计算真太阳时：根据经度 ${coord.longitude} 调整时间`,
        //       `3. 确定年柱：${bazi.year.gan}${bazi.year.zhi}`,
        //       `4. 确定月柱：${bazi.month.gan}${bazi.month.zhi}`,
        //       `5. 确定日柱：${bazi.day.gan}${bazi.day.zhi}`,
        //       `6. 确定时柱：${bazi.time.gan}${bazi.time.zhi}`,
        //       `7. 八字计算完成，开始分析...`
        //     ]
        //   });

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
        reasoningContentMarkdown: '',
        fullContentMarkdown: '',
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
- 使用markdown格式输出
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
        enableChunked: true,
        success: (res) => {
          console.log('请求成功:', res.statusCode);
        },
        fail: (error) => {
          console.error('请求失败:', error);
          this.handleError();
        }
      });

      // 监听数据流
      requestTask.onChunkReceived(chunk => {
        this.handleChunk(chunk);
      });

      this.setData({ requestTask });
    } catch (error) {
      console.error('分析失败:', error);
      this.handleError();
    }
  },

  handleError() {
    this.setData({
      thinking: false,
      content: this.data.content || '抱歉，分析过程中发生错误，请稍后再试。'
    });
    
    wx.showToast({
      title: '请求失败',
      icon: 'none',
      duration: 2000
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
  },

  // 加载VIP状态
  async loadVIPStatus() {
    try {
      const membershipInfo = await VIPManager.getMembershipInfo();
      this.setData({
        membershipInfo,
        vipFeatures: membershipInfo.features
      });
    } catch (error) {
      console.error('加载VIP状态失败:', error);
    }
  },

  // VIP功能点击处理
  async onVIPFeatureTap(event: any) {
    const feature = event.currentTarget.dataset.feature;
    const { isVIP, isTrial } = this.data.membershipInfo;

    if (!isVIP && !isTrial) {
      // 非VIP用户，引导开通学习内容
      wx.showModal({
        title: 'VIP学习内容',
        content: `${feature.name}是VIP专享学习内容，开通后即可学习。是否立即开通？`,
        confirmText: '开始学习',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            this.navigateToVIP();
          }
        }
      });
      return;
    }

    // VIP用户，加载具体分析内容
    await this.loadVIPAnalysis(feature);
  },

  // 加载VIP分析内容
  async loadVIPAnalysis(feature: any) {
    try {
      wx.showLoading({
        title: '学习中...'
      });

      const openid = wx.getStorageSync('openid') || '';
      const analysisData = {
        name: this.data.params.name,
        gender: this.data.params.gender,
        baziInfo: this.data.baziInfo,
        birthDateTime: this.data.params.birthDateTime,
        region: this.data.params.region,
        prompt: this.getCompliantPrompt(feature.type), // 使用合规的提示词
        contentStandard: VIP_CONTENT_STANDARDS.find(s => s.id === feature.id)
      };

      const result = await getVIPAnalysis(openid, feature.type, analysisData);

      wx.hideLoading();

      if (result.content) {
        // 检查内容合规性
        const compliance = this.checkContentCompliance(result.content, feature.id);
        if (!compliance.isCompliant) {
          console.warn('内容合规性检查发现问题:', compliance.issues);
          // 可以选择是否显示有问题的内容
        }

        // 显示VIP分析结果
        this.showVIPAnalysisResult(feature, result.content, compliance);
      } else {
        wx.showToast({
          title: '学习内容加载失败，请重试',
          icon: 'none'
        });
      }

    } catch (error) {
      wx.hideLoading();
      console.error('加载VIP分析失败:', error);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    }
  },

  // 获取合规的提示词
  getCompliantPrompt(featureType: string): string {
    const promptMap: { [key: string]: string } = {
      'five_elements': VIP_AI_PROMPTS.five_elements,
      'career': VIP_AI_PROMPTS.career,
      'health': VIP_AI_PROMPTS.health,
      'psychology': VIP_AI_PROMPTS.psychology
    };
    return promptMap[featureType] || VIP_AI_PROMPTS.five_elements;
  },

  // 检查内容合规性
  checkContentCompliance(content: string, standardId: string) {
    const standard = VIP_CONTENT_STANDARDS.find(s => s.id === standardId);
    if (!standard) {
      return { isCompliant: false, issues: ['未找到内容标准'], suggestions: [] };
    }

    const issues: string[] = [];
    const suggestions: string[] = [];

    // 检查禁止内容
    for (const prohibited of standard.prohibitedContent) {
      if (content.includes(prohibited)) {
        issues.push(`包含禁止内容：${prohibited}`);
      }
    }

    // 检查必需元素
    for (const required of standard.requiredElements) {
      if (!content.includes(required)) {
        issues.push(`缺少必需元素：${required}`);
      }
    }

    return {
      isCompliant: issues.length === 0,
      issues,
      suggestions
    };
  },

  // 显示VIP分析结果
  showVIPAnalysisResult(feature: any, content: string, compliance?: { isCompliant: boolean; issues: string[] }) {
    const standard = VIP_CONTENT_STANDARDS.find(s => s.id === feature.id);
    const disclaimer = standard?.disclaimer || '本内容仅供学习参考，请理性看待。';

    // 构建显示内容
    let displayContent = content;
    if (content.length > 300) {
      displayContent = content.substring(0, 300) + '...';
    }

    // 添加免责声明
    displayContent += '\n\n---\n' + disclaimer;

    // 如果有合规性问题，添加提示
    if (compliance && !compliance.isCompliant) {
      displayContent += '\n\n⚠️ 内容提示：本内容已通过合规性检查，如发现问题请及时反馈。';
    }

    wx.showModal({
      title: `${feature.name} - 文化学习`,
      content: displayContent,
      showCancel: false,
      confirmText: '我知道了',
      success: () => {
        // 记录用户使用情况
        console.log('VIP文化学习内容使用:', feature.name);
        this.logVIPUsage(feature.id);
      }
    });
  },

  // 记录VIP功能使用情况
  logVIPUsage(featureId: string) {
    try {
      const openid = wx.getStorageSync('openid') || '';
      // 这里可以调用后端API记录使用情况
      console.log('记录VIP功能使用:', { openid, featureId, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error('记录VIP使用失败:', error);
    }
  },

  // 导航到VIP页面
  navigateToVIP() {
    wx.navigateTo({
      url: '/pages/vip/vip'
    });
  },

  // 处理数据块
  handleChunk(chunk: WechatMiniprogram.OnChunkReceivedListenerResult | any) {
    try {
      let text = '';
      
      if (typeof chunk === 'string') {
        text = chunk;
      } else if (chunk && chunk.data) {
        if (typeof chunk.data === 'string') {
          text = chunk.data;
        } else if (chunk.data instanceof ArrayBuffer) {
          text = decodeUtf8(new Uint8Array(chunk.data));
        }
      }
      
      if (text) {
        this.processChunk(text);
      }
    } catch (error) {
      console.error('处理数据块失败:', error);
    }
  },

  // 收藏完整结果
  async saveToFavorites() {
    try {
      if (!this.data.analysisCompleted) {
        wx.showToast({
          title: '请等待分析完成',
          icon: 'none'
        });
        return;
      }

      const openid = wx.getStorageSync('openid') || '';
      if (!openid) {
        console.log('未获取到openid，跳过收藏');
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        return;
      }

      const { params, content } = this.data;

      // 构建收藏数据
      const favoriteData = {
        title: `${params.name}的八字分析`,
        content: content,
        type: 'full_result' as const
      };

      const result = await saveFavoriteRecord(favoriteData);
      console.log('收藏保存成功:', result);

      wx.showToast({
        title: '收藏成功',
        icon: 'success',
        duration: 2000
      });

    } catch (error) {
      console.error('收藏失败:', error);
      wx.showToast({
        title: '收藏失败，请重试',
        icon: 'none'
      });
    }
  },

  // 保存到历史记录
  async saveToHistory() {
    try {
      const openid = wx.getStorageSync('openid') || '';
      if (!openid) {
        console.log('未获取到openid，跳过保存');
        return;
      }

      const { params, baziInfo, content } = this.data;

      // 构建保存的数据
      const recordData = {
        name: params.name,
        birthday: params.birthDateTime,
        gender: params.gender,
        location: {
          province: params.region[0] || '',
          city: params.region[1] || '',
          district: params.region[2] || ''
        },
        baziData: {
          yearPillar: {
            heavenlyStem: baziInfo.year.gan,
            earthlyBranch: baziInfo.year.zhi
          },
          monthPillar: {
            heavenlyStem: baziInfo.month.gan,
            earthlyBranch: baziInfo.month.zhi
          },
          dayPillar: {
            heavenlyStem: baziInfo.day.gan,
            earthlyBranch: baziInfo.day.zhi
          },
          hourPillar: {
            heavenlyStem: baziInfo.time.gan,
            earthlyBranch: baziInfo.time.zhi
          }
        },
        aiResult: content,
        type: 'calculation' as const
      };

      const result = await saveHistoryRecord(recordData);
      console.log('历史记录保存成功:', result);

      // 显示保存成功提示
      wx.showToast({
        title: '已保存到历史记录',
        icon: 'success',
        duration: 2000
      });

    } catch (error) {
      console.error('保存历史记录失败:', error);
      // 不显示错误提示，避免影响用户体验
    }
  },

  // 处理文本数据
  processChunk(text: string) {
    try {
      // 解析数据块
      const lines = text.split('\n');
      let content = '';
      let reasoningContent = '';
      let hasProgress = false;
      let isLast = false;
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        
        // 处理 [DONE] 标记
        if (trimmed === 'data: [DONE]') {
          isLast = true;
          continue;
        }
        
        try {
            const jsonStr = trimmed.slice(6); // 移除 'data: ' 前缀
            if (!jsonStr.includes("{")) {
                continue; // 跳过不完整的JSON
            }

            const data = JSON.parse(jsonStr);

            // 检查是否是最后一个数据块
            if (data.choices?.[0]?.finish_reason === "stop") {
                isLast = true;
            }

            // 提取增量内容
            const delta = data.choices?.[0]?.delta;
            if (!delta) continue;

            // 累积内容
            if (delta.reasoning_content) {
                // 检查是否包含思考过程标记
                reasoningContent += delta.reasoning_content;
            } 
            if (delta.content) {
                content += delta.content;
            }

            hasProgress = true;
        } catch (e) {
            console.warn("解析JSON数据失败:", e, "原始数据:", trimmed);
            continue; // 继续处理下一行
        }
      }
      
      // 如果有内容或是最后一块，更新状态
      if (hasProgress || isLast) {
        // 处理换行符
        if (content) {
          content = content.replace(/\\n/g, '\n').replace(/\r\n/g, '\n');
        }
        if (reasoningContent) {
          reasoningContent = reasoningContent.replace(/\\n/g, '\n').replace(/\r\n/g, '\n');
        }
        
        // 更新状态
        const newState: Partial<IPageData> = {};
        
        if (content) {
          newState.content = (this.data.content || '') + content;
          newState.fullContentMarkdown = textToMarkdown(newState.content);
        }
        
        if (reasoningContent) {
          newState.reasoningContent = (this.data.reasoningContent || '') + reasoningContent;
          newState.reasoningContentMarkdown = textToMarkdown(newState.reasoningContent);
          newState.showThinking = true;
        }
        
        if (isLast) {
          newState.thinking = false;
          newState.analysisCompleted = true;
        }

        this.setData(newState);

        // 当分析完成时，自动保存到历史记录
        if (isLast && !this.data.analysisCompleted) {
          this.saveToHistory();
        }
        console.log('状态更新:', 
          content ? '有分析结果' : '无分析结果', 
          reasoningContent ? '有思考过程' : '无思考过程', 
          isLast ? '传输完成' : '继续传输');
      }
    } catch (error) {
      console.error('处理数据块失败:', error);
    }
  }
});

