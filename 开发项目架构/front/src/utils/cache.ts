/**
 * 缓存存储类型
 * - memory: 内存缓存（页面刷新后丢失）
 *   ├─ 速度: ⚡⚡⚡ 最快 (~0.001ms)
 *   ├─ 容量: 💾 大 (受内存限制)
 *   └─ 持久化: ❌
 *
 * - localStorage: 本地存储（页面刷新后保留）
 *   ├─ 速度: 🐌 较慢 (~1ms，比内存慢1000倍)
 *   ├─ 容量: 📦 小 (5-10MB)
 *   └─ 持久化: ✅
 *
 * - hybrid: 混合模式（内存+本地存储，优先使用内存）【推荐】
 *   ├─ 读取: ⚡⚡⚡ 从内存读 (~0.001ms)
 *   ├─ 写入: 同时写入内存和localStorage
 *   ├─ 恢复: 页面刷新时从localStorage恢复到内存
 *   └─ 优势: 兼顾性能和持久化
 *
 * 💡 为什么不只用 localStorage？
 * 因为频繁读取时，内存比localStorage快1000倍！
 *
 * 例如：每秒读取10次缓存，持续1分钟
 * - 纯localStorage: 10次/秒 × 60秒 × 1ms = 600ms
 * - 混合缓存: 10次/秒 × 60秒 × 0.001ms = 0.6ms (快1000倍！)
 */
type CacheStorageType = "memory" | "localStorage" | "hybrid";

const BIGINT_MARKER = "__cache_bigint__";

export function jsonStringifyWithBigInt(value: unknown): string {
  return JSON.stringify(value, (_key, val) => {
    if (typeof val === "bigint") {
      return { [BIGINT_MARKER]: val.toString() };
    }
    return val;
  });
}

export function jsonParseWithBigInt<T>(text: string): T {
  return JSON.parse(text, (_key, val) => {
    if (
      val &&
      typeof val === "object" &&
      BIGINT_MARKER in (val as Record<string, unknown>) &&
      typeof (val as Record<string, unknown>)[BIGINT_MARKER] === "string"
    ) {
      try {
        return BigInt((val as Record<string, string>)[BIGINT_MARKER]);
      } catch (error) {
        console.warn("Failed to deserialize BigInt from cache:", error);
        return (val as Record<string, unknown>)[BIGINT_MARKER];
      }
    }
    return val;
  });
}

/**
 * 缓存配置
 */
interface CacheConfig {
  /** 存储类型 */
  storageType?: CacheStorageType;
  /** localStorage 键前缀 */
  localStoragePrefix?: string;
  /** 是否在启动时从 localStorage 恢复缓存 */
  restoreOnInit?: boolean;
}

/**
 * 缓存存储类 - 支持内存和持久化存储
 */
class CacheStore {
  private cache = new Map<string, { data: unknown; expires: number }>();
  private config: Required<CacheConfig>;

  constructor(config: CacheConfig = {}) {
    this.config = {
      storageType: config.storageType || "memory",
      localStoragePrefix: config.localStoragePrefix || "app_cache:",
      restoreOnInit: config.restoreOnInit ?? false,
    };

    // 如果配置了从 localStorage 恢复，则在初始化时恢复
    if (this.config.restoreOnInit && typeof window !== "undefined") {
      this.restoreFromLocalStorage();
    }
  }

  /**
   * 设置缓存
   */
  set(key: string, data: unknown, ttlSeconds: number = 3600) {
    const expires = Date.now() + ttlSeconds * 1000;
    const item = { data, expires };

    // 内存缓存
    if (
      this.config.storageType === "memory" ||
      this.config.storageType === "hybrid"
    ) {
      this.cache.set(key, item);
    }

    // localStorage 持久化
    if (
      this.config.storageType === "localStorage" ||
      this.config.storageType === "hybrid"
    ) {
      this.setToLocalStorage(key, item);
    }
  }

