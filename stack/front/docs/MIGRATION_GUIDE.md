# 🚀 合约交互系统迁移指南

## 📋 概述

我们已经将合约交互系统从依赖默认合约的模式升级为完全通用的模式。新系统提供了更大的灵活性，可以与任意智能合约交互。

## 🔄 主要变化

### 旧版本 (v1.x)

- ❌ 依赖默认合约配置
- ❌ 只能调用预设的 MultiStakePledgeContract
- ❌ Hook 有循环限制

### 新版本 (v3.x)

- ✅ 完全通用，可调用任意合约
- ✅ 支持在循环中调用
- ✅ 提供 wagmi-ethers 兼容层

## 📖 迁移步骤

### 1. Hook 替换

#### 旧代码：

```typescript
import { useContractData, useContractDataWrite } from "@/hooks/useContract";

function MyComponent() {
  // 旧的只读 Hook
  const { data: poolCount } = useContractData<bigint>("poolCounter");

  // 旧的写入 Hook
  const { write, isPending } = useContractDataWrite("stake", {
    onSuccess: (hash) => console.log("成功:", hash),
  });
}
```

#### 新代码：

```typescript
import { useEthersContract } from "@/hooks/useEthersContract";
import MultiStakePledgeContract from "@/app/abi/MultiStakePledgeContract.json";

function MyComponent() {
  const { read, write } = useEthersContract();
  const [poolCount, setPoolCount] = useState<bigint>();
  const [loading, setLoading] = useState(false);

  // 新的只读调用
  const getPoolCount = async () => {
    const result = await read<bigint>(
      MultiStakePledgeContract.address,
      MultiStakePledgeContract.abi,
      "poolCounter"
    );
    setPoolCount(result || BigInt(0));
  };

  // 新的写入调用
  const handleStake = async () => {
    try {
      setLoading(true);
      const tx = await write(
        MultiStakePledgeContract.address,
        MultiStakePledgeContract.abi,
        "stake",
        [ethers.parseEther("1.0")],
        { value: ethers.parseEther("1.0") }
      );

      console.log("交易发送:", tx.hash);
      const receipt = await tx.wait();
      console.log("交易确认:", receipt.hash);
    } catch (error) {
      console.error("质押失败:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getPoolCount();
  }, []);
}
```

### 2. API 函数替换

#### 旧代码：

```typescript
import { getTotalStakedAmount } from "@/app/api/ContractApi";

// 旧的 API 调用（依赖默认合约）
const total = await getTotalStakedAmount();
```

#### 新代码：

```typescript
import { getTotalStakedAmount } from "@/app/api/ContractApi";

// 新的 API 调用（已经更新为新格式）
const total = await getTotalStakedAmount(provider);
```

### 3. 直接合约调用

#### 旧代码：

```typescript
import { readContract } from "@/utils/ethersContractUtils";

// 旧的直接调用（依赖默认合约）
const result = await readContract<bigint>("poolCounter");
```

#### 新代码：

```typescript
import { readContract } from "@/utils/ethersContractUtils";
import MultiStakePledgeContract from "@/app/abi/MultiStakePledgeContract.json";

// 新的直接调用（明确指定合约）
const result = await readContract<bigint>(
  MultiStakePledgeContract.address,
  MultiStakePledgeContract.abi,
  "poolCounter"
);
```

## 🎯 新功能优势

### 1. 循环中调用合约

```typescript
// 现在可以在循环中调用了！
const { read } = useEthersContract();

for (let i = 0; i < poolCount; i++) {
  const poolInfo = await read(contractAddress, contractAbi, "getPoolInfo", [
    BigInt(i),
  ]);
  console.log(`Pool ${i}:`, poolInfo);
}
```

### 2. 调用多个不同的合约

```typescript
const { read } = useEthersContract();

// ERC20 代币合约
const tokenBalance = await read("0x1234...ABCD", ERC20_ABI, "balanceOf", [
  userAddress,
]);

// Uniswap 池合约
const reserves = await read("0x5678...EFGH", UNISWAP_PAIR_ABI, "getReserves");

// 你的业务合约
const businessData = await read(
  MultiStakePledgeContract.address,
  MultiStakePledgeContract.abi,
  "getPoolInfo",
  [poolId]
);
```

### 3. 批量操作

```typescript
const { batchRead } = useEthersContract();

// 批量获取多个池子信息
const calls = Array.from({ length: Number(poolCount) }, (_, i) => ({
  functionName: "getPoolInfo",
  args: [BigInt(i)],
}));

const results = await batchRead(contractAddress, contractAbi, calls);
```

