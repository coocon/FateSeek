export const config = {
  // 硅基流动API配置
  SILICON_API_KEY: 'sk-namkednxiltazdprfnjdylcnystqmwaoafluvcxeiudwtuqd', // 从环境变量获取
  SILICON_API_URL: 'https://api.siliconflow.cn/v1',
  SILICON_MODEL: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B', // 使用 DeepSeek-R1-Distill-Qwen-7B 模型
  // 模型参数配置
  MODEL_PARAMS: {
    temperature: 0.7,
    max_tokens: 2000,
    top_p: 0.7,
    frequency_penalty: 0
  }
}; 