  /**
   * 获取缓存
   *
   * 混合模式的读取策略：
   * 1. 优先从内存读取（极快，~0.001ms）
   * 2. 内存未命中时从localStorage读取（~1ms）
   * 3. localStorage命中后会加载到内存，下次更快
   *
   * 这样设计的原因：
   * - 页面刷新后：第一次从localStorage读取（1ms）
   * - 后续访问：从内存读取（0.001ms，快1000倍）
   * - 频繁读取场景下性能提升显著
   */
  get<T = unknown>(key: string): T | null {
    const now = Date.now();

    // 优先从内存获取（更快）
    if (
      this.config.storageType === "memory" ||
      this.config.storageType === "hybrid"
    ) {
      const item = this.cache.get(key);
      if (item) {
        if (now > item.expires) {
          this.delete(key);
          return null;
        }
        return item.data as T;
      }
    }

    // 从 localStorage 获取
    if (
      this.config.storageType === "localStorage" ||
      this.config.storageType === "hybrid"
    ) {
      const item = this.getFromLocalStorage(key);
      if (item) {
        if (now > item.expires) {
          this.delete(key);
          return null;
        }
        // 如果是混合模式，将数据加载到内存
        if (this.config.storageType === "hybrid") {
          this.cache.set(key, item);
        }
        return item.data as T;
      }
    }

    return null;
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    let deleted = false;

    // 从内存删除
    if (
      this.config.storageType === "memory" ||
      this.config.storageType === "hybrid"
    ) {
      deleted = this.cache.delete(key) || deleted;
    }

    // 从 localStorage 删除
    if (
      this.config.storageType === "localStorage" ||
      this.config.storageType === "hybrid"
    ) {
      deleted = this.deleteFromLocalStorage(key) || deleted;
    }

    return deleted;
  }

  /**
   * 清空所有缓存
   */
  clear() {
    // 清空内存
    if (
      this.config.storageType === "memory" ||
      this.config.storageType === "hybrid"
    ) {
      this.cache.clear();
    }

    // 清空 localStorage
    if (
      this.config.storageType === "localStorage" ||
      this.config.storageType === "hybrid"
    ) {
      this.clearLocalStorage();
    }
  }

