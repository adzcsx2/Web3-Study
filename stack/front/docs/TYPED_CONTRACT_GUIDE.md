# 🎯 useEthersContract 泛型使用指南

## 📖 概述

`useEthersContract` Hook 现在完全支持 TypeScript 泛型，让你可以精确指定每个合约调用的返回类型，获得更好的类型安全和 IDE 支持。

## 🔧 基本语法

```typescript
const { read, batchRead, write } = useEthersContract();

// 指定返回类型
const result = await read<YourType>(
  contractAddress,
  contractAbi,
  functionName,
  args
);
```

## 🎨 内置类型定义

我们提供了常用的合约返回类型：

```typescript
export type ContractReturnTypes = {
  // 基础类型
  string: string;
  bigint: bigint;
  number: number;
  boolean: boolean;
  address: string;
  bytes32: string;

  // 数组类型
  stringArray: string[];
  bigintArray: bigint[];

  // 常见元组类型
  poolInfo: [string, string, bigint, bigint, bigint, bigint, boolean];
  userInfo: [bigint, bigint, bigint];

  // 结构化对象类型
  PoolInfoStruct: {
    tokenAddress: string;
    collateralToken: string;
    totalStaked: bigint;
    // ... 更多字段
  };
};
```

## 💡 使用示例

### 1. 基础类型

```typescript
// ✅ 指定返回 bigint
const poolCount = await read<bigint>(
  contractAddress,
  contractAbi,
  "poolCounter"
);
// TypeScript 知道 poolCount 是 bigint | null

// ✅ 指定返回 string
const contractName = await read<string>(contractAddress, contractAbi, "name");
// TypeScript 知道 contractName 是 string | null

// ✅ 指定返回 boolean
const isActive = await read<boolean>(contractAddress, contractAbi, "isActive");
// TypeScript 知道 isActive 是 boolean | null
```

### 2. 使用预定义类型

```typescript
// ✅ 使用预定义的元组类型
const poolInfo = await read<ContractReturnTypes["poolInfo"]>(
  contractAddress,
  contractAbi,
  "getPoolInfo",
  [BigInt(0)]
);

if (poolInfo) {
  // TypeScript 知道这是 [string, string, bigint, bigint, bigint, bigint, boolean]
  const tokenAddress = poolInfo[0]; // string
  const totalStaked = poolInfo[2]; // bigint
  const isActive = poolInfo[6]; // boolean
}
```

### 3. 自定义类型

```typescript
// ✅ 定义你自己的类型
interface MyPoolInfo {
  tokenAddress: string;
  collateralToken: string;
  totalStaked: bigint;
  isActive: boolean;
}

// 使用自定义类型
const poolInfo = await read<MyPoolInfo>(
  contractAddress,
  contractAbi,
  "getPoolInfo",
  [BigInt(0)]
);

if (poolInfo) {
  // 完美的类型提示和检查
  console.log("代币地址:", poolInfo.tokenAddress);
  console.log("总质押:", ethers.formatEther(poolInfo.totalStaked));
  console.log("状态:", poolInfo.isActive ? "激活" : "未激活");
}
```

### 4. 批量调用泛型

```typescript
// ✅ 批量调用相同类型
const calls = [
  { functionName: "getPoolInfo", args: [BigInt(0)] },
  { functionName: "getPoolInfo", args: [BigInt(1)] },
  { functionName: "getPoolInfo", args: [BigInt(2)] },
];

const results = await batchRead<ContractReturnTypes["poolInfo"]>(
  contractAddress,
  contractAbi,
  calls
);

// results 类型是: (ContractReturnTypes['poolInfo'] | null)[]
results.forEach((poolInfo, index) => {
  if (poolInfo) {
    console.log(`池子 ${index} 总质押:`, ethers.formatEther(poolInfo[2]));
  }
});
```

### 5. 混合类型批量调用

