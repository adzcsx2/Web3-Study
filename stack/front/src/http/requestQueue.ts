/**
 * 请求队列管理器（v2.0 - 统一重试机制）
 *
 * 用于控制 RPC 请求的频率并统一处理所有错误重试，避免 429 Too Many Requests 错误
 * 通过维护一个任务队列，确保每个请求之间有设定的间隔时间
 *
 * 🚀 核心功能：
 * 1. RPC 频率控制 - 默认 200ms 间隔（适合 Infura 免费版滑动窗口）
 * 2. 统一重试机制 - 最多重试 3 次（对所有类型的错误）
 * 3. 智能延迟策略：
 *    - 429 错误：指数退避（600ms → 1200ms → 1800ms）
 *    - 其他错误：固定延迟（1000ms）
 * 4. 优先队列重试 - 失败任务优先处理
 * 5. 统计追踪 - 完成/失败任务计数、平均处理时间
 *
 * 使用说明:
 * 1. 所有合约调用已自动集成到队列中（viemContractUtils.ts）
 * 2. 默认间隔: 200ms（适合 Infura 免费版滑动窗口限制）
 * 3. 如需调整间隔: setGlobalQueueInterval(150) // 改为 150ms
 * 4. 查看队列状态: getGlobalQueueStats()
 *
 * 推荐间隔:
 * - Infura 免费版: 150-200ms（考虑滑动窗口 + 突发请求）
 * - 其他免费端点: 200-300ms
 * - 付费端点: 50-100ms
 * - 本地节点: 0ms（无限制）
 *
 * 重试策略:
 * - 最大重试: 3 次
 * - 429 错误: 600ms → 1200ms → 1800ms（指数退避）
 * - 网络/节点错误: 1000ms 固定延迟
 *
 * @author Hoyn
 * @version 2.0.0
 * @lastModified 2025-10-28
 */

/**
 * 队列任务的内部表示
 */
interface QueueTask<T = unknown> {
  /** 任务函数 */
  fn: () => Promise<T>;
  /** 任务完成 Promise 的 resolve */
  resolve: (value: T | PromiseLike<T>) => void;
  /** 任务失败 Promise 的 reject */
  reject: (reason?: unknown) => void;
  /** 任务创建的时间戳 */
  createdAt: number;
  /** 任务执行的时间戳 */
  executedAt?: number;
  /** 重试次数 */
  retryCount?: number;
  /** 任务超时时间（毫秒），默认 30 秒 */
  timeout?: number;
  /** 超时定时器 ID */
  timeoutId?: NodeJS.Timeout;
}

/**
 * 队列统计信息
 */
export interface RequestQueueStats {
  /** 待处理任务数 */
  pending: number;
  /** 已完成任务数 */
  completed: number;
  /** 失败任务数 */
  failed: number;
  /** 总处理任务数（已完成 + 失败） */
  totalProcessed: number;
  /** 平均任务处理时间（毫秒） */
  averageProcessTime?: number;
  /** 队列最后更新时间 */
  lastUpdated: number;
}

/**
 * 请求队列管理器
 *
 * 通过维护一个 FIFO 队列来控制请求频率，确保每个请求之间有固定的间隔
 */
export class RequestQueue {
  /** 请求间隔（毫秒） */
  private intervalMs: number;

  /** 任务队列 */
  private queue: QueueTask[] = [];

  /** 是否正在处理队列 */
  private isProcessing = false;

  /** 上一个任务完成的时间戳 */
  private lastExecutedTime = 0;

  /** 已完成的任务数 */
  private completedCount = 0;

  /** 失败的任务数 */
  private failedCount = 0;

  /** 所有任务的总处理时间 */
  private totalProcessTime = 0;

  /** 最大重试次数（适用于所有错误） */
  private readonly MAX_RETRIES = 3;

  /** 重试延迟基数（毫秒） */
  private readonly RETRY_BASE_DELAY = 1000;

  /** 默认任务超时时间（毫秒） */
  private readonly DEFAULT_TASK_TIMEOUT = 30000; // 30 秒

  /** 是否已销毁 */
  private destroyed = false;

  /**
   * 创建一个新的请求队列
   *
   * @param intervalMs 请求间隔（毫秒），默认 100ms
   *
   * @example
   * ```typescript
   * // 创建 100ms 间隔的队列
   * const queue = new RequestQueue(100);
   *
   * // 创建 50ms 间隔的队列
   * const fastQueue = new RequestQueue(50);
   * ```
   */
  constructor(intervalMs: number) {
    if (intervalMs < 0) {
      throw new Error("Interval must be greater than or equal to 0");
    }
    this.intervalMs = intervalMs;
  }

