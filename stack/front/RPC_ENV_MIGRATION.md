# RPC 配置迁移到环境变量

## 概述

已将硬编码的 RPC URLs 迁移到环境变量中，提高了安全性和灵活性。

## 重构内容

### 1. 环境变量配置 (.env.local)

```bash
# Infura Project ID - 主要的 RPC 提供商
NEXT_PUBLIC_INFURA_PROJECT_ID=your_infura_project_id

# 自定义 RPC URLs（可选覆盖）
NEXT_PUBLIC_RPC_URL_1=https://your-custom-mainnet-rpc.com
NEXT_PUBLIC_RPC_URL_137=https://your-custom-polygon-rpc.com
# ... 其他链的自定义 RPC
```

### 2. 配置优先级

1. **自定义 RPC URL** (NEXT*PUBLIC_RPC_URL*[CHAIN_ID]) - 最高优先级
2. **Infura + Project ID** (NEXT_PUBLIC_INFURA_PROJECT_ID) - 推荐方式
3. **默认配置** - 降级方案（仅开发环境）

### 支持的链

| 链名称   | Chain ID | 环境变量                             |
| -------- | -------- | ------------------------------------ |
| Mainnet  | 1        | NEXT_PUBLIC_RPC_URL_1_MAINNET        |
| Polygon  | 137      | NEXT_PUBLIC_RPC_URL_137_POLYGON      |
| Optimism | 10       | NEXT_PUBLIC_RPC_URL_10_OPTIMISM      |
| Arbitrum | 42161    | NEXT_PUBLIC_RPC_URL_42161_ARBITRUM   |
| Sepolia  | 11155111 | NEXT_PUBLIC_RPC_URL_11155111_SEPOLIA |
| Base     | 8453     | NEXT_PUBLIC_RPC_URL_8453_BASE        |

## 使用方式

### 方式一：使用 Infura（推荐）

1. 访问 [Infura](https://infura.io/) 注册账号
2. 创建新项目获取 Project ID
3. 在 `.env.local` 中配置：

```bash
NEXT_PUBLIC_INFURA_PROJECT_ID=your_project_id
```

### 方式二：直接配置 RPC URLs（推荐）

在 `.env.local` 中直接配置各链的 RPC：

```bash
# 配置各链的 RPC URLs
NEXT_PUBLIC_RPC_URL_1_MAINNET=https://mainnet.infura.io/v3/your-project-id
NEXT_PUBLIC_RPC_URL_137_POLYGON=https://polygon-mainnet.infura.io/v3/your-project-id
NEXT_PUBLIC_RPC_URL_10_OPTIMISM=https://optimism-mainnet.infura.io/v3/your-project-id
NEXT_PUBLIC_RPC_URL_42161_ARBITRUM=https://arbitrum-mainnet.infura.io/v3/your-project-id
NEXT_PUBLIC_RPC_URL_11155111_SEPOLIA=https://sepolia.infura.io/v3/your-project-id
NEXT_PUBLIC_RPC_URL_8453_BASE=https://base-mainnet.infura.io/v3/your-project-id

# 或者使用不同的 RPC 提供商
NEXT_PUBLIC_RPC_URL_1_MAINNET=https://eth-mainnet.alchemyapi.io/v2/your-api-key
NEXT_PUBLIC_RPC_URL_137_POLYGON=https://your-endpoint.matic.quiknode.pro/your-api-key/
```

### 方式三：混合使用

```bash
# 使用 Infura 作为默认（降级方案）
NEXT_PUBLIC_INFURA_PROJECT_ID=your_infura_project_id

# 特定链使用专门的 RPC 服务
NEXT_PUBLIC_RPC_URL_1_MAINNET=https://eth-mainnet.alchemyapi.io/v2/your-alchemy-key
NEXT_PUBLIC_RPC_URL_137_POLYGON=https://your-endpoint.matic.quiknode.pro/your-quicknode-key/
```

## 代码变更

### 文件结构

```
src/config/
├── rpc.ts          # RPC 配置（现在基于环境变量）
├── env.ts          # 环境变量处理（新增 RPC 配置）
└── wagmi.ts        # Wagmi 配置（使用共享 RPC）

src/utils/
└── viemContractUtils.ts  # Viem 配置（使用共享 RPC）
```

### 主要变更

1. **rpc.ts**: 动态构建 RPC URLs，支持环境变量覆盖
2. **env.ts**: 新增 `infuraProjectId` 和 `rpcUrls` 配置
3. **wagmi.ts**: 使用 `RPC_URLS` 替代硬编码
4. **viemContractUtils.ts**: 使用 `RPC_URLS` 替代硬编码

## 优势

### 安全性

- ✅ API 密钥不再硬编码在源代码中
- ✅ 敏感信息存储在环境变量中
- ✅ `.env.local` 文件不会提交到版本控制

### 灵活性

- ✅ 不同环境可使用不同的 RPC 提供商
- ✅ 支持多种 RPC 提供商（Infura、Alchemy、QuickNode 等）
- ✅ 可以针对特定链使用专门的 RPC 服务

### 可维护性

- ✅ 统一的 RPC 配置管理
- ✅ 配置优先级清晰
- ✅ 降级机制确保开发环境可用

## 迁移步骤

如果您有现有的项目需要迁移：

1. **备份现有配置**

```bash
cp .env.local .env.local.backup
```

2. **添加 RPC 环境变量**

```bash
# 在 .env.local 中添加
NEXT_PUBLIC_INFURA_PROJECT_ID=your_project_id
```

3. **验证配置**

```bash
npm run dev
```

检查控制台是否有 RPC 相关警告。

4. **测试连接**
   确保钱包连接和合约交互正常工作。

## 故障排除

### 常见问题

1. **RPC 连接失败**
   - 检查 `NEXT_PUBLIC_INFURA_PROJECT_ID` 是否正确
   - 验证自定义 RPC URL 是否可访问

2. **开发环境警告**

   ```
   ⚠️ 未配置 INFURA_PROJECT_ID，使用默认配置
   ```

   - 这是正常的，添加您的 Infura Project ID 即可消除

3. **类型错误**
   - 确保环境变量以 `NEXT_PUBLIC_` 开头
   - 重启开发服务器以重新加载环境变量

### 调试技巧

1. **检查当前 RPC 配置**

```typescript
import { RPC_URLS } from "@/config/rpc";
console.log("Current RPC URLs:", RPC_URLS);
```

2. **验证环境变量**

```typescript
import { env } from "@/config/env";
console.log("Infura Project ID:", env.infuraProjectId);
console.log("Custom RPC URLs:", env.rpcUrls);
```

---

_迁移日期: 2025-10-24_
_作者: Hoyn_
