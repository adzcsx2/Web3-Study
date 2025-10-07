import { useEffect, useState } from 'react';
import i18n from '../index';
import { getLang } from '../utils';

// 客户端语言初始化 hook
export function useClientLanguageInit() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // 只在客户端执行语言检测和初始化
    const initializeLanguage = async () => {
      try {
        const detectedLang = getLang();
        
        // 设置语言但不等待资源加载，避免阻塞渲染
        if (detectedLang !== i18n.language) {
          await i18n.changeLanguage(detectedLang);
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize language:', error);
        // 即使出错也标记为已初始化，使用默认语言
        setIsInitialized(true);
      }
    };

    initializeLanguage();
  }, []);

  return {
    isInitialized,
    currentLanguage: i18n.language,
  };
}
