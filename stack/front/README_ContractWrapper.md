# ContractWrapper 使用指南

## 概述

基于您的想法，我已经将 `ethersContractUtils.ts` 改造成了一个更加灵活的合约包装器系统。现在您可以轻松地为每个合约创建专用的包装器。

## 🎯 新增功能

### 1. ContractWrapper 类

在 `ethersContractUtils.ts` 中新增了 `ContractWrapper` 类，允许为特定合约创建预配置的实例：

```typescript
export class ContractWrapper {
  constructor(config: ContractWrapperConfig) {
    this.config = config;
  }

  // 简化的 API，无需每次传递合约地址和 ABI
  async read<T>(functionName: string, args?: readonly unknown[]) { ... }
  async write(functionName: string, args?: readonly unknown[], options?: ...) { ... }
  async estimateGas(functionName: string, args?: readonly unknown[], options?: ...) { ... }
  // ... 更多方法
}
```

### 2. 工厂函数

提供了便捷的工厂函数：

```typescript
export function createContractWrapper(
  config: ContractWrapperConfig
): ContractWrapper {
  return new ContractWrapper(config);
}
```

## 🚀 使用方式

### 方式一：直接使用 ContractWrapper

```typescript
import { createContractWrapper } from "@/utils/ethersContractUtils";
import contract from "@/app/abi/MultiStakePledgeContract.json";

// 创建专用合约包装器
const multiStakeContract = createContractWrapper({
  contractAddress: "0x123...",
  contractAbi: contract.abi,
  contractName: "MultiStakePledge",
});

// 简洁的读取调用
const poolCount = await multiStakeContract.read<number>("poolCount");
const poolInfo = await multiStakeContract.read("getPoolInfo", [poolId]);

// 简洁的写入调用
const result = await multiStakeContract.write("stake", [poolId], {
  value: ethers.parseEther("1.0"),
  estimateGas: true,
});

// 事件监听
const removeListener = multiStakeContract.addEventListener(
  "Staked",
  (event) => {
    console.log("用户质押:", event);
  }
);
```

### 方式二：使用专用包装器类（推荐）

我为您创建了 `MultiStakePledgeContractWrapper.ts` 作为示例：

```typescript
import { multiStakePledgeContract } from "@/utils/MultiStakePledgeContractWrapper";

// 类型安全的读取方法
const poolCount = await multiStakePledgeContract.getPoolCount();
const poolInfo = await multiStakePledgeContract.getPoolInfo(0);
const userStake = await multiStakePledgeContract.getUserStake(0, userAddress);

// 简化的写入方法
const stakeResult = await multiStakePledgeContract.stake(
  0,
  ethers.parseEther("1.0"),
  {
    estimateGas: true,
    signer: wagmiSigner,
  }
);

// 事件监听
const removeListener = multiStakePledgeContract.onStaked((event) => {
  console.log("质押事件:", event);
}, userAddress); // 可选的用户过滤

// 批量操作
const poolInfos = await multiStakePledgeContract.batchGetPoolInfo([0, 1, 2]);
```

## 🔧 为其他合约创建包装器

您可以轻松地为其他合约创建类似的包装器：

### 1. 基础包装器

```typescript
// ERC20TokenWrapper.ts
import { createContractWrapper } from "@/utils/ethersContractUtils";
import erc20Abi from "@/abi/ERC20.json";

export const createERC20Wrapper = (tokenAddress: string) => {
  return createContractWrapper({
    contractAddress: tokenAddress,
    contractAbi: erc20Abi,
    contractName: "ERC20Token",
  });
};

// 使用
const usdtContract = createERC20Wrapper("0x...");
const balance = await usdtContract.read<bigint>("balanceOf", [userAddress]);
```

### 2. 专用类包装器