  /**
   * 清理过期缓存
   */
  cleanup() {
    const now = Date.now();

    // 清理内存缓存
    if (
      this.config.storageType === "memory" ||
      this.config.storageType === "hybrid"
    ) {
      for (const [key, item] of this.cache.entries()) {
        if (now > item.expires) {
          this.cache.delete(key);
        }
      }
    }

    // 清理 localStorage
    if (
      this.config.storageType === "localStorage" ||
      this.config.storageType === "hybrid"
    ) {
      this.cleanupLocalStorage();
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    const keys = new Set<string>();

    // 收集内存中的键
    if (
      this.config.storageType === "memory" ||
      this.config.storageType === "hybrid"
    ) {
      this.cache.forEach((_, key) => keys.add(key));
    }

    // 收集 localStorage 中的键
    if (
      this.config.storageType === "localStorage" ||
      this.config.storageType === "hybrid"
    ) {
      const localKeys = this.getLocalStorageKeys();
      localKeys.forEach((key) => keys.add(key));
    }

    return {
      size: keys.size,
      keys: Array.from(keys),
      storageType: this.config.storageType,
      memorySize: this.cache.size,
      localStorageSize: this.getLocalStorageKeys().length,
    };
  }

  // ==================== localStorage 辅助方法 ====================

  private setToLocalStorage(
    key: string,
    item: { data: unknown; expires: number }
  ) {
    if (typeof window === "undefined") return;

    try {
      const storageKey = this.config.localStoragePrefix + key;
      const serialized = jsonStringifyWithBigInt(item);
      localStorage.setItem(storageKey, serialized);
    } catch (error) {
      // localStorage 可能已满或被禁用
      console.warn("Failed to save to localStorage:", error);
    }
  }

  private getFromLocalStorage(
    key: string
  ): { data: unknown; expires: number } | null {
    if (typeof window === "undefined") return null;

    try {
      const storageKey = this.config.localStoragePrefix + key;
      const item = localStorage.getItem(storageKey);
      if (!item) return null;
      return jsonParseWithBigInt(item);
    } catch (error) {
      console.warn("Failed to read from localStorage:", error);
      return null;
    }
  }

  private deleteFromLocalStorage(key: string): boolean {
    if (typeof window === "undefined") return false;

    try {
      const storageKey = this.config.localStoragePrefix + key;
      localStorage.removeItem(storageKey);
      return true;
    } catch (error) {
      console.warn("Failed to delete from localStorage:", error);
      return false;
    }
  }

  private clearLocalStorage() {
    if (typeof window === "undefined") return;

    try {
      const keys = this.getLocalStorageKeys();
      keys.forEach((key) => {
        const storageKey = this.config.localStoragePrefix + key;
        localStorage.removeItem(storageKey);
      });
    } catch (error) {
      console.warn("Failed to clear localStorage:", error);
    }
  }

  private cleanupLocalStorage() {
    if (typeof window === "undefined") return;

    try {
      const now = Date.now();
      const keys = this.getLocalStorageKeys();

      keys.forEach((key) => {
        const item = this.getFromLocalStorage(key);
        if (item && now > item.expires) {
          this.deleteFromLocalStorage(key);
        }
      });
    } catch (error) {
      console.warn("Failed to cleanup localStorage:", error);
    }
  }

  private getLocalStorageKeys(): string[] {
    if (typeof window === "undefined") return [];

    try {
      const keys: string[] = [];
      const prefix = this.config.localStoragePrefix;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keys.push(key.substring(prefix.length));
        }
      }

      return keys;
    } catch (error) {
      console.warn("Failed to get localStorage keys:", error);
      return [];
    }
  }

  private restoreFromLocalStorage() {
    if (typeof window === "undefined") return;

    try {
      const keys = this.getLocalStorageKeys();
      const now = Date.now();
      let restoredCount = 0;

      keys.forEach((key) => {
        const item = this.getFromLocalStorage(key);
        if (item && now <= item.expires) {
          this.cache.set(key, item);
          restoredCount++;
        } else if (item) {
          // 删除过期项
          this.deleteFromLocalStorage(key);
        }
      });

      if (restoredCount > 0) {
        console.log(`✅ 从 localStorage 恢复了 ${restoredCount} 个缓存项`);
      }
    } catch (error) {
      console.warn("Failed to restore from localStorage:", error);
    }
  }

  /**
   * 切换存储类型
   */
  setStorageType(type: CacheStorageType) {
    this.config.storageType = type;
  }

  /**
   * 获取当前存储类型
   */
  getStorageType(): CacheStorageType {
    return this.config.storageType;
  }
}

// ==================== 导出实例 ====================

/**
 * 默认缓存实例 - 内存模式（页面刷新后丢失）
 * 如需持久化，请使用 persistentCache
 */
export const cache = new CacheStore({
  storageType: "memory",
});

/**
 * 持久化缓存实例 - 使用 localStorage（页面刷新后保留）
 * 适用于需要跨页面刷新保留的数据
 */
export const persistentCache = new CacheStore({
  storageType: "localStorage",
  localStoragePrefix: "app_persistent_cache:",
  restoreOnInit: true,
});

/**
 * 混合缓存实例 - 内存+localStorage（性能与持久化兼得）
 * 优先使用内存，同时备份到 localStorage
 */
export const hybridCache = new CacheStore({
  storageType: "hybrid",
  localStoragePrefix: "app_hybrid_cache:",
  restoreOnInit: true,
});

// 定期清理过期缓存（每5分钟）
setInterval(
  () => {
    cache.cleanup();
    persistentCache.cleanup();
    hybridCache.cleanup();
  },
  5 * 60 * 1000
);

