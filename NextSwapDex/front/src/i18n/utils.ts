import { Constants } from "../constants/constants";

// 获取默认语言
export function getDefaultLanguage(): string {
  return process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || "zh";
}

// 获取支持的语言列表
export function getSupportedLanguages(): string[] {
  const supported = process.env.NEXT_PUBLIC_SUPPORTED_LANGUAGES || "zh,en";
  return supported.split(",").map((lang) => lang.trim());
}

// 获取语言
export function getLang(): string {
  const defaultLang = getDefaultLanguage();

  // 检查是否在浏览器环境中
  if (typeof window === "undefined") {
    return defaultLang; // 服务端渲染时返回默认语言
  }

  const params = new URLSearchParams(window.location.search);
  const urlLang = params.get("lang");
  if (urlLang) {
    localStorage.setItem(Constants.LANG_KEY, urlLang);
    return urlLang;
  }

  const savedLang = localStorage.getItem(Constants.LANG_KEY);
  if (savedLang) {
    return savedLang;
  }
  return defaultLang;
}

// 设置语言到存储和URL
export function setLangStorage(lang: string) {
  // 检查是否在浏览器环境中
  if (typeof window === "undefined") {
    return; // 服务端渲染时直接返回
  }

  localStorage.setItem(Constants.LANG_KEY, lang);

  const params = new URLSearchParams(window.location.search);
  params.set("lang", lang);
  window.history.replaceState({}, "", `?${params.toString()}`);
}
