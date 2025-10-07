# Next.js 自动化 i18n 框架

一个 Next.js 练手项目，集成了 [i18n-auto-sync](https://github.com/adzcsx2/i18n-auto-sync) VS Code 插件，实现国际化多语言自动转换：自动将页面中的中文字符串转换为 i18n 的 t() 函数调用，并自动生成对应的中英文翻译键值对。让你只需专注于页面开发，i18n 国际化完全自动处理！

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/adzcsx2/nextjs-study.git
cd nextjs-study/next_app
```

### 2. 安装依赖

```bash
npm install
```

### 3. 环境配置

复制环境配置示例文件并根据你的需要进行配置：

```bash
# 复制配置文件
cp .env.example .env.local
```

在 `.env.local` 文件中配置必要的环境变量：

```env
# ==================== API 配置 ====================
# API 基础地址 - 用于接口代理和请求
NEXT_PUBLIC_BASE_API=https://mock.apifox.cn/m1/2398938-0-default

# ==================== 应用配置 ====================
# 应用标题
NEXT_PUBLIC_APP_TITLE=图书管理系统(开发版)
```

> 📝 **详细配置说明**: 查看 [环境变量配置指南](./docs/ENV_GUIDE.md) 获取完整的配置说明

### 4. 安装 VS Code i18n 插件

1. 下载插件：从 [GitHub Release](https://github.com/adzcsx2/i18n-auto-sync/releases) 下载 `i18n-auto-sync-0.1.0.vsix` 文件
2. 安装插件：在 VS Code 中按 `Ctrl+Shift+P`，输入 `Extensions: Install from VSIX...`，选择下载的 `.vsix` 文件

### 5. 启动开发

```bash
npm run dev
```

这个命令会启动 Next.js 开发服务器 (默认端口 3000)

🎉 现在访问 [http://localhost:3000](http://localhost:3000) 即可开始使用！

## ✨ 核心特性

- 🎯 **智能字符串转换** - 自动将 JSX 中的中文字符串转换为 `t("key")` 格式
- 🔄 **自动键值对生成** - 自动在中文翻译文件中添加对应的键值对
- 🌍 **实时英文翻译** - 腾讯翻译 API 自动生成英文翻译并同步
- � **VS Code 插件驱动** - 基于 VS Code 插件，提供更好的开发体验
- 🧹 **自动清理优化** - 自动清理未使用的翻译键，保持文件整洁
- ⚡ **实时处理机制** - 保存文件时自动处理，支持手动触发
- 🛡️ **格式保护** - 完美保持代码格式，支持 Prettier 兼容
- 🚀 **多环境部署** - 支持开发、测试、生产环境的自动化部署

## 🌍 i18n 自动化处理系统

本项目集成了 [i18n-auto-sync](https://github.com/adzcsx2/i18n-auto-sync) VS Code 插件，提供智能化的国际化处理方案。

### ✨ 核心功能

- **🎯 智能监听**: VS Code 插件自动检测并处理包含中文的 React 组件文件
- **🔄 自动转换**: 将中文字符串转换为 `t()` 函数调用
- **📝 自动导入**: 自动添加 `import { useTranslation } from "@/i18n/hooks"`
- **🎯 自动调用**: 自动添加 `const { t } = useTranslation()`
- **📁 文件同步**: 中英文翻译文件自动双向同步
- **🌍 智能翻译**: 集成腾讯云 API，自动生成英文翻译
- **🧹 清理优化**: 自动清理未使用的翻译键，保持文件整洁

### 🚀 快速使用

#### 1. 安装 VS Code 插件

1. 下载插件：从 [GitHub Release](https://github.com/adzcsx2/i18n-auto-sync/releases) 下载 `i18n-auto-sync-0.1.0.vsix` 文件
2. 安装插件：在 VS Code 中按 `Ctrl+Shift+P`，输入 `Extensions: Install from VSIX...`，选择下载的 `.vsix` 文件
3. 配置项目：确保项目具备正确的目录结构（见下方结构要求）

#### 2. 使用方式

```bash
# 自动模式
# 保存文件时自动转换中文字符串

# 手动模式快捷键（推荐）
Ctrl+Shift+I     # 处理当前文件
Ctrl+Shift+R     # 重命名翻译键
Ctrl+Alt+S       # 保存并处理
```

#### 3. 插件配置

在 VS Code 设置中搜索 `i18n-auto-sync`，可配置：

- **触发模式**: 自动保存模式 / 手动模式
- **翻译文件路径**: 自定义翻译文件位置
- **目标目录过滤**: 指定需要处理的目录
- **腾讯云翻译**: 配置自动英文翻译（可选）

#### 4. 项目结构要求

```
your-project/
├── src/
│   ├── i18n/
│   │   ├── hooks.ts          # useTranslation hook
│   │   └── lang/
│   │       ├── zh/
│   │       │   └── common.ts # 中文翻译文件
│   │       └── en/
│   │           └── common.ts # 英文翻译文件
│   ├── components/           # 你的组件
│   └── ...
└── ...
```

### 📝 使用示例

**编写代码时直接使用中文：**

```tsx
// 输入
export default function LoginPage() {
  return (
    <Form.Item
      label="用户名"
      name="username"
      rules={[{ required: true, message: "请输入用户名" }]}
    >
      <Input placeholder="请输入用户名" />
    </Form.Item>
  );
}
```

**保存文件后自动转换为：**

```tsx
// 输出
import { useTranslation } from "@/i18n/hooks";

export default function LoginPage() {
  const { t } = useTranslation("common");
  return (
    <Form.Item
      label={t("用户名")}
      name="username"
      rules={[{ required: true, message: t("请输入用户名") }]}
    >
      <Input placeholder={t("请输入用户名")} />
    </Form.Item>
  );
}
```

**同时自动生成翻译文件：**

```typescript
// src/i18n/lang/zh/common.ts
export default {
  用户名: "用户名",
  请输入用户名: "请输入用户名",
};

// src/i18n/lang/en/common.ts
export default {
  用户名: "Username",
  请输入用户名: "Please enter username",
};
```

### ⚙️ 高级配置

VS Code 插件设置示例：

```json
{
  "i18n-auto-sync.triggerMode": "auto-save",
  "i18n-auto-sync.langRootDir": "src/",
  "i18n-auto-sync.activeDirectories": "src/app/*,src/components/*",
  "i18n-auto-sync.autoTranslate": true,
  "i18n-auto-sync.tencentSecretId": "your_secret_id",
  "i18n-auto-sync.tencentSecretKey": "your_secret_key"
}
```

### 🛡️ 注意事项

- ✅ **推荐**: 直接在组件中写中文，让插件自动处理
- ✅ **支持文件**: `src/` 下的 `.tsx/.ts/.jsx/.js` 文件
- ✅ **智能过滤**: 只处理包含中文字符的字符串，纯英文不会被转换
- ❌ **避免**: 手动编辑英文翻译文件（会被自动覆盖）
- ❌ **排除**: `i18n/` 目录下的文件不会被转换

### 🔧 常见问题

**Q: 插件没有自动处理中文字符串？**

- 检查 VS Code 设置中的 `i18n-auto-sync.triggerMode`
- 确保 `activeDirectories` 包含当前文件目录
- 验证项目目录结构是否正确

**Q: 英文字符串没有被转换？**

- 这是设计如此，插件只处理包含中文字符的字符串

**Q: 翻译文件没有生成？**

- 检查 `langRootDir` 路径设置
- 确保有 `src/i18n/lang/` 目录结构
- 验证 VS Code 写入权限

### 📚 详细文档

- **插件仓库**: [https://github.com/adzcsx2/i18n-auto-sync](https://github.com/adzcsx2/i18n-auto-sync)
- **使用指南**: 查看插件 README 获取完整使用说明
- **问题反馈**: 在 GitHub 仓库提交 Issue

---

## 🏗️ 多环境构建与部署

### 环境配置

项目支持三种环境，每种环境都有独立的配置文件：

- `.env.local` - 本地开发配置（优先级最高，不会上传到仓库）
- `.env.test` - 测试环境配置
- `.env.production` - 生产环境配置

#### 主要环境变量说明

| 变量名                  | 说明               | 示例值                      |
| ----------------------- | ------------------ | --------------------------- |
| `NEXT_PUBLIC_BASE_API`  | API 基础地址       | https://api.example.com     |
| `NEXT_PUBLIC_APP_TITLE` | 应用标题           | 应用系统(开发版)            |
| `NEXT_PUBLIC_ENV_NAME`  | 环境标识           | development/test/production |
| `NEXT_PUBLIC_USE_MOCK`  | 是否使用 Mock 数据 | true/false                  |
| `NEXT_PUBLIC_DEBUG`     | 调试模式           | true/false                  |
| `PORT`                  | 应用端口           | 3000/3001                   |

> 📝 **完整配置指南**: 查看 [环境变量配置指南](./docs/ENV_GUIDE.md) 获取详细说明

### 构建命令

```bash
# 安装依赖
npm install

# 开发环境
npm run dev                    # 开发模式启动

# 测试环境
npm run build:test             # 构建测试版
npm run start:test             # 启动测试版 (端口: 3001)

# 生产环境
npm run build:production       # 构建生产版
npm run start:production       # 启动生产版 (端口: 3000)
```

### 自动化部署

使用部署脚本进行一键部署：

```bash
# 本地构建
./deploy.sh local-test         # 本地构建测试版
./deploy.sh local-production   # 本地构建生产版

# 服务器部署（需先配置服务器信息）
./deploy.sh test              # 构建并部署测试版到服务器
./deploy.sh production        # 构建并部署生产版到服务器
```

### 部署脚本配置

在使用服务器部署前，需要修改 `deploy.sh` 中的服务器配置：

```bash
# 编辑部署脚本中的配置
SERVER_USER="your-username"      # 服务器用户名
SERVER_HOST="your-server-ip"     # 服务器IP地址
SERVER_PATH="/var/www/app"       # 部署路径
```

### PM2 进程管理

部署后使用 PM2 管理应用进程：

```bash
# 查看所有进程
pm2 list

# 查看日志
pm2 logs app-test              # 测试版日志
pm2 logs app-production        # 生产版日志

# 重启服务
pm2 restart app-test           # 重启测试版
pm2 restart app-production     # 重启生产版

# 停止服务
pm2 stop app-test              # 停止测试版
pm2 stop app-production        # 停止生产版
```

### 环境对比

| 环境 | 端口 | PM2 进程名     | 配置文件        | 访问地址              |
| ---- | ---- | -------------- | --------------- | --------------------- |
| 开发 | 3000 | -              | .env.local      | http://localhost:3000 |
| 测试 | 3001 | app-test       | .env.test       | http://服务器 IP:3001 |
| 生产 | 3000 | app-production | .env.production | http://服务器 IP:3000 |

> 📝 **详细部署说明**: 查看 [DEPLOYMENT.md](./docs/DEPLOYMENT.md) 获取完整的部署指南

## 项目结构

```
next_app/
├── .env.example         # 环境变量配置示例
├── .env.local          # 本地环境配置（不上传到仓库）
├── .env.test          # 测试环境配置
├── .env.production    # 生产环境配置
├── docs/
│   ├── ENV_GUIDE.md   # 环境变量配置指南
│   └── DEPLOYMENT.md  # 部署指南
├── src/
│   ├── config/
│   │   └── env.ts     # 环境变量配置管理
│   ├── i18n/
│   │   └── lang/
│   │       ├── zh/    # 中文翻译文件
│   │       │   ├── common.ts
│   │       │   └── network.ts
│   │       └── en/    # 英文翻译文件
│   │           ├── common.ts
│   │           └── network.ts
│   ├── app/           # 页面文件
│   │   ├── page.tsx
│   │   └── ...
│   └── ...
├── deploy.sh          # 自动化部署脚本
└── ecosystem.config.json  # PM2进程管理配置
```

## ️ 可用命令

| 命令            | 描述           |
| --------------- | -------------- |
| `npm run dev`   | 启动开发服务器 |
| `npm run build` | 构建生产版本   |
| `npm run start` | 启动生产服务器 |
| `npm run lint`  | 代码检查       |

## 🔒 环境要求

- **Node.js 18+**: 运行 Next.js 应用的基础要求
- **环境配置文件**: 正确配置 `.env.local` 文件

### 必需配置

- `NEXT_PUBLIC_BASE_API`: API 基础地址
- `NEXT_PUBLIC_APP_TITLE`: 应用标题

> 📝 **完整配置清单**: 查看 [环境变量配置指南](./docs/ENV_GUIDE.md)

## 💡 最佳实践

1. **推荐开发流程**：

   - ✅ 正常编写包含中文的 React 组件
   - ✅ 保存文件后通过 VS Code 插件自动转换
   - ✅ 检查插件状态确认处理结果
   - ✅ 英文翻译会自动同步，无需手动干预

2. **代码组织建议**：

   - 🎯 专注于页面功能开发，i18n 完全自动化处理
   - 📝 中文内容写得越规范，翻译质量越好
   - 🔄 插件会自动处理 JSX 中的所有中文字符串

3. **性能优化特点**：

   - ⚡ 智能检测：插件自动检测文件变化
   - 🧹 按需清理：可通过插件命令清理未使用的翻译键
   - 🔄 批量处理：多个文件变化时批量处理，提高效率
   - 💾 避免重复：相同内容不会重复翻译

4. **错误处理机制**：
   - 🛡️ 翻译 API 失败时自动重试
   - 📋 插件日志输出，便于问题排查
   - 🔧 插件保护代码格式，不会破坏原有结构

## ⚠️ 注意事项

- 🚫 **不要手动编辑** `src/i18n/lang/en/` 下的文件，它们由插件自动生成
- ✅ **可以手动调整** 自动生成的英文翻译内容，但重新运行时可能被覆盖
- 🔧 **翻译配置** 如需自动翻译功能，在 VS Code 插件设置中配置腾讯云密钥
- 📁 **保持文件结构** 不要移动或重命名 i18n 相关文件夹

## 🚫 停止服务

使用 `Ctrl+C` 可以停止 Next.js 开发服务器。

## 📝 许可证

MIT License

---

🎉 **享受完全自动化的 React 国际化开发体验！**  
_专注写页面，i18n 交给插件自动处理！_
