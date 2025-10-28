/**
 * Token 授权和质押 Hook
 *
 * 封装 ERC20 代币授权和质押的完整流程
 *
 * @author Hoyn
 * @version 1.0.0
 * @lastModified 2025-10-28
 */

import { useState, useCallback } from "react";
import { usePublicClient, useWriteContract } from "wagmi";
import { sepolia } from "wagmi/chains";
import { multiStakeViemContract } from "@/services/MultiStakeViemService";
import { useWagmiWalletClient } from "./useWalletClient";

// ERC20 approve 函数的 ABI
const ERC20_ABI = [
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

interface StakeParams {
  poolId: number;
  tokenAddress: `0x${string}`;
  stakeAmount: bigint; // 具体的区块链数量
  contractAddress: `0x${string}`;
}

interface StakeCallbacks {
  onApprovalStart?: () => void;
  onApprovalSuccess?: (hash: string) => void;
  onApprovalError?: (error: Error) => void;
  onStakeStart?: () => void;
  onStakeSuccess?: (hash: string) => void;
  onStakeError?: (error: Error) => void;
  onRequestUnstakeStart?: () => void;
  onRequestUnstakeSuccess?: (hash: string) => void;
  onRequestUnstakeError?: (error: Error) => void;
  onUnstakeStart?: () => void;
  onUnstakeSuccess?: (hash: string) => void;
  onUnstakeError?: (error: Error) => void;
}

interface UseTokenStakeReturn {
  /** 是否正在处理中（授权或质押） */
  isProcessing: boolean;
  /** 是否正在授权 */
  isApproving: boolean;
  /** 是否正在质押 */
  isStaking: boolean;
  /** 是否正在请求解质押 */
  isRequestingUnstake: boolean;
  /** 是否正在执行解质押 */
  isUnstaking: boolean;
  /** 执行授权和质押 */
  executeStake: (
    params: StakeParams,
    callbacks?: StakeCallbacks
  ) => Promise<void>;
  /** 请求解质押（第一步） */
  executeRequestUnstake: (
    params: StakeParams,
    callbacks?: StakeCallbacks
  ) => Promise<void>;
  /** 执行解质押（第二步，需等待冷却期） */
  executeUnstake: (
    params: Omit<
      StakeParams,
      "stakeAmount" | "tokenAddress" | "contractAddress"
    >,
    callbacks?: StakeCallbacks
  ) => Promise<void>;
  /** 检查授权额度 */
  checkAllowance: (
    tokenAddress: `0x${string}`,
    spenderAddress: `0x${string}`
  ) => Promise<bigint>;
}

/**
 * Token 授权和质押 Hook
 *
 * @example
 * ```tsx
 * function StakeComponent() {
 *   const { executeStake, isProcessing } = useTokenStake();
 *
 *   const handleStake = async () => {
 *     await executeStake(
 *       {
 *         poolId: 0,
 *         tokenAddress: "0x...",
 *         stakeAmount: "1.5",
 *         contractAddress: "0x..."
 *       },
 *       {
 *         onApprovalStart: () => console.log("开始授权..."),
 *         onApprovalSuccess: (hash) => console.log("授权成功:", hash),
 *         onStakeSuccess: (hash) => console.log("质押成功:", hash),
 *       }
 *     );
 *   };
 *
 *   return (
 *     <button onClick={handleStake} disabled={isProcessing}>
 *       {isProcessing ? "处理中..." : "质押"}
 *     </button>
 *   );
 * }
 * ```
 */
export function useStakeContract(): UseTokenStakeReturn {
  const [isApproving, setIsApproving] = useState(false);
  const [isStaking, setIsStaking] = useState(false);
  const [isRequestingUnstake, setIsRequestingUnstake] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const wallet = useWagmiWalletClient();
  const publicClient = usePublicClient({ chainId: 11155111 });
  const { writeContractAsync } = useWriteContract();

  const isProcessing =
    isApproving || isStaking || isRequestingUnstake || isUnstaking;

  /**
   * 检查当前授权额度
   */
  const checkAllowance = useCallback(
    async (
      tokenAddress: `0x${string}`,
      spenderAddress: `0x${string}`
    ): Promise<bigint> => {
      if (!wallet.address || !publicClient) {
        throw new Error("钱包未连接或公共客户端未初始化");
      }

      const allowance = await publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [wallet.address as `0x${string}`, spenderAddress],
      });

      return allowance || 0n;
    },
    [wallet.address, publicClient]
  );

  /**
   * 执行授权操作
   */
  const approveToken = useCallback(
    async (
      tokenAddress: `0x${string}`,
      spenderAddress: `0x${string}`,
      amount: bigint,
      callbacks?: StakeCallbacks
    ): Promise<string> => {
      if (!wallet.address) {
        throw new Error("钱包未连接");
      }

      setIsApproving(true);
      callbacks?.onApprovalStart?.();

      try {
        // 授权精确数量
        const approveAmount = amount;
        const approveTx = await writeContractAsync({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [spenderAddress, approveAmount],
          chainId: sepolia.id,
        });

        console.log("✅ 授权交易哈希:", approveTx);
        callbacks?.onApprovalSuccess?.(approveTx);

        // 等待授权交易在区块链上确认
        if (publicClient) {
          console.log("⏳ 等待授权交易确认...");
          const receipt = await publicClient.waitForTransactionReceipt({
            hash: approveTx,
            confirmations: 1, // 等待1个区块确认
          });

          console.log("✅ 授权交易已确认，区块号:", receipt.blockNumber);

          // 验证授权是否成功
          const confirmedAllowance = await publicClient.readContract({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: "allowance",
            args: [wallet.address as `0x${string}`, spenderAddress],
          });
          console.log(
            "✅ 授权确认 - 新的授权额度:",
            confirmedAllowance?.toString()
          );

          if (!confirmedAllowance || confirmedAllowance < amount) {
            throw new Error(
              `授权失败：期望 ${amount.toString()}，实际 ${confirmedAllowance?.toString() || "0"}`
            );
          }
        }

        return approveTx;
      } catch (error) {
        const err = error instanceof Error ? error : new Error("授权失败");
        console.error("❌ 授权失败:", err);
        callbacks?.onApprovalError?.(err);
        throw err;
      } finally {
        setIsApproving(false);
      }
    },
    [wallet.address, writeContractAsync, publicClient]
  );

  /**
   * 执行质押操作
   */
  const stake = useCallback(
    async (
      poolId: number,
      amount: bigint,
      callbacks?: StakeCallbacks
    ): Promise<void> => {
      if (!wallet.data || !wallet.address) {
        throw new Error("钱包未连接");
      }

      setIsStaking(true);
      callbacks?.onStakeStart?.();

      try {
        const result = await multiStakeViemContract.stakeInPool(
          poolId,
          amount,
          {
            account: wallet.data.account,
            walletClient: wallet.data,
            estimateGas: true,
          }
        );

        console.log("✅ 质押结果:", result);

        if (result.isSuccess && result.hash) {
          callbacks?.onStakeSuccess?.(result.hash);
        } else {
          throw new Error(result.error?.message || "质押失败");
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error("质押失败");
        console.error("❌ 质押失败:", err);
        callbacks?.onStakeError?.(err);
        throw err;
      } finally {
        setIsStaking(false);
      }
    },
    [wallet.data, wallet.address]
  );

  /**
   * 执行完整的授权和质押流程
   */
  const executeStake = useCallback(
    async (params: StakeParams, callbacks?: StakeCallbacks): Promise<void> => {
      const { poolId, tokenAddress, stakeAmount, contractAddress } = params;

      if (!wallet.isConnected || !wallet.data || !wallet.address) {
        throw new Error("请先连接钱包");
      }

      // 在质押前验证池子状态
      const validation =
        await multiStakeViemContract.validatePoolForStaking(poolId);
      if (!validation.canStake) {
        throw new Error(validation.error || "池子状态验证失败");
      }

      // 转换质押数量
      console.log("📊 质押数量:", stakeAmount);

      //不检查额度直接申请授权
      await approveToken(tokenAddress, contractAddress, stakeAmount, callbacks);

      // 执行质押
      console.log("🔄 开始质押...");
      await stake(poolId, stakeAmount, callbacks);
    },
    [wallet.isConnected, wallet.data, wallet.address, approveToken, stake]
  );

  /**申请解质押（第一步）*/
  const requestUnstake = useCallback(
    async (
      poolId: number,
      amount: bigint,
      callbacks?: StakeCallbacks
    ): Promise<void> => {
      if (!wallet.data || !wallet.address) {
        throw new Error("钱包未连接");
      }
      setIsRequestingUnstake(true);
      try {
        // 🔍 检查是否已有待处理的解质押请求
        const userPoolInfo = await multiStakeViemContract.getUserPoolInfo(
          poolId,
          wallet.address,
          true // 强制刷新
        );

        const pendingRequests = userPoolInfo.pendingUnstakeRequests || [];

        if (pendingRequests.length > 0) {
          throw new Error(
            `⚠️ 您已有 ${pendingRequests.length} 个待处理的解质押请求，请先完成提取后再申请新的解质押。`
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

        console.log("✅ 申请解质押结果:", result);

        if (result.isSuccess && result.hash) {
          callbacks?.onRequestUnstakeSuccess?.(result.hash);
        } else {
          throw new Error(result.error?.message || "申请解质押失败");
        }
      } catch (error) {
        const err =
          error instanceof Error ? error : new Error("申请解质押失败");
        console.error("❌ 申请解质押失败:", err);
        callbacks?.onRequestUnstakeError?.(err);
        throw err;
      } finally {
        setIsRequestingUnstake(false);
      }
    },
    [wallet.data, wallet.address]
  );

  /**执行解质押（第二步）*/
  const finalizeUnstake = useCallback(
    async (poolId: number, callbacks?: StakeCallbacks): Promise<void> => {
      if (!wallet.data || !wallet.address) {
        throw new Error("钱包未连接");
      }
      setIsUnstaking(true);
      try {
        // 获取用户池子信息
        const userPoolInfo = await multiStakeViemContract.getUserPoolInfo(
          poolId,
          wallet.address,
          true
        );

        // 检查用户是否还有质押余额
        if (userPoolInfo.stakedBalance === BigInt(0)) {
          throw new Error(
            "❌ 您当前没有质押余额，无法执行提取操作。请刷新页面查看最新状态。"
          );
        }

        // 获取所有可执行的解质押请求
        const executableRequests =
          await multiStakeViemContract.getExecutableUnstakeRequests(
            poolId,
            wallet.address
          );

        if (executableRequests.length === 0) {
          throw new Error("没有可执行的解质押请求");
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

        // 最后一道防线：确保提取金额不为 0
        if (withdrawAmount === BigInt(0)) {
          throw new Error("❌ 提取金额为 0，无法执行提取操作。");
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

        console.log("✅ 解质押结果:", result);

        if (result.isSuccess && result.hash) {
          callbacks?.onUnstakeSuccess?.(result.hash);
        } else {
          throw new Error(result.error?.message || "解质押失败");
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error("解质押失败");
        console.error("❌ 解质押失败:", err);
        callbacks?.onUnstakeError?.(err);
        throw err;
      } finally {
        setIsUnstaking(false);
      }
    },
    [wallet.data, wallet.address]
  );

  /**执行完整的申请解质押流程 */
  const executeRequestUnstake = useCallback(
    async (params: StakeParams, callbacks?: StakeCallbacks): Promise<void> => {
      const { poolId, stakeAmount } = params;

      if (!wallet.isConnected || !wallet.data || !wallet.address) {
        throw new Error("请先连接钱包");
      }

      // 在解质押前验证池子状态
      const validation =
        await multiStakeViemContract.validatePoolForUnstaking(poolId);
      if (!validation.canUnstake) {
        throw new Error(validation.error || "池子状态验证失败");
      }

      // 执行申请解质押
      console.log("🔄 开始申请解质押...");
      await requestUnstake(poolId, stakeAmount, callbacks);
    },
    [wallet.isConnected, wallet.data, wallet.address, requestUnstake]
  );

  /**执行完整的解质押流程（完成第二步）*/
  const executeUnstake = useCallback(
    async (
      params: Omit<
        StakeParams,
        "stakeAmount" | "tokenAddress" | "contractAddress"
      >,
      callbacks?: StakeCallbacks
    ): Promise<void> => {
      const { poolId } = params;

      if (!wallet.isConnected || !wallet.data || !wallet.address) {
        throw new Error("请先连接钱包");
      }

      // 验证该池子是否有可执行的解质押请求
      const executableRequests =
        await multiStakeViemContract.getExecutableUnstakeRequests(
          poolId,
          wallet.address
        );

      if (executableRequests.length === 0) {
        throw new Error("没有可执行的解质押请求或冷却期未结束");
      }

      // 执行解质押
      console.log("🔄 开始执行解质押...");
      await finalizeUnstake(poolId, callbacks);
    },
    [wallet.isConnected, wallet.data, wallet.address, finalizeUnstake]
  );

  return {
    isProcessing,
    isApproving,
    isStaking,
    isRequestingUnstake,
    isUnstaking,
    executeStake,
    executeRequestUnstake,
    executeUnstake,
    checkAllowance,
  };
}
