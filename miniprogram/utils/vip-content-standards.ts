// VIP功能内容标准 - 严格保守合规性控制

export interface VIPContentStandard {
  id: string;
  name: string;
  description: string;
  contentType: 'cultural_learning' | 'educational_guidance' | 'positive_psychology';
  prohibitedContent: string[];
  requiredElements: string[];
  disclaimer: string;
}

// VIP功能内容标准定义
export const VIP_CONTENT_STANDARDS: VIPContentStandard[] = [
  {
    id: 'five_elements_learning',
    name: '传统文化学习 - 五行文化',
    description: '学习中华传统五行文化知识，了解其历史背景和文化内涵',
    contentType: 'cultural_learning',
    prohibitedContent: [
      '命运预测',
      '性格判断',
      '未来预测',
      '吉凶祸福判断',
      '婚姻配对预测',
      '财运预测',
      '疾病预测',
      '事业成败预测'
    ],
    requiredElements: [
      '历史背景介绍',
      '文化内涵说明',
      '理论知识普及',
      '学习方法指导',
      '积极价值观引导',
      '现代意义阐释',
      '免责声明提示'
    ],
    disclaimer: '本内容为传统文化知识普及，仅供学习参考，不涉及任何预测或判断。'
  },
  {
    id: 'career_development',
    name: '职业素养提升',
    description: '基于个人特点的职业发展规划和技能提升建议',
    contentType: 'educational_guidance',
    prohibitedContent: [
      '事业成功预测',
      '职业发展预测',
      '升职机会预测',
      '创业成功预测',
      '行业前景预测',
      '收入预测',
      '职场运势判断'
    ],
    requiredElements: [
      '个人特质分析',
      '技能提升建议',
      '学习方法推荐',
      '职业规划指导',
      '积极心态建设',
      '持续发展建议',
      '努力重要性强调'
    ],
    disclaimer: '本内容为职业发展建议，成功需要个人努力和实践，不包含任何预测性内容。'
  },
  {
    id: 'health_education',
    name: '中医文化学习',
    description: '学习中医养生文化知识，了解传统健康理念',
    contentType: 'cultural_learning',
    prohibitedContent: [
      '疾病预测',
      '健康状况判断',
      '寿命预测',
      '具体疾病诊断',
      '治疗方案建议',
      '药物推荐',
      '康复预测'
    ],
    requiredElements: [
      '中医文化背景',
      '养生理念介绍',
      '生活习惯建议',
      '运动方式推荐',
      '饮食文化学习',
      '预防保健知识',
      '专业就医提醒'
    ],
    disclaimer: '本内容为中医文化知识普及，不涉及医疗诊断或治疗建议，如有健康问题请咨询专业医师。'
  },
  {
    id: 'psychology_guidance',
    name: '积极心理健康教育',
    description: '学习积极心理学知识，培养健康心态和情绪管理能力',
    contentType: 'positive_psychology',
    prohibitedContent: [
      '心理疾病诊断',
      '心理问题预测',
      '精神状态判断',
      '治疗效果预测',
      '心理危机干预',
      '专业心理治疗建议'
    ],
    requiredElements: [
      '积极心理学理论',
      '情绪管理方法',
      '压力调节技巧',
      '积极心态培养',
      '自我认知提升',
      '人际关系建议',
      '专业求助提醒'
    ],
    disclaimer: '本内容为心理健康教育，不涉及心理疾病诊断或治疗，如有心理问题请咨询专业心理医师。'
  }
];

