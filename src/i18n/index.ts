import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCommon from './lang/zh/common';
import enCommon from './lang/en/common';

export type SupportedLanguage = 'zh' | 'en';

const resources = {
  zh: {
    common: zhCommon,
  },
  en: {
    common: enCommon,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'zh',
    fallbackLng: 'zh',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
