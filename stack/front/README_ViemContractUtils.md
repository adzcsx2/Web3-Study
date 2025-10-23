# Viem 合约工具集 - 完整指南

基于 `ethersContractUtils.ts` 设计，创建的现代化 Viem 版本合约交互工具。

## 📁 新增文件

### 1. 核心工具文件

- `src/utils/viemContractUtils.ts` - 主要的 Viem 合约工具集
- `src/services/ViemContractExample.ts` - 使用示例

## 🚀 主要特性

### 与 Ethers 版本功能对照

| 功能       | Ethers 版本                     | Viem 版本                     | 状态 |
| ---------- | ------------------------------- | ----------------------------- | ---- |
| 合约读取   | `EthersContractService.read()`  | `ViemContractService.read()`  | ✅   |
| 合约写入   | `EthersContractService.write()` | `ViemContractService.write()` | ✅   |
| 批量读取   | `batchRead()`                   | `batchRead()`                 | ✅   |
| Gas 估算   | `estimateGas()`                 | `estimateGas()`               | ✅   |
| 事件监听   | `addEventListener()`            | `addEventListener()`          | ✅   |
| 历史事件   | `getEvents()`                   | `getEvents()`                 | ✅   |
| 合约包装器 | `ContractWrapper`               | `ViemContractWrapper`         | ✅   |
| 统一写方法 | `executeWrite()`                | `executeWrite()`              | ✅   |
| 状态回调   | `executeWriteWithStatus()`      | `executeWriteWithStatus()`    | ✅   |

### 新增的 Viem 特色功能

1. **更强的类型安全** - 基于 Viem 的严格类型系统
2. **更小的包体积** - 更好的树摇优化
3. **现代化 API** - 符合最新 Web3 标准
4. **EIP-1559 支持** - 原生支持新的 Gas 费用模型

## 🎯 快速开始

### 基础使用

```typescript
import { createViemContractWrapper } from "@/utils/viemContractUtils";
import contract from "@/app/abi/MultiStakePledgeContract.json";

// 创建合约实例
const multiStakeContract = createViemContractWrapper({
  contractAddress: "0x123...",
  contractAbi: contract.abi,
  contractName: "MultiStakePledge",
});

// 读取数据
const poolCount = await multiStakeContract.read<bigint>("poolCount");

// 写入数据
const result = await multiStakeContract.executeWrite("stake", [poolId], {
  account: userAccount,
  value: parseViemEther("1.0"),
});
```

### 在 React 组件中使用

```typescript
import { useAccount } from "wagmi";
import { parseViemEther } from "@/utils/viemContractUtils";

function StakeComponent() {
  const { address } = useAccount();

  const handleStake = async () => {
    await multiStakeContract.executeWriteWithStatus("stake", [poolId], {
      account: { address } as Account,
      value: parseViemEther("1.0"),
      onPending: () => setStatus("发送中..."),
      onSent: (hash) => setStatus(`已发送: ${hash}`),
      onSuccess: () => setStatus("成功！"),
      onError: (error) => setStatus(`失败: ${error.message}`),
    });
  };
}
```

## 📚 API 参考

### 核心类和函数

#### ViemContractService

- `read<T>()` - 读取合约数据
- `write()` - 写入合约数据
- `batchRead()` - 批量读取
- `estimateGas()` - Gas 估算
- `addEventListener()` - 事件监听
- `getEvents()` - 获取历史事件

#### ViemContractWrapper

- `read<T>()` - 实例读取方法
- `write()` - 实例写入方法
- `executeWrite()` - 统一写入方法
- `executeWriteWithStatus()` - 带回调的写入方法
- `estimateGas()` - 实例 Gas 估算
- `batchRead()` - 实例批量读取

#### 便捷函数

- `readViemContract()` - 快速读取
- `writeViemContract()` - 快速写入
- `estimateViemContractGas()` - 快速 Gas 估算
- `createViemContractWrapper()` - 创建包装器

#### 工具函数

- `parseViemEther()` / `formatViemEther()` - ETH/Wei 转换
- `parseViemGwei()` / `formatViemGasPrice()` - Gwei 转换
- `isValidViemAddress()` - 地址验证
- `isViemContract()` - 合约检查

## 🔄 从 Ethers 迁移

### 导入更改

```typescript
// 旧的 Ethers 版本
import {
  EthersContractService,
  ContractWrapper,
  createContractWrapper,
} from "@/utils/ethersContractUtils";

// 新的 Viem 版本
import {
  ViemContractService,
  ViemContractWrapper,
  createViemContractWrapper,
} from "@/utils/viemContractUtils";
```

