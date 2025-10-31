/**
 * 用户交易历史Hook
 *
 * 提供完整的交易历史查询、过滤、统计功能
 * 支持实时更新和缓存优化
 *
 * @author Hoyn
 * @version 1.0.0
 * @lastModified 2025-10-31
 */

import { useState, useEffect, useCallback } from "react";
import { usePublicClient } from "wagmi";
import { useWagmiWalletClient } from "./useWalletClient";
import { multiStakeViemContract } from "@/services/MultiStakeViemService";
import type { ContractEvent as ServiceContractEvent } from "@/services/MultiStakeViemService";
import {
  TransactionHistoryItem,
  TransactionHistoryQuery,
  TransactionHistoryStats,
  TransactionType,
  TransactionStatus,
  TOKEN_SYMBOL_MAPPING,
} from "@/types/TransactionHistory";
import { PublicClient } from "viem";
import { USDC_ADDRESS, WETH_ADDRESS } from "@/utils/constants";

/**
 * 将合约事件转换为交易历史项目
 */
async function contractEventToTransactionItem(
  event: ServiceContractEvent,
  userAddress: string,
  currentBlockNumber: bigint,
  contractService: typeof multiStakeViemContract,
  publicClient: PublicClient
): Promise<TransactionHistoryItem> {
  // 从event topics推断事件名称
  // 注意: viem的Log只有topics和data，需要解析eventName
  // 这里假设第一个topic是事件签名，但实际应该从合约ABI解析
  const eventName = "Unknown"; // 需要根据实际情况从topics或其他地方获取
  const transactionType: TransactionType = "Stake"; // 默认类型

  // 从事件参数中提取信息
  const args = event.args || [];
  let poolId: number | undefined;
  let amount: bigint | undefined;
  let rewardAmount: bigint | undefined;
  let unlockBlock: bigint | undefined;
  let tokenAddress: string | undefined;

  // 根据args数组提取参数
  // args的结构需要根据实际ABI定义来解析
  if (args.length >= 2) {
    poolId = args[0] ? Number(args[0]) : undefined;
    amount = args[1] as bigint;
  }

  // 如果有poolId，尝试获取池子信息来确定代币地址
  if (poolId !== undefined && !tokenAddress) {
    try {
      const poolInfo = await contractService.getPoolInfo(poolId, false);
      tokenAddress = poolInfo.stakeToken;
    } catch (error) {
      console.warn(`Failed to get pool info for pool ${poolId}:`, error);
    }
  }

  // 确定代币符号
  let tokenSymbol = "Unknown";
  if (tokenAddress) {
    if (tokenAddress === WETH_ADDRESS) {
      tokenSymbol = "WETH";
    } else if (tokenAddress === USDC_ADDRESS) {
      tokenSymbol = "USDC";
    } else {
      tokenSymbol = TOKEN_SYMBOL_MAPPING[tokenAddress] || "Unknown";
    }
  }

  // 确定交易状态
  const status: TransactionStatus = "Success";

  // 获取区块时间戳
  let blockTimestamp = Date.now();
  if (event.blockNumber) {
    try {
      const block = await publicClient.getBlock({
        blockNumber: event.blockNumber,
      });
      blockTimestamp = Number(block.timestamp) * 1000; // 转换为毫秒
    } catch (error) {
      console.warn("Failed to get block timestamp:", error);
      blockTimestamp = Date.now();
    }
  }

  // 计算确认数
  const confirmations = event.blockNumber
    ? Number(currentBlockNumber - event.blockNumber)
    : 0;

  return {
    id: `${event.transactionHash || "0x0"}-${event.logIndex || 0}`,
    type: transactionType,
    status,
    timestamp: blockTimestamp,
    transactionHash: event.transactionHash || "0x0",
    blockNumber: event.blockNumber || 0n,
    poolId,
    amount,
    tokenSymbol,
    tokenAddress,
    eventName,
    userAddress,
    contractAddress: event.address || "",
    confirmations,
    rewardAmount,
    unlockBlock,
    isExecutable: unlockBlock ? unlockBlock <= currentBlockNumber : undefined,
  };
}

/**
 * 计算交易历史统计信息
 */
