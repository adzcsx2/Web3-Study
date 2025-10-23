/**
 * Wagmi 钱包客户端 Hooks 和工具函数
 *
 * 提供获取已连接钱包客户端的各种方式：
 * - useWalletClient: React Hook，用于组件中
 * - getConnectedWalletClient: 非 Hook 方式，用于服务层
 *
 * @author Hoyn
 * @version 1.0.0
 * @lastModified 2025-10-24
 */

import { useConnectorClient, useAccount, useWalletClient } from "wagmi";
import { config } from "@/config/wagmi";
import { type WalletClient } from "viem";
import { useEffect } from "react";

/**
 * 获取已连接的钱包客户端 Hook
 *
 * @returns 钱包客户端数据和状态
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { data: walletClient, isError, isLoading } = useConnectedWalletClient();
 *
 *   if (isLoading) return <div>连接中...</div>;
 *   if (isError || !walletClient) return <div>未连接钱包</div>;
 *
 *   return <div>钱包已连接: {walletClient.account.address}</div>;
 * }
 * ```
 */
export function useConnectedWalletClient() {
  const { address, isConnected } = useAccount();
  const {
    data: walletClient,
    isError,
    isLoading,
  } = useConnectorClient({
    config,
    // 只在连接状态下获取客户端
    query: {
      enabled: isConnected && !!address,
    },
  });

  return {
    data: walletClient as WalletClient | undefined,
    isError,
    isLoading,
    isConnected,
    address,
  };
}

/**
 * 使用 Wagmi 的 useWalletClient Hook（推荐）
 *
 * @returns 钱包客户端数据和状态
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { data: walletClient, isError, isLoading } = useWagmiWalletClient();
 *
 *   const handleSign = async () => {
 *     if (!walletClient) return;
 *
 *     const signature = await walletClient.signMessage({
 *       message: 'Hello World',
 *       account: walletClient.account,
 *     });
 *   };
 *
 *   return <button onClick={handleSign}>签名</button>;
 * }
 * ```
 */
export function useWagmiWalletClient() {
  const { address, isConnected } = useAccount();
  const {
    data: walletClient,
    isError,
    isLoading,
  } = useWalletClient({
    config,
    query: {
      enabled: isConnected && !!address,
    },
  });

  return {
    data: walletClient,
    isError,
    isLoading,
    isConnected,
    address,
  };
}

/**
 * 钱包客户端状态 Hook
 * 提供更详细的连接状态信息
 *
 * @returns 钱包连接状态和基本信息
 */
export function useWalletStatus() {
  const {
    address,
    isConnected,
    isConnecting,
    isDisconnected,
    connector,
    chain,
  } = useAccount();

  return {
    address,
    isConnected,
    isConnecting,
    isDisconnected,
    connector,
    chain,
    chainId: chain?.id,
    chainName: chain?.name,
  };
}

/**
 * 获取钱包客户端的便捷 Hook
 * 结合了钱包客户端和账户状态
 *
 * @returns 完整的钱包信息
 *
 * @example
 * ```tsx
 * function WalletInfo() {
 *   const wallet = useWallet();
 *
 *   if (!wallet.isConnected) {
 *     return <div>请连接钱包</div>;
 *   }
 *
 *   return (
 *     <div>
 *       <p>地址: {wallet.address}</p>
 *       <p>网络: {wallet.chainName}</p>
 *       <p>连接器: {wallet.connector?.name}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useWallet() {
  const status = useWalletStatus();
  const { data: walletClient, isError, isLoading } = useWagmiWalletClient();

  return {
    ...status,
    walletClient,
    isError,
    isLoading,
    // 便捷属性
    isReady: status.isConnected && !!walletClient && !isLoading,
    hasWallet: !!walletClient,
  };
}

// ==================== 非 Hook 方式 ====================

/**
 * 钱包客户端管理器
 * 用于在非 React 组件中获取钱包客户端
 */
class WalletClientManager {
  private static instance: WalletClientManager;
  private currentWalletClient: WalletClient | null = null;
  private currentAddress: string | null = null;

  private constructor() {}

  static getInstance(): WalletClientManager {
    if (!WalletClientManager.instance) {
      WalletClientManager.instance = new WalletClientManager();
    }
    return WalletClientManager.instance;
  }

  /**
   * 设置当前的钱包客户端
   * 通常在组件中调用，将钱包客户端传递给管理器
   */
  setWalletClient(walletClient: WalletClient | null, address?: string | null) {
    this.currentWalletClient = walletClient;
    this.currentAddress = address || null;
  }

  /**
   * 获取当前的钱包客户端
   */
  getWalletClient(): WalletClient | null {
    return this.currentWalletClient;
  }

  /**
   * 获取当前的地址
   */
  getAddress(): string | null {
    return this.currentAddress;
  }

  /**
   * 检查是否有可用的钱包客户端
   */
  isWalletConnected(): boolean {
    return !!this.currentWalletClient && !!this.currentAddress;
  }
}

// 导出管理器实例
export const walletClientManager = WalletClientManager.getInstance();

/**
 * 获取已连接的钱包客户端（非 Hook 方式）
 * 用于在服务层或非组件中使用
 *
 * @returns 钱包客户端或 null
 *
 * @example
 * ```typescript
 * // 在服务中使用
 * async function signTransaction() {
 *   const walletClient = getConnectedWalletClient();
 *   if (!walletClient) {
 *     throw new Error('钱包未连接');
 *   }
 *
 *   return await walletClient.signMessage({
 *     message: 'Hello World',
 *     account: walletClient.account,
 *   });
 * }
 * ```
 */
export function getConnectedWalletClient(): WalletClient | null {
  return walletClientManager.getWalletClient();
}

/**
 * 获取当前连接的地址（非 Hook 方式）
 */
export function getConnectedAddress(): string | null {
  return walletClientManager.getAddress();
}

/**
 * 检查钱包是否已连接（非 Hook 方式）
 */
export function isWalletConnected(): boolean {
  return walletClientManager.isWalletConnected();
}

// ==================== 工具函数 ====================

/**
 * 钱包客户端同步 Hook
 * 用于将钱包客户端同步到管理器中，以便在非组件中使用
 *
 * 在应用的根组件或布局组件中使用这个 Hook
 *
 * @example
 * ```tsx
 * function App() {
 *   // 同步钱包客户端到管理器
 *   useWalletClientSync();
 *
 *   return <YourAppContent />;
 * }
 * ```
 */
export function useWalletClientSync() {
  const { data: walletClient } = useWagmiWalletClient();
  const { address } = useAccount();

  // 同步钱包客户端到管理器
  useEffect(() => {
    walletClientManager.setWalletClient(walletClient || null, address);
  }, [walletClient, address]);
}
