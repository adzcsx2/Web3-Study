import { getGlobalMessage } from "@/utils/messageInstance";
import i18n from "@/i18n";
import { env } from "@/config/env";
import { Path } from "@/router/path";

// ==================== 配置常量 ====================
// 动态获取基础URL的函数
const getBaseURL = () => {
  if (process.env.NODE_ENV === "development") {
    console.log("Base API URL:", env.baseAPI);
  }
  return env.baseAPI;
};
const TIMEOUT = 15000;
const t = i18n.t.bind(i18n);

// 日志工具
const logger = {
  request: (url: string, options: RequestOptions) => {
    if (process.env.NODE_ENV === "development") {
      console.group(`🚀 HTTP ${options.method || "GET"} ${url}`);
      console.log("Options:", options);
      console.groupEnd();
    }
  },
  response: (url: string, data: unknown, duration: number) => {
    if (process.env.NODE_ENV === "development") {
      console.group(`✅ HTTP Response ${url} (${duration}ms)`);
      console.log("Data:", data);
      console.groupEnd();
    }
  },
  error: (url: string, error: unknown, duration: number) => {
    if (process.env.NODE_ENV === "development") {
      console.group(`❌ HTTP Error ${url} (${duration}ms)`);
      console.error("Error:", error);
      console.groupEnd();
    }
  },
};

// ==================== 类型定义 ====================
// 缓存配置
interface CacheConfig {
  ttl?: number; // 缓存时间（毫秒），默认5分钟
  key?: string; // 自定义缓存键，默认使用URL+参数
  strategy?: "cache-first" | "network-first"; // 缓存策略，默认cache-first
}

// 缓存项
interface CacheItem<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

interface RequestOptions extends Omit<RequestInit, "cache"> {
  preventDuplicate?: boolean;
  showLoading?: boolean;
  showSuccess?: boolean;
  needToken?: boolean;
  retry?: number;
  params?: Record<string, unknown>;
  throwError?: boolean; // 是否抛出错误供.catch()捕获，默认false
  timeout?: number; // 自定义超时时间
  validateStatus?: (status: number) => boolean; // 自定义状态码验证
  enableCache?: boolean | CacheConfig; // 缓存配置
}

interface LoadingConfig {
  type: "antd" | "store" | "event" | "none";
  antdOptions?: {
    content?: string;
    duration?: number;
  };
}

// 响应数据类型
interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

// 扩展的错误接口（用于类型安全）
interface ExtendedError extends Error {
  code?: number;
  response?: unknown;
  type?: string;
  originalError?: unknown;
}

// ==================== 全局状态 ====================
const pendingRequests = new Map<string, AbortController>();
// Store in-flight request promises so concurrent identical requests can reuse the
// same promise instead of issuing multiple network calls.
const pendingPromises = new Map<string, Promise<unknown>>();
const requestCache = new Map<string, CacheItem>();
let loadingInstance: (() => void) | null = null;
let loadingCount = 0;

// 默认缓存配置
const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5分钟
const defaultLoadingConfig: LoadingConfig = {
  type: "antd",
  antdOptions: {
    content: t("network:loadingText"),
    duration: 0,
  },
};

// ==================== 工具函数 ====================
const generateReqKey = (
  url: string,
  method: string,
  params?: Record<string, unknown>,
  body?: unknown
): string =>
  [url, method, JSON.stringify(params || {}), JSON.stringify(body || {})].join(
    "&"
  );
const buildUrlWithParam = (
  baseUrl: string,
  params?: Record<string, unknown>
): string => {
  if (!params || Object.keys(params).length === 0) return baseUrl;
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      searchParams.append(key, String(value));
    }
  });
  const queryString = searchParams.toString();
  return queryString
    ? `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}${queryString}`
    : baseUrl;
};

// ==================== 请求管理 ====================
const addPendingRequest = (key: string, controller: AbortController) => {
  if (!pendingRequests.has(key)) pendingRequests.set(key, controller);
};
const removePendingRequest = (key: string) => {
  pendingRequests.delete(key);
};
const cancelPendingRequest = (key: string) => {
  const controller = pendingRequests.get(key);
  if (controller) {
    controller.abort(t("network:duplicateRequest"));
    pendingRequests.delete(key);
  }
};

// ==================== 缓存管理 ====================
const generateCacheKey = (
  url: string,
  method: string,
  params?: Record<string, unknown>,
  body?: unknown,
  customKey?: string
): string => {
  if (customKey) return customKey;
  return `${method}:${url}:${JSON.stringify(params || {})}:${JSON.stringify(
    body || {}
  )}`;
};

