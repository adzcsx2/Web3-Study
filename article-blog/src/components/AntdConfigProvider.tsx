"use client";
import React, { useState, useEffect, useMemo } from "react";
import { ConfigProvider } from "antd";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { getLang, getDefaultLanguage } from "@/i18n/utils";
import enUS from "antd/locale/en_US";
import zhCN from "antd/locale/zh_CN";
import i18n from "@/i18n";

// 直接导入React 19兼容性补丁，不需要额外的日志
import "@ant-design/v5-patch-for-react-19";

interface AntdConfigProviderProps {
  children: React.ReactNode;
}

// 预定义语言映射，避免每次渲染时重新计算
const LOCALE_MAP = {
  zh: zhCN,
  en: enUS,
} as const;

const AntdConfigProvider: React.FC<AntdConfigProviderProps> = ({
  children,
}) => {
  // 初始化时使用默认语言，避免服务端和客户端不匹配
  const [currentLang, setCurrentLang] = useState(getDefaultLanguage());

  useEffect(() => {
    // 客户端挂载后，读取实际的语言设置
    const actualLang = getLang();
    console.log("Detected language:", actualLang);
    setCurrentLang(actualLang);

    // 监听 i18n 语言变化事件
    const handleLanguageChange = (lng: string) => {
      setCurrentLang(lng);
    };

    i18n.on("languageChanged", handleLanguageChange);

    return () => {
      i18n.off("languageChanged", handleLanguageChange);
    };
  }, []);

  // 使用 useMemo 缓存 locale 对象
  const locale = useMemo(() => {
    return LOCALE_MAP[currentLang as keyof typeof LOCALE_MAP] || zhCN;
  }, [currentLang]);

  return (
    <AntdRegistry>
      <ConfigProvider locale={locale}>{children}</ConfigProvider>
    </AntdRegistry>
  );
};

export default AntdConfigProvider;
