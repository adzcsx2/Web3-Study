# 项目指导说明

## 项目概述
这是一个Web3质押平台前端项目，使用Next.js 15、React 19和TypeScript构建。

## 编码规范
- 使用TypeScript严格模式
- 遵循React 19最佳实践
- 使用Tailwind CSS进行样式设计
- 组件优先使用函数组件和Hooks

## 项目架构
- App Router结构
- Zustand状态管理
- Wagmi Web3集成
- Viem合约交互

## 特殊要求
- 所有Web3交互需要错误处理
- 交易状态需要实时更新
- 组件需要响应式设计
- 需要国际化支持（中英文）

## 测试要求
- 组件测试优先
- Web3功能需要模拟测试
- 需要覆盖边界情况

## 部署要求
- PM2进程管理
- 多环境配置（test/production）
- 构建优化

## 交互规则
**重要**：请遵循 `.claude/interaction-rules.md` 中定义的中文命令翻译和优化建议规则。