const getCachedData = <T>(cacheKey: string): T | null => {
  const cached = requestCache.get(cacheKey);
  if (!cached) return null;

  // 检查是否过期
  if (Date.now() > cached.timestamp + cached.ttl) {
    requestCache.delete(cacheKey);
    return null;
  }

  return cached.data as T;
};

const setCachedData = <T>(
  cacheKey: string,
  data: T,
  ttl: number = DEFAULT_CACHE_TTL
): void => {
  const cacheItem: CacheItem<T> = {
    data,
    timestamp: Date.now(),
    ttl,
    key: cacheKey,
  };
  requestCache.set(cacheKey, cacheItem);
};

const clearExpiredCache = (): void => {
  const now = Date.now();
  for (const [key, item] of requestCache.entries()) {
    if (now > item.timestamp + item.ttl) {
      requestCache.delete(key);
    }
  }
};

const clearAllCache = (): void => {
  requestCache.clear();
};

// ==================== Loading 管理 ====================
const showLoading = (config: LoadingConfig = defaultLoadingConfig) => {
  loadingCount++;
  if (loadingCount !== 1) return;
  switch (config.type) {
    case "antd":
      loadingInstance = getGlobalMessage().loading(
        config.antdOptions?.content ?? t("network:loadingText"),
        config.antdOptions?.duration ?? 0
      );
      break;
    case "store":
      import("@/stores/loading")
        .then(({ useLoadingStore }) =>
          useLoadingStore.getState().setLoading(true, t("network:loadingText"))
        )
        .catch((error) => console.warn("Loading store not available:", error));
      break;
    case "event":
      window.dispatchEvent(
        new CustomEvent("loading:show", {
          detail: {
            text: t("network:loadingText"),
          },
        })
      );
      break;
  }
};
const hideLoading = (config: LoadingConfig = defaultLoadingConfig) => {
  loadingCount = Math.max(0, loadingCount - 1);
  if (loadingCount > 0) return;
  switch (config.type) {
    case "antd":
      if (loadingInstance) {
        loadingInstance();
        loadingInstance = null;
      }
      break;
    case "store":
      import("@/stores/loading")
        .then(({ useLoadingStore }) =>
          useLoadingStore.getState().setLoading(false)
        )
        .catch((error) => console.warn("Loading store not available:", error));
      break;
    case "event":
      window.dispatchEvent(new CustomEvent("loading:hide"));
      break;
  }
};

// ==================== 错误处理 ====================
const handleErrorResponse = async (response: Response) => {
  const errorMessages: Record<number, string> = {
    401: t("network:unauthorized"),
    403: t("network:forbidden"),
    404: t("network:notFound"),
    500: t("network:serverError"),
  };
  getGlobalMessage().error(
    errorMessages[response.status] || t("network:networkError")
  );
  if (response.status === 401) {
    // HttpOnly Cookie 会由后端自动清理（过期或删除）
    // 前端只需要跳转到登录页
    window.location.href = Path.LOGIN;
  }
};
const handleError = (error: unknown) => {
  const err = error as Error;
  if (err?.name === "AbortError") {
    getGlobalMessage().error(err.message || t("network:requestCanceled"));
  } else if (err?.message?.includes("Failed to fetch")) {
    getGlobalMessage().error(t("network:networkConnectionFailed"));
  } else {
    getGlobalMessage().error(err?.message || t("network:requestSendFailed"));
  }
};

