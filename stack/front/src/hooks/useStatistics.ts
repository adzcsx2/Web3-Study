/**
 * 平台统计数据 Hook
 *
 * 使用 wagmi 的 useReadContracts 一次性读取平台统计数据：
 * - 池子数量
 * - 活跃用户数
 * - 总锁仓量（WETH、USDC）
 * - 总发放奖励
 *
 * @author Hoyn
 * @version 1.0.0
 * @lastModified 2025-10-31
 */

import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import { formatEther, formatUnits } from "viem";
import type { Abi } from "viem";
import deploymentInfo from "@/app/abi/deployment-info.json";
import contract from "@/app/abi/MultiStakePledgeContractV2.json";
import { USDC_ADDRESS, WETH_ADDRESS } from "@/utils/constants";
import type { PoolInfo } from "@/types/StakePledgeContractStructs";

/**
 * 统计数据接口
 */
export interface StatisticsData {
  wethTotal: string;
  usdcTotal: string;
  totalRewards: string;
  activeUsers: number;
  poolCount: number; // 活跃池子数量（开放且未过期）
  totalPoolCount: number; // 🔧 新增：合约中实际存在的总池子数
}

/**
 * Hook 返回值接口
 */
export interface UseStatisticsReturn {
  /** 统计数据 */
  statistics: StatisticsData;
  /** 所有池子的详细信息（原始数据） */
  poolsData: Array<{ status: string; result?: PoolInfo }> | undefined;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 刷新数据 */
  refetch: () => void;
}

/**
 * 平台统计数据 Hook
 *
 * @param refetchInterval - 自动刷新间隔（毫秒），默认 30000ms（30秒）
 * @returns 统计数据、加载状态和刷新函数
 *
 * @example
 * ```tsx
 * const { statistics, isLoading, refetch } = useStatistics();
 *
 * return (
 *   <div>
 *     <p>WETH锁仓: {statistics.wethTotal}</p>
 *     <p>USDC锁仓: {statistics.usdcTotal}</p>
 *     <p>活跃用户: {statistics.activeUsers}</p>
 *     <p>总奖励: {statistics.totalRewards}</p>
 *     <button onClick={refetch}>刷新</button>
 *   </div>
 * );
 * ```
 */
export function useStatistics(
  refetchInterval: number = 30000
): UseStatisticsReturn {
  const contractAddress = deploymentInfo.contracts.MultiStakePledgeContractV2
    .address as `0x${string}`;
  const contractAbi = contract.abi as Abi;

  // 第一步：只读取池子数量
  // 🔧 注意：合约 V2 中没有 getActiveStakers 函数，所以暂时无法获取活跃用户数
  const {
    data: baseData,
    isLoading: isLoadingBase,
    refetch: refetchBase,
  } = useReadContracts({
    contracts: [
      {
        address: contractAddress,
        abi: contractAbi,
        functionName: "poolCounter",
        chainId: 11155111,
      },
    ],
    query: {
      refetchInterval,
    },
  });

  // 解析基础数据 - 这是合约中实际存在的总池子数
  const totalPoolCount =
    baseData?.[0]?.status === "success"
      ? Number(baseData[0].result as bigint)
      : 0;

  // 🔧 暂时设置为 0，因为合约中没有 getActiveStakers 函数
  // 要实现此功能需要在合约中添加相应的函数并重新部署
  const activeUsers = 0;

  // 🔧 重要：使用总池子数来读取所有池子信息，包括已过期的池子
  // 因为用户可能在任何池子中有质押（包括已过期的池子）
  const poolIds = useMemo(() => {
    return Array.from({ length: totalPoolCount }, (_, i) => i);
  }, [totalPoolCount]);

  // 第二步：读取所有池子的详细信息
  const {
    data: poolsData,
    isLoading: isLoadingPools,
    refetch: refetchPools,
  } = useReadContracts({
    contracts: poolIds.map((poolId) => ({
      address: contractAddress,
      abi: contractAbi,
      functionName: "getPoolInfo",
      args: [poolId],
      chainId: 11155111,
    })),
    query: {
      enabled: totalPoolCount > 0,
      refetchInterval,
    },
  });

  // 计算统计数据
  const statistics = useMemo((): StatisticsData => {
    let wethTotal = 0n;
    let usdcTotal = 0n;
    let totalRewards = 0n;
    let activePoolCount = 0; // 🔧 新增：计算真正活跃的池子数量

    // 获取当前时间戳（秒）
    const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));

    if (poolsData) {
      poolsData.forEach((pool) => {
        if (pool.status === "success" && pool.result) {
          const poolInfo = pool.result as PoolInfo;

          // 🔧 统计活跃池子：isOpenForStaking = true 且未过期
          if (
            poolInfo.isOpenForStaking &&
            currentTimestamp < poolInfo.endTime
          ) {
            activePoolCount++;
          }

          // 计算总锁仓量
          if (poolInfo.stakeToken === WETH_ADDRESS) {
            wethTotal += poolInfo.totalStaked;
          } else if (poolInfo.stakeToken === USDC_ADDRESS) {
            usdcTotal += poolInfo.totalStaked;
          }

          // 累加总奖励
          totalRewards += poolInfo.totalRewardsIssued;
        }
      });
    }

    return {
      wethTotal: formatEther(wethTotal),
      usdcTotal: formatUnits(usdcTotal, 6),
      totalRewards: formatEther(totalRewards),
      activeUsers,
      poolCount: activePoolCount, // 活跃池子数量（开放且未过期）
      totalPoolCount, // 🔧 合约中实际存在的总池子数
    };
  }, [poolsData, activeUsers, totalPoolCount]);

  // 合并加载状态
  const isLoading = isLoadingBase || isLoadingPools;

  // 合并刷新函数
  const refetch = () => {
    refetchBase();
    refetchPools();
  };

  return {
    statistics,
    poolsData: poolsData as
      | Array<{ status: string; result?: PoolInfo }>
      | undefined,
    isLoading,
    refetch,
  };
}
