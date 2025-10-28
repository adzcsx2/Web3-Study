/**
 * 智能提取 Hook
 *
 * 自动处理解质押的完整流程：
 * 1. 检查是否已申请解质押
 * 2. 如果未申请，执行申请解质押
 * 3. 如果已申请，检查冷却期
 * 4. 冷却期已结束则执行最终提取
 *
 * @author Hoyn
 * @version 1.0.0
 * @lastModified 2025-10-29
 */

import { useState, useCallback } from "react";
import { usePublicClient } from "wagmi";
import { multiStakeViemContract } from "@/services/MultiStakeViemService";
import { useWagmiWalletClient } from "./useWalletClient";
import type { UnstakeRequest } from "@/types/StakePledgeContractStructs";

interface WithdrawParams {
  poolId: number;
  amount: bigint; // 要解质押的数量
}

interface WithdrawCallbacks {
  // 申请解质押相关
  onRequestStart?: () => void;
  onRequestSuccess?: (hash: string) => void;
  onRequestError?: (error: Error) => void;

  // 执行提取相关
  onWithdrawStart?: () => void;
  onWithdrawSuccess?: (hash: string) => void;
  onWithdrawError?: (error: Error) => void;

  // 冷却期相关
  onCooldownRemaining?: (
    remainingBlocks: bigint,
    estimatedTime: string
  ) => void;
}

interface WithdrawStatus {
  hasRequest: boolean;
  isInCooldown: boolean;
  canWithdraw: boolean;
  pendingRequests: UnstakeRequest[];
  executableRequests: UnstakeRequest[];
  remainingBlocks?: bigint;
  estimatedTime?: string;
}

interface UseSmartWithdrawReturn {
  /** 是否正在处理中 */
  isProcessing: boolean;
  /** 是否正在申请解质押 */
  isRequesting: boolean;
  /** 是否正在执行提取 */
  isWithdrawing: boolean;
  /** 智能提取：自动判断并执行相应步骤 */
  smartWithdraw: (
    params: WithdrawParams,
    callbacks?: WithdrawCallbacks
  ) => Promise<void>;
  /** 检查提取状态 */
  checkWithdrawStatus: (poolId: number) => Promise<WithdrawStatus>;
  /** 手动申请解质押 */
  requestUnstake: (
    params: WithdrawParams,
    callbacks?: WithdrawCallbacks
  ) => Promise<void>;
  /** 手动执行提取（需要已过冷却期） */
  executeWithdraw: (
    poolId: number,
    callbacks?: WithdrawCallbacks
  ) => Promise<void>;
}

/**
 * 智能提取 Hook
 */