  /**
   * 添加一个任务到队列
   *
   * @template T 任务返回值类型
   * @param fn 异步任务函数
   * @param timeout 可选的超时时间（毫秒），默认 30 秒
   * @returns 任务完成的 Promise
   *
   * @example
   * ```typescript
   * const result = await queue.add(async () => {
   *   return await someAsyncOperation();
   * }, 60000); // 60 秒超时
   * ```
   */
  async add<T>(fn: () => Promise<T>, timeout?: number): Promise<T> {
    // 检查队列是否已销毁
    if (this.destroyed) {
      return Promise.reject(new Error("RequestQueue has been destroyed"));
    }

    return new Promise<T>((resolve, reject) => {
      const task: QueueTask<T> = {
        fn,
        resolve,
        reject,
        createdAt: Date.now(),
        timeout: timeout || this.DEFAULT_TASK_TIMEOUT,
      };

      // 设置超时定时器
      task.timeoutId = setTimeout(() => {
        // 从队列中移除超时任务
        const index = this.queue.indexOf(task as QueueTask);
        if (index > -1) {
          this.queue.splice(index, 1);
        }

        // 清理定时器
        if (task.timeoutId) {
          clearTimeout(task.timeoutId);
        }

        // 拒绝任务
        reject(new Error(`Task timeout after ${task.timeout}ms`));
      }, task.timeout);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.queue.push(task as any);

      // 开始处理队列
      this.process().catch((error) => {
        console.error("Queue processing error:", error);
      });
    });
  }

  /**
   * 处理队列中的任务
   */
  private async process(): Promise<void> {
    // 防止并发处理
    if (this.isProcessing) {
      return;
    }

    // 检查是否已销毁
    if (this.destroyed) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.queue.length > 0 && !this.destroyed) {
        // 计算需要等待的时间
        const now = Date.now();
        const timeSinceLastExecution = now - this.lastExecutedTime;
        const waitTime = Math.max(0, this.intervalMs - timeSinceLastExecution);

        // 如果需要等待，则延迟
        if (waitTime > 0) {
          await this.delay(waitTime);
        }

        // 取出队列中的第一个任务
        const task = this.queue.shift();

        if (!task) {
          break;
        }

        // 记录执行时间
        const startTime = Date.now();
        task.executedAt = startTime;

        try {
          // 执行任务
          const result = await task.fn();

          // 清理超时定时器
          if (task.timeoutId) {
            clearTimeout(task.timeoutId);
          }

          // 记录统计信息
          this.lastExecutedTime = Date.now();
          this.completedCount++;
          const processTime = this.lastExecutedTime - startTime;
          this.totalProcessTime += processTime;

          // 完成任务
          task.resolve(result);
        } catch (error) {
          // 统一处理所有错误的重试逻辑
          const currentRetryCount = task.retryCount || 0;

          if (currentRetryCount < this.MAX_RETRIES && !this.destroyed) {
            const errorMsg =
              error instanceof Error ? error.message : String(error);

            // 检查是否是 429 错误，使用不同的延迟策略
            const is429Error =
              errorMsg.includes("429") ||
              errorMsg.includes("Too Many Requests");

            console.warn(
              `⚠️ Request failed (${is429Error ? "429 Rate Limit" : "Error"}), ` +
                `retry ${currentRetryCount + 1}/${this.MAX_RETRIES}...`
            );

            // 增加重试计数
            task.retryCount = currentRetryCount + 1;

            // 🔧 修复：更新最后执行时间，避免过快重试
            this.lastExecutedTime = Date.now();

            // 将任务放回队列头部（优先重试）
            this.queue.unshift(task);

            // 计算延迟时间
            // 429 错误：使用指数退避（更激进）
            // 其他错误：固定延迟
            let retryDelay: number;
            if (is429Error) {
              // 429: 600ms, 1200ms, 1800ms (指数退避)
              retryDelay = this.intervalMs * 3 * task.retryCount;
            } else {
              // 其他错误: 1000ms 固定延迟
              retryDelay = this.RETRY_BASE_DELAY;
            }

            await this.delay(retryDelay);

            // 继续处理下一个任务（实际上是重试当前任务）
            continue;
          }

          // 清理超时定时器
          if (task.timeoutId) {
            clearTimeout(task.timeoutId);
          }

          // 超过重试次数，记录失败
          console.error(
            `❌ Request failed after ${this.MAX_RETRIES} retries, giving up.`,
            error instanceof Error ? error.message : error
          );

          // 记录失败信息
          this.lastExecutedTime = Date.now();
          this.failedCount++;
          const processTime = this.lastExecutedTime - startTime;
          this.totalProcessTime += processTime;

          // 拒绝任务
          task.reject(error);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 获取队列统计信息
   *
   * @returns 队列统计信息
   *
   * @example
   * ```typescript
   * const stats = queue.getStats();
   * console.log(`队列中有 ${stats.pending} 个待处理任务`);
   * console.log(`已完成 ${stats.completed} 个任务`);
   * console.log(`失败 ${stats.failed} 个任务`);
   * console.log(`平均处理时间: ${stats.averageProcessTime}ms`);
   * ```
   */
  getStats(): RequestQueueStats {
    const totalProcessed = this.completedCount + this.failedCount;
    const averageProcessTime =
      totalProcessed > 0 ? this.totalProcessTime / totalProcessed : undefined;

    return {
      pending: this.queue.length,
      completed: this.completedCount,
      failed: this.failedCount,
      totalProcessed,
      averageProcessTime,
      lastUpdated: Date.now(),
    };
  }

  /**
   * 获取队列大小
   *
   * @returns 当前队列中的任务数
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * 获取已完成的任务数
   */
  getCompletedCount(): number {
    return this.completedCount;
  }

  /**
   * 获取失败的任务数
   */
  getFailedCount(): number {
    return this.failedCount;
  }

  /**
   * 清空队列（已在队列中但未执行的任务将被拒绝）
   *
   * @param reason 拒绝原因
   *
   * @example
   * ```typescript
   * queue.clear();
   * // or
   * queue.clear('Queue cleared by user');
   * ```
   */
  clear(reason: string = "Queue cleared"): void {
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        // 清理超时定时器
        if (task.timeoutId) {
          clearTimeout(task.timeoutId);
        }
        task.reject(new Error(reason));
      }
    }
  }