// ==================== Http 客户端类 ====================
class HttpClient {
  /**
   * 通用请求方法 - 支持可选的错误抛出
   */
  private async coreRequest<T = unknown>(
    url: string,
    options: RequestOptions = {}
  ): Promise<T | null> {
    // 解构配置
    const {
      method = "GET",
      preventDuplicate = true,
      showLoading: needLoading = true,
      showSuccess = false,
      needToken = true,
      retry = 0,
      throwError = false,
      timeout = TIMEOUT,
      validateStatus = (status: number) =>
        (status >= 200 && status < 300) || status === 304,
      enableCache = false,
      params,
      headers: customHeaders,
      ...restOptions
    } = options;

    // 处理缓存配置
    const cacheConfig: CacheConfig | null = enableCache
      ? typeof enableCache === "boolean"
        ? { ttl: DEFAULT_CACHE_TTL, strategy: "cache-first" }
        : { ttl: DEFAULT_CACHE_TTL, strategy: "cache-first", ...enableCache }
      : null;

    // 判断是否应该缓存（GET和POST都支持）
    const shouldCache = cacheConfig && (method === "GET" || method === "POST");

    // 初始化
    const controller = new AbortController();
    const reqKey = generateReqKey(url, method, params, restOptions.body);

    // If preventDuplicate is enabled and there's already an in-flight promise for
    // the same request key, return that promise to avoid sending another request.
    if (preventDuplicate && pendingPromises.has(reqKey)) {
      return pendingPromises.get(reqKey) as Promise<T | null>;
    }

    // 构建请求URL
    const baseURL = getBaseURL();
    const requestUrl = buildUrlWithParam(baseURL + url, params);

    // 缓存处理（对GET和POST请求启用缓存）
    if (shouldCache) {
      const cacheKey = generateCacheKey(
        url,
        method,
        params,
        restOptions.body,
        cacheConfig.key
      );

      // 检查缓存
      const cachedData = getCachedData<T>(cacheKey);
      if (cachedData !== null) {
        logger.response(requestUrl, cachedData, 0);
        if (process.env.NODE_ENV === "development") {
          console.log("🎯 Cache hit:", cacheKey);
        }
        return cachedData;
      }
    }

    // 构建请求头
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (customHeaders) {
      Object.assign(headers, customHeaders);
    }
    // HttpOnly Cookie 模式下不需要手动设置 Authorization 头
    // Cookie 会自动包含在请求中
    if (needToken) {
      // 可以添加一些调试日志
      if (process.env.NODE_ENV === "development") {
        console.log("🔐 Using HttpOnly Cookie for authentication");
      }
    }

    // 重复请求处理
    if (preventDuplicate) {
      cancelPendingRequest(reqKey);
      addPendingRequest(reqKey, controller);
    }

    // 显示loading
    if (needLoading) showLoading();

    // 记录请求开始
    const startTime = Date.now();
    logger.request(requestUrl, { method, ...options });

    // 设置超时
    const timeoutId = setTimeout(() => {
      if (!controller.signal.aborted) {
        controller.abort(t("network:requestTimeout"));
      }
    }, timeout);
    const cleanup = () => {
      clearTimeout(timeoutId);
      removePendingRequest(reqKey);
      // remove coalesced promise when request completes/aborts
      pendingPromises.delete(reqKey);

      if (needLoading) hideLoading();
    };
    // Wrap the actual network flow in a promise so we can store it in
    // `pendingPromises` and return the same promise for concurrent identical
    // requests.
    const requestPromise = (async (): Promise<T | null> => {
      try {
        // 发送请求
        const response = await fetch(requestUrl, {
          method,
          headers,
          signal: controller.signal,
          credentials: "include", // 包含 HttpOnly Cookie
          ...restOptions,
        });
        cleanup();

        // 检查响应状态
        if (!validateStatus(response.status)) {
          await handleErrorResponse(response);
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // 处理304 Not Modified状态
        if (response.status === 304) {
          // 304状态码表示资源未修改，应该使用缓存
          if (shouldCache) {
            const cacheKey = generateCacheKey(
              url,
              method,
              params,
              restOptions.body,
              cacheConfig.key
            );
            const cachedData = getCachedData<T>(cacheKey);
            if (cachedData !== null) {
              logger.response(requestUrl, cachedData, Date.now() - startTime);
              if (process.env.NODE_ENV === "development") {
                console.log("🔄 304 Not Modified - Using cache:", cacheKey);
              }
              return cachedData;
            }
          }
          // 如果没有缓存，304状态码可能是错误的
          throw new Error("304 Not Modified but no cache available");
        }

        // 解析响应
        let data = await response.json();
        data = {
          ...data,
          message: "success",
          code: 200,
        };

        // 业务状态码处理
        if (data.code === 200) {
          if (showSuccess) {
            getGlobalMessage().success(
              data.message || t("network:operationSuccess")
            );
          }

          // 缓存成功的响应数据
          if (shouldCache) {
            const cacheKey = generateCacheKey(
              url,
              method,
              params,
              restOptions.body,
              cacheConfig.key
            );
            setCachedData(cacheKey, data.data, cacheConfig.ttl);
            if (process.env.NODE_ENV === "development") {
              console.log("💾 Data cached:", cacheKey);
            }
          }

          logger.response(requestUrl, data.data, Date.now() - startTime);
          return data.data; // 成功时直接返回 data
        } else {
          getGlobalMessage().error(
            data.message || t("network:operationFailed")
          );
          logger.error(requestUrl, data, Date.now() - startTime);
          // 根据配置决定是否抛出错误
          if (throwError) {
            const error = new Error(
              data.message || t("network:operationFailed")
            ) as ExtendedError;
            error.code = data.code;
            error.response = data;
            throw error;
          }
          // 默认情况下返回 null，表示操作失败但已处理
          return null as unknown as T;
        }
      } catch (error: unknown) {
        cleanup();
        const err = error as Error;

        // 重复请求处理
        if (
          err?.name === "AbortError" &&
          err.message?.includes(t("network:duplicateRequest"))
        ) {
          if (throwError) {
            const duplicateError = new Error(
              err.message || t("network:duplicateRequest")
            ) as ExtendedError;
            duplicateError.code = -1;
            duplicateError.type = "duplicate";
            throw duplicateError;
          }
          // 默认情况下静默处理重复请求
          return null as unknown as T;
        }

        // 重试机制
        if (retry > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return this.coreRequest<T>(url, {
            ...options,
            retry: retry - 1,
          });
        }

        // 错误处理 - 显示错误消息
        handleError(error);
        logger.error(requestUrl, error, Date.now() - startTime);
        if (throwError) {
          const finalError = new Error(
            err?.message || t("network:requestSendFailed")
          ) as ExtendedError;
          finalError.code = -1;
          finalError.originalError = error;
          throw finalError;
        }
        // 默认情况下返回 null，表示请求失败但已处理
        return null as unknown as T;
      }
    })();

    // store the promise so concurrent identical requests can await it
    pendingPromises.set(reqKey, requestPromise as Promise<unknown>);

    // await and return the result of the promise
    return (await requestPromise) as T | null;
  }

  /**
   * GET 请求 - 与POST请求使用相同的参数格式
   */
  async get<T = unknown, P = unknown>(
    url: string,
    data?: P,
    options?: Omit<RequestOptions, "method" | "params">
  ): Promise<T | null> {
    return this.coreRequest<T>(url, {
      ...options,
      method: "GET",
      // coreRequest expects params?: Record<string, unknown>
      params: (data as unknown as Record<string, unknown>) || undefined,
    });
  }

  /**
   * POST 请求
   */
  async post<T = unknown>(
    url: string,
    data?: unknown,
    options?: Omit<RequestOptions, "method" | "body">
  ): Promise<T | null> {
    return this.coreRequest<T>(url, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT 请求
   */
  async put<T = unknown>(
    url: string,
    data?: unknown,
    options?: Omit<RequestOptions, "method" | "body">
  ): Promise<T | null> {
    return this.coreRequest<T>(url, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE 请求
   */
  async delete<T = unknown>(
    url: string,
    options?: Omit<RequestOptions, "method">
  ): Promise<T | null> {
    return this.coreRequest<T>(url, {
      ...options,
      method: "DELETE",
    });
  }

  /**
   * PATCH 请求
   */
  async patch<T = unknown>(
    url: string,
    data?: unknown,
    options?: Omit<RequestOptions, "method" | "body">
  ): Promise<T | null> {
    return this.coreRequest<T>(url, {
      ...options,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * 文件上传
   */
  async upload<T = unknown>(
    url: string,
    file: File | FormData,
    options?: Omit<RequestOptions, "method" | "body" | "headers">
  ): Promise<T | null> {
    const formData = file instanceof FormData ? file : new FormData();
    if (file instanceof File) {
      formData.append("file", file);
    }
    return this.coreRequest<T>(url, {
      ...options,
      method: "POST",
      body: formData,
      headers: {
        // 不设置 Content-Type，让浏览器自动设置
      },
    });
  }

  /**
   * 文件下载
   */
  async download(
    url: string,
    filename?: string,
    options?: Omit<RequestOptions, "method">
  ): Promise<void> {
    try {
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {
        ...((options?.headers as Record<string, string>) || {}),
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const baseURL = getBaseURL();
      const response = await fetch(baseURL + url, {
        method: "GET",
        headers,
      });
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      getGlobalMessage().success(t("network:operationSuccess"));
    } catch (error) {
      console.error("Download error:", error);
      getGlobalMessage().error(t("network:operationFailed"));
    }
  }
}

// ==================== 导出 ====================
export const http = new HttpClient();

// 导出配置函数
export const setLoadingConfig = (config: Partial<LoadingConfig>) => {
  Object.assign(defaultLoadingConfig, config);
};

// 导出缓存管理函数
export const cacheManager = {
  // 清理过期缓存
  clearExpired: clearExpiredCache,
  // 清理所有缓存
  clearAll: clearAllCache,
  // 获取缓存统计信息
  getStats: () => ({
    total: requestCache.size,
    keys: Array.from(requestCache.keys()),
  }),
  // 手动设置缓存
  set: setCachedData,
  // 手动获取缓存
  get: getCachedData,
  // 删除特定缓存
  delete: (key: string) => requestCache.delete(key),
};

// 导出类型
export type { RequestOptions, LoadingConfig, ApiResponse, CacheConfig };