export function useSmartWithdraw(): UseSmartWithdrawReturn {
  const [isRequesting, setIsRequesting] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const wallet = useWagmiWalletClient();
  const publicClient = usePublicClient({ chainId: 11155111 });

  const isProcessing = isRequesting || isWithdrawing;

  /**
   * 计算剩余时间（估算）
   * Sepolia 平均出块时间约 12 秒
   */
  const calculateEstimatedTime = useCallback(
    (remainingBlocks: bigint): string => {
      const blocks = Number(remainingBlocks);
      const seconds = blocks * 12; // Sepolia 平均 12 秒一个块

      if (seconds < 60) {
        return `${seconds}秒`;
      } else if (seconds < 3600) {
        const minutes = Math.ceil(seconds / 60);
        return `${minutes}分钟`;
      } else if (seconds < 86400) {
        const hours = Math.ceil(seconds / 3600);
        return `${hours}小时`;
      } else {
        const days = Math.ceil(seconds / 86400);
        return `${days}天`;
      }
    },
    []
  );

  /**
   * 检查提取状态
   */
  const checkWithdrawStatus = useCallback(
    async (poolId: number): Promise<WithdrawStatus> => {
      if (!wallet.address) {
        throw new Error("钱包未连接");
      }

      // 获取用户在该池子的信息
      const userPoolInfo = await multiStakeViemContract.getUserPoolInfo(
        poolId,
        wallet.address,
        true // 强制刷新
      );

      // 获取当前区块号
      const currentBlock = await publicClient?.getBlockNumber();
      if (!currentBlock) {
        throw new Error("无法获取当前区块号");
      }

      // 获取解质押请求列表
      const unstakeRequests = userPoolInfo.pendingUnstakeRequests || [];

      // 检查是否有解质押请求
      const hasRequest = unstakeRequests.length > 0;

      // 分类请求：可执行的和仍在冷却期的
      const executableRequests = unstakeRequests.filter(
        (req) => req.unlockBlock <= currentBlock
      );
      const cooldownRequests = unstakeRequests.filter(
        (req) => req.unlockBlock > currentBlock
      );

      const canWithdraw = executableRequests.length > 0;
      const isInCooldown = cooldownRequests.length > 0 && !canWithdraw;

      // 计算最近的解锁时间
      let remainingBlocks: bigint | undefined;
      let estimatedTime: string | undefined;

      if (cooldownRequests.length > 0) {
        const nearestUnlock = cooldownRequests.reduce((min, req) =>
          req.unlockBlock < min.unlockBlock ? req : min
        );
        remainingBlocks = nearestUnlock.unlockBlock - currentBlock;
        estimatedTime = calculateEstimatedTime(remainingBlocks);
      }

      return {
        hasRequest,
        isInCooldown,
        canWithdraw,
        pendingRequests: unstakeRequests,
        executableRequests,
        remainingBlocks,
        estimatedTime,
      };
    },
    [wallet.address, publicClient, calculateEstimatedTime]
  );

  /**
   * 申请解质押
   */
  const requestUnstake = useCallback(
    async (
      params: WithdrawParams,
      callbacks?: WithdrawCallbacks
    ): Promise<void> => {
      if (!wallet.data || !wallet.address) {
        throw new Error("钱包未连接");
      }

      const { poolId, amount } = params;
      setIsRequesting(true);

      try {
        callbacks?.onRequestStart?.();
        console.log(`🔄 开始申请解质押: Pool ${poolId}, 数量: ${amount}`);

        // 🔍 检查是否已有待处理的解质押请求
        const userPoolInfo = await multiStakeViemContract.getUserPoolInfo(
          poolId,
          wallet.address,
          true // 强制刷新
        );

        const pendingRequests = userPoolInfo.pendingUnstakeRequests || [];

        if (pendingRequests.length > 0) {
          const currentBlock = await publicClient?.getBlockNumber();
          const inCooldownRequests = pendingRequests.filter(
            (req) => currentBlock && req.unlockBlock > currentBlock
          );

          if (inCooldownRequests.length > 0) {
            const nearestUnlock = inCooldownRequests.reduce((min, req) =>
              req.unlockBlock < min.unlockBlock ? req : min
            );
            const remainingBlocks = currentBlock
              ? nearestUnlock.unlockBlock - currentBlock
              : 0n;
            const estimatedTime = calculateEstimatedTime(remainingBlocks);

            throw new Error(
              `⚠️ 您已有 ${pendingRequests.length} 个待处理的解质押请求，请等待冷却期结束后先完成提取。\n` +
                `预计还需等待约 ${estimatedTime}（${remainingBlocks} 个区块）`
            );
          }

          // 如果有可执行的请求，提示用户先完成提取
          throw new Error(
            `⚠️ 您有 ${pendingRequests.length} 个解质押请求已完成冷却期，请先执行提取操作后再申请新的解质押。`
          );
        }

        const result = await multiStakeViemContract.requestUnstakeFromPool(
          poolId,
          amount,
          {
            account: wallet.data.account,
            walletClient: wallet.data,
            estimateGas: true,
          }
        );

        if (result.isSuccess && result.hash) {
          console.log("✅ 申请解质押成功:", result.hash);
          callbacks?.onRequestSuccess?.(result.hash);
        } else {
          throw new Error(result.error?.message || "申请解质押失败");
        }
      } catch (error) {
        const err =
          error instanceof Error ? error : new Error("申请解质押失败");

        // 检查是否是用户拒绝，如果是则静默处理
        const isUserRejection =
          err.message.includes("User rejected") ||
          err.message.includes("User denied");

        if (!isUserRejection) {
          console.error("❌ 申请解质押失败:", err);
        }

        callbacks?.onRequestError?.(err);
        throw err;
      } finally {
        setIsRequesting(false);
      }
    },
    [wallet.data, wallet.address, publicClient, calculateEstimatedTime]
  );

  /**
   * 执行提取
   */
  const executeWithdraw = useCallback(
    async (poolId: number, callbacks?: WithdrawCallbacks): Promise<void> => {
      if (!wallet.data || !wallet.address) {
        throw new Error("钱包未连接");
      }

      setIsWithdrawing(true);

      try {
        callbacks?.onWithdrawStart?.();
        console.log(`🔄 开始执行提取: Pool ${poolId}`);

        // 获取用户池子信息（此时应该已经通过 smartWithdraw 的检查）
        const userPoolInfo = await multiStakeViemContract.getUserPoolInfo(
          poolId,
          wallet.address,
          true
        );

        // 获取所有可执行的解质押请求
        const executableRequests =
          await multiStakeViemContract.getExecutableUnstakeRequests(
            poolId,
            wallet.address
          );

        if (executableRequests.length === 0) {
          throw new Error("没有可执行的解质押请求");
        }

        // 二次检查质押余额（防御性编程）
        if (userPoolInfo.stakedBalance === BigInt(0)) {
          throw new Error(
            "❌ 检测到质押余额为 0，可能已经完成提取。\n请刷新页面查看最新状态。"
          );
        }

        // 计算总请求金额
        const totalRequestAmount = executableRequests.reduce(
          (sum, req) => sum + req.amount,
          BigInt(0)
        );

        // 使用实际质押余额和请求金额中的较小值
        const withdrawAmount =
          totalRequestAmount <= userPoolInfo.stakedBalance
            ? totalRequestAmount
            : userPoolInfo.stakedBalance;

        console.log(
          `📊 准备提取: ${executableRequests.length} 个请求，请求总金额: ${totalRequestAmount}，实际余额: ${userPoolInfo.stakedBalance}，提取金额: ${withdrawAmount}`
        );

        // 最后一道防线：确保提取金额不为 0
        if (withdrawAmount === BigInt(0)) {
          throw new Error(
            "❌ 提取金额为 0，无法执行提取操作。\n" +
              "请联系技术支持或刷新页面查看最新状态。"
          );
        }

        const result = await multiStakeViemContract.unstakeFromPool(
          poolId,
          withdrawAmount,
          {
            account: wallet.data.account,
            walletClient: wallet.data,
            estimateGas: true,
          }
        );

        if (result.isSuccess && result.hash) {
          console.log("✅ 提取成功:", result.hash);
          callbacks?.onWithdrawSuccess?.(result.hash);
        } else {
          throw new Error(result.error?.message || "提取失败");
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error("提取失败");

        // 检查是否是用户拒绝，如果是则静默处理
        const isUserRejection =
          err.message.includes("User rejected") ||
          err.message.includes("User denied");

        if (!isUserRejection) {
          console.error("❌ 提取失败:", err);
        }

        callbacks?.onWithdrawError?.(err);
        throw err;
      } finally {
        setIsWithdrawing(false);
      }
    },
    [wallet.data, wallet.address]
  );

  /**
   * 智能提取：自动判断并执行相应步骤
   */
  const smartWithdraw = useCallback(
    async (
      params: WithdrawParams,
      callbacks?: WithdrawCallbacks
    ): Promise<void> => {
      if (!wallet.address) {
        throw new Error("请先连接钱包");
      }

      const { poolId } = params;

      try {
        // 步骤0: 先检查用户是否有质押余额（强制刷新）
        console.log("🔍 步骤0: 检查用户质押余额...");
        const userPoolInfo = await multiStakeViemContract.getUserPoolInfo(
          poolId,
          wallet.address,
          true // 强制刷新缓存
        );

        if (userPoolInfo.stakedBalance === BigInt(0)) {
          throw new Error(
            "❌ 您当前没有质押余额，无法进行解质押操作。\n\n" +
              "可能的原因：\n" +
              "• 已经完成了提取，资金已到账\n" +
              "• 从未在此池子质押过\n" +
              "• 页面数据未及时更新\n\n" +
              "💡 请刷新页面查看最新余额。"
          );
        }

        console.log(
          `✅ 当前质押余额: ${userPoolInfo.stakedBalance}，可以继续操作`
        );

        // 步骤1: 检查当前状态
        console.log("🔍 步骤1: 检查提取状态...");
        const status = await checkWithdrawStatus(poolId);

        // 步骤2: 如果没有申请，执行申请
        if (!status.hasRequest) {
          console.log("📝 步骤2: 未发现解质押请求，开始申请...");
          await requestUnstake(params, callbacks);

          // 申请成功后，告知用户需要等待
          const cooldownInfo = await checkWithdrawStatus(poolId);
          if (cooldownInfo.remainingBlocks && cooldownInfo.estimatedTime) {
            callbacks?.onCooldownRemaining?.(
              cooldownInfo.remainingBlocks,
              cooldownInfo.estimatedTime
            );
            console.log(
              `⏳ 申请成功！需要等待约 ${cooldownInfo.estimatedTime}（${cooldownInfo.remainingBlocks} 个区块）后才能提取`
            );
          }
          return;
        }

        // 步骤3: 如果有申请但仍在冷却期
        if (status.isInCooldown && !status.canWithdraw) {
          const message = `❄️ 提取失败：仍在冷却期，还需等待约 ${status.estimatedTime}（${status.remainingBlocks} 个区块）`;
          console.warn(message);
          callbacks?.onCooldownRemaining?.(
            status.remainingBlocks!,
            status.estimatedTime!
          );
          throw new Error(message);
        }

        // 步骤4: 冷却期已结束，执行提取
        if (status.canWithdraw) {
          console.log(
            `✅ 步骤4: 冷却期已结束，开始提取... (${status.executableRequests.length} 个可执行请求)`
          );
          await executeWithdraw(poolId, callbacks);
          console.log("🎉 提取完成！");
          return;
        }

        // 理论上不应该到达这里
        throw new Error("未知状态");
      } catch (error) {
        // 检查是否是用户拒绝，如果是则静默处理
        if (error instanceof Error) {
          const isUserRejection =
            error.message.includes("User rejected") ||
            error.message.includes("User denied");

          if (!isUserRejection) {
            console.error("❌ 智能提取失败:", error);
          }
        } else {
          console.error("❌ 智能提取失败:", error);
        }
        throw error;
      }
    },
    [wallet.address, checkWithdrawStatus, requestUnstake, executeWithdraw]
  );

  return {
    isProcessing,
    isRequesting,
    isWithdrawing,
    smartWithdraw,
    checkWithdrawStatus,
    requestUnstake,
    executeWithdraw,
  };
}