// AI提示词模板 - 严格合规版本
export const VIP_AI_PROMPTS = {
  five_elements: `
请基于五行文化知识，为用户提供传统文化学习内容。必须严格遵守以下要求：

【重要原则】
1. 本内容为文化知识普及，不涉及任何预测或判断
2. 强调文化学习价值，避免任何形式的命运预测
3. 提供积极正面的价值观引导
4. 所有建议必须基于科学和理性

【内容框架】
1. 五行文化背景介绍（历史、文化内涵）
2. 五行理论知识普及（基本概念、相互关系）
3. 文化学习意义（现代价值、学习意义）
4. 实践应用建议（日常生活中的文化体验）
5. 积极心态引导（基于文化学习的正面价值观）

【严格禁止】
- 命运预测、性格判断、未来预测
- 吉凶祸福、婚姻配对、财运判断
- 疾病预测、事业成败预测
- 任何形式的绝对化判断

【必须包含】
- "本内容为传统文化知识普及，仅供学习参考"
- "真正的改变需要个人努力和积极行动"
- "建议结合理性思考，避免盲目相信"

请以积极正面、教育导向的方式提供内容，确保完全符合文化学习属性。
`,

  career: `
请基于职业发展规划理论，为用户提供职业素养提升建议。必须严格遵守以下要求：

【重要原则】
1. 本内容为职业发展建议，不涉及任何预测或判断
2. 强调个人努力的重要性，避免成功预测
3. 提供实用的技能提升和学习方法
4. 鼓励积极进取和持续发展

【内容框架】
1. 个人特质分析（基于科学理论的特点描述）
2. 技能提升建议（具体的学习方法和发展方向）
3. 职业规划指导（理性的发展规划）
4. 学习方法推荐（实用的技能提升途径）
5. 积极心态建设（面对挑战的正面态度）

【严格禁止】
- 事业成功预测、职业发展预测
- 升职机会、创业成功预测
- 行业前景、收入预测
- 职场运势、命运判断

【必须包含】
- "职业发展需要个人努力和持续学习"
- "建议结合实际情况理性规划"
- "成功源于实践和坚持"
- "仅供参考，具体决策请结合实际情况"

请以积极向上、实用导向的方式提供内容，强调个人努力的重要性。
`,

  health: `
请基于中医养生文化，为用户提供健康文化学习内容。必须严格遵守以下要求：

【重要原则】
1. 本内容为中医文化知识普及，不涉及医疗诊断或治疗
2. 强调预防保健理念，避免疾病预测或诊断
3. 提供健康生活方式建议，鼓励专业就医
4. 基于传统养生文化的现代阐释

【内容框架】
1. 中医文化背景（历史渊源、文化价值）
2. 养生理念介绍（传统健康观念）
3. 生活方式建议（日常保健习惯）
4. 运动方式推荐（传统健身方法）
5. 饮食文化学习（饮食养生智慧）

【严格禁止】
- 疾病预测、健康状况判断
- 寿命预测、具体疾病诊断
- 治疗方案、药物推荐
- 康复预测、疗效保证

【必须包含】
- "本内容为中医文化知识普及"
- "如有健康问题请咨询专业医师"
- "养生保健不能替代专业医疗"
- "建议结合现代医学知识"

请以科学理性、健康导向的方式提供内容，强调专业医疗的重要性。
`,

  psychology: `
请基于积极心理学理论，为用户提供心理健康教育内容。必须严格遵守以下要求：

【重要原则】
1. 本内容为心理健康教育，不涉及心理疾病诊断或治疗
2. 强调积极心态培养，避免心理问题诊断
3. 提供实用的情绪管理和压力调节方法
4. 鼓励专业求助，提供必要提醒

【内容框架】
1. 积极心理学理论（科学基础、核心理念）
2. 情绪管理方法（实用的情绪调节技巧）
3. 压力调节策略（科学的压力应对方法）
4. 积极心态培养（正向思维训练）
5. 人际关系建议（健康的社交技巧）

【严格禁止】
- 心理疾病诊断、心理问题预测
- 精神状态判断、治疗效果预测
- 心理危机干预、专业治疗建议
- 任何形式的心理状态绝对化判断

【必须包含】
- "本内容为心理健康教育"
- "如有心理问题请咨询专业心理医师"
- "自我调节不能替代专业治疗"
- "鼓励在需要时寻求专业帮助"

请以专业严谨、积极导向的方式提供内容，强调专业心理服务的重要性。
`
};

// 内容合规性检查函数
export function checkContentCompliance(content: string, standardId: string): {
  isCompliant: boolean;
  issues: string[];
  suggestions: string[];
} {
  const standard = VIP_CONTENT_STANDARDS.find(s => s.id === standardId);
  if (!standard) {
    return {
      isCompliant: false,
      issues: ['未找到对应的内容标准'],
      suggestions: ['请确保使用了正确的内容标准ID']
    };
  }

  const issues: string[] = [];
  const suggestions: string[] = [];

  // 检查禁止内容
  for (const prohibited of standard.prohibitedContent) {
    if (content.includes(prohibited)) {
      issues.push(`包含禁止内容：${prohibited}`);
      suggestions.push(`请移除"${prohibited}"相关表述`);
    }
  }

  // 检查必需元素
  for (const required of standard.requiredElements) {
    if (!content.includes(required)) {
      issues.push(`缺少必需元素：${required}`);
      suggestions.push(`请添加"${required}"相关内容`);
    }
  }

  // 检查免责声明
  if (!content.includes(standard.disclaimer)) {
    issues.push('缺少免责声明');
    suggestions.push(`请添加免责声明：${standard.disclaimer}`);
  }

  return {
    isCompliant: issues.length === 0,
    issues,
    suggestions
  };
}