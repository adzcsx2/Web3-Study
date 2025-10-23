# RPC 配置重构记录

## 重构目标

消除 `wagmi.ts` 和 `viemContractUtils.ts` 中重复的 RPC URLs 定义，提高代码复用性和维护性。

## 重构内容

### 1. 新增文件: `src/config/rpc.ts`

- 统一管理所有链的 RPC URLs
- 提供便捷的辅助函数：
  - `getRpcUrl(chainId)`: 根据链 ID 获取 RPC URL
  - `getChainName(chainId)`: 根据链 ID 获取链名称
  - `getSupportedChainIds()`: 获取所有支持的链 ID
  - `isSupportedChain(chainId)`: 检查链 ID 是否受支持

### 2. 修改文件: `src/config/wagmi.ts`

- 导入 `RPC_URLS` 从 `@/config/rpc`
- 移除重复的硬编码 RPC URLs
- 在 transports 配置中使用 `RPC_URLS[chainId]`
- 移除未使用的 `base` 链导入

### 3. 修改文件: `src/utils/viemContractUtils.ts`

- 导入 `RPC_URLS` 从 `@/config/rpc`
- 简化 `getWagmiRpcUrls()` 函数，移除重复的硬编码 RPC URLs
- 直接使用共享的 `RPC_URLS` 配置

## 优势

1. **单一数据源**: 所有 RPC URLs 在一个地方维护
2. **减少重复**: 消除代码重复，提高可维护性
3. **类型安全**: 保持 TypeScript 的类型安全性
4. **易于扩展**: 添加新链时只需在一个地方修改
5. **便捷函数**: 提供实用的辅助函数

## 支持的链

- Mainnet (ID: 1)
- Polygon (ID: 137)
- Optimism (ID: 10)
- Arbitrum (ID: 42161)
- Sepolia (ID: 11155111)
- Base (ID: 8453)

## 使用示例

```typescript
import { RPC_URLS, getRpcUrl, isSupportedChain } from "@/config/rpc";

// 直接使用 RPC URLs 对象
const mainnetRpc = RPC_URLS[1];

// 使用辅助函数
const sepoliaRpc = getRpcUrl(11155111);
const isSupported = isSupportedChain(1);
```

## 注意事项

- 所有现有功能保持不变
- 不影响现有的 wagmi 和 viem 配置
- 向后兼容，不破坏现有代码

---

_重构日期: 2025-10-24_
_重构者: Hoyn_