## 🔧 wagmi-ethers 兼容层

新的 `useContract.ts` 现在专注于提供兼容性功能：

```typescript
import { useEthersProvider, useEthersSigner } from "@/hooks/useContract";
import { ethers } from "ethers";

function MyComponent() {
  const provider = useEthersProvider(); // 只读操作
  const signer = useEthersSigner(); // 写入操作

  // 直接使用 ethers.js
  const contract = new ethers.Contract(address, abi, provider);
  const data = await contract.someMethod();

  // 写入操作
  if (signer) {
    const writeContract = new ethers.Contract(address, abi, signer);
    const tx = await writeContract.someWriteMethod();
  }
}
```

## 📚 完整示例

这里是一个完整的迁移示例：

```typescript
// 新的组件实现
import { useEthersContract } from "@/hooks/useEthersContract";
import MultiStakePledgeContract from "@/app/abi/MultiStakePledgeContract.json";
import { ethers } from "ethers";
import { useState, useEffect, useCallback } from "react";

function StakingComponent() {
  const { read, batchRead, write, isConnected } = useEthersContract();
  const [totalStaked, setTotalStaked] = useState<string>("0");
  const [loading, setLoading] = useState(false);

  // 计算总质押量
  const calculateTotal = useCallback(async () => {
    try {
      setLoading(true);

      // 1. 获取池子数量
      const poolCount = await read<bigint>(
        MultiStakePledgeContract.address,
        MultiStakePledgeContract.abi,
        "poolCounter"
      );

      if (!poolCount) return;

      // 2. 批量获取池子信息
      const calls = Array.from({ length: Number(poolCount) }, (_, i) => ({
        functionName: "getPoolInfo",
        args: [BigInt(i)]
      }));

      const results = await batchRead(
        MultiStakePledgeContract.address,
        MultiStakePledgeContract.abi,
        calls
      );

      // 3. 计算总和
      let total = BigInt(0);
      results.forEach(poolInfo => {
        if (poolInfo && Array.isArray(poolInfo) && poolInfo[2]) {
          total += poolInfo[2] as bigint;
        }
      });

      setTotalStaked(ethers.formatEther(total));
    } catch (error) {
      console.error("计算失败:", error);
    } finally {
      setLoading(false);
    }
  }, [read, batchRead]);

  // 质押操作
  const handleStake = async (amount: string) => {
    if (!isConnected) {
      alert("请先连接钱包");
      return;
    }

    try {
      const tx = await write(
        MultiStakePledgeContract.address,
        MultiStakePledgeContract.abi,
        "stake",
        [ethers.parseEther(amount)],
        { value: ethers.parseEther(amount) }
      );

      console.log("质押交易:", tx.hash);
      await tx.wait();
      console.log("质押成功！");

      // 重新计算总质押量
      await calculateTotal();
    } catch (error) {
      console.error("质押失败:", error);
    }
  };

  useEffect(() => {
    calculateTotal();
  }, [calculateTotal]);

  return (
    <div>
      <h2>总质押量: {totalStaked} WETH</h2>
      <button
        onClick={() => handleStake("0.1")}
        disabled={loading || !isConnected}
      >
        {loading ? "计算中..." : "质押 0.1 WETH"}
      </button>
    </div>
  );
}
```

## 🎉 迁移检查清单

- [ ] 替换所有 `useContractData` 为 `useEthersContract`
- [ ] 替换所有 `useContractDataWrite` 为 `useEthersContract`
- [ ] 为所有合约调用添加明确的地址和 ABI
- [ ] 更新错误处理逻辑
- [ ] 测试循环调用功能
- [ ] 验证批量操作性能
- [ ] 确保钱包连接状态检查正确

## 🆘 常见问题

### Q: 为什么要移除默认合约？

A: 为了提供更大的灵活性，让你可以与任意智能合约交互，而不仅仅是预设的合约。

### Q: 旧的 Hook 还能用吗？

A: 不能，旧的 Hook 已经被移除。请按照迁移指南更新你的代码。

### Q: 如何处理 React Hook 循环调用的问题？

A: 使用新的 `useEthersContract` Hook，它内部使用 ethers.js 实现，可以在循环中调用。

### Q: 性能会受影响吗？

A: 不会，新系统支持批量操作，性能比逐个调用更好。

恭喜你完成迁移！🎉 新系统为你提供了更强大和灵活的合约交互能力！
