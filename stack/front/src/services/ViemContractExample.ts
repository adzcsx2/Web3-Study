/**
 * 基于 Viem 版本的合约服务示例
 *
 * 展示如何使用新的 viemContractUtils.ts
 *
 * @example
 * ```typescript
 * import contract from "@/app/abi/MultiStakePledgeContract.json";
 * import { createViemContractWrapper } from "@/utils/viemContractUtils";
 *
 * // 创建合约包装器
 * const multiStakeContract = createViemContractWrapper({
 *   contractAddress: "0x123...",
 *   contractAbi: contract.abi,
 *   contractName: "MultiStakePledge"
 * });
 *
 * // 读取数据
 * const poolCount = await multiStakeContract.read<bigint>('poolCount');
 *
 * // 写入数据（需要 account）
 * const result = await multiStakeContract.executeWrite('stake', [poolId], {
 *   account: userAccount,
 *   value: parseViemEther('1.0'),
 *   estimateGas: true
 * });
 *
 * // 带状态跟踪的写入
 * await multiStakeContract.executeWriteWithStatus('stake', [poolId], {
 *   account: userAccount,
 *   value: parseViemEther('1.0'),
 *   onPending: () => console.log('🔄 交易发送中...'),
 *   onSent: (hash) => console.log('📤 交易已发送:', hash),
 *   onSuccess: (receipt) => console.log('✅ 交易成功！'),
 *   onError: (error) => console.error('💥 交易失败:', error)
 * });
 * ```
 */

import {
  createViemContractWrapper,
  parseViemEther,
  formatViemEther,
} from "@/utils/viemContractUtils";
import type { Account, Address, Abi } from "viem";

/**
 * 简化的 Viem 合约服务示例类
 */
export class SimpleViemContractExample {
  /**
   * 使用 Viem 工具进行基本合约交互示例
   */
  static async example(
    contractAddress: Address,
    contractAbi: Abi,
    userAccount: Account
  ) {
    // 创建合约包装器
    const contract = createViemContractWrapper({
      contractAddress,
      contractAbi,
      contractName: "ExampleContract",
    });

    try {
      // 1. 读取操作示例
      console.log("=== 读取操作示例 ===");

      // 读取单个值
      const result1 = await contract.read<bigint>("someFunction");
      console.log("读取结果:", result1);

      // 读取带参数的函数
      const result2 = await contract.read<string>("getName", [123]);
      console.log("名称:", result2);

      // 批量读取
      const batchResults = await contract.batchRead([
        { functionName: "function1", args: [] },
        { functionName: "function2", args: [456] },
      ]);
      console.log("批量结果:", batchResults);

      // 2. 写入操作示例
      console.log("=== 写入操作示例 ===");

      // 基本写入
      const writeResult1 = await contract.executeWrite(
        "setName",
        ["New Name"],
        {
          account: userAccount,
          estimateGas: true,
        }
      );
      console.log("写入结果:", writeResult1.hash);

      // 带 ETH 发送的写入
      const writeResult2 = await contract.executeWrite("deposit", [], {
        account: userAccount,
        value: parseViemEther("0.1"), // 发送 0.1 ETH
        estimateGas: true,
      });
      console.log("存款结果:", writeResult2.hash);

      // 3. 带状态跟踪的写入
      console.log("=== 状态跟踪写入示例 ===");

      await contract.executeWriteWithStatus(
        "complexFunction",
        [123, "parameter"],
        {
          account: userAccount,
          estimateGas: true,
          onPending: () => console.log("🔄 交易准备中..."),
          onSent: (hash) => console.log("📤 交易已发送:", hash),
          onConfirming: () => console.log("⏳ 等待确认..."),
          onSuccess: (receipt) => {
            console.log("✅ 交易成功！");
            console.log("Gas 使用量:", receipt.gasUsed);
          },
          onError: (error) => console.error("💥 交易失败:", error),
        }
      );

      // 4. Gas 估算示例
      console.log("=== Gas 估算示例 ===");

      const gasEstimate = await contract.estimateGas(
        "expensiveFunction",
        [789],
        {
          value: parseViemEther("1.0"),
        }
      );
      console.log("Gas 估算:", {
        gasLimit: gasEstimate.gasLimit.toString(),
        estimatedCost: gasEstimate.estimatedCost + " ETH",
      });

      // 5. 事件监听示例
      console.log("=== 事件监听示例 ===");

      const unwatch = contract.addEventListener(
        "SomeEvent",
        (logs) => {
          console.log("接收到事件:", logs.length);
          logs.forEach((log) => {
            console.log("事件数据:", log);
          });
        },
        { user: userAccount.address } // 事件过滤器
      );

      // 监听一段时间后取消
      setTimeout(() => {
        unwatch();
        console.log("🔇 已停止事件监听");
      }, 30000); // 30秒后停止

      return {
        success: true,
        contractAddress: contract.address,
        contractName: contract.name,
      };
    } catch (error) {
      console.error("合约交互失败:", error);
      throw error;
    }
  }

  /**
   * 工具函数示例
   */
  static formatters() {
    // Wei <-> ETH 转换
    const wei = parseViemEther("1.5");
    const eth = formatViemEther(wei);
    console.log(`${eth} ETH = ${wei} Wei`);

    // 大数值处理
    const bigNumber = 1234567890123456789n;
    const formatted = formatViemEther(bigNumber);
    console.log(`格式化结果: ${formatted} ETH`);

    return { wei, eth, formatted };
  }
}

export default SimpleViemContractExample;