function calculateStats(
  transactions: TransactionHistoryItem[]
): TransactionHistoryStats {
  if (transactions.length === 0) {
    return {
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      pendingTransactions: 0,
      totalStaked: 0n,
      totalUnstaked: 0n,
      totalClaimed: 0n,
    };
  }

  const stats: TransactionHistoryStats = {
    totalTransactions: transactions.length,
    successfulTransactions: transactions.filter((t) => t.status === "Success")
      .length,
    failedTransactions: transactions.filter((t) => t.status === "Failed")
      .length,
    pendingTransactions: transactions.filter((t) => t.status === "Pending")
      .length,
    totalStaked: 0n,
    totalUnstaked: 0n,
    totalClaimed: 0n,
  };

  // 计算各项总额
  transactions.forEach((transaction) => {
    if (transaction.type === "Stake" && transaction.amount) {
      stats.totalStaked += transaction.amount;
    } else if (transaction.type === "Unstake" && transaction.amount) {
      stats.totalUnstaked += transaction.amount;
    } else if (
      transaction.type === "ClaimRewards" &&
      transaction.rewardAmount
    ) {
      stats.totalClaimed += transaction.rewardAmount;
    }
  });

  // 计算最活跃的池子
  const poolCountMap = new Map<number, number>();
  transactions.forEach((transaction) => {
    if (transaction.poolId !== undefined) {
      poolCountMap.set(
        transaction.poolId,
        (poolCountMap.get(transaction.poolId) || 0) + 1
      );
    }
  });

  if (poolCountMap.size > 0) {
    let maxCount = 0;
    let mostActivePoolId: number | undefined;
    for (const [poolId, count] of poolCountMap.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostActivePoolId = poolId;
      }
    }
    stats.mostActivePoolId = mostActivePoolId;
  }

  // 计算时间范围
  const timestamps = transactions.map((t) => t.timestamp).filter((t) => t > 0);
  if (timestamps.length > 0) {
    stats.earliestTransaction = Math.min(...timestamps);
    stats.latestTransaction = Math.max(...timestamps);
  }

  return stats;
}

/**
 * 用户交易历史Hook
 */
