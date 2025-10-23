# 钱包客户端获取和使用指南

## 概述

本指南介绍如何在项目中获取和使用已连接的钱包客户端，基于 Wagmi v2 和 Viem 实现。

## 快速开始

### 1. 基本使用（推荐）

```tsx
import { useWallet } from "@/hooks/useWalletClient";

function MyComponent() {
  const wallet = useWallet();

  if (!wallet.isConnected) {
    return <div>请连接钱包</div>;
  }

  if (!wallet.isReady) {
    return <div>钱包加载中...</div>;
  }

  // 现在可以使用 wallet.walletClient 进行操作
  const handleSign = async () => {
    const signature = await wallet.walletClient!.signMessage({
      message: "Hello World",
      account: wallet.walletClient!.account,
    });
  };

  return (
    <div>
      <p>钱包地址: {wallet.address}</p>
      <p>当前网络: {wallet.chainName}</p>
      <button onClick={handleSign}>签名消息</button>
    </div>
  );
}
```

### 2. 直接使用 Wagmi Hook

```tsx
import { useWagmiWalletClient } from "@/hooks/useWalletClient";

function MyComponent() {
  const { data: walletClient, isError, isLoading } = useWagmiWalletClient();

  if (isLoading) return <div>加载中...</div>;
  if (isError || !walletClient) return <div>钱包未连接</div>;

  return <div>钱包已连接: {walletClient.account.address}</div>;
}
```

## 与合约操作集成

### 1. 使用合约包装器

```tsx
import { useWallet } from "@/hooks/useWalletClient";
import { createViemContractWrapper } from "@/utils/viemContractUtils";
import contractABI from "@/app/abi/MyContract.json";

function ContractComponent() {
  const wallet = useWallet();

  const contract = useMemo(() => {
    return createViemContractWrapper({
      contractAddress: "0x...",
      contractAbi: contractABI.abi as Abi,
      contractName: "MyContract",
    });
  }, []);

  const handleStake = async () => {
    if (!wallet.isReady) {
      alert("钱包未连接");
      return;
    }

    try {
      const result = await contract.write("stake", [poolId], {
        account: wallet.walletClient.account,
        value: parseEther("1.0"),
        estimateGas: true,
      });

      if (result.isSuccess) {
        console.log("质押成功!", result.hash);
      }
    } catch (error) {
      console.error("质押失败:", error);
    }
  };

  return (
    <button onClick={handleStake} disabled={!wallet.isReady}>
      质押
    </button>
  );
}
```

### 2. 使用 ViemContractService

```tsx
import { ViemContractService } from "@/utils/viemContractUtils";

const handleContractWrite = async () => {
  const result = await ViemContractService.write({
    contractAddress: "0x...",
    contractAbi: contractABI.abi as Abi,
    functionName: "stake",
    args: [poolId],
    account: wallet.walletClient.account,
    walletClient: wallet.walletClient, // 传入钱包客户端
    value: parseEther("1.0"),
    estimateGas: true,
  });
};
```

## 在非组件中使用

### 1. 设置钱包客户端同步

在应用的根组件中添加同步 Hook：

```tsx
// app/layout.tsx 或根组件
import { useWalletClientSync } from "@/hooks/useWalletClient";

export default function RootLayout() {
  // 同步钱包客户端到管理器
  useWalletClientSync();

  return (
    // 您的应用内容
  );
}
```

### 2. 在服务层使用

```typescript
import {
  getConnectedWalletClient,
  isWalletConnected,
} from "@/hooks/useWalletClient";

// 在服务函数中使用
export async function signMessage(message: string) {
  if (!isWalletConnected()) {
    throw new Error("钱包未连接");
  }

  const walletClient = getConnectedWalletClient();
  if (!walletClient) {
    throw new Error("无法获取钱包客户端");
  }

  return await walletClient.signMessage({
    message,
    account: walletClient.account,
  });
}
```

## API 参考

### Hooks

#### `useWallet()`

最便捷的钱包 Hook，提供完整的钱包信息和状态。

**返回值:**

```typescript
{
  // 基本信息
  address: string | undefined;
  isConnected: boolean;
  isConnecting: boolean;
  isDisconnected: boolean;

  // 网络信息
  chain: Chain | undefined;
  chainId: number | undefined;
  chainName: string | undefined;

  // 钱包客户端
  walletClient: WalletClient | undefined;
  isError: boolean;
  isLoading: boolean;

  // 便捷属性
  isReady: boolean; // 钱包已连接且客户端可用
  hasWallet: boolean; // 是否有钱包客户端

  // 连接器信息
  connector: Connector | undefined;
}
```

#### `useWagmiWalletClient()`

基于 Wagmi 的 `useWalletClient` Hook。

#### `useConnectedWalletClient()`

基于 Wagmi 的 `useConnectorClient` Hook。

#### `useWalletStatus()`

仅获取钱包连接状态，不包含钱包客户端。

#### `useWalletClientSync()`

同步钱包客户端到管理器，用于非组件访问。

### 非 Hook 函数

#### `getConnectedWalletClient()`

获取当前连接的钱包客户端。

#### `getConnectedAddress()`

获取当前连接的钱包地址。

#### `isWalletConnected()`

检查钱包是否已连接。

## 最佳实践

### 1. 错误处理

```tsx
const wallet = useWallet();

const handleOperation = async () => {
  try {
    if (!wallet.isConnected) {
      throw new Error("请先连接钱包");
    }

    if (!wallet.walletClient) {
      throw new Error("钱包客户端不可用");
    }

    // 执行操作
    const result = await someWalletOperation();
  } catch (error) {
    if (error.code === 4001) {
      // 用户拒绝交易
      console.log("用户取消了交易");
    } else {
      console.error("操作失败:", error);
    }
  }
};
```

### 2. 加载状态管理

```tsx
const wallet = useWallet();
const [isOperating, setIsOperating] = useState(false);

const isReady = wallet.isReady && !isOperating;

return (
  <button
    onClick={handleOperation}
    disabled={!isReady}
    className={isReady ? "bg-blue-500" : "bg-gray-400"}
  >
    {wallet.isConnecting
      ? "连接中..."
      : wallet.isLoading
        ? "加载中..."
        : isOperating
          ? "处理中..."
          : "执行操作"}
  </button>
);
```

### 3. 网络检查

```tsx
const wallet = useWallet();

const handleOperation = async () => {
  // 检查网络
  if (wallet.chainId !== expectedChainId) {
    alert(`请切换到正确的网络 (Chain ID: ${expectedChainId})`);
    return;
  }

  // 继续操作...
};
```

## 故障排除

### 1. 钱包客户端为 undefined

**问题:** `wallet.walletClient` 为 `undefined`
**解决方案:**

- 确保钱包已连接
- 检查 `wallet.isReady` 状态
- 确保在组件中正确使用 Hook

### 2. 非组件中无法获取钱包客户端

**问题:** `getConnectedWalletClient()` 返回 `null`
**解决方案:**

- 确保在根组件中调用了 `useWalletClientSync()`
- 检查钱包是否已连接

### 3. 类型错误

**问题:** TypeScript 类型错误
**解决方案:**

- 使用类型断言: `contractABI.abi as Abi`
- 确保正确导入类型定义

## 完整示例

参见以下示例文件：

- `src/components/WalletClientExample.tsx` - 基本钱包客户端使用
- `src/components/ContractWithWalletExample.tsx` - 合约操作集成示例

---

**更新日期:** 2025-10-24  
**版本:** 1.0.0
