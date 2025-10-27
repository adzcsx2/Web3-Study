/**
 * RequestQueue 使用示例
 *
 * 展示正确和错误的使用方式
 */

import {
  readViemContract,
  getViemContractQueueStats,
} from "@/utils/viemContractUtils";
import { useRequestQueue } from "@/hooks/useRequestQueue";

// ==================== ✅ 推荐方式 ====================

/**
 * 示例 1: 直接使用 viemContractUtils（推荐）
 *
 * 所有合约调用自动进入全局队列，无需额外配置
 */
function Example1_RecommendedUsage() {
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    const loadBalance = async () => {
      try {
        // ✅ 自动进入全局队列（200ms 间隔 + 自动重试）
        const result = await readViemContract(
          "0x123...",
          contractAbi,
          "balanceOf",
          [userAddress]
        );
        setBalance(result);
      } catch (error) {
        console.error("Failed to load balance:", error);
      }
    };

    loadBalance();
  }, [userAddress]);

  return <div>Balance: {balance}</div>;
}

/**
 * 示例 2: 批量请求（使用全局队列）
 *
 * 所有请求共享全局队列，自动按 200ms 间隔执行
 */
function Example2_BatchRequests() {
  const [pools, setPools] = useState([]);

  useEffect(() => {
    const loadPools = async () => {
      try {
        // 第 1 个请求：获取池子总数
        const poolCount = await readViemContract(
          contractAddress,
          contractAbi,
          "poolCounter"
        );

        // 批量请求：获取所有池子信息
        const promises = [];
        for (let i = 0; i < poolCount; i++) {
          // 所有请求自动进入全局队列，按顺序执行
          promises.push(
            readViemContract(contractAddress, contractAbi, "getPoolInfo", [i])
          );
        }

        const poolData = await Promise.all(promises);
        setPools(poolData);
      } catch (error) {
        console.error("Failed to load pools:", error);
      }
    };

    loadPools();
  }, []);

  return (
    <div>
      {pools.map((pool, index) => (
        <div key={index}>{pool.name}</div>
      ))}
    </div>
  );
}

/**
 * 示例 3: 监控全局队列状态
 */
function Example3_MonitorQueue() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const queueStats = getViemContractQueueStats();
      setStats(queueStats);

      console.log("队列状态:", {
        pending: queueStats.pending,
        completed: queueStats.completed,
        failed: queueStats.failed,
        avgTime: queueStats.averageProcessTime,
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h3>队列统计</h3>
      {stats && (
        <>
          <p>待处理: {stats.pending}</p>
          <p>已完成: {stats.completed}</p>
          <p>失败: {stats.failed}</p>
          <p>平均耗时: {stats.averageProcessTime}ms</p>
        </>
      )}
    </div>
  );
}

// ==================== ⚠️ 不推荐方式（仅供参考） ====================

/**
 * 反例 1: 使用 useRequestQueue（不推荐用于合约调用）
 *
 * 问题：每个组件创建独立队列，失去全局频率控制
 */
function AntiPattern1_UseHook() {
  // ⚠️ 创建独立队列（与全局队列隔离）
  const queue = useRequestQueue(200);

  const loadData = async () => {
    try {
      // ❌ 这个请求在独立队列中，与其他组件不共享频率控制
      const result = await queue.add(async () => {
        return await readViemContract(
          contractAddress,
          contractAbi,
          "balanceOf",
          [userAddress]
        );
      });
    } catch (error) {
      console.error("Error:", error);
    }
  };

  // 问题：如果页面有 10 个这样的组件，会创建 10 个队列
  // 每个队列独立运行，可能同时发送请求，仍然触发 429 错误！
}

/**
 * 反例 2: 多个组件使用独立队列
 *
 * 问题：无法实现全局频率控制
 */
function AntiPattern2_MultipleComponents() {
  // 组件 A
  function ComponentA() {
    const queue = useRequestQueue(200); // 队列 1
    // 使用 queue 发送请求...
  }

  // 组件 B
  function ComponentB() {
    const queue = useRequestQueue(200); // 队列 2（独立的）
    // 使用 queue 发送请求...
  }

  // 问题：组件 A 和 B 的请求不共享频率限制
  // 可能同时发送，触发 429 错误
}

// ==================== 📊 对比总结 ====================

/**
 * 全局队列 vs 独立队列对比
 */
const comparisonTable = `
┌─────────────────────────┬──────────────────────────┬────────────────────────┐
│ 特性                    │ 全局队列（推荐）         │ 独立队列（不推荐）     │
├─────────────────────────┼──────────────────────────┼────────────────────────┤
│ 使用方式                │ 直接调用 viemContractUtils│ useRequestQueue Hook   │
│ 队列实例                │ 1 个（全应用共享）       │ N 个（每组件一个）     │
│ 频率控制                │ ✅ 全局统一              │ ❌ 各自独立            │
│ 内存占用                │ ✅ 低                    │ ⚠️ 高（N 个实例）      │
│ 429 风险                │ ✅ 低                    │ ❌ 高                  │
│ 配置复杂度              │ ✅ 零配置                │ ⚠️ 需要管理生命周期    │
│ 适用场景                │ ✅ 合约调用              │ ⚠️ 非合约 API 请求     │
└─────────────────────────┴──────────────────────────┴────────────────────────┘
`;

// ==================== 🎯 最佳实践 ====================

/**
 * 最佳实践示例：完整的合约交互
 */
function BestPractice_CompleteExample() {
  const [poolData, setPoolData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadPoolData = async (poolId: number) => {
    setLoading(true);
    setError(null);

    try {
      // ✅ 所有请求自动进入全局队列
      const [poolInfo, totalStaked, userStake] = await Promise.all([
        readViemContract(contractAddress, contractAbi, "getPoolInfo", [poolId]),
        readViemContract(contractAddress, contractAbi, "getTotalStaked", [
          poolId,
        ]),
        readViemContract(contractAddress, contractAbi, "getUserStake", [
          poolId,
          userAddress,
        ]),
      ]);

      setPoolData({ poolInfo, totalStaked, userStake });
    } catch (err) {
      setError(err.message);
      console.error("Failed to load pool data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPoolData(0); // 加载第 0 个池子
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h3>Pool Data</h3>
      {poolData && (
        <>
          <p>Pool Name: {poolData.poolInfo.name}</p>
          <p>Total Staked: {poolData.totalStaked.toString()}</p>
          <p>Your Stake: {poolData.userStake.toString()}</p>
        </>
      )}
    </div>
  );
}

export {
  // 推荐示例
  Example1_RecommendedUsage,
  Example2_BatchRequests,
  Example3_MonitorQueue,
  BestPractice_CompleteExample,

  // 反例（仅供学习）
  AntiPattern1_UseHook,
  AntiPattern2_MultipleComponents,
};
