# 文章博客 (Article Blog)

一个基于 Next.js 15 + Ant Design 5 的现代化博客系统，集成了自动化国际化系统，提供完整的多语言支持和多环境部署方案。

## ✨ 核心特性

- 🚀 **Next.js 15.5.3** - 使用 App Router 和 Turbopack 构建
- 🎨 **Ant Design 5.27.4** - 企业级 UI 组件库
- 🌍 **自动化 i18n** - 智能中英文转换，支持 VS Code 插件自动翻译
- 📱 **Tailwind CSS 4** - 现代化样式方案
- 🔄 **Zustand 5.0.8** - 轻量级状态管理
- 🛡️ **TypeScript** - 完整类型支持
- 🌐 **多环境部署** - 支持开发、测试、生产环境
- 🔄 **HTTP 客户端** - 内置缓存、重试、请求去重等功能
- 📊 **PM2 进程管理** - 生产级部署方案

## 🏗️ 技术架构

### 前端框架
- **Next.js 15** - React 全栈框架，支持 SSR/SSG
- **React 19** - 最新版本的 React
- **TypeScript** - 类型安全的 JavaScript

### UI 组件与样式
- **Ant Design 5** - 企业级 UI 设计语言
- **Tailwind CSS 4** - 原子化 CSS 框架
- **React 19 兼容性补丁** - 确保组件库兼容性

### 状态管理
- **Zustand** - 轻量级状态管理
- **Auth Store** - 用户认证状态
- **Loading Store** - 全局加载状态
- **User Store** - 用户数据管理

### 国际化系统
- **i18next 25.5.2** - 国际化核心库
- **自动化转换** - VS Code 插件智能转换中文字符串
- **多语言支持** - 中文/英文动态切换
- **命名空间管理** - 模块化翻译文件

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd article-blog
```

### 2. 安装依赖

```bash
npm install
```

### 3. 环境配置

```bash
# 复制环境配置文件
cp .env.example .env.local
```

在 `.env.local` 中配置必要的环境变量：

```env
# API 配置
NEXT_PUBLIC_BASE_API=https://your-api-endpoint.com

# 应用配置
NEXT_PUBLIC_APP_TITLE=文章博客系统

# 语言配置
NEXT_PUBLIC_DEFAULT_LANGUAGE=zh
NEXT_PUBLIC_SUPPORTED_LANGUAGES=zh,en
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 🌍 自动化国际化系统

### VS Code 插件安装