export function useStakeExchangeHistory() {
  const [transactions, setTransactions] = useState<TransactionHistoryItem[]>(
    []
  );
  const [stats, setStats] = useState<TransactionHistoryStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wallet = useWagmiWalletClient();
  const publicClient = usePublicClient({ chainId: 11155111 });

  // 缓存所有交易历史数据，避免重复加载
  const [cachedTransactions, setCachedTransactions] = useState<
    TransactionHistoryItem[]
  >([]);
  const [hasMoreData, setHasMoreData] = useState(true);

  /**
   * 应用过滤条件
   */
  const applyFilters = useCallback(
    (
      items: TransactionHistoryItem[],
      query: Partial<TransactionHistoryQuery>
    ): TransactionHistoryItem[] => {
      let filteredItems = [...items];

      if (query.type && query.type.length > 0) {
        filteredItems = filteredItems.filter((item) =>
          query.type!.includes(item.type)
        );
      }

      if (query.status && query.status.length > 0) {
        filteredItems = filteredItems.filter((item) =>
          query.status!.includes(item.status)
        );
      }

      if (query.poolId && query.poolId.length > 0) {
        filteredItems = filteredItems.filter(
          (item) =>
            item.poolId !== undefined && query.poolId!.includes(item.poolId)
        );
      }

      if (query.startTime) {
        filteredItems = filteredItems.filter(
          (item) => item.timestamp >= query.startTime!
        );
      }

      if (query.endTime) {
        filteredItems = filteredItems.filter(
          (item) => item.timestamp <= query.endTime!
        );
      }

      return filteredItems;
    },
    []
  );

  /**
   * 应用分页
   */
  const applyPagination = useCallback(
    (
      items: TransactionHistoryItem[],
      page?: number,
      limit?: number
    ): TransactionHistoryItem[] => {
      if (!page || !limit) {
        return items;
      }
      const startIndex = (page - 1) * limit;
      return items.slice(startIndex, startIndex + limit);
    },
    []
  );

  /**
   * 获取交易历史（优化版本）
   */
  const fetchTransactionHistory = useCallback(
    async (
      query: Partial<TransactionHistoryQuery> = {}
    ): Promise<TransactionHistoryItem[]> => {
      if (!wallet.address) {
        return [];
      }

      try {
        setIsLoading(true);
        setError(null);

        let allItems: TransactionHistoryItem[];

        // 只有在强制刷新或首次加载时才重新获取所有数据
        if (query.forceRefresh || cachedTransactions.length === 0) {
          // 获取用户事件历史
          const events = await multiStakeViemContract.getUserEventHistory(
            wallet.address,
            query.forceRefresh || false
          );

          // 获取当前区块号
          const currentBlockNumber = await publicClient?.getBlockNumber();
          if (!currentBlockNumber) {
            throw new Error("Failed to get current block number");
          }

          // 转换事件为交易历史项目
          const transactionItemPromises = events.map((event) =>
            contractEventToTransactionItem(
              event,
              wallet.address!,
              currentBlockNumber,
              multiStakeViemContract,
              publicClient as PublicClient
            )
          );
          allItems = await Promise.all(transactionItemPromises);

          // 按时间倒序排列
          allItems.sort((a, b) => b.timestamp - a.timestamp);

          // 更新缓存
          setCachedTransactions(allItems);
        } else {
          // 使用缓存数据
          allItems = cachedTransactions;
        }

        // 应用过滤条件
        const filteredItems = applyFilters(allItems, query);

        // 应用分页
        const paginatedItems = applyPagination(
          filteredItems,
          query.page,
          query.limit
        );

        // 更新hasMoreData状态
        if (query.page && query.limit) {
          const totalPages = Math.ceil(filteredItems.length / query.limit);
          setHasMoreData(query.page < totalPages);
        } else {
          setHasMoreData(false);
        }

        return paginatedItems;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMessage);
        console.error("获取交易历史失败:", err);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [
      wallet.address,
      publicClient,
      cachedTransactions,
      applyFilters,
      applyPagination,
    ]
  );

  /**
   * 加载更多数据（用于无限滚动）
   */
  const loadMoreData = useCallback(
    async (
      currentPage: number,
      pageSize: number
    ): Promise<TransactionHistoryItem[]> => {
      if (!hasMoreData || isLoading) {
        console.log("📄 loadMoreData 跳过:", { hasMoreData, isLoading });
        return [];
      }

      console.log("📄 loadMoreData 加载下一页:", {
        currentPage,
        pageSize,
        nextPage: currentPage + 1,
      });

      const newTransactions = await fetchTransactionHistory({
        page: currentPage + 1,
        limit: pageSize,
      });

      // 累积新数据到现有数据
      if (newTransactions.length > 0) {
        setTransactions((prev) => [...prev, ...newTransactions]);
        console.log("✅ 成功追加", newTransactions.length, "条新数据");
      } else {
        console.log("⚠️ 没有获取到新数据");
      }

      return newTransactions;
    },
    [hasMoreData, isLoading, fetchTransactionHistory]
  );

  /**
   * 重置缓存
   */
  const resetCache = useCallback((): void => {
    setCachedTransactions([]);
    setTransactions([]);
    setHasMoreData(true);
  }, []);

  /**
   * 刷新交易历史
   */
  const refreshTransactionHistory = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    try {
      // 强制刷新，使用第一页
      const refreshedTransactions = await fetchTransactionHistory({
        forceRefresh: true,
        page: 1,
        limit: 10,
      });
      setTransactions(refreshedTransactions);

      // 重新计算统计信息
      const newStats = calculateStats(cachedTransactions);
      setStats(newStats);
    } catch (err) {
      console.error("刷新交易历史失败:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchTransactionHistory, cachedTransactions]);

  /**
   * 获取统计信息
   */
  const fetchStats = useCallback(async (): Promise<TransactionHistoryStats> => {
    if (!wallet.address) {
      return {
        totalTransactions: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        pendingTransactions: 0,
        totalStaked: 0n,
        totalUnstaked: 0n,
        totalClaimed: 0n,
      };
    }

    try {
      // 使用缓存数据计算统计信息
      const statsData =
        cachedTransactions.length > 0
          ? cachedTransactions
          : await fetchTransactionHistory({ forceRefresh: false });

      const newStats = calculateStats(statsData);
      setStats(newStats);
      return newStats;
    } catch (err) {
      console.error("获取统计信息失败:", err);
      throw err;
    }
  }, [wallet.address, cachedTransactions, fetchTransactionHistory]);

  /**
   * 清空历史记录
   */
  const clearHistory = useCallback((): void => {
    setTransactions([]);
    setStats(null);
    setError(null);
  }, []);

  /**
   * 按类型过滤
   */
  const filterByType = useCallback(
    (types: TransactionType[]): TransactionHistoryItem[] => {
      return transactions.filter((transaction) =>
        types.includes(transaction.type)
      );
    },
    [transactions]
  );

  /**
   * 按状态过滤
   */
  const filterByStatus = useCallback(
    (statuses: TransactionStatus[]): TransactionHistoryItem[] => {
      return transactions.filter((transaction) =>
        statuses.includes(transaction.status)
      );
    },
    [transactions]
  );

  /**
   * 按时间范围过滤
   */
  const filterByTimeRange = useCallback(
    (startTime: number, endTime: number): TransactionHistoryItem[] => {
      return transactions.filter(
        (transaction) =>
          transaction.timestamp >= startTime && transaction.timestamp <= endTime
      );
    },
    [transactions]
  );

  /**
   * 搜索交易
   */
  const searchTransactions = useCallback(
    (keyword: string): TransactionHistoryItem[] => {
      if (!keyword.trim()) {
        return transactions;
      }

      const lowerKeyword = keyword.toLowerCase();
      return transactions.filter(
        (transaction) =>
          transaction.transactionHash.toLowerCase().includes(lowerKeyword) ||
          transaction.tokenSymbol?.toLowerCase().includes(lowerKeyword) ||
          transaction.eventName.toLowerCase().includes(lowerKeyword) ||
          (transaction.poolId !== undefined &&
            transaction.poolId.toString().includes(lowerKeyword))
      );
    },
    [transactions]
  );

  /**
   * 更新查询参数并重新获取数据
   */
  const updateQuery = useCallback(
    async (
      newQuery: Partial<TransactionHistoryQuery>
    ): Promise<TransactionHistoryItem[]> => {
      if (!wallet.address) return [];

      try {
        setIsLoading(true);
        const newTransactions = await fetchTransactionHistory(newQuery);
        setTransactions(newTransactions);
        return newTransactions;
      } catch (err) {
        console.error("更新查询参数失败:", err);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [wallet.address, fetchTransactionHistory]
  );

  /**
   * 设置页面大小并加载数据
   */
  const setPageSize = useCallback(
    async (pageSize: number): Promise<TransactionHistoryItem[]> => {
      return updateQuery({ page: 1, limit: pageSize });
    },
    [updateQuery]
  );

  /**
   * 设置页码并加载数据
   */
  const setPage = useCallback(
    async (
      pageNum: number,
      pageSize?: number
    ): Promise<TransactionHistoryItem[]> => {
      const query: Partial<TransactionHistoryQuery> = { page: pageNum };
      if (pageSize) query.limit = pageSize;
      return updateQuery(query);
    },
    [updateQuery]
  );

  // 初始化加载
  useEffect(() => {
    if (wallet.address) {
      // 首次加载第一页数据
      fetchTransactionHistory({ page: 1, limit: 10 }).then(
        (newTransactions) => {
          setTransactions(newTransactions);
        }
      );
      fetchStats();
    } else {
      clearHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.address]); // 只依赖wallet.address，避免循环依赖

  return {
    transactions,
    stats,
    isLoading,
    isRefreshing,
    error,
    hasMoreData,
    // 核心方法
    fetchTransactionHistory,
    refreshTransactionHistory,
    fetchStats,
    clearHistory,
    // 过滤和搜索
    filterByType,
    filterByStatus,
    filterByTimeRange,
    searchTransactions,
    // 分页控制
    loadMoreData,
    resetCache,
    updateQuery,
    setPageSize,
    setPage,
  };
}
