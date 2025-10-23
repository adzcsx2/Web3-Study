/**
 * wagmi-ethers 兼容性工具集
 *
 * 提供 wagmi 和 ethers.js 之间的桥接功能，让你可以在使用 wagmi 管理连接的同时，
 * 使用 ethers.js 进行更灵活的合约交互。
 *
 * 主要功能：
 * - wagmi Client 转 ethers Provider
 * - wagmi Wallet Client 转 ethers Signer
 * - 支持 Fallback Provider 和多 RPC 配置
 * - 保持网络信息同步
 *
 * @author Hoyn
 * @version 2.0.0 - 移除默认合约依赖，专注于兼容性功能
 */

import {
  FallbackProvider,
  JsonRpcProvider,
  BrowserProvider,
  JsonRpcSigner,
} from "ethers";
import { useMemo } from "react";
import type { Account, Chain, Client, Transport } from "viem";
import { type Config, useClient, useConnectorClient } from "wagmi";

// ============================================================================
// wagmi-ethers 兼容性函数
// ============================================================================

/**
 * 将 wagmi Wallet Client 转换为 ethers.js Signer
 *
 * @param client wagmi Wallet Client
 * @returns ethers.js JsonRpcSigner
 *
 * @example
 * ```typescript
 * import { useConnectorClient } from 'wagmi';
 * import { clientToSigner } from './useContract';
 *
 * function MyComponent() {
 *   const { data: client } = useConnectorClient();
 *   const signer = client ? clientToSigner(client) : undefined;
 *
 *   // 现在可以使用 ethers.js signer 进行合约交互
 * }
 * ```
 */
export function clientToSigner(client: Client<Transport, Chain, Account>) {
  const { account, chain, transport } = client;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };
  const provider = new BrowserProvider(transport, network);
  const signer = new JsonRpcSigner(provider, account.address);
  return signer;
}

/**
 * React Hook：将 wagmi Wallet Client 转换为 ethers.js Signer
 *
 * @param options 配置选项
 * @returns ethers.js JsonRpcSigner | undefined
 *
 * @example
 * ```typescript
 * import { useEthersSigner } from './useContract';
 *
 * function MyComponent() {
 *   const signer = useEthersSigner();
 *
 *   if (signer) {
 *     // 可以使用 signer 进行写操作
 *     const contract = new ethers.Contract(address, abi, signer);
 *     const tx = await contract.someMethod();
 *   }
 * }
 * ```
 */
export function useEthersSigner({ chainId }: { chainId?: number } = {}) {
  const { data: client } = useConnectorClient<Config>({ chainId });
  return useMemo(() => (client ? clientToSigner(client) : undefined), [client]);
}

/**
 * 将 wagmi Client 转换为 ethers.js Provider
 *
 * @param client wagmi Client
 * @returns ethers.js Provider (JsonRpcProvider 或 FallbackProvider)
 *
 * @example
 * ```typescript
 * import { useClient } from 'wagmi';
 * import { clientToProvider } from './useContract';
 *
 * function MyComponent() {
 *   const client = useClient();
 *   const provider = client ? clientToProvider(client) : undefined;
 *
 *   // 现在可以使用 ethers.js provider 进行只读操作
 * }
 * ```
 */
export function clientToProvider(client: Client<Transport, Chain>) {
  const { chain, transport } = client;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };

  if (transport.type === "fallback") {
    const providers = (transport.transports as ReturnType<Transport>[]).map(
      ({ value }) => new JsonRpcProvider(value?.url, network)
    );
    if (providers.length === 1) return providers[0];
    return new FallbackProvider(providers);
  }

  return new JsonRpcProvider(transport.url, network);
}

/**
 * React Hook：将 wagmi Client 转换为 ethers.js Provider
 *
 * @param options 配置选项
 * @returns ethers.js Provider | undefined
 *
 * @example
 * ```typescript
 * import { useEthersProvider } from './useContract';
 *
 * function MyComponent() {
 *   const provider = useEthersProvider();
 *
 *   if (provider) {
 *     // 可以使用 provider 进行只读操作
 *     const contract = new ethers.Contract(address, abi, provider);
 *     const data = await contract.someReadMethod();
 *   }
 * }
 * ```
 */
export function useEthersProvider({ chainId }: { chainId?: number } = {}) {
  const client = useClient<Config>({ chainId });
  return useMemo(
    () => (client ? clientToProvider(client) : undefined),
    [client]
  );
}

// ============================================================================
// 使用示例和最佳实践
// ============================================================================

/**
 * 完整使用示例：
 *
 * ```typescript
 * import { ethers } from 'ethers';
 * import { useEthersProvider, useEthersSigner } from './useContract';
 *
 * function ContractInteraction() {
 *   const provider = useEthersProvider();
 *   const signer = useEthersSigner();
 *
 *   // 只读操作
 *   const readContract = async () => {
 *     if (!provider) return;
 *
 *     const contract = new ethers.Contract(contractAddress, contractAbi, provider);
 *     const result = await contract.balanceOf(userAddress);
 *     console.log('Balance:', ethers.formatEther(result));
 *   };
 *
 *   // 写入操作
 *   const writeContract = async () => {
 *     if (!signer) {
 *       alert('请先连接钱包');
 *       return;
 *     }
 *
 *     const contract = new ethers.Contract(contractAddress, contractAbi, signer);
 *     const tx = await contract.transfer(toAddress, ethers.parseEther('1.0'));
 *
 *     console.log('交易发送:', tx.hash);
 *     const receipt = await tx.wait();
 *     console.log('交易确认:', receipt.hash);
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={readContract}>读取余额</button>
 *       <button onClick={writeContract} disabled={!signer}>
 *         发送交易
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 *
 * 最佳实践：
 * 1. 总是检查 provider 和 signer 是否存在
 * 2. 读操作使用 provider，写操作使用 signer
 * 3. 错误处理要完善
 * 4. 合理使用 useMemo 和 useCallback 优化性能
 */
