// 简单的内存缓存实现
class CacheStore {
  private cache = new Map<string, { data: unknown; expires: number }>()

  set(key: string, data: unknown, ttlSeconds: number = 3600) {
    const expires = Date.now() + (ttlSeconds * 1000)
    this.cache.set(key, { data, expires })
  }

  get<T = unknown>(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      return null
    }

    if (Date.now() > item.expires) {
      this.cache.delete(key)
      return null
    }

    return item.data as T
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear() {
    this.cache.clear()
  }

  // 清理过期缓存
  cleanup() {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key)
      }
    }
  }

  // 获取缓存统计信息
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

// 创建全局缓存实例
export const cache = new CacheStore()

// 定期清理过期缓存（每5分钟）
setInterval(() => {
  cache.cleanup()
}, 5 * 60 * 1000)

// 缓存装饰器
export function Cached(ttlSeconds: number = 3600) {
  return function (target: unknown, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: unknown[]) {
      const cacheKey = `${(target as { constructor: { name: string } }).constructor.name}_${propertyName}_${JSON.stringify(args)}`
      
      // 尝试从缓存获取
      const cached = cache.get(cacheKey)
      if (cached !== null) {
        return cached
      }

      // 执行原方法
      const result = await method.apply(this, args)
      
      // 存储到缓存
      cache.set(cacheKey, result, ttlSeconds)
      
      return result
    }

    return descriptor
  }
}

// 缓存辅助函数
export class CacheHelper {
  // 生成缓存键
  static generateKey(prefix: string, ...parts: (string | number | boolean)[]): string {
    return `${prefix}:${parts.join(':')}`
  }

  // 缓存函数执行结果
  static async memoize<T>(
    key: string,
    fn: () => Promise<T>,
    ttlSeconds: number = 3600
  ): Promise<T> {
    const cached = cache.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const result = await fn()
    cache.set(key, result, ttlSeconds)
    return result
  }

  // 批量删除缓存
  static invalidatePattern(pattern: string) {
    const regex = new RegExp(pattern)
    const keysToDelete: string[] = []

    for (const key of cache.getStats().keys) {
      if (regex.test(key)) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => cache.delete(key))
    return keysToDelete.length
  }

  // 预热缓存
  static async warmup<T>(key: string, fn: () => Promise<T>, ttlSeconds: number = 3600): Promise<void> {
    try {
      const result = await fn()
      cache.set(key, result, ttlSeconds)
    } catch (error) {
      console.error(`Cache warmup failed for key ${key}:`, error)
    }
  }
}

// 响应缓存中间件
export function withResponseCache(ttlSeconds: number = 300) {
  return function(target: unknown, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (request: Request, ...args: unknown[]) {
      const url = new URL(request.url)
      const cacheKey = `response:${request.method}:${url.pathname}:${url.search}`
      
      // 只缓存GET请求
      if (request.method === 'GET') {
        const cached = cache.get<{ data: unknown; status: number }>(cacheKey)
        if (cached) {
          return new Response(JSON.stringify(cached.data), {
            status: cached.status,
            headers: {
              'Content-Type': 'application/json',
              'X-Cache': 'HIT'
            }
          })
        }
      }

      const response = await method.apply(this, [request, ...args])
      
      // 缓存成功响应
      if (request.method === 'GET' && response.status === 200) {
        try {
          const responseData = await response.clone().json()
          cache.set(cacheKey, {
            data: responseData,
            status: response.status
          }, ttlSeconds)
        } catch {
          // 忽略JSON解析错误
        }
      }

      return response
    }

    return descriptor
  }
}

// 性能监控
export class PerformanceMonitor {
  private static metrics = new Map<string, number[]>()

  static startTimer(operation: string): () => number {
    const start = Date.now()
    
    return () => {
      const duration = Date.now() - start
      this.recordMetric(operation, duration)
      return duration
    }
  }

  static recordMetric(operation: string, duration: number) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, [])
    }
    
    const values = this.metrics.get(operation)!
    values.push(duration)
    
    // 保留最近100次记录
    if (values.length > 100) {
      values.shift()
    }
  }

  static getMetrics(operation: string) {
    const values = this.metrics.get(operation) || []
    
    if (values.length === 0) {
      return null
    }

    const sorted = [...values].sort((a, b) => a - b)
    const sum = values.reduce((a, b) => a + b, 0)

    return {
      count: values.length,
      avg: sum / values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    }
  }

  static getAllMetrics() {
    const result: Record<string, unknown> = {}
    
    for (const [operation] of this.metrics) {
      result[operation] = this.getMetrics(operation)
    }
    
    return result
  }
}

// 性能监控装饰器
export function Monitor(operation?: string) {
  return function (target: unknown, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    const operationName = operation || `${(target as { constructor: { name: string } }).constructor.name}.${propertyName}`

    descriptor.value = async function (...args: unknown[]) {
      const endTimer = PerformanceMonitor.startTimer(operationName)
      
      try {
        const result = await method.apply(this, args)
        endTimer()
        return result
      } catch (error) {
        endTimer()
        throw error
      }
    }

    return descriptor
  }
}