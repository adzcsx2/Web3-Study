/**
 * 全局消息实例工具
 * 用于在非 React 组件中使用 Ant Design 的 message API
 */

import type { MessageInstance } from "antd/es/message/interface";

let globalMessageInstance: MessageInstance | null = null;

/**
 * 设置全局 message 实例
 * 在应用初始化时由 App 组件调用
 */
export const setGlobalMessage = (instance: MessageInstance) => {

  globalMessageInstance = instance;
};

/**
 * 获取全局 message 实例
 * 如果实例未初始化，返回一个空操作的替代实例
 */
export const getGlobalMessage = (): MessageInstance => {
  if (globalMessageInstance) {
    return globalMessageInstance;
  }

  // 返回一个安全的默认实例，避免运行时错误
  console.warn("Global message instance not initialized yet");
  
  // 创建一个空操作函数，符合 MessageType 接口
  const noop = () => {
    const fn = () => {};
    fn.then = () => Promise.resolve(false);
    return fn as any;
  };

  return {
    success: noop,
    error: noop,
    info: noop,
    warning: noop,
    loading: noop,
    open: noop,
    destroy: () => {},
  };
};
