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

const processChunk = (chunk, apiConfig, onProgress) => {
    if (!chunk || !chunk.data) {
      return false;
    }
  
    try {
      // 统一使用 TextDecoder 解码二进制数据
      const text = new TextDecoder('utf-8').decode(new Uint8Array(chunk.data));
      // console.log('收到数据块:', text);  // 添加日志
      
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
          console.log('收到结束标记');  // 添加日志
          isLast = true;
          hasProgress = true;
          break;
        }
  
        // 只处理 data: 开头的行
        if (!trimmed.startsWith('data: ')) continue;
  
        try {
          // 解析 JSON 数据
          const data = JSON.parse(trimmed.slice(6));
          // console.log('解析的数据:', data);  // 添加日志
          
          // 检查是否是最后一个数据块
          if (data.choices?.[0]?.finish_reason === 'stop') {
            console.log('检测到结束原因: stop');  // 添加日志
            isLast = true;
          }
          
          // 提取增量内容
          const delta = data.choices?.[0]?.delta;
          if (!delta) continue;
  
          // 累积内容
          if (delta.content) {
            content += delta.content;
            // console.log('累积内容:', content);  // 添加日志
          }
          if (delta.reasoning_content) {
            reasoningContent += delta.reasoning_content;
            // console.log('累积推理内容:', reasoningContent);  // 添加日志
          }
          
          hasProgress = true;
        } catch (e) {
          console.error('解析JSON数据失败:', e, '原始数据:', trimmed);
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
        
        const progressData = {
          content: content || '',
          reasoningContent: reasoningContent || '',
          isLast: isLast,
          raw: { content, reasoningContent }
        };
        
        console.log('触发进度回调:', progressData);  // 添加日志
        onProgress(progressData);
      }
      
      return hasProgress || isLast;
    } catch (error) {
      console.error('处理数据块失败:', error, '原始数据:', chunk);
      return false;
    }
  }

Page({
    data: {
      thinking: true,
      showThinking: true,
      reasoningContent: '',
      reasoningContentMarkdown: null,
      analysisSteps: [] as string[],
      currentStepIndex: -1,
      requestTask: null as WechatMiniprogram.RequestTask | null,
      autoScroll: true,
      fullContent: '',
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
        // 使用完整内容重新解析 markdown
        const markdownContent = getApp().towxml(newContent, 'markdown', { theme: 'light' });
        this.setData({
            reasoningContent: newContent,
            reasoningContentMarkdown: markdownContent,
        }, ()=> {
            if (this.data.autoScroll) {
                this.scrollToBottom();
            }
        });
      }
      if (data.content) {
        // 累加内容
        const newContent = this.data.fullContent + data.content;
        const markdownContent = getApp().towxml(newContent, 'markdown', { theme: 'light' });
          
          // 更新 markdown 内容
          this.setData(
              {
                  fullContent: newContent,
                  fullContentMarkdown: markdownContent,
              },
              () => {
                  if (this.data.autoScroll) {
                      this.scrollToBottom();
                  }
              }
          );

          // 处理步骤分析
          if (this.isNewStep(data.content)) {
            this.data.currentStepIndex++;
            this.data.analysisSteps[this.data.currentStepIndex] = '';
          }

          if (this.data.currentStepIndex >= 0) {
            this.data.analysisSteps[this.data.currentStepIndex] += data.content;
            this.setData({ 
              analysisSteps: [...this.data.analysisSteps]
            });
          }
      }

      if (data.isLast) {
        this.setData({ 
          thinking: false,
          autoScroll: false
        });
      }
    },

    // 滚动到底部
    scrollToBottom() {
      const query = wx.createSelectorQuery();
      
      // 分别获取思考过程和分析结果的高度
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
          
          wx.pageScrollTo({
            scrollTop: contentHeight - windowHeight + 200, // 增加一些底部空间
            duration: 300
          });
        }
      });
    },

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
    }
});

