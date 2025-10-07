# 博客系统架构文档

## 项目概述

本项目是一个基于 Next.js 15、Supabase 和 TypeScript 的现代化博客系统，采用分层架构设计，具备完整的用户认证、内容管理、评论系统和权限控制功能。

## 技术栈

### 前端技术
- **Next.js 15**: 使用 App Router 的现代化 React 框架
- **TypeScript**: 类型安全的 JavaScript 超集
- **Tailwind CSS**: 实用优先的 CSS 框架
- **Ant Design**: 企业级 UI 组件库
- **Zustand**: 轻量级状态管理库

### 后端技术
- **Supabase**: 开源的 Firebase 替代方案
  - PostgreSQL 数据库
  - 实时订阅
  - 行级安全 (RLS)
  - 用户认证
- **Next.js API Routes**: 服务端 API 端点

### 开发工具
- **ESLint**: 代码检查工具
- **i18next**: 国际化框架

## 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   │   ├── posts/         # 文章相关 API
│   │   ├── comments/      # 评论相关 API
│   │   └── auth/          # 认证相关 API
│   ├── (pages)/           # 页面组件
│   └── globals.css        # 全局样式
├── components/            # 可复用组件
├── config/               # 配置文件
├── database/             # 数据库脚本
│   ├── schema.sql        # 表结构定义
│   ├── rls.sql          # 行级安全策略
│   └── functions.sql     # 数据库函数和触发器
├── hooks/                # 自定义 React Hooks
├── i18n/                 # 国际化配置
├── lib/                  # 库文件
│   └── supabase.ts      # Supabase 客户端配置
├── middleware/           # 中间件
├── router/               # 路由配置
├── services/             # 业务逻辑服务层
├── stores/               # Zustand 状态管理
├── types/                # TypeScript 类型定义
└── utils/                # 工具函数
```

## 核心架构

### 1. 数据库设计

#### 核心表结构
- **user_profiles**: 用户扩展信息
- **posts**: 文章表
- **categories**: 分类表
- **tags**: 标签表
- **post_tags**: 文章标签关联表
- **comments**: 评论表
- **likes**: 点赞表
- **follows**: 关注关系表

#### 权限控制
- 使用 Supabase RLS (Row Level Security) 实现行级权限控制
- 支持三级用户角色：管理员、作者、读者
- 细粒度的数据访问控制

### 2. API 架构

#### RESTful API 设计
- `GET /api/posts` - 获取文章列表（支持分页、搜索、排序）
- `GET /api/posts/[id]` - 获取文章详情
- `POST /api/posts/create` - 发布文章（需要认证）
- `PUT /api/posts/[id]` - 更新文章（需要权限验证）
- `DELETE /api/posts/[id]` - 删除文章（需要权限验证）
- `GET /api/posts/[id]/comments` - 获取文章评论
- `POST /api/comments` - 发表评论（需要认证、内容校验、防刷）

#### 中间件系统
- **认证中间件**: 验证用户身份
- **权限中间件**: 验证用户权限
- **速率限制**: 防止API滥用
- **内容验证**: 过滤不当内容
- **CORS处理**: 跨域请求支持

### 3. 服务层架构

#### 服务类设计
- **PostService**: 文章相关业务逻辑
- **CommentService**: 评论相关业务逻辑  
- **AuthService**: 用户认证和权限管理

#### 特性
- 统一的错误处理
- 业务逻辑封装
- 数据验证和清洗
- 缓存集成

### 4. 状态管理

使用 Zustand 实现轻量级状态管理：
- 用户认证状态
- 全局加载状态
- 错误处理状态

### 5. 性能优化

#### 缓存策略
- 内存缓存实现
- API 响应缓存
- 缓存装饰器
- 自动过期清理

#### 性能监控
- 请求性能监控
- 缓存命中率统计
- 错误追踪

## 安全特性

### 1. 认证与授权
- Supabase Auth 集成
- JWT token 验证
- 基于角色的访问控制 (RBAC)

### 2. 数据安全
- SQL 注入防护（Supabase 内置）
- XSS 攻击防护
- CSRF 保护
- 输入验证和清洗

### 3. API 安全
- 请求速率限制
- 内容过滤
- 用户权限验证
- 敏感操作日志

## 部署配置

### 环境变量
```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# 应用配置
NEXT_PUBLIC_APP_TITLE=My Blog
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_ENV_NAME=production

# 国际化配置
NEXT_PUBLIC_DEFAULT_LANGUAGE=zh
NEXT_PUBLIC_SUPPORTED_LANGUAGES=zh,en
```

### 数据库初始化
1. 在 Supabase 控制台执行 `database/schema.sql`
2. 执行 `database/rls.sql` 配置权限策略
3. 执行 `database/functions.sql` 创建辅助函数

## 开发指南

### 本地开发
```bash
npm run dev          # 开发模式
npm run build        # 构建生产版本
npm run start        # 启动生产服务器
npm run lint         # 代码检查
```

### 代码规范
- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 统一的错误处理模式
- 完善的类型定义

## 功能特性

### 核心功能
- ✅ 用户注册、登录、权限管理
- ✅ 文章发布、编辑、删除
- ✅ 文章分类和标签系统
- ✅ 评论系统（支持嵌套回复）
- ✅ 点赞功能
- ✅ 用户关注系统
- ✅ 内容搜索和过滤
- ✅ 响应式设计

### 管理功能
- ✅ 基于角色的权限控制
- ✅ 内容审核
- ✅ 用户管理
- ✅ 统计和分析

### 性能特性
- ✅ 服务端渲染 (SSR)
- ✅ 静态生成 (SSG)
- ✅ 缓存优化
- ✅ 图片优化
- ✅ 代码分割

## 扩展性

### 水平扩展
- 无状态 API 设计
- 数据库连接池
- CDN 集成支持

### 功能扩展
- 插件系统架构
- 主题系统支持
- 第三方集成接口

### 监控和日志
- 性能监控
- 错误追踪
- 审计日志

## 总结

本博客系统采用现代化的全栈架构，具备以下优势：

1. **类型安全**: 全面的 TypeScript 支持
2. **性能优化**: 多层缓存和性能监控
3. **安全可靠**: 完善的认证授权和数据保护
4. **易于维护**: 清晰的分层架构和代码组织
5. **可扩展性**: 模块化设计和标准化接口

该架构为构建现代化博客应用提供了坚实的基础，同时保持了良好的开发体验和运维友好性。