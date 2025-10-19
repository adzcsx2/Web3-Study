// scripts/utils/contract-helpers.ts
import { ethers } from "hardhat";
import { getContractABI } from "./deployment-utils";

/**
 * 创建类型安全的合约实例辅助函数
 * 避免使用 as unknown as T 的类型断言
 */
export async function createTypedContract<T>(
  contractName: string,
  address: string,
  signerOrProvider?: any
): Promise<T> {
  try {
    // 优先使用 Hardhat 的 getContractAt (最佳实践)
    return await ethers.getContractAt(contractName, address, signerOrProvider) as T;
  } catch (error) {
    // 回退到使用保存的 ABI
    try {
      const contractABI = getContractABI(contractName);
      return new ethers.Contract(address, contractABI.abi, signerOrProvider) as unknown as T;
    } catch (abiError) {
      throw new Error(`无法创建合约实例: ${contractName}, 错误: ${error}`);
    }
  }
}

/**
 * 连接到已部署的合约（优雅降级）
 */
export async function connectToDeployedContract<T>(
  contractName: string,
  address: string,
  signerOrProvider?: any
): Promise<{
  contract: T;
  method: 'hardhat' | 'abi-file';
}> {
  try {
    // 方法1: 使用 Hardhat 编译的合约 (推荐)
    const contract = await ethers.getContractAt(contractName, address, signerOrProvider) as T;
    return { contract, method: 'hardhat' };
  } catch (hardhatError) {
    try {
      // 方法2: 使用保存的 ABI 文件
      const contractABI = getContractABI(contractName);
      const contract = new ethers.Contract(address, contractABI.abi, signerOrProvider) as unknown as T;
      return { contract, method: 'abi-file' };
    } catch (abiError) {
      throw new Error(`无法连接到合约 ${contractName}:\n- Hardhat: ${hardhatError}\n- ABI文件: ${abiError}`);
    }
  }
}

/**
 * 批量连接多个合约
 */
export async function connectToMultipleContracts(
  contracts: Array<{ name: string; address: string; type: string }>,
  signerOrProvider?: any
): Promise<{ [key: string]: any }> {
  const result: { [key: string]: any } = {};
  
  for (const { name, address, type } of contracts) {
    try {
      const { contract, method } = await connectToDeployedContract(type, address, signerOrProvider);
      result[name] = contract;
      console.log(`✅ ${name} 连接成功 (${method})`);
    } catch (error) {
      console.error(`❌ ${name} 连接失败:`, error);
      throw error;
    }
  }
  
  return result;
}