import {
  readContract,
  EthersContractService,
} from "@/utils/ethersContractUtils";
import MultiStakePledgeContract from "@/app/abi/MultiStakePledgeContract.json";
import { ethers } from "ethers";

// 合约配置
const CONTRACT_ADDRESS = MultiStakePledgeContract.address;
const CONTRACT_ABI = MultiStakePledgeContract.abi;

/**
 * 获取总质押数量 - 普通函数版本（不使用 React Hook）
 * @param provider 可选的 ethers Provider
 * @returns Promise<bigint | null>
 */
export function getTotalStakedAmount(
  provider?: ethers.Provider
): Promise<bigint | null> {
  return readContract<bigint | null>(
    CONTRACT_ADDRESS,
    CONTRACT_ABI,
    "getTotalStakedAmount",
    [], // args
    false, // skipLogging
    provider
  );
}

/**
 * 使用 EthersContractService 的版本（支持对象参数）
 */
export async function getTotalStakedAmountV2(
  provider?: ethers.Provider
): Promise<bigint | null> {
  const result = await EthersContractService.read<bigint>({
    contractAddress: CONTRACT_ADDRESS,
    contractAbi: CONTRACT_ABI,
    functionName: "getTotalStakedAmount",
    provider,
  });
  return result.data;
}

/**
 * 最简洁版本（使用默认 provider）
 */
export function getTotalStakedSimple(): Promise<bigint | null> {
  return readContract<bigint | null>(
    CONTRACT_ADDRESS,
    CONTRACT_ABI,
    "getTotalStakedAmount"
  );
}

// 默认导出
export default getTotalStakedAmount;

// 🎯 React Hook 版本的使用说明
/*
如果你想在 React 组件中使用 useEthersContract，请这样做：

import { useEthersContract } from '@/hooks/useEthersContract';

function MyComponent() {
  const { read, calculateTotalStaked, isConnected } = useEthersContract();
  
  const handleGetTotal = async () => {
    if (!isConnected) return;
    
    // 方法1：使用内置方法
    const total = await calculateTotalStaked();
    
    // 方法2：直接调用
    const directTotal = await read<bigint>("getTotalStakedAmount");
    
    console.log('总质押量:', ethers.formatEther(total), 'WETH');
  };
  
  return <button onClick={handleGetTotal}>获取总质押量</button>;
}
*/
