/**
 * 智能合约交互工具集
 *
 * 提供了一系列用于与智能合约进行读写操作的 React Hooks。
 * 基于 wagmi 库封装，提供类型安全、错误处理和调试功能。
 *
 * 主要功能：
 * - 合约读取操作（useContractRead, useContractFunction, useContractData）
 * - 合约写入操作（useContractWrite, useContractDataWrite）
 * - Hook 工厂函数（createContractHook, createContractWriteHook）
 * - 自动化的交易状态跟踪和确认等待
 * - 可配置的日志记录和错误处理
 *
 * 关于写操作:
 * 场景1: 完全成功的交易
 * 1️⃣ isPending: true   → 🔄 发送中
 * 2️⃣ isSuccess: true   → 📤 已发送到区块链
 * 3️⃣ isConfirming: true → ⏳ 等待确认
 * 4️⃣ isConfirmed: true → 🔗 已上链
 * 5️⃣ isTransactionSuccessful: true → ✅ 执行成功！
 * 场景2: 交易回滚（失败但已上链）
 * 1️⃣ isPending: true   → 🔄 发送中
 * 2️⃣ isSuccess: true   → 📤 已发送到区块链
 * 3️⃣ isConfirming: true → ⏳ 等待确认
 * 4️⃣ isConfirmed: true → 🔗 已上链
 * 5️⃣ isReverted: true  → ❌ 执行失败（回滚）！
 * 场景3: 发送失败
 * 1️⃣ isPending: true  → 🔄 发送中
 * 2️⃣ isError: true    → ❌ 发送失败（未上链）
 *
 * 真正的成功判断：
 * if (isConfirmed && isTransactionSuccessful) {
 * // 🎉 交易真正成功！
 * }
 *
 * 回滚检测：
 * if (isConfirmed && isReverted) {
 * // 💸 交易失败但消耗了Gas！
 *    console.log('交易已回滚，但仍需支付手续费');
 * }
 *
 * // ✅ 完整的用户提示系统
 * if (isPending) {
 *    showMessage('🔄 正在发送交易...', 'loading');
 * }
 * if (isSuccess && isConfirming) {
 *    showMessage('⏳ 交易已发送，等待确认...', 'info');
 * }
 * if (isTransactionSuccessful) {
 *    showMessage('✅ 交易执行成功！', 'success');
 * }
 * if (isReverted) {
 *    showMessage('❌ 交易执行失败，已回滚！', 'error');
 *    // 提醒用户仍需支付Gas费用
 * }
 *
 * @author Hoyn
 * @version 1.0.0
 */

import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useEffect } from "react";
import contract from "@/app/abi/MultiStakePledgeContract.json";

/**
 * 合约读取操作的配置选项
 */
interface UseContractReadOptions {
  /** 要调用的合约函数名称 */
  functionName: string;
  /** 传递给合约函数的参数数组 */
  args?: readonly unknown[];
  /** 是否启用查询，默认为 true */
  enabled?: boolean;
  /** 是否跳过日志输出，默认为 false */
  skipLogging?: boolean;
}

/**
 * 合约读取操作的返回结果
 * @template T 返回数据的类型
 */
interface UseContractReadResult<T> {
  /** 合约调用返回的数据 */
  data: T | undefined;
  /** 错误信息，如果有的话 */
  error: Error | null;
  /** 是否发生错误 */
  isError: boolean;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 重新获取数据的函数 */
  refetch: () => void;
}

/**
 * 用于读取合约数据的基础 Hook
 *
 * @template T 返回数据的类型
 * @param options 配置选项
 * @returns 合约读取结果，包含数据、错误状态、加载状态等
 *
 * @example
 * ```typescript
 * const { data, isLoading, error } = useContractRead<string>({
 *   functionName: 'name',
 *   args: [],
 *   enabled: true
 * });
 * ```
 */
