/**
 * 已部署合约服务
 * 用于管理不同链上的已部署合约信息
 */

import localhostContracts from "@/app/abi/localhost-deployment.json";

export interface ContractInfo {
  contractName: string;
  proxyAddress: string;
  isProxyContract: boolean;
  currentVersion: string;
  abi: any[];
}

/**
 * 根据链ID和合约地址获取合约信息
 */
export function getContractInfo(chainId: number, contractAddress: string): ContractInfo | null {
  // 支持localhost链的两个常见chainId
  if (chainId !== 1337 && chainId !== 31337) {
    return null;
  }

  const deployment = localhostContracts as any;
  if (!deployment.contracts) {
    return null;
  }

  // 搜索所有合约，找到匹配地址的合约
  for (const [contractName, contractData] of Object.entries(deployment.contracts)) {
    const contract = contractData as any;
    if (contract.proxyAddress?.toLowerCase() === contractAddress.toLowerCase()) {
      return {
        contractName,
        proxyAddress: contract.proxyAddress,
        isProxyContract: contract.isProxyContract || false,
        currentVersion: contract.currentVersion || "1",
        abi: contract.versions?.[0]?.abi || contract.abi || [],
      };
    }
  }

  return null;
}

/**
 * 获取localhost链上的所有已部署合约
 */
export function getLocalhostContracts(): Record<string, ContractInfo> {
  const deployment = localhostContracts as any;
  const contracts: Record<string, ContractInfo> = {};

  if (!deployment.contracts) {
    return contracts;
  }

  for (const [contractName, contractData] of Object.entries(deployment.contracts)) {
    const contract = contractData as any;
    if (contract.proxyAddress) {
      contracts[contractName] = {
        contractName,
        proxyAddress: contract.proxyAddress,
        isProxyContract: contract.isProxyContract || false,
        currentVersion: contract.currentVersion || "1",
        abi: contract.versions?.[0]?.abi || contract.abi || [],
      };
    }
  }

  return contracts;
}

/**
 * 根据合约地址获取合约名称
 */
export function getContractName(chainId: number, contractAddress: string): string | null {
  const contractInfo = getContractInfo(chainId, contractAddress);
  return contractInfo?.contractName || null;
}