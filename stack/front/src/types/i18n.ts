// i18n 相关类型定义

// 支持的语言类型
export type SupportedLanguage = 'zh' | 'en'

// 命名空间资源类型
export interface NamespaceResources {
  common: typeof import('../i18n/lang/zh/common').default
  network: typeof import('../i18n/lang/zh/network').default
}

// 所有可用的命名空间键
export type NamespaceKey = keyof NamespaceResources

// 获取指定命名空间的所有翻译键
export type TranslationKeys<T extends NamespaceKey> = keyof NamespaceResources[T]

// i18next 类型增强
declare module 'i18next' {
  interface CustomTypeOptions {
    returnNull: false
    resources: NamespaceResources
  }
}

// React i18next 类型增强
declare module 'react-i18next' {
  interface CustomTypeOptions {
    resources: NamespaceResources
    returnNull: false
  }
}