export function useContractRead<T = unknown>({
  functionName,
  args = [],
  enabled = true,
  skipLogging = false,
}: UseContractReadOptions): UseContractReadResult<T> {
  // 验证合约地址
  if (!contract.address) {
    console.warn("Contract address is not defined");
  }

  const { data, error, isError, isLoading, refetch } = useReadContract({
    abi: contract.abi,
    address: contract.address as `0x${string}`,
    functionName,
    args,
    query: {
      enabled: enabled && !!contract.address,
    },
  });

  useEffect(() => {
    if (!skipLogging) {
      console.log(`=== Contract ${functionName} Debug ===`);
      console.log("Contract Address:", contract.address);
      console.log("Function Name:", functionName);
      console.log("Arguments:", args);
      console.log("Data:", data);
      console.log("Is Loading:", isLoading);
      console.log("Is Error:", isError);
      if (isError) {
        console.error(`${functionName} Error:`, error);
      }
      console.log("===============================");
    }
  }, [data, isError, error, isLoading, functionName, args, skipLogging]);

  return {
    data: data as T | undefined,
    error,
    isError,
    isLoading,
    refetch,
  };
}

/**
 * 简化的合约函数调用 Hook
 * 对 useContractRead 的封装，提供更简洁的 API
 *
 * @template T 返回数据的类型
 * @param functionName 合约函数名称
 * @param args 函数参数数组
 * @param options 可选配置
 * @returns 合约读取结果
 *
 * @example
 * ```typescript
 * const result = useContractFunction<bigint>('balanceOf', [userAddress]);
 * ```
 */
export function useContractFunction<T = unknown>(
  functionName: string,
  args: readonly unknown[] = [],
  options: { enabled?: boolean; skipLogging?: boolean } = {}
) {
  return useContractRead<T>({
    functionName,
    args,
    enabled: options.enabled ?? true,
    skipLogging: options.skipLogging ?? false,
  });
}

/**
 * 简化版本的合约数据获取 Hook
 * 只返回核心数据，不包含调试信息，默认跳过日志
 *
 * @template T 返回数据的类型
 * @param functionName 合约函数名称
 * @param args 函数参数数组
 * @param options 可选配置，只包含 enabled 选项
 * @returns 简化的结果对象，只包含 data、isLoading、isError
 *
 * @example
 * ```typescript
 * const { data, isLoading } = useContractData<string>('symbol');
 * ```
 */
export function useContractData<T = unknown>(
  functionName: string,
  args: readonly unknown[] = [],
  options: { enabled?: boolean } = {}
) {
  const { data, isLoading, isError } = useContractRead<T>({
    functionName,
    args,
    enabled: options.enabled ?? true,
    skipLogging: true, // 简化版本默认跳过日志
  });

  return {
    data,
    isLoading,
    isError,
  };
}

/**
 * 创建类型安全的合约方法 Hook 工厂函数
 * 返回一个专门用于特定合约函数的 Hook
 *
 * @template R 返回数据的类型
 * @param functionName 合约函数名称
 * @returns 返回一个 Hook 函数，该函数接收参数和选项
 *
 * @example
 * ```typescript
 * const useBalanceOf = createContractHook<bigint>('balanceOf');
 * const { data } = useBalanceOf([userAddress]);
 * ```
 */
export function createContractHook<R = unknown>(functionName: string) {
  return <T extends readonly unknown[]>(
    args: T = [] as unknown as T,
    options?: { enabled?: boolean; skipLogging?: boolean }
  ) => {
    return useContractRead<R>({
      functionName,
      args,
      enabled: options?.enabled ?? true,
      skipLogging: options?.skipLogging ?? false,
    });
  };
}

// ==================== 写合约Hook ====================

/**
 * 合约写入操作的配置选项
 */
interface UseContractWriteOptions {
  /** 要调用的合约函数名称 */
  functionName: string;
  /** 传递给合约函数的参数数组 */
  args?: readonly unknown[];
  /** 要发送的以太币数量（wei 单位，支持字符串或 BigInt） */
  value?: string | bigint;
  /** 交易已发送到区块链时的回调函数（此时交易还未确认） */
  onSuccess?: (hash: string) => void;
  /** 交易发送失败时的回调函数 */
  onError?: (error: Error) => void;
  /** 是否跳过日志输出，默认为 false */
  skipLogging?: boolean;
}

