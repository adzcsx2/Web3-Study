/**
 * 交易历史相关的TypeScript类型定义
 *
 * @author Hoyn
 * @version 1.0.0
 * @lastModified 2025-10-31
 */

import { Log } from "viem";

/**
 * 合约事件接口
 */
export interface ContractEvent extends Log {
  args?: unknown[];
  eventName?: string;
  transactionHash?: string;
  blockNumber?: bigint;
  address?: string;
}

/**
 * 交易类型枚举
 */
export type TransactionType = 'Stake' | 'Unstake' | 'Withdraw' | 'ClaimRewards';

/**
 * 交易状态枚举
 */
export type TransactionStatus = 'Pending' | 'Success' | 'Failed';

/**
 * 交易历史项目接口
 */
export interface TransactionHistoryItem {
  /** 唯一标识符，通常使用交易哈希和事件索引组合 */
  id: string;
  /** 交易类型 */
  type: TransactionType;
  /** 交易状态 */
  status: TransactionStatus;
  /** 交易时间戳 */
  timestamp: number;
  /** 交易哈希 */
  transactionHash: string;
  /** 区块号 */
  blockNumber: bigint;
  /** 池子ID */
  poolId?: number;
  /** 交易金额 */
  amount?: bigint;
  /** 代币符号 */
  tokenSymbol?: string;
  /** 代币地址 */
  tokenAddress?: string;
  /** 交易费用（Gas费用） */
  gasUsed?: bigint;
  /** Gas价格 */
  gasPrice?: bigint;
  /** 事件名称 */
  eventName: string;
  /** 用户地址 */
  userAddress: string;
  /** 合约地址 */
  contractAddress: string;
  /** 交易确认数 */
  confirmations?: number;
  /** 错误信息（如果交易失败） */
  error?: string;
  /** 奖励金额（适用于奖励领取交易） */
  rewardAmount?: bigint;
  /** 解锁区块（适用于解质押请求） */
  unlockBlock?: bigint;
  /** 是否可执行（适用于解质押请求） */
  isExecutable?: boolean;
}

/**
 * 交易历史查询参数
 */
export interface TransactionHistoryQuery {
  /** 用户地址 */
  userAddress: string;
  /** 交易类型过滤 */
  type?: TransactionType[];
  /** 交易状态过滤 */
  status?: TransactionStatus[];
  /** 开始时间戳 */
  startTime?: number;
  /** 结束时间戳 */
  endTime?: number;
  /** 池子ID过滤 */
  poolId?: number[];
  /** 页码 */
  page?: number;
  /** 每页数量 */
  limit?: number;
  /** 是否强制刷新缓存 */
  forceRefresh?: boolean;
}

/**
 * 交易历史查询结果
 */
export interface TransactionHistoryResult {
  /** 交易历史列表 */
  transactions: TransactionHistoryItem[];
  /** 总数量 */
  total: number;
  /** 当前页码 */
  page: number;
  /** 每页数量 */
  limit: number;
  /** 总页数 */
  totalPages: number;
}

/**
 * 交易历史统计信息
 */
export interface TransactionHistoryStats {
  /** 总交易数量 */
  totalTransactions: number;
  /** 成功交易数量 */
  successfulTransactions: number;
  /** 失败交易数量 */
  failedTransactions: number;
  /** 待处理交易数量 */
  pendingTransactions: number;
  /** 总质押金额 */
  totalStaked: bigint;
  /** 总解质押金额 */
  totalUnstaked: bigint;
  /** 总奖励领取金额 */
  totalClaimed: bigint;
  /** 最活跃的池子ID */
  mostActivePoolId?: number;
  /** 最早交易时间 */
  earliestTransaction?: number;
  /** 最新交易时间 */
  latestTransaction?: number;
}

/**
 * 交易历史Hook返回类型
 */
export interface UseStakeExchangeHistoryReturn {
  /** 交易历史数据 */
  transactions: TransactionHistoryItem[];
  /** 统计信息 */
  stats: TransactionHistoryStats | null;
  /** 加载状态 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 是否正在刷新 */
  isRefreshing: boolean;
  /** 获取交易历史 */
  fetchTransactionHistory: (query?: Partial<TransactionHistoryQuery>) => Promise<TransactionHistoryItem[]>;
  /** 刷新交易历史 */
  refreshTransactionHistory: () => Promise<void>;
  /** 获取统计信息 */
  fetchStats: () => Promise<TransactionHistoryStats>;
  /** 清空历史记录 */
  clearHistory: () => void;
  /** 按类型过滤 */
  filterByType: (types: TransactionType[]) => TransactionHistoryItem[];
  /** 按状态过滤 */
  filterByStatus: (statuses: TransactionStatus[]) => TransactionHistoryItem[];
  /** 按时间范围过滤 */
  filterByTimeRange: (startTime: number, endTime: number) => TransactionHistoryItem[];
  /** 搜索交易 */
  searchTransactions: (keyword: string) => TransactionHistoryItem[];
  /** 加载更多数据（增量加载） */
  loadMoreData: () => Promise<void>;
  /** 重置分页状态 */
  resetPagination: () => void;
  /** 是否还有更多数据 */
  hasMoreData: boolean;
  /** 更新查询参数 */
  updateQuery: (query: Partial<TransactionHistoryQuery>) => Promise<void>;
  /** 设置页面大小 */
  setPageSize: (pageSize: number) => Promise<void>;
  /** 设置页码 */
  setPage: (page: number, pageSize?: number) => Promise<void>;
}

/**
 * 事件到交易类型的映射
 */
export const EVENT_TYPE_MAPPING: Record<string, TransactionType> = {
  'StakedInPool': 'Stake',
  'UnstakedFromPool': 'Withdraw',
  'RequestUnstakeFromPool': 'Unstake',
  'RewardsClaimedFromPool': 'ClaimRewards'
};

/**
 * 事件到交易状态的映射规则
 */
export const EVENT_STATUS_MAPPING = {
  // 对于事件日志，通常都是成功状态
  // 失败状态需要通过检查交易receipt来确定
  default: 'Success' as TransactionStatus
};

/**
 * 代币地址到符号的映射（示例）
 */
export const TOKEN_SYMBOL_MAPPING: Record<string, string> = {
  // 需要根据实际项目配置更新
  '0x4200000000000000000000000000000000000006': 'WETH',
  '0xA0b86a33E6441b8e8C7C7b0b8e8e8e8e8e8e8e8e': 'USDC',
  '0x1234567890123456789012345678901234567890': 'MTK'
};