/**
 * useSmartWithdraw Hook 使用示例
 *
 * 展示如何使用智能提取 Hook
 */

import { useSmartWithdraw } from "@/hooks/useSmartWithdraw";
import { parseUnits } from "viem";

export function WithdrawExample() {
  const {
    isProcessing,
    isRequesting,
    isWithdrawing,
    smartWithdraw,
    checkWithdrawStatus,
  } = useSmartWithdraw();

  // 示例1: 完全自动的智能提取
  const handleSmartWithdraw = async () => {
    try {
      await smartWithdraw(
        {
          poolId: 0,
          amount: parseUnits("100", 18), // 100 代币
        },
        {
          // 申请解质押回调
          onRequestStart: () => {
            console.log("开始申请解质押...");
          },
          onRequestSuccess: (hash) => {
            console.log("申请成功，交易哈希:", hash);
          },
          onRequestError: (error) => {
            console.error("申请失败:", error.message);
          },

          // 执行提取回调
          onWithdrawStart: () => {
            console.log("开始执行提取...");
          },
          onWithdrawSuccess: (hash) => {
            console.log("提取成功，交易哈希:", hash);
          },
          onWithdrawError: (error) => {
            console.error("提取失败:", error.message);
          },

          // 冷却期回调
          onCooldownRemaining: (blocks, time) => {
            console.log(`还需等待 ${time}（${blocks} 个区块）`);
            // 可以在UI上显示倒计时
          },
        }
      );
    } catch (error) {
      console.error("操作失败:", error);
    }
  };

  // 示例2: 手动检查状态
  const handleCheckStatus = async () => {
    try {
      const status = await checkWithdrawStatus(0);

      console.log("提取状态:", {
        hasRequest: status.hasRequest ? "已申请" : "未申请",
        canWithdraw: status.canWithdraw ? "可提取" : "不可提取",
        isInCooldown: status.isInCooldown ? "冷却中" : "非冷却期",
        executableCount: status.executableRequests.length,
        estimatedTime: status.estimatedTime || "无",
      });

      if (status.isInCooldown) {
        alert(`还需等待 ${status.estimatedTime} 才能提取`);
      } else if (status.canWithdraw) {
        alert("可以提取了！");
      } else {
        alert("还没有解质押请求");
      }
    } catch (error) {
      console.error("检查失败:", error);
    }
  };

  return (
    <div>
      <h2>智能提取示例</h2>

      <button onClick={handleSmartWithdraw} disabled={isProcessing}>
        {isRequesting && "申请解质押中..."}
        {isWithdrawing && "提取中..."}
        {!isProcessing && "智能提取"}
      </button>

      <button onClick={handleCheckStatus} disabled={isProcessing}>
        检查状态
      </button>

      {isProcessing && (
        <div style={{ marginTop: "10px", color: "orange" }}>
          处理中，请稍候...
        </div>
      )}
    </div>
  );
}

// ============= 工作流程说明 =============

/**
 * 智能提取的工作流程：
 *
 * 场景1: 首次提取（未申请解质押）
 * ----------------------------------------
 * 1. 用户点击"智能提取"按钮
 * 2. Hook 检测到没有解质押请求
 * 3. 自动执行申请解质押
 * 4. 触发 onRequestSuccess 回调
 * 5. 触发 onCooldownRemaining 回调，告知需要等待的时间
 * 6. 用户需要等待冷却期结束
 *
 * 场景2: 冷却期中再次点击
 * ----------------------------------------
 * 1. 用户点击"智能提取"按钮
 * 2. Hook 检测到有解质押请求但仍在冷却期
 * 3. 抛出错误："还需等待约 X 时间"
 * 4. 触发 onCooldownRemaining 回调
 * 5. 不执行任何链上操作
 *
 * 场景3: 冷却期结束后点击
 * ----------------------------------------
 * 1. 用户点击"智能提取"按钮
 * 2. Hook 检测到有可执行的解质押请求
 * 3. 自动执行提取操作
 * 4. 触发 onWithdrawSuccess 回调
 * 5. 代币和奖励转入用户钱包
 *
 * 优化点：
 * ----------------------------------------
 * ✅ 自动判断当前状态，用户无需关心流程细节
 * ✅ 准确计算剩余时间（基于区块数）
 * ✅ 完整的回调系统，方便 UI 展示
 * ✅ 详细的日志输出，便于调试
 * ✅ 同时提供手动方法，满足高级需求
 * ✅ 支持批量提取（如果有多个可执行请求）
 */