/**
 * 辅助函数：安全地转换 value 为 BigInt
 * 处理字符串和 BigInt 类型的转换，包含错误处理
 *
 * @param value 要转换的值，可以是字符串或 BigInt
 * @returns 转换后的 BigInt 值，如果转换失败则返回 undefined
 */
function parseValue(value?: string | bigint): bigint | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "bigint") return value;
  if (typeof value === "string") {
    try {
      return BigInt(value);
    } catch (error) {
      console.error("Failed to parse value as BigInt:", value, error);
      return undefined;
    }
  }
  return undefined;
}

/**
 * 合约写入操作的返回结果
 */
interface UseContractWriteResult {
  /** 同步写入函数，触发交易 */
  write: (args?: readonly unknown[], value?: string | bigint) => void;
  /** 异步写入函数，返回包含交易哈希的 Promise */
  writeAsync: (
    args?: readonly unknown[],
    value?: string | bigint
  ) => Promise<{ hash: string }>;
  /** 数据字段，对于写操作始终为 undefined */
  data: undefined;
  /** 错误信息，如果有的话 */
  error: Error | null;
  /** 是否发生错误 */
  isError: boolean;
  /** 是否处于空闲状态 */
  isIdle: boolean;
  /** 是否正在发送交易到区块链网络 */
  isPending: boolean;
  /** 交易是否已成功发送到区块链（获得了交易哈希） */
  isSuccess: boolean;
  /** 重置状态的函数 */
  reset: () => void;
  /** 当前状态 */
  status: "idle" | "pending" | "error" | "success";
  /** 交易哈希（交易发送成功后获得） */
  hash: `0x${string}` | undefined;
  /** 交易是否正在等待网络确认（已发送但未确认） */
  isConfirming: boolean;
  /** 交易是否已获得网络确认（最终成功状态） */
  isConfirmed: boolean;
  /** 交易执行是否成功（区分上链成功和执行成功） */
  isTransactionSuccessful: boolean;
  /** 交易是否因执行失败而回滚 */
  isReverted: boolean;
  /** 确认次数（默认值） */
  confirmationCount: number;
  /** 确认数量（默认值） */
  confirmations: number;
  /** 交易收据（包含执行状态信息） */
  receipt: unknown;
}

/**
 * 完整功能的合约写入 Hook
 * 提供完整的合约写入功能，包括交易状态跟踪、确认等待等
 *
 * @param options 写入操作的配置选项
 * @returns 完整的写入操作结果
 *
 * @example
 * ```typescript
 * const { write, isPending, isConfirmed, isTransactionSuccessful } = useContractWrite({
 *   functionName: 'transfer',
 *   args: [recipientAddress, amount],
 *   onSuccess: (hash) => console.log('交易已发送，等待确认:', hash),
 *   onError: (error) => console.error('交易发送失败:', error)
 * });
 *
 * // 完整的交易状态监听
 * if (isPending) console.log('🔄 正在发送交易...');
 * if (isSuccess) console.log('📤 交易已发送，哈希:', hash);
 * if (isConfirming) console.log('⏳ 交易确认中...');
 * if (isConfirmed && isTransactionSuccessful) console.log('✅ 交易执行成功！');
 * if (isConfirmed && isReverted) console.log('❌ 交易已上链但执行失败（回滚）');
 *
 * // 同步调用
 * write();
 *
 * // 异步调用
 * const result = await writeAsync();
 * ```
 */
