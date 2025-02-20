import { request } from '../../utils/request';
import { config } from '../../config/env';

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
  return function(...args: any[]) {
    const now = Date.now();
    if (now - lastTime >= wait) {
      fn.apply(this, args);
      lastTime = now;
    }
  }
};

Page({
    data: {
      thinking: true,
      showThinking: true,
      reasoningContent: '',
      reasoningContentMarkdown: null,
      fullContent: '',
      fullContentMarkdown: null,
      analysisSteps: [] as string[],
      currentStepIndex: -1,
      requestTask: null as WechatMiniprogram.RequestTask | null,
      autoScroll: true,
      lastContent: '', // 用于检测内容变化
      userScrolling: false, // 用户是否在滚动
      touchStartY: 0, // 触摸起始位置
    },
  
    async onLoad(options: { params: string }) {
      console.log('Result页面加载，参数:', options);
      
      if (!options.params) {
        console.error('缺少必要参数');
        wx.showToast({
          title: '参数错误',
          icon: 'none'
        });
        return;
      }

      try {
        const params = JSON.parse(decodeURIComponent(options.params));
        console.log('解析后的参数:', params);
        await this.startAnalysis(params);
      } catch (error) {
        console.error('参数解析失败:', error);
        wx.showToast({
          title: '数据错误',
          icon: 'none'
        });
      }
    },

    // 切换思考过程的展开/收起
    toggleThinking() {
      this.setData({
        showThinking: !this.data.showThinking
      });
    },

    async startAnalysis(params: {
      birthday: string;
      birthTime: string;
      region: string[];
      isLunar: boolean;
    }) {
      try {
        let requestTask = null
        let timeoutCheck = null
        let lastProgressTime = Date.now()
        let isCompleted = false
        let finalContent = ''
        let finalReasoningContent = ''
        let hasError = false
        // 使用小程序原生请求
        requestTask = wx.request({
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
                content: `请根据以下信息进行八字分析,分步骤输出:
                  出生日期: ${params.birthday}
                  出生时间: ${params.birthTime}
                  出生地点: ${params.region.join(' ')}
                  历法: ${params.isLunar ? '农历' : '公历'}`
              }
            ],
            ...config.MODEL_PARAMS,
            stream: true
          },
          enableChunked: true,
          responseType: 'text',
          success: (res: WechatMiniprogram.RequestSuccessCallbackResult<string>) => {
            if (typeof res.data === 'string') {
              this.handleChunk(res.data);
            }
          },
          fail: (error) => {
            console.error('Request failed:', error);
            this.handleError();
          }
        });

        // 保存请求任务以便取消
        this.setData({ requestTask });

         if (requestTask.onChunkReceived) {
             requestTask.onChunkReceived((chunk) => {
                 try {
                     const result = processChunk(chunk, {}, (data) => {
                         if (isCompleted) return;

                         if (data.content) {
                             finalContent += data.content;
                         }
                         if (data.reasoningContent) {
                             finalReasoningContent += data.reasoningContent;
                         }

                         // 调用进度回调
                         this.handleChunk(data);

                         // 如果是最后一块数据
                         if (data.isLast) {
                             isCompleted = true;
                             // 清理资源
                             if (timeoutCheck) {
                                 clearInterval(timeoutCheck);
                                 timeoutCheck = null;
                             }
                             if (requestTask) {
                                 requestTask = null;
                             }
                         }
                     });

                     if (result) {
                         lastProgressTime = Date.now();
                     }
                 } catch (error) {
                     console.error("处理数据块失败:", error);
                     if (!isCompleted) {
                         hasError = true;
                         reject(error);
                     }
                 }
             });
         }

      } catch (error: any) {
        console.error('Analysis failed:', error);
        this.handleError();
      }
    },

    handleChunk(data: ChunkData) {
      if (data.reasoningContent) {
        const newContent = this.data.reasoningContent + data.reasoningContent;
        // 检查是否有新的换行，并且内容变化超过一定长度
        const hasNewLine = this.checkForNewLine(this.data.reasoningContent, newContent);
        const contentDiff = newContent.length - this.data.reasoningContent.length;
        
        const markdownContent = getApp().towxml(newContent, 'markdown', { theme: 'light' });
        this.setData({
          reasoningContent: newContent,
          reasoningContentMarkdown: markdownContent,
        }, () => {
          // 只在有新换行且内容变化超过50个字符时触发滚动
          if (hasNewLine && contentDiff > 50) {
            this.scrollToBottom();
          }
        });
      }

      if (data.content) {
        const newContent = this.data.fullContent + data.content;
        // 分析结果部分保持原有的换行检测逻辑
        const hasNewLine = this.checkForNewLine(this.data.fullContent, newContent);
        
        const markdownContent = getApp().towxml(newContent, 'markdown', { theme: 'light' });
        this.setData({
          fullContent: newContent,
          fullContentMarkdown: markdownContent,
        }, () => {
          if (hasNewLine) {
            this.scrollToBottom();
          }
        });
      }

      if (data.isLast) {
        this.setData({ 
          thinking: false,
          autoScroll: false // 结束时关闭自动滚动
        });
      }
    },

    // 检查内容是否有新的换行
    checkForNewLine(oldContent: string, newContent: string): boolean {
      const oldLines = oldContent.split('\n').length;
      const newLines = newContent.split('\n').length;
      return newLines > oldLines;
    },

    // 修改滚动到底部的方法
    scrollToBottom: throttle(function() {
      // 如果用户在滚动或已禁用自动滚动，则不执行
      if (this.data.userScrolling || !this.data.autoScroll) {
        return;
      }

      const query = wx.createSelectorQuery();
      query.select('.thinking-content').boundingClientRect();
      query.select('.analysis-content').boundingClientRect();
      query.selectViewport().scrollOffset();
      
      query.exec((res) => {
        if (res[0] && res[1] && res[2]) {
          const thinkingHeight = res[0].height;
          const analysisHeight = res[1].height;
          const scrollTop = res[2].scrollTop;
          const windowHeight = wx.getSystemInfoSync().windowHeight;
          
          // 计算总内容高度
          const contentHeight = thinkingHeight + analysisHeight;
          
          // 检查是否需要滚动（内容高度超过视窗）
          if (contentHeight > windowHeight) {
            wx.pageScrollTo({
              scrollTop: contentHeight - windowHeight + 50,
              duration: 200
            });
          }
        }
      });
    }, 200),

    isNewStep(content: string): boolean {
      return (
        content.includes('步骤') || 
        content.includes('第') || 
        /^\d+[.、]/.test(content)
      );
    },

    handleError() {
      this.setData({ thinking: false });
      wx.showToast({
        title: '分析失败，请重试',
        icon: 'none'
      });
    },

    onUnload() {
      // 页面卸载时取消请求
      if (this.data.requestTask) {
        this.data.requestTask.abort();
      }
    },

    // 添加触摸事件处理
    handleTouchStart(e: WechatMiniprogram.TouchEvent) {
      this.setData({
        touchStartY: e.touches[0].clientY
      });
    },

    handleTouchMove(e: WechatMiniprogram.TouchEvent) {
      const touchMoveY = e.touches[0].clientY;
      const moveDistance = Math.abs(touchMoveY - this.data.touchStartY);
      
      // 如果移动距离超过50px，认为是用户主动滚动
      if (moveDistance > 50 && this.data.autoScroll) {
        this.setData({ autoScroll: false });
      }
    },

    // 监听页面滚动
    onPageScroll(e: WechatMiniprogram.PageScrollEvent) {
      if (!this.data.userScrolling) {
        this.data.userScrolling = true;
        
        // 设置延时，防止频繁触发
        setTimeout(() => {
          this.data.userScrolling = false;
        }, 150);
      }
    },
});