### API 更改

```typescript
// 旧版本
const result = await contract.write("stake", [poolId], {
  signer: ethersigner, // ethers Signer
  value: ethers.parseEther("1.0"),
});

// 新版本
const result = await contract.write("stake", [poolId], {
  account: viemAccount, // viem Account
  value: parseViemEther("1.0"),
});
```

### 主要差异

1. **Signer -> Account**: Viem 使用 Account 概念替代 Signer
2. **函数名前缀**: 工具函数加上 Viem 前缀避免冲突
3. **类型导入**: 从 viem 而不是 ethers 导入类型
4. **事件处理**: Viem 的事件 API 略有不同

## ✨ 优势对比

### Viem 相比 Ethers 的优势

1. **包体积** 📦
   - Ethers: ~284KB (gzipped)
   - Viem: ~31KB (gzipped)

2. **类型安全** 🔒
   - Ethers: 基础 TypeScript 支持
   - Viem: 完整类型推导和验证

3. **现代化** 🆕
   - Ethers: 传统 API 设计
   - Viem: 现代 ES6+ 标准

4. **性能** ⚡
   - Ethers: 标准性能
   - Viem: 优化过的执行效率

5. **树摇优化** 🌳
   - Ethers: 有限支持
   - Viem: 完全支持

### 保持的优势

✅ **可在循环中调用** - 两个版本都支持  
✅ **批量操作** - 并行处理多个请求  
✅ **错误处理** - 统一的错误处理机制  
✅ **状态跟踪** - 完整的交易生命周期跟踪  
✅ **Gas 估算** - 智能 Gas 费用预测  
✅ **事件监听** - 实时合约事件监控

## 🔧 配置

### 网络配置

在 `viemContractUtils.ts` 中已预配置主流网络：

```typescript
export const VIEM_CONFIG = {
  chains: {
    mainnet,
    sepolia,
    goerli,
    polygon,
    optimism,
    arbitrum,
    localhost,
  },
  defaultChain: sepolia,
  // ... 其他配置
};
```

### 自定义网络

```typescript
import { defineChain } from "viem";

const customChain = defineChain({
  id: 12345,
  name: "Custom Network",
  network: "custom",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["https://custom-rpc.com"],
    },
    public: {
      http: ["https://custom-rpc.com"],
    },
  },
});
```

## 🧪 测试建议

### 单元测试

```typescript
import { describe, it, expect } from "vitest";
import { parseViemEther, formatViemEther } from "@/utils/viemContractUtils";

describe("Viem Utils", () => {
  it("should convert ETH to Wei", () => {
    const wei = parseViemEther("1.0");
    expect(wei).toBe(1000000000000000000n);
  });

  it("should convert Wei to ETH", () => {
    const eth = formatViemEther(1000000000000000000n);
    expect(eth).toBe("1.0");
  });
});
```

### 集成测试

```typescript
import { createViemContractWrapper } from "@/utils/viemContractUtils";
import { testAccount, testContract } from "./fixtures";

describe("Contract Integration", () => {
  const contract = createViemContractWrapper(testContract);

  it("should read contract data", async () => {
    const result = await contract.read("name");
    expect(result).toBeDefined();
  });
});
```

## 📈 性能优化建议

1. **批量操作** - 使用 `batchRead()` 减少 RPC 调用
2. **缓存结果** - 对不变数据进行缓存
3. **Gas 估算** - 启用 `estimateGas` 避免交易失败
4. **错误处理** - 妥善处理网络和合约错误
5. **事件过滤** - 使用精确的事件过滤器

## 🔮 未来规划

- [ ] 支持更多网络
- [ ] 增加合约部署功能
- [ ] 支持多签钱包
- [ ] 添加缓存层
- [ ] 支持合约升级检测

## 💡 最佳实践

1. **始终进行 Gas 估算** 避免交易失败
2. **使用状态回调** 提供更好的用户体验
3. **妥善处理错误** 区分网络错误和合约错误
4. **批量操作优化** 减少不必要的 RPC 调用
5. **类型安全** 充分利用 TypeScript 类型检查

---

## 📝 总结

新的 Viem 版本完全保持了 Ethers 版本的功能特性，同时提供了：

- 🎯 **更好的开发体验** - 现代化 API 和完善的类型支持
- 📦 **更小的包体积** - 优秀的树摇优化
- ⚡ **更好的性能** - 底层优化和高效执行
- 🔒 **更强的类型安全** - 编译时错误检查

适合希望使用最新 Web3 技术栈的项目！