  /**
   * 销毁队列（用于页面卸载时清理，防止内存泄漏）
   *
   * @param reason 销毁原因
   *
   * @example
   * ```typescript
   * // 在 React useEffect 的清理函数中调用
   * useEffect(() => {
   *   return () => {
   *     queue.destroy("Component unmounted");
   *   };
   * }, []);
   * ```
   */
  destroy(reason: string = "Queue destroyed"): void {
    this.destroyed = true;
    this.clear(reason);
    this.resetStats();
  }

  /**
   * 检查队列是否已销毁
   */
  isDestroyed(): boolean {
    return this.destroyed;
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.completedCount = 0;
    this.failedCount = 0;
    this.totalProcessTime = 0;
    this.lastExecutedTime = 0;
  }

  /**
   * 设置新的请求间隔
   *
   * @param intervalMs 新的间隔时间（毫秒）
   *
   * @example
   * ```typescript
   * queue.setInterval(200); // 改为 200ms 间隔
   * ```
   */
  setInterval(intervalMs: number): void {
    if (intervalMs < 0) {
      throw new Error("Interval must be greater than or equal to 0");
    }
    this.intervalMs = intervalMs;
  }

  /**
   * 获取当前的请求间隔
   */
  getInterval(): number {
    return this.intervalMs;
  }
}

/**
 * 全局请求队列实例（默认 100ms 间隔）
 */
export const globalRequestQueue = new RequestQueue(100);

/**
 * 使用全局队列执行异步函数
 *
 * @template T 函数返回值类型
 * @param fn 异步函数
 * @returns 函数的执行结果
 *
 * @example
 * ```typescript
 * const result = await withRequestQueue(async () => {
 *   return await readViemContract(address, abi, 'balanceOf', [userAddress]);
 * });
 * ```
 */
export async function withRequestQueue<T>(fn: () => Promise<T>): Promise<T> {
  return globalRequestQueue.add(fn);
}

/**
 * 设置全局队列的间隔
 *
 * @param intervalMs 间隔时间（毫秒）
 *
 * @example
 * ```typescript
 * setGlobalQueueInterval(150); // 改为 150ms 间隔
 * ```
 */
export function setGlobalQueueInterval(intervalMs: number): void {
  globalRequestQueue.setInterval(intervalMs);
}

/**
 * 获取全局队列的统计信息
 */
export function getGlobalQueueStats(): RequestQueueStats {
  return globalRequestQueue.getStats();
}

/**
 * 清空全局队列
 */
export function clearGlobalQueue(reason?: string): void {
  globalRequestQueue.clear(reason);
}

/**
 * 重置全局队列的统计信息
 */
export function resetGlobalQueueStats(): void {
  globalRequestQueue.resetStats();
}