1. 下载 [i18n-auto-sync](https://github.com/adzcsx2/i18n-auto-sync) 插件
2. 在 VS Code 中安装插件：`Ctrl+Shift+P` → `Extensions: Install from VSIX...`
3. 选择下载的 `.vsix` 文件

### 使用方式

**编写组件时直接使用中文：**

```tsx
export default function HomePage() {
  return (
    <div>
      <h1>欢迎来到文章博客</h1>
      <p>这是一个基于 Next.js 的博客系统</p>
    </div>
  );
}
```

**保存后自动转换为：**

```tsx
import { useTranslation } from "@/i18n/hooks";

export default function HomePage() {
  const { t } = useTranslation("common");
  return (
    <div>
      <h1>{t("欢迎来到文章博客")}</h1>
      <p>{t("这是一个基于 Next.js 的博客系统")}</p>
    </div>
  );
}
```

**同时生成翻译文件：**

```typescript
// src/i18n/lang/zh/common.ts
export default {
  "欢迎来到文章博客": "欢迎来到文章博客",
  "这是一个基于 Next.js 的博客系统": "这是一个基于 Next.js 的博客系统",
};

// src/i18n/lang/en/common.ts
export default {
  "欢迎来到文章博客": "Welcome to Article Blog",
  "这是一个基于 Next.js 的博客系统": "This is a blog system based on Next.js",
};
```

### 插件快捷键

- `Ctrl+Shift+I` - 处理当前文件
- `Ctrl+Shift+R` - 重命名翻译键
- `Ctrl+Alt+S` - 保存并处理

## 🏗️ 项目结构

```
src/
├── app/                    # Next.js App Router 页面
│   ├── page.tsx           # 首页
│   ├── login/             # 登录相关页面
│   └── layout.tsx         # 根布局
├── components/            # 可复用组件
│   ├── AntdConfigProvider.tsx    # Ant Design 配置
│   ├── HomeHeaderLogin.tsx       # 首页登录组件
│   └── FOUCPrevention.tsx        # 闪烁预防组件
├── stores/               # Zustand 状态管理
│   ├── auth.ts          # 认证状态
│   ├── loading.ts       # 加载状态
│   ├── userStore.tsx    # 用户数据
│   └── home-title.tsx   # 页面标题
├── i18n/               # 国际化系统
│   ├── index.ts        # i18n 配置
│   ├── hooks.ts        # React hooks
│   ├── utils.ts        # 工具函数
│   └── lang/           # 翻译文件
│       ├── zh/         # 中文翻译
│       └── en/         # 英文翻译
├── http/               # HTTP 客户端
│   └── http.ts         # 封装的请求工具
├── config/             # 配置文件
│   └── env.ts          # 环境变量管理
├── types/              # TypeScript 类型定义
├── utils/              # 工具函数
└── router/             # 路径定义
```

## 🔧 HTTP 客户端架构

项目内置了强大的 HTTP 客户端，具备以下特性：

- **请求缓存** - 内置 TTL 缓存机制
- **请求去重** - 自动取消相同的并发请求
- **重试逻辑** - 可配置的重试机制
- **加载状态** - 多种加载策略
- **Cookie 认证** - 基于 HttpOnly cookies
- **请求合并** - 复用进行中的请求

## 📦 可用命令

### 开发命令
```bash
npm run dev              # 启动开发服务器 (Turbopack)
npm run build            # 构建生产版本
npm run start            # 启动生产服务器
npm run lint             # 运行 ESLint 检查
```

### 多环境命令
```bash
# 测试环境
npm run build:test       # 构建测试版本
npm run start:test       # 启动测试服务器 (端口: 3001)

# 生产环境
npm run build:production # 构建生产版本
npm run start:production # 启动生产服务器 (端口: 3000)
```

### 部署命令
```bash
./deploy.sh local-test        # 本地构建测试版
./deploy.sh local-production  # 本地构建生产版
```

## 🌐 多环境部署

### 环境配置文件

- `.env.local` - 本地开发配置（不提交到版本控制）
- `.env.test` - 测试环境配置
- `.env.production` - 生产环境配置

### PM2 进程管理

使用 PM2 管理生产环境进程：

```bash
# 查看进程状态
pm2 list

# 查看日志
pm2 logs app-test
pm2 logs app-production

# 重启服务
pm2 restart app-test
pm2 restart app-production
```

### 环境对比

| 环境 | 端口 | PM2 进程名 | 配置文件 | 访问地址 |
| ---- | ---- | ---------- | -------- | --------- |
| 开发 | 3000 | - | .env.local | http://localhost:3000 |
| 测试 | 3001 | app-test | .env.test | http://服务器:3001 |
| 生产 | 3000 | app-production | .env.production | http://服务器:3000 |

## 🎨 核心组件

### AntdConfigProvider
- 动态语言切换支持
- React 19 兼容性处理
- 统一的主题配置

### 认证系统
- 基于 HttpOnly cookies 的安全认证
- 自动 token 刷新
- 登录状态持久化

### 加载管理
- 全局加载状态管理
- 多种加载显示策略
- 请求级别的加载控制

## 🔒 环境要求

- **Node.js 18+** - 运行环境要求
- **npm 9+** - 包管理器
- **VS Code** - 推荐的开发环境（用于 i18n 插件）

## 💡 最佳实践

### 开发流程
1. 直接编写包含中文的 React 组件
2. 保存文件，让 VS Code 插件自动处理国际化
3. 检查自动生成的翻译文件
4. 使用 Turbopack 享受快速的开发体验

### 代码规范
- 使用 TypeScript 进行类型安全开发
- 遵循 ESLint 规则
- 利用 Tailwind CSS 进行样式开发
- 保持组件的纯函数特性

### 性能优化
- 利用 Next.js 的自动代码分割
- 使用内置的 HTTP 缓存机制
- 合理使用 Zustand 状态管理
- 启用图片优化

## 🚨 注意事项

- 不要手动编辑 `src/i18n/lang/en/` 下的文件，它们由插件自动生成
- 保持正确的项目目录结构以确保 i18n 插件正常工作
- 生产环境部署前请确保所有环境变量配置正确
- 使用 PM2 部署时确保服务器已安装 Node.js 18+

## 📝 许可证

MIT License

---

🎉 **享受现代化的博客开发体验！**
_专注内容创作，技术细节交给框架处理！_