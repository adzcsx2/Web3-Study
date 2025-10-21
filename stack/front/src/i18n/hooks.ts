/**
 * 增强版的 i18n hooks
 * 提供 useTranslation 和语言切换功能
 */

// 直接导出原生的 useTranslation
export { useTranslation } from 'react-i18next'

// 导出语言切换 hook
export { useLanguageSwitch } from './hooks/useLanguageSwitch'