```typescript
// NFTContractWrapper.ts
import {
  ContractWrapper,
  createContractWrapper,
} from "@/utils/ethersContractUtils";
import nftAbi from "@/abi/NFTContract.json";

export class NFTContractService {
  private wrapper: ContractWrapper;

  constructor(contractAddress: string) {
    this.wrapper = createContractWrapper({
      contractAddress,
      contractAbi: nftAbi,
      contractName: "NFTContract",
    });
  }

  async mint(to: string, tokenId: number, signer: ethers.Signer) {
    return this.wrapper.write("mint", [to, tokenId], { signer });
  }

  async tokenURI(tokenId: number): Promise<string> {
    const result = await this.wrapper.read<string>("tokenURI", [tokenId]);
    if (!result) throw new Error("Failed to get tokenURI");
    return result;
  }

  async ownerOf(tokenId: number): Promise<string> {
    const result = await this.wrapper.read<string>("ownerOf", [tokenId]);
    if (!result) throw new Error("Failed to get owner");
    return result;
  }
}
```

## 💡 优势对比

### vs React Hooks (useEthersContract)

| 特性         | ContractWrapper | React Hooks      |
| ------------ | --------------- | ---------------- |
| 在循环中使用 | ✅ 支持         | ❌ 不支持        |
| 条件调用     | ✅ 支持         | ❌ 不支持        |
| 并行批量操作 | ✅ 支持         | ❌ 有限支持      |
| 错误处理     | ✅ 灵活         | ❌ 受限          |
| 性能控制     | ✅ 完全控制     | ❌ React 管理    |
| Gas 估算     | ✅ 内置支持     | ❌ 需要额外处理  |
| 事件监听     | ✅ 完整支持     | ❌ 需要额外 Hook |
| 交易超时     | ✅ 内置支持     | ❌ 需要手动处理  |

### vs 原始 ethers.js

| 特性     | ContractWrapper | 原始 ethers.js  |
| -------- | --------------- | --------------- |
| 类型安全 | ✅ TypeScript   | ❌ 需要手动定义 |
| 错误处理 | ✅ 统一处理     | ❌ 需要手动处理 |
| 重试机制 | ✅ 内置         | ❌ 需要手动实现 |
| 日志记录 | ✅ 内置         | ❌ 需要手动添加 |
| Gas 估算 | ✅ 一键开启     | ❌ 需要手动实现 |
| 批量操作 | ✅ 内置支持     | ❌ 需要手动实现 |

## 📚 完整示例

```typescript
// 1. 导入合约 ABI 和创建包装器
import contract from "@/app/abi/MultiStakePledgeContract.json";
import { createContractWrapper } from '@/utils/ethersContractUtils';
import { ethers } from 'ethers';

// 2. 创建合约实例
const multiStakeContract = createContractWrapper({
  contractAddress: "0x123...",
  contractAbi: contract.abi,
  contractName: "MultiStakePledge"
});

// 3. 在 React 组件中使用
export function StakingComponent() {
  const [poolCount, setPoolCount] = useState<number>(0);

  useEffect(() => {
    // 可以在 useEffect 中直接调用
    const loadData = async () => {
      try {
        const count = await multiStakeContract.read<number>('poolCount');
        if (count !== null) {
          setPoolCount(count);
        }
      } catch (error) {
        console.error('Failed to load pool count:', error);
      }
    };

    loadData();
  }, []);

  const handleStake = async (poolId: number, amount: string) => {
    try {
      const result = await multiStakeContract.write('stake', [poolId], {
        value: ethers.parseEther(amount),
        estimateGas: true,
        timeout: 180000 // 3分钟超时
      });

      if (result.isSuccess) {
        console.log('质押成功!', result.hash);
      }
    } catch (error) {
      console.error('质押失败:', error);
    }
  };

  return (
    <div>
      <h2>Pool Count: {poolCount}</h2>
      <button onClick={() => handleStake(0, '1.0')}>
        Stake 1 ETH to Pool 0
      </button>
    </div>
  );
}
```

## 🎯 总结

这种包装器模式结合了以下优点：

1. **简单易用**：就像您说的，"导入合约，设置一次，到处使用"
2. **类型安全**：完整的 TypeScript 支持
3. **功能丰富**：Gas 估算、事件监听、批量操作等
4. **易于复制**：为新合约创建包装器只需几行代码
5. **向后兼容**：所有原有功能保持不变

您现在可以选择直接使用 `ContractWrapper` 基础类，或者参考 `MultiStakePledgeContractWrapper.ts` 为每个合约创建专用的类型化包装器。
