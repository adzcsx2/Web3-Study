# 多质押池合约 - viem 集成指南

## 问题解决方案

您遇到的 `FallbackProvider`, `JsonRpcProvider`, `BrowserProvider` 无法使用的问题是因为您的项目使用了 **viem + wagmi v2** 技术栈，而这些是 **ethers.js** 的 API。

## 解决方案概述

我们提供了三种解决方案：

### 1. 简化的 viem 服务 (推荐)

**文件**: `src/services/MultiStakeService.ts`

这是一个基于纯 viem 的服务实现，避免了复杂的类型问题：

```typescript
import { multiStakeService } from "@/services/MultiStakeService";
import { usePublicClient, useWalletClient } from "wagmi";

function MyComponent() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const handleStake = async () => {
    if (!publicClient || !walletClient) return;

    const hash = await multiStakeService.stakeInPool(
      publicClient,
      walletClient,
      0, // poolId
      "1.0" // amount in ETH
    );
  };
}
```

### 2. 完整示例组件

**文件**: `src/components/MultiStakeExample.tsx`

一个完整的 React 组件示例，展示如何：

- 连接 wagmi v2 的 hooks
- 读取池子和用户信息
- 执行质押、解质押、领取奖励操作
- 处理错误和加载状态

### 3. ethers.js 兼容方案 (备选)

如果您确实需要使用 ethers.js，可以：

**文件**: `src/hooks/useEthersContract.ts`
**文件**: `src/services/MultiStakeViemService.ts` (高级版本)

## 推荐使用方案

### 步骤 1: 使用简化服务

```typescript
// 在您的组件中
import { multiStakeService } from '@/services/MultiStakeService';
import { usePublicClient, useWalletClient } from 'wagmi';

export function MyStakeComponent() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // 读取池子信息
  const loadPoolInfo = async () => {
    if (!publicClient) return;
    const poolInfo = await multiStakeService.getPoolInfo(publicClient, 0);
    console.log('池子信息:', poolInfo);
  };

  // 质押操作
  const stake = async () => {
    if (!publicClient || !walletClient) return;
    const hash = await multiStakeService.stakeInPool(
      publicClient, walletClient, 0, '1.0'
    );
    console.log('交易哈希:', hash);
  };

  return (
    <div>
      <button onClick={loadPoolInfo}>加载池子信息</button>
      <button onClick={stake}>质押 1 ETH</button>
    </div>
  );
}
```

### 步骤 2: 更新合约地址

在 `MultiStakeService.ts` 中修改合约地址：

```typescript
// 第 49 行，替换为您的实际合约地址
const CONTRACT_ADDRESS = "0x你的合约地址" as Address;
```

### 步骤 3: 检查 ABI 文件

确保 `src/app/abi/MultiStakePledgeContract.json` 存在且包含正确的合约 ABI。

## 主要特性

### ✅ viem 兼容

- 使用 `PublicClient` 和 `WalletClient`
- 兼容 wagmi v2 的 hooks
- 使用 `simulateContract` 进行交易模拟

### ✅ 类型安全

- 完整的 TypeScript 类型定义
- 与 Solidity 合约结构匹配的接口
- 编译时类型检查

### ✅ 错误处理

- 友好的错误消息
- 交易失败处理
- 连接状态检查

### ✅ 实用功能

- 质押、解质押、领取奖励
- 池子信息查询
- 用户信息查询
- 金额格式化工具

## 可用的方法

### 读取方法

- `getPoolInfo(client, poolId)` - 获取池子信息
- `getUserPoolInfo(client, poolId, userAddress)` - 获取用户信息
- `getPoolCount(client)` - 获取池子总数

### 写入方法

- `stakeInPool(publicClient, walletClient, poolId, amount)` - 质押
- `unstakeFromPool(publicClient, walletClient, poolId, amount)` - 解质押
- `claimRewards(publicClient, walletClient, poolId)` - 领取奖励
- `requestUnstake(publicClient, walletClient, poolId, amount)` - 请求解质押
- `processUnstake(publicClient, walletClient, poolId)` - 处理解质押

### 工具方法

- `formatAmount(amount)` - 格式化金额显示
- `parseAmount(amount)` - 解析金额输入
- `getContractAddress()` - 获取合约地址

## 使用注意事项

1. **合约地址**: 请在 `MultiStakeService.ts` 中设置正确的合约地址
2. **ABI 文件**: 确保 ABI 文件路径正确且内容匹配您的合约
3. **网络配置**: 确保 wagmi 配置的网络与合约部署网络一致
4. **钱包连接**: 所有写入操作都需要连接钱包

## 技术栈兼容性

- ✅ viem v2.38.3+
- ✅ wagmi v2.18.1+
- ✅ Next.js 15.5.3
- ✅ React 19.1.0
- ✅ TypeScript

## 下一步

1. 复制 `MultiStakeService.ts` 到您的项目
2. 更新合约地址和 ABI 路径
3. 参考 `MultiStakeExample.tsx` 创建您的组件
4. 根据需要自定义界面和功能

如有问题，检查：

- 钱包是否已连接
- 网络是否正确
- 合约地址和 ABI 是否匹配
- Gas 费用是否足够
