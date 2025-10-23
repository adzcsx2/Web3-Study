# Viem 配置更新说明

## 更新概述

将 `viemContractUtils.ts` 中的配置完全迁移到使用 `wagmi.ts` 中的配置，确保整个应用的配置一致性。

## 更新内容

### 1. 网络配置

- ✅ 已迁移：使用 `wagmi.ts` 中的 `chains` 配置
- ✅ 已迁移：使用 `wagmi.ts` 中的 `transports` 配置
- ✅ 已迁移：RPC URLs 从 wagmi 配置中提取

### 2. 合约配置 (新增)

- ✅ **新增迁移**：使用 `wagmi.ts` 中的 `CONTRACT_CONFIG`
- ✅ **Gas 设置**：`defaultGasLimit`, `defaultGasPrice`
- ✅ **重试设置**：`defaultRetryCount`, `defaultRetryDelay`
- ✅ **日志设置**：`enableLogging`
- ✅ **交易设置**：`confirmations`, `timeout`

## 配置映射

| wagmi.ts 配置                       | viemContractUtils.ts 配置                | 转换            |
| ----------------------------------- | ---------------------------------------- | --------------- |
| `CONTRACT_CONFIG.defaultGasLimit`   | `VIEM_CONFIG.contract.defaultGasLimit`   | `BigInt(value)` |
| `CONTRACT_CONFIG.defaultGasPrice`   | `VIEM_CONFIG.contract.defaultGasPrice`   | `BigInt(value)` |
| `CONTRACT_CONFIG.defaultRetryCount` | `VIEM_CONFIG.contract.defaultRetryCount` | 直接使用        |
| `CONTRACT_CONFIG.defaultRetryDelay` | `VIEM_CONFIG.contract.defaultRetryDelay` | 直接使用        |
| `CONTRACT_CONFIG.enableLogging`     | `VIEM_CONFIG.contract.enableLogging`     | 直接使用        |
| `CONTRACT_CONFIG.confirmations`     | `VIEM_CONFIG.contract.confirmations`     | 直接使用        |
| `CONTRACT_CONFIG.timeout`           | `VIEM_CONFIG.contract.timeout`           | 直接使用        |

## 配置文件结构

### wagmi.ts

```typescript
export const CONTRACT_CONFIG = {
  // Gas 设置
  defaultGasLimit: "300000",
  defaultGasPrice: "20000000000", // 20 Gwei

  // 重试设置
  defaultRetryCount: 3,
  defaultRetryDelay: 1000,

  // 日志设置
  enableLogging: process.env.NODE_ENV === "development",

  // 交易确认设置
  confirmations: 1,
  timeout: 300000, // 5分钟
};
```

### viemContractUtils.ts

```typescript
export const VIEM_CONFIG = {
  // ... 其他配置

  // 合约设置 - 使用 wagmi 配置
  contract: {
    defaultGasLimit: BigInt(CONTRACT_CONFIG.defaultGasLimit),
    defaultGasPrice: BigInt(CONTRACT_CONFIG.defaultGasPrice),
    defaultRetryCount: CONTRACT_CONFIG.defaultRetryCount,
    defaultRetryDelay: CONTRACT_CONFIG.defaultRetryDelay,
    enableLogging: CONTRACT_CONFIG.enableLogging,
    confirmations: CONTRACT_CONFIG.confirmations,
    timeout: CONTRACT_CONFIG.timeout,
  },
};
```

## 测试验证

更新了 `viemContractUtils.test.ts` 来验证配置一致性：

### 新增测试项目

- ✅ 合约配置一致性检查
- ✅ Gas 设置验证
- ✅ 重试设置验证
- ✅ 日志设置验证
- ✅ 交易设置验证

### 测试命令

```typescript
import { runViemConfigTests } from "@/utils/viemContractUtils.test";

// 运行测试
const result = await runViemConfigTests();
console.log("测试结果:", result.success);
```

## 好处

1. **配置统一性**：所有网络和合约配置都来自同一个源
2. **维护简单**：只需要在 `wagmi.ts` 中修改配置
3. **类型安全**：自动类型转换和验证
4. **测试覆盖**：完整的配置一致性测试

## 注意事项

1. **类型转换**：字符串配置需要转换为 BigInt
2. **环境变量**：日志设置基于 NODE_ENV
3. **默认值**：保持原有的默认值逻辑
4. **向后兼容**：不影响现有 API 接口

## 升级指南

如果需要修改合约配置：

1. **仅修改 wagmi.ts**：

   ```typescript
   export const CONTRACT_CONFIG = {
     defaultGasLimit: "500000", // 修改这里
     // ... 其他配置
   };
   ```

2. **viemContractUtils.ts 会自动同步**：无需手动修改

3. **运行测试验证**：
   ```bash
   # 在浏览器控制台或测试环境中
   runViemConfigTests()
   ```

---

更新时间: 2025-10-24  
更新人员: Assistant  
版本: v3.1.0
