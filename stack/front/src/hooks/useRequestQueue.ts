/**
 * React Hook for managing RequestQueue lifecycle
 *
 * ⚠️ 注意：通常情况下，你不需要直接使用这个 Hook！
 *
 * viemContractUtils 内部已经使用了全局单例队列，自动处理所有合约请求。
 * 只有在需要创建独立队列（例如非合约的 API 请求）时才使用此 Hook。
 *
 * @deprecated 对于合约调用，直接使用 viemContractUtils，无需此 Hook
 *
 * @example
 * ```typescript
 * // ✅ 推荐：直接使用 viemContractUtils（内置全局队列）
 * import { readViemContract } from '@/utils/viemContractUtils';
 *
 * function MyComponent() {
 *   const loadData = async () => {
 *     // 自动进入全局队列，200ms 间隔 + 自动重试
 *     const result = await readViemContract(address, abi, 'balanceOf', [user]);
 *   };
 * }
 *
 * // ❌ 不推荐：创建独立队列（失去全局频率控制）
 * function MyComponent() {
 *   const queue = useRequestQueue(200); // 每个组件独立队列
 *   const result = await queue.add(() => fetch(...)); // 仅用于非合约请求
 * }
 * ```
 */

import { useEffect, useRef } from "react";
import { RequestQueue } from "@/http/requestQueue";

/**
 * 使用请求队列的 Hook（仅用于非合约请求）
 *
 * ⚠️ 警告：每个组件会创建独立的队列实例！
 * 如果多个组件都调用此 Hook，会创建多个队列，失去全局频率控制。
 *
 * @param intervalMs 请求间隔（毫秒），默认 200ms
 * @returns RequestQueue 实例
 */
export function useRequestQueue(intervalMs: number = 200): RequestQueue {
  const queueRef = useRef<RequestQueue | null>(null);

  // 创建队列实例（只在首次渲染时）
  if (!queueRef.current) {
    queueRef.current = new RequestQueue(intervalMs);
    console.warn(
      "⚠️ useRequestQueue: 创建了独立队列实例。" +
        "对于合约调用，建议直接使用 viemContractUtils（内置全局队列）。"
    );
  }

  // 组件卸载时销毁队列，防止内存泄漏
  useEffect(() => {
    return () => {
      if (queueRef.current && !queueRef.current.isDestroyed()) {
        queueRef.current.destroy("Component unmounted");
        queueRef.current = null;
      }
    };
  }, []);

  return queueRef.current;
}
