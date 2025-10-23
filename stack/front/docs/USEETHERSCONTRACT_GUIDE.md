# useEthersContract Hook 使用指南 (v3.0)

## 🎯 核心理念

**完全通用，不依赖默认合约** - 所有合约操作都需要明确指定合约地址和 ABI，提供最大的灵活性。

## 📦 基本用法

```typescript
import { useEthersContract } from "@/hooks/useEthersContract";
import { ethers } from "ethers";

function MyComponent() {
  const { read, batchRead, write, isConnected } = useEthersContract();

  // 合约信息
  const contractAddress = "0x1234...ABCD";
  const contractAbi = [...]; // 你的合约 ABI

  // ... 使用方法
}
```

## 🔧 API 参考

### `read<T>(contractAddress, contractAbi, functionName, args?, skipLogging?)`

读取合约数据，**可以在循环中使用**。

```typescript
// 基本调用
const balance = await read<bigint>(
  "0x1234...ABCD", // 合约地址
  ERC20_ABI, // 合约 ABI
  "balanceOf", // 函数名
  [userAddress] // 参数数组
);

// 在循环中调用（wagmi hooks 做不到的！）
for (let i = 0; i < poolCount; i++) {
  const poolInfo = await read(contractAddress, contractAbi, "getPoolInfo", [
    BigInt(i),
  ]);
  console.log(`池子 ${i}:`, poolInfo);
}
```

### `batchRead(contractAddress, contractAbi, calls, skipLogging?)`

批量并行读取，性能更好。

```typescript
// 构建批量调用
const calls = [];
for (let i = 0; i < poolCount; i++) {
  calls.push({
    functionName: "getPoolInfo",
    args: [BigInt(i)],
  });
}

// 批量执行（并行）
const results = await batchRead(contractAddress, contractAbi, calls);
```

### `write(contractAddress, contractAbi, functionName, args?, options?)`

写入合约数据，需要连接钱包。

```typescript
const tx = await write(
  contractAddress,
  contractAbi,
  "stake",
  [ethers.parseEther("1.0")],
  {
    value: ethers.parseEther("1.0"),
    gasLimit: "200000",
  }
);

// 等待交易确认
const receipt = await tx.wait();
console.log("交易成功:", receipt.hash);
```

## 🎯 实际使用案例

### 案例 1: 计算所有池子的总质押量

```typescript
async function calculateTotalStaked() {
  // 1. 获取池子数量
  const poolCount = await read<bigint>(
    contractAddress,
    contractAbi,
    "poolCounter"
  );

  if (!poolCount) return "0";

  // 2. 方案A: 循环调用（简单直接）
  let total = BigInt(0);
  for (let i = 0; i < Number(poolCount); i++) {
    const poolInfo = await read(contractAddress, contractAbi, "getPoolInfo", [
      BigInt(i),
    ]);

    if (poolInfo?.[2]) {
      total += poolInfo[2] as bigint;
    }
  }

  // 3. 方案B: 批量调用（性能更好）
  const calls = Array.from({ length: Number(poolCount) }, (_, i) => ({
    functionName: "getPoolInfo",
    args: [BigInt(i)],
  }));

  const results = await batchRead(contractAddress, contractAbi, calls);
  const batchTotal = results.reduce((sum, poolInfo) => {
    return sum + ((poolInfo as any[])?.[2] || BigInt(0));
  }, BigInt(0));

  return total.toString();
}
```

### 案例 2: 调用多个不同的合约

```typescript
// ERC20 代币合约
const tokenInfo = await read<string>("0x5678...EFGH", ERC20_ABI, "name");

// Uniswap 池子合约
const poolReserves = await read(
  "0x9ABC...DEF0",
  UNISWAP_PAIR_ABI,
  "getReserves"
);

// 你自己的业务合约
const businessData = await read(
  "0x1234...ABCD",
  YOUR_CONTRACT_ABI,
  "getBusinessData",
  [userId, timestamp]
);
```

### 案例 3: 条件调用和动态合约

