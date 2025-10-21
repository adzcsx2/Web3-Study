import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// 导入语言包
import zhCommon from './lang/zh/common'
import zhNetwork from './lang/zh/network'
import enCommon from './lang/en/common'
import enNetwork from './lang/en/network'

// 手动配置语言包
function loadLocaleMessages() {
  const messages = {
    zh: {
      common: zhCommon,
      network: zhNetwork,
    },
    en: {
      common: enCommon,
      network: enNetwork,
    },
  }
  
  const namespaces = ['common', 'network']

  return {
    messages,
    namespaces,
  }
}

const { messages: resources, namespaces } = loadLocaleMessages()


i18n
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh',
    debug: process.env.NODE_ENV === 'development',

    interpolation: {
      escapeValue: false,
    },

    // 动态命名空间设置
    ns: namespaces,
    defaultNS: 'common',
  })

// 支持的语言类型
export type SupportedLanguage = 'zh' | 'en'

// 获取可用的语言列表 - ['zh', 'en']
export const getAvailableLocales = () => Object.keys(resources)

// 获取可用的命名空间列表 - ['common', 'network']
export const getAvailableNamespaces = () => namespaces

// 动态添加国际化辅助函数
export const addResourceBundle = (locale: string, namespace: string, resource: Record<string, string>) => {
  i18n.addResourceBundle(locale, namespace, resource, true, true)
}

export default i18n
