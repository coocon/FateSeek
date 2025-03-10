# FateSeek - 生辰八字测算小程序

## 项目简介
FateSeek 是一个基于微信小程序平台开发的生辰八字测算应用。本应用提供准确的生辰八字计算、五行分析、运势预测等功能，帮助用户了解自己的命理信息。

## 技术栈
- 微信小程序框架
- TypeScript
- Less 样式预处理器
- 自定义组件系统

## 目录结构
```
miniprogram/
├── components/        # 公共组件
├── config/           # 配置文件
├── data/            # 静态数据
├── pages/           # 页面文件
├── utils/           # 工具函数
└── app.ts           # 入口文件
```

## 更新日志

### 2024-03-04
1. 首页表单优化
   - 添加姓名输入框
   - 将年月日和时分合并为单个日期时间选择组件
   - 优化表单样式和交互体验

2. 日期时间选择器优化
   - 将输入框改为多列选择器形式
   - 优化显示格式为"年月日，时分"
   - 实现年月日时分联动效果
   - 添加日期合法性校验

3. 选项行布局优化
   - 重构选项行结构，添加选项标签
   - 优化布局使其更加紧凑
   - 防止文字换行
   - 调整内边距和字体大小

4. 默认时间设置
   - 设置默认时间为 1990年6月15日 12点30分
   - 优化时间选择器初始化逻辑

5. 用户协议功能实现
   - 创建协议内容文件
   - 实现协议弹窗功能
   - 添加弹窗样式和交互
   - 完善协议内容，强调正能量

修改文件：
- miniprogram/pages/index/index.wxml
- miniprogram/pages/index/index.ts
- miniprogram/pages/index/index.less
- miniprogram/data/agreement.ts（新建）

技术栈：
- 微信小程序原生组件
- TypeScript
- Less 样式预处理器

### 2024-03-05
1. 结果页面优化
   - 新增八字图表组件
   - 实现生辰八字和五行的可视化展示
   - 优化分析结果和推理过程的展示

2. 八字图表组件开发
   - 创建自定义组件展示生辰八字
   - 实现天干地支的显示和五行颜色标注
   - 添加主星、副星等信息的展示
   - 优化组件样式和交互

3. 类型系统完善
   - 添加详细的 TypeScript 类型定义
   - 实现五行属性的类型安全判断
   - 优化组件属性的类型检查

修改文件：
- miniprogram/components/bazi-chart/bazi-chart.wxml（新建）
- miniprogram/components/bazi-chart/bazi-chart.less（新建）
- miniprogram/components/bazi-chart/bazi-chart.ts（新建）
- miniprogram/pages/result/result.json
- miniprogram/pages/result/result.wxml
- miniprogram/pages/result/result.less

技术栈：
- TypeScript
- Less 样式预处理器
- 微信小程序自定义组件
- Moment.js 

### 2024-03-06
1. 八字计算功能优化
   - 重构 getBaziInfo 函数，支持完整的日期时间和经纬度信息
   - 优化八字计算的参数传递
   - 完善农历转换和八字计算逻辑

2. 经纬度信息处理
   - 添加主要城市的经纬度数据
   - 实现城市经纬度的自动匹配
   - 添加默认经纬度处理

修改文件：
- miniprogram/utils/util.ts
- miniprogram/pages/result/result.ts

技术栈：
- TypeScript
- lunar-typescript 库
- 微信小程序框架

### 2024-03-07
1. 农历/阳历切换功能优化
   - 修复农历/阳历切换的类型错误
   - 优化切换逻辑，确保数据同步
   - 完善切换后的日期重置功能

2. 性别选择功能优化
   - 添加性别选择的类型定义
   - 优化选择逻辑，提高代码可维护性
   - 完善性别切换的状态管理

3. 地区选择器优化
   - 修复地区选择器的类型错误
   - 优化数据传递的类型安全性

修改文件：
- miniprogram/pages/index/index.ts

技术栈：
- TypeScript
- 微信小程序框架 