// 缓存装饰器
export function Cached(ttlSeconds: number = 3600) {
  return function (
    target: unknown,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const cacheKey = `${(target as { constructor: { name: string } }).constructor.name}_${propertyName}_${jsonStringifyWithBigInt(args)}`;

      // 尝试从缓存获取
      const cached = cache.get(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // 执行原方法
      const result = await method.apply(this, args);

      // 存储到缓存
      cache.set(cacheKey, result, ttlSeconds);

      return result;
    };

    return descriptor;
  };
}

// 缓存辅助函数
export class CacheHelper {
  // 生成缓存键
  static generateKey(
    prefix: string,
    ...parts: (string | number | boolean)[]
  ): string {
    return `${prefix}:${parts.join(":")}`;
  }

  // 缓存函数执行结果
  static async memoize<T>(
    key: string,
    fn: () => Promise<T>,
    ttlSeconds: number = 3600
  ): Promise<T> {
    const cached = cache.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const result = await fn();
    cache.set(key, result, ttlSeconds);
    return result;
  }

  // 批量删除缓存
  static invalidatePattern(pattern: string) {
    const regex = new RegExp(pattern);
    const keysToDelete: string[] = [];

    for (const key of cache.getStats().keys) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => cache.delete(key));
    return keysToDelete.length;
  }

  // 预热缓存
  static async warmup<T>(
    key: string,
    fn: () => Promise<T>,
    ttlSeconds: number = 3600
  ): Promise<void> {
    try {
      const result = await fn();
      cache.set(key, result, ttlSeconds);
    } catch (error) {
      console.error(`Cache warmup failed for key ${key}:`, error);
    }
  }
}

// 响应缓存中间件
export function withResponseCache(ttlSeconds: number = 300) {
  return function (
    target: unknown,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (request: Request, ...args: unknown[]) {
      const url = new URL(request.url);
      const cacheKey = `response:${request.method}:${url.pathname}:${url.search}`;

      // 只缓存GET请求
      if (request.method === "GET") {
        const cached = cache.get<{ data: unknown; status: number }>(cacheKey);
        if (cached) {
          return new Response(JSON.stringify(cached.data), {
            status: cached.status,
            headers: {
              "Content-Type": "application/json",
              "X-Cache": "HIT",
            },
          });
        }
      }

      const response = await method.apply(this, [request, ...args]);

      // 缓存成功响应
      if (request.method === "GET" && response.status === 200) {
        try {
          const responseData = await response.clone().json();
          cache.set(
            cacheKey,
            {
              data: responseData,
              status: response.status,
            },
            ttlSeconds
          );
        } catch {
          // 忽略JSON解析错误
        }
      }

      return response;
    };

    return descriptor;
  };
}

// 性能监控
export class PerformanceMonitor {
  private static metrics = new Map<string, number[]>();

  static startTimer(operation: string): () => number {
    const start = Date.now();

    return () => {
      const duration = Date.now() - start;
      this.recordMetric(operation, duration);
      return duration;
    };
  }

  static recordMetric(operation: string, duration: number) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }

    const values = this.metrics.get(operation)!;
    values.push(duration);

    // 保留最近100次记录
    if (values.length > 100) {
      values.shift();
    }
  }

  static getMetrics(operation: string) {
    const values = this.metrics.get(operation) || [];

    if (values.length === 0) {
      return null;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      count: values.length,
      avg: sum / values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  static getAllMetrics() {
    const result: Record<string, unknown> = {};

    for (const [operation] of this.metrics) {
      result[operation] = this.getMetrics(operation);
    }

    return result;
  }
}

// 性能监控装饰器
export function Monitor(operation?: string) {
  return function (
    target: unknown,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;
    const operationName =
      operation ||
      `${(target as { constructor: { name: string } }).constructor.name}.${propertyName}`;

    descriptor.value = async function (...args: unknown[]) {
      const endTimer = PerformanceMonitor.startTimer(operationName);

      try {
        const result = await method.apply(this, args);
        endTimer();
        return result;
      } catch (error) {
        endTimer();
        throw error;
      }
    };

    return descriptor;
  };
}