```typescript
// 根据条件调用不同合约
const userLevel = await read<number>(contractAddress, abi, "getUserLevel", [
  user,
]);

let rewardContract: string;
let rewardABI: any[];

if (userLevel >= 5) {
  rewardContract = "0xPREMIUM...";
  rewardABI = PREMIUM_ABI;
} else {
  rewardContract = "0xBASIC...";
  rewardABI = BASIC_ABI;
}

const rewards = await read(rewardContract, rewardABI, "calculateRewards", [
  user,
]);
```

## ⚡ 性能优化建议

### 1. 优先使用批量调用

```typescript
// ❌ 慢：逐个调用
for (let i = 0; i < count; i++) {
  const result = await read(...);
}

// ✅ 快：批量并行
const calls = Array.from({ length: count }, (_, i) => ({...}));
const results = await batchRead(contractAddress, abi, calls);
```

### 2. 合理使用 skipLogging

```typescript
// 开发环境：显示详细日志
const result = await read(address, abi, "method", args, false);

// 生产环境：跳过日志提升性能
const result = await read(address, abi, "method", args, true);
```

### 3. 缓存合约实例

```typescript
// 在组件外部或使用 useMemo 缓存 ABI
const CACHED_ABI = [...]; // 避免每次重新创建

function MyComponent() {
  const contractAddress = useMemo(() => "0x...", []);
  // ...
}
```

## 🛠️ 错误处理

```typescript
try {
  const result = await read(address, abi, "method", args);
  if (!result) {
    console.log("调用返回 null，可能是网络问题或合约错误");
    return;
  }
  // 处理成功结果
} catch (error) {
  console.error("合约调用失败:", error);
  // 处理错误情况
}
```

## 📊 Hook 变体

### 只读版本

```typescript
import { useEthersContractRead } from "@/hooks/useEthersContract";

const { read, batchRead } = useEthersContractRead();
```

### 只写版本

```typescript
import { useEthersContractWrite } from "@/hooks/useEthersContract";

const { write, isConnected } = useEthersContractWrite();
```

## 🔄 与 wagmi 对比

| 功能       | wagmi Hooks      | useEthersContract |
| ---------- | ---------------- | ----------------- |
| 循环中调用 | ❌ 不支持        | ✅ 支持           |
| 条件调用   | ❌ 受限          | ✅ 完全自由       |
| 多合约调用 | 🤔 需要多个 Hook | ✅ 一个 Hook 搞定 |
| 动态合约   | ❌ 困难          | ✅ 简单           |
| 批量操作   | ❌ 需要额外配置  | ✅ 内置支持       |
| 类型安全   | ✅ 优秀          | ✅ 优秀           |

## 🎯 最佳实践

1. **明确指定合约信息**: 始终传入完整的地址和 ABI
2. **合理使用批量操作**: 多个调用用 `batchRead`
3. **错误处理**: 总是检查返回值和捕获异常
4. **性能优化**: 生产环境跳过日志
5. **类型注解**: 使用泛型指定返回类型

```typescript
// 🎯 完美的调用示例
const balance = await read<bigint>(
  CONTRACT_ADDRESS, // 明确的地址
  ERC20_ABI, // 完整的 ABI
  "balanceOf", // 明确的函数名
  [userAddress], // 类型正确的参数
  !isDevelopment // 生产环境跳过日志
);

if (balance !== null) {
  // 检查返回值
  console.log(`余额: ${ethers.formatEther(balance)} ETH`);
}
```

## 🔧 故障排除

### 问题：调用返回 null

- **检查**: 合约地址是否正确
- **检查**: ABI 是否匹配
- **检查**: 网络连接是否正常
- **检查**: 函数参数是否正确

### 问题：交易失败

- **检查**: 钱包是否连接
- **检查**: 账户余额是否足够
- **检查**: Gas 限制是否合理
- **检查**: 合约状态是否允许操作

这就是全新的 `useEthersContract` Hook！🚀 完全通用，不依赖任何默认合约，给你最大的灵活性！