```typescript
// ✅ 不同返回类型的批量调用
const calls = [
  { functionName: "poolCounter", args: [] }, // bigint
  { functionName: "name", args: [] }, // string
  { functionName: "paused", args: [] }, // boolean
];

const results = await batchRead<unknown>(contractAddress, contractAbi, calls);

// 手动类型断言
const poolCount = results[0] as bigint;
const contractName = results[1] as string;
const isPaused = results[2] as boolean;
```

## 🚀 高级用法

### 创建类型化的合约 Hook

```typescript
export function useMyContract() {
  const { read, write } = useEthersContract();

  // 封装常用方法，预设类型
  const getPoolCount = () =>
    read<bigint>(CONTRACT_ADDRESS, CONTRACT_ABI, "poolCounter");

  const getPoolInfo = (id: number) =>
    read<ContractReturnTypes["poolInfo"]>(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      "getPoolInfo",
      [BigInt(id)]
    );

  const stake = (amount: string) =>
    write(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      "stake",
      [ethers.parseEther(amount)],
      { value: ethers.parseEther(amount) }
    );

  return { getPoolCount, getPoolInfo, stake };
}
```

### 类型守卫函数

```typescript
// 创建类型守卫来安全处理返回值
function isValidPoolInfo(
  data: unknown
): data is ContractReturnTypes["poolInfo"] {
  return (
    Array.isArray(data) &&
    data.length === 7 &&
    typeof data[0] === "string" &&
    typeof data[2] === "bigint"
  );
}

// 使用类型守卫
const rawData = await read<unknown>(contractAddress, abi, "getPoolInfo", [0]);
if (isValidPoolInfo(rawData)) {
  // TypeScript 现在知道 rawData 是正确的类型
  console.log("总质押:", ethers.formatEther(rawData[2]));
}
```

## 📝 最佳实践

### 1. 💯 推荐做法

```typescript
// ✅ 明确指定类型
const balance = await read<bigint>(address, abi, "balanceOf", [user]);

// ✅ 使用预定义类型
const info = await read<ContractReturnTypes["poolInfo"]>(
  address,
  abi,
  "getPoolInfo",
  [0]
);

// ✅ 定义接口用于复杂结构
interface UserData {
  balance: bigint;
  rewards: bigint;
  lastAction: bigint;
}
const userData = await read<UserData>(address, abi, "getUserData", [user]);
```

### 2. ⚠️ 注意事项

```typescript
// ❌ 避免：过度使用 any
const result = await read<any>(address, abi, "someFunction");

// ✅ 更好：使用 unknown，然后进行类型检查
const result = await read<unknown>(address, abi, "someFunction");
if (typeof result === "bigint") {
  // 安全使用
}

// ❌ 避免：不检查 null 返回值
const count = await read<bigint>(address, abi, "count");
console.log(count.toString()); // 可能报错，count 可能是 null

// ✅ 更好：总是检查 null
const count = await read<bigint>(address, abi, "count");
if (count !== null) {
  console.log(count.toString());
}
```

### 3. 🎯 类型复用

```typescript
// 在项目中创建统一的类型文件
// types/contracts.ts
export interface StakePoolInfo {
  tokenAddress: string;
  totalStaked: bigint;
  rewardRate: bigint;
  isActive: boolean;
}

export interface UserStakeInfo {
  stakedAmount: bigint;
  earnedRewards: bigint;
  lastStakeTime: bigint;
}

// 在各个组件中复用
import type { StakePoolInfo, UserStakeInfo } from "@/types/contracts";

const poolInfo = await read<StakePoolInfo>(address, abi, "pools", [id]);
const userInfo = await read<UserStakeInfo>(address, abi, "users", [address]);
```

## 🔥 实战示例

查看完整的使用示例：

- `TypedContractExample.tsx` - 包含所有用法的完整示例
- `useMyContract.ts` - 自定义类型化 Hook 示例

现在你可以享受完全类型安全的合约交互了！🎉