export function useContractWrite(
  options: UseContractWriteOptions
): UseContractWriteResult {
  const {
    functionName,
    args = [],
    value,
    onSuccess,
    onError,
    skipLogging = false,
  } = options;

  const wagmiResult = useWriteContract({
    mutation: {
      onSuccess: (data) => {
        if (!skipLogging) {
          console.log(`=== 交易已发送: ${functionName} ===`);
          console.log("交易哈希:", data);
          console.log("函数参数:", args);
          console.log("发送金额:", value);
          console.log("状态: 等待网络确认...");
          console.log("================================");
        }
        onSuccess?.(data);
      },
      onError: (error) => {
        if (!skipLogging) {
          console.error(`=== 交易发送失败: ${functionName} ===`);
          console.error("错误信息:", error);
          console.error("函数参数:", args);
          console.error("发送金额:", value);
          console.error("================================");
        }
        onError?.(error);
      },
    },
  });

  const {
    data: hash,
    writeContract,
    writeContractAsync,
    error,
    isError,
    isIdle,
    isPending,
    isSuccess,
    reset,
    status,
  } = wagmiResult;

  const receiptData = useWaitForTransactionReceipt({
    hash: hash as `0x${string}` | undefined,
  });

  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess: isConfirmed,
  } = receiptData;

  // 判断交易执行状态 - 区分上链成功和执行成功
  const receiptWithStatus = receipt as { status: number } | undefined;
  const isTransactionSuccessful = Boolean(
    isConfirmed && receiptWithStatus && receiptWithStatus.status === 1
  );
  const isReverted = Boolean(
    isConfirmed && receiptWithStatus && receiptWithStatus.status === 0
  );

  return {
    write: (
      overrideArgs?: readonly unknown[],
      overrideValue?: string | bigint
    ) => {
      writeContract({
        abi: contract.abi,
        address: contract.address as `0x${string}`,
        functionName,
        args: overrideArgs || args,
        value: parseValue(overrideValue || value),
      });
    },
    writeAsync: async (
      overrideArgs?: readonly unknown[],
      overrideValue?: string | bigint
    ) => {
      const result = await writeContractAsync({
        abi: contract.abi,
        address: contract.address as `0x${string}`,
        functionName,
        args: overrideArgs || args,
        value: parseValue(overrideValue || value),
      });
      return { hash: result };
    },
    data: undefined,
    error,
    isError,
    isIdle,
    isPending,
    isSuccess,
    reset,
    status,
    hash: hash as `0x${string}` | undefined,
    isConfirming,
    isConfirmed,
    isTransactionSuccessful,
    isReverted,
    confirmationCount: 0, // Default value since property doesn't exist
    confirmations: 0, // Default value since property doesn't exist
    receipt,
  };
}

/**
 * 简化版本的合约写入 Hook（默认跳过日志）
 *
 * @param functionName 合约函数名称
 * @param options 可选配置
 * @returns 简化的写入操作结果
 *
 * @example
 * ```typescript
 * const { write, isPending, isTransactionSuccessful } = useContractDataWrite('approve', {
 *   args: [spenderAddress, amount]
 * });
 * ```
 */
export function useContractDataWrite(
  functionName: string,
  options: {
    args?: readonly unknown[];
    value?: string | bigint;
    onSuccess?: (hash: string) => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const { args = [], value, onSuccess, onError } = options;

  const {
    write,
    writeAsync,
    error,
    isError,
    isPending,
    isSuccess,
    hash,
    isConfirming,
    isConfirmed,
    isTransactionSuccessful,
    isReverted,
    receipt,
  } = useContractWrite({
    functionName,
    args,
    value,
    onSuccess,
    onError,
    skipLogging: true, // 简化版本默认跳过日志
  });

  return {
    write,
    writeAsync,
    error,
    isError,
    isPending,
    isSuccess,
    hash,
    isConfirming,
    isConfirmed,
    isTransactionSuccessful,
    isReverted,
    receipt,
  };
}

/**
 * 创建特定函数的写合约 Hook 工厂函数
 *
 * @param functionName 合约函数名称
 * @returns 返回一个专用的 Hook 函数
 *
 * @example
 * ```typescript
 * const useTransfer = createContractWriteHook('transfer');
 * const { write, isPending, isTransactionSuccessful } = useTransfer({
 *   args: [recipientAddress, amount]
 * });
 * ```
 */
export function createContractWriteHook(functionName: string) {
  return (
    options: {
      args?: readonly unknown[];
      value?: string | bigint;
      onSuccess?: (hash: string) => void;
      onError?: (error: Error) => void;
    } = {}
  ) => {
    return useContractDataWrite(functionName, options);
  };
}
