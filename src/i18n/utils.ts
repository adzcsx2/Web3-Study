import { type SupportedLanguage } from './index';

const LANG_STORAGE_KEY = 'preferred-language';

export function getLang(): SupportedLanguage {
  if (typeof window === 'undefined') return 'zh';
  
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY) as SupportedLanguage;
    if (stored === 'zh' || stored === 'en') return stored;
    
    // 检测浏览器语言
    const browserLang = navigator.language.toLowerCase();
    return browserLang.startsWith('zh') ? 'zh' : 'en';
  } catch {
    return 'zh';
  }
}

export function setLangStorage(lang: SupportedLanguage) {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch (error) {
    console.error('Failed to save language preference:', error);
  }
}
