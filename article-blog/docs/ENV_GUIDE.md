# 环境变量使用说明

## 📋 快速开始

1. **复制示例文件**

   ```bash
   cp .env.example .env.local
   ```

2. **修改配置值**
   根据你的实际环境修改 `.env.local` 中的配置值

3. **验证配置**
   启动开发服务器时，配置会自动验证并显示在控制台

## 🔧 配置说明

### API 配置

-  `NEXT_PUBLIC_BASE_API`: API 基础地址，用于接口代理和请求

### 应用配置

-  `NEXT_PUBLIC_APP_TITLE`: 应用标题，显示在浏览器标题栏
-  `NEXT_PUBLIC_APP_VERSION`: 应用版本标识
-  `NEXT_PUBLIC_ENV_NAME`: 环境名称标识

### 国际化配置

-  `NEXT_PUBLIC_DEFAULT_LANGUAGE`: 默认语言（zh/en）
-  `NEXT_PUBLIC_SUPPORTED_LANGUAGES`: 支持的语言列表，逗号分隔

### 开发配置

-  `NEXT_PUBLIC_USE_MOCK`: 是否启用 Mock 数据
-  `NEXT_PUBLIC_DEBUG`: 调试模式，开启后显示更多日志
-  `NEXT_PUBLIC_LOG_LEVEL`: 日志级别（debug/info/warn/error）

### 服务器配置

-  `PORT`: 应用运行端口，默认 3000

## 🌍 多环境配置

项目支持多环境配置：

### 开发环境

使用 `.env.local` 文件

### 测试环境

使用 `.env.test` 文件

```bash
npm run build:test
npm run start:test
```

### 生产环境

使用 `.env.production` 文件

```bash
npm run build:production
npm run start:production
```

## 📝 使用方式

### 在组件中使用

```typescript
import { env } from "@/config/env";

export default function MyComponent() {
   return (
      <div>
         <h1>{env.appTitle}</h1>
         <p>环境: {env.envName}</p>
         <p>版本: {env.appVersion}</p>
      </div>
   );
}
```

### 在 API 中使用

```typescript
import { env } from "@/config/env";

export async function fetchData() {
   const response = await fetch(`${env.baseAPI}/users`);
   return response.json();
}
```

### 环境判断

```typescript
import { env } from "@/config/env";

if (env.isDev) {
   console.log("开发环境");
}

if (env.isProd) {
   console.log("生产环境");
}

if (env.debug) {
   console.log("调试模式已开启");
}
```

## ⚠️ 注意事项

1. **安全性**: 不要在 `.env.local` 文件中存储敏感信息，它会被 Git 忽略但仍存在于本地
2. **客户端变量**: 只有以 `NEXT_PUBLIC_` 开头的变量才能在客户端代码中使用
3. **服务端变量**: 不以 `NEXT_PUBLIC_` 开头的变量只能在服务端使用
4. **重启应用**: 修改环境变量后需要重启开发服务器才能生效

## 🚫 常见错误

### 变量未定义

```bash
❌ 环境变量配置错误:
  - NEXT_PUBLIC_BASE_API 未配置
```

**解决方案**: 检查 `.env.local` 文件中是否正确配置了相应变量

### 客户端无法访问

如果在客户端组件中无法获取环境变量，确保变量名以 `NEXT_PUBLIC_` 开头
