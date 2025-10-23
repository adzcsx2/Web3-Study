# Page.tsx 重构总结

## 重构概述

将 `src/app/page.tsx` 中的合约交互从混合使用 ethers.js 和 viem 改为统一使用 viem 和新的钱包客户端系统。

## 主要变更

### 1. 导入更新

**之前:**

```tsx
import { useConnectedWalletClient } from "@/hooks/useWalletClient";
import { getContract } from "viem";
import { ethers, FallbackProvider, JsonRpcProvider } from "ethers";
import { useEthersProvider } from "@/hooks/useContract";
import { multiStakePledgeContract } from "@/services/MultiStakePledgeContractService";
```

**现在:**

```tsx
import { useWallet } from "@/hooks/useWalletClient";
import {
  readViemContract,
  readViemContractBatch,
} from "@/utils/viemContractUtils";
import { type Abi } from "viem";
import { ethers } from "ethers"; // 仅用于格式化
```

### 2. TotalStakedDisplay 组件重构

**关键变更:**

1. **钱包客户端获取:** `useConnectedWalletClient()` → `useWallet()`
2. **合约读取:** 使用 `readViemContract()` 和 `readViemContractBatch()`
3. **类型安全:** 添加了 `PoolInfo` 接口定义
4. **错误处理:** 改进了空值检查和错误处理

**之前的问题代码:**

```tsx
const { isConnected, data } = useConnectedWalletClient();

// 获取合约对象
const contract = getContract({
  address: CONTRACT_ADDRESS as `0x${string}`,
  abi: CONTRACT_ABI,
  account: data!.account,
});

// 1. 获取池子数量
const allPools = await read<bigint>(
  CONTRACT_ADDRESS,
  CONTRACT_ABI,
  "poolCounter"
);
```

**修复后:**

```tsx
const wallet = useWallet();

// 1. 获取池子数量
const allPools = await readViemContract<bigint>(
  CONTRACT_ADDRESS,
  CONTRACT_ABI,
  "poolCounter"
);
```

### 3. PoolCountDisplay 组件重构

**变更内容:**

- 移除了复杂的 provider 和 ethers.Contract 设置
- 直接使用 `readViemContract()` 进行合约读取
- 简化了状态管理和错误处理

**之前:**

```tsx
const [provider, setProvider] = useState<
  JsonRpcProvider | FallbackProvider | undefined
>();
const [contract, setContract] = useState<ethers.Contract | null>(null);
const ethersProvider = useEthersProvider();
setProvider(ethersProvider);

const count: bigint = await contract.poolCounter();
```

**现在:**

```tsx
const CONTRACT_ADDRESS = MultiStakePledgeContract.address as `0x${string}`;
const CONTRACT_ABI = MultiStakePledgeContract.abi as Abi;

const count = await readViemContract<bigint>(
  CONTRACT_ADDRESS,
  CONTRACT_ABI,
  "poolCounter"
);
```

## 核心改进

### 1. 统一的技术栈

- ✅ 全面使用 viem 进行合约交互
- ✅ 统一使用新的钱包客户端系统
- ✅ 消除了 ethers.js 和 viem 混用的复杂性

### 2. 更好的类型安全

- ✅ 正确的 ABI 类型转换: `as Abi`
- ✅ 地址类型安全: `as \`0x${string}\``
- ✅ 明确的接口定义: `PoolInfo`

### 3. 简化的代码结构

- ✅ 移除了不必要的状态管理
- ✅ 直接使用工具函数进行合约读取
- ✅ 更清晰的错误处理逻辑

### 4. 性能优化

- ✅ 减少了不必要的依赖
- ✅ 优化了 useEffect 依赖数组
- ✅ 更高效的合约读取方式

## 使用的新工具

### 1. useWallet() Hook

```tsx
const wallet = useWallet();
// wallet.isConnected - 检查连接状态
// wallet.walletClient - 获取钱包客户端
// wallet.address - 钱包地址
// wallet.chainId - 网络 ID
```

### 2. readViemContract() 函数

```tsx
const result = await readViemContract<bigint>(
  contractAddress,
  contractAbi,
  "functionName",
  [arg1, arg2] // 可选参数
);
```

### 3. readViemContractBatch() 函数

```tsx
const results = await readViemContractBatch(contractAddress, contractAbi, [
  { functionName: "func1", args: [arg1] },
  { functionName: "func2", args: [arg2] },
]);
```

## 错误修复

### 1. 类型错误修复

- 修复了 ABI 类型不兼容问题
- 添加了正确的类型断言
- 解决了 undefined 类型问题

### 2. Hook 使用修复

- 修复了 useEffect 依赖数组问题
- 消除了未使用变量的警告
- 正确使用新的钱包 Hook

### 3. 合约交互修复

- 移除了有问题的 getContract 调用
- 使用正确的 viem 工具函数
- 添加了适当的错误处理

## 向后兼容性

保持了组件的外部接口不变：

- ✅ `<PoolCountDisplay />` 继续显示池子数量
- ✅ `<TotalStakedDisplay />` 继续显示总锁仓量
- ✅ 用户界面和交互保持一致

## 下一步建议

1. **测试验证:** 在开发环境中测试所有组件功能
2. **性能监控:** 观察新的合约读取方式的性能表现
3. **错误处理:** 根据实际使用情况完善错误处理逻辑
4. **代码优化:** 可以考虑将合约配置提取到常量文件中

---

**重构日期:** 2025-10-24  
**技术栈:** Viem + Wagmi + Next.js + TypeScript
