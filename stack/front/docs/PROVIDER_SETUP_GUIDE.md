# Provider 设置指南 (wagmi v2 + viem)

本指南展示如何在 wagmi v2 + viem 环境中正确设置 Provider 和 Wallet Client。

## 🚀 快速开始

### 1. 基础设置（无 Provider）

```typescript
import { MultiStakePledgeContractService } from "@/utils/MultiStakePledgeContractWrapper";

// 创建服务实例（使用默认配置）
const contract = new MultiStakePledgeContractService();

// 只能进行读取操作
const poolInfo = await contract.getPoolInfo(0);
```

### 2. 使用 wagmi v2 Clients (推荐)

```typescript
import { usePublicClient, useWalletClient } from 'wagmi';
import { parseEther } from 'viem';
import { MultiStakePledgeContractService } from '@/utils/MultiStakePledgeContractWrapper';

function MyComponent() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // 方式 1: 构造时设置
  const contract = new MultiStakePledgeContractService({
    publicClient,
    walletClient
  });

  // 方式 2: 动态设置
  const contract2 = new MultiStakePledgeContractService();
  if (publicClient) contract2.setDefaultPublicClient(publicClient);
  if (walletClient) contract2.setDefaultWalletClient(walletClient);

  // 现在可以进行写入操作
  const handleStake = async () => {
    try {
      await contract.stakeInPoolWithStatus(0, parseEther('1.0'), {
        onPending: () => console.log('🔄 正在发送交易...'),
        onSuccess: (receipt) => console.log('✅ 质押成功！'),
        onError: (error) => console.error('💥 交易失败:', error)
      });
    } catch (error) {
      console.error('质押失败:', error);
    }
  };

  return (
    <button onClick={handleStake} disabled={!walletClient}>
      质押 1 ETH
    </button>
  );
}
```

### 3. 使用 wagmi v2 (最新版本)

```typescript
import { usePublicClient, useWalletClient } from "wagmi";
import {
  walletClientToSigner,
  publicClientToProvider,
} from "@/utils/wagmiAdapters";

function MyComponent() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const provider = publicClient
    ? publicClientToProvider(publicClient)
    : undefined;
  const signer = walletClient ? walletClientToSigner(walletClient) : undefined;

  const contract = new MultiStakePledgeContractService({
    provider,
    signer,
  });

  // ... 使用合约
}
```

### 4. 创建 wagmi 适配器 (如果需要)

创建文件 `src/utils/wagmiAdapters.ts`:

```typescript
import { ethers } from "ethers";
import { PublicClient, WalletClient } from "viem";

export function publicClientToProvider(publicClient: PublicClient) {
  const { chain, transport } = publicClient;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };

  if (transport.type === "fallback") {
    return new ethers.FallbackProvider(
      transport.transports.map(
        ({ value }) => new ethers.JsonRpcProvider(value?.url, network)
      )
    );
  }

  return new ethers.JsonRpcProvider(transport.url, network);
}

export function walletClientToSigner(walletClient: WalletClient) {
  const { account, chain, transport } = walletClient;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };

  const provider = new ethers.BrowserProvider(transport, network);
  return provider.getSigner(account.address);
}
```

## 🔧 高级用法

### 1. 临时覆盖 Provider/Signer

```typescript
// 设置默认的 provider/signer
const contract = new MultiStakePledgeContractService({
  provider: defaultProvider,
  signer: defaultSigner,
});

// 在特定操作中临时覆盖
await contract.stakeInPool(0, ethers.parseEther("1.0"), {
  signer: temporarySigner, // 临时使用其他 signer
  gasLimit: 500000, // 同时设置其他参数
});
```

### 2. 只读模式 (Read-Only)

```typescript
// 只设置 provider，不设置 signer（只读模式）
const readOnlyContract = new MultiStakePledgeContractService({
  provider: ethersProvider,
});

// 可以读取数据
const poolInfo = await readOnlyContract.getPoolInfo(0);
const userInfo = await readOnlyContract.getUserPoolInfo(0, userAddress);

// 无法写入（会抛出错误）
// await readOnlyContract.stakeInPool(...); // ❌ 会失败
```

### 3. 自定义 RPC Provider

```typescript
import { ethers } from "ethers";

// 使用自定义 RPC
const customProvider = new ethers.JsonRpcProvider("https://your-rpc-url.com");

const contract = new MultiStakePledgeContractService({
  provider: customProvider,
});
```

### 4. 批量操作中的 Provider

```typescript
// 批量读取操作会自动使用默认 provider
const contract = new MultiStakePledgeContractService({
  provider: yourProvider,
});

const poolIds = [0, 1, 2];
const poolInfos = await contract.batchGetPoolInfo(poolIds);
```

## 🎯 最佳实践

### 1. React Hook 封装

创建自定义 hook：

```typescript
// hooks/useMultiStakeContract.ts
import { useMemo } from 'react';
import { usePublicClient, useWalletClient } from 'wagmi';
import { MultiStakePledgeContractService } from '@/utils/MultiStakePledgeContractWrapper';

export function useMultiStakeContract() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  return useMemo(() => {
    const provider = publicClient ? publicClientToProvider(publicClient) : undefined;
    const signer = walletClient ? walletClientToSigner(walletClient) : undefined;

    return new MultiStakePledgeContractService({
      provider,
      signer
    });
  }, [publicClient, walletClient]);
}

// 使用
function MyComponent() {
  const contract = useMultiStakeContract();

  const handleStake = async () => {
    await contract.stakeInPool(0, ethers.parseEther('1.0'));
  };

  return <button onClick={handleStake}>质押</button>;
}
```

### 2. 错误处理

```typescript
const contract = new MultiStakePledgeContractService({
  provider: yourProvider,
  signer: yourSigner,
});

try {
  await contract.stakeInPoolWithStatus(0, ethers.parseEther("1.0"), {
    onError: (error) => {
      if (error.message.includes("insufficient funds")) {
        toast.error("余额不足");
      } else if (error.message.includes("user rejected")) {
        toast.error("用户拒绝了交易");
      } else {
        toast.error("交易失败: " + error.message);
      }
    },
  });
} catch (error) {
  console.error("质押操作失败:", error);
}
```

### 3. 网络检查

```typescript
const contract = new MultiStakePledgeContractService({
  provider: yourProvider,
  signer: yourSigner,
});

// 检查网络
const network = await yourProvider.getNetwork();
if (network.chainId !== 1) {
  // 假设合约部署在主网
  throw new Error("请切换到主网");
}
```

## 🔍 调试技巧

### 1. 检查 Provider 状态

```typescript
const contract = new MultiStakePledgeContractService();

// 检查是否设置了 provider
console.log("Provider:", contract.getWrapper().provider);
console.log("Signer:", contract.getWrapper().signer);
```

### 2. 网络信息

```typescript
if (provider) {
  const network = await provider.getNetwork();
  console.log("Network:", network);
  console.log("Chain ID:", network.chainId);
}
```

### 3. 账户信息

```typescript
if (signer) {
  const address = await signer.getAddress();
  const balance = await signer.provider?.getBalance(address);
  console.log("Address:", address);
  console.log("Balance:", ethers.formatEther(balance || 0));
}
```
