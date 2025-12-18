"use client";
import React, { useState, useEffect, useMemo } from "react";
import { ConfigProvider } from "antd";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { getDefaultLanguage } from "@/i18n/utils";
import enUS from "antd/locale/en_US";
import zhCN from "antd/locale/zh_CN";

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
  // 使用默认语言，避免服务端和客户端不匹配
  const [currentLang, setCurrentLang] = useState(getDefaultLanguage());

  useEffect(() => {
    // 只在客户端运行
    if (typeof window !== "undefined") {
      // 动态导入 i18n 避免服务端渲染问题
      Promise.all([import("@/i18n"), import("@/i18n/utils")])
        .then(([i18nModule, utilsModule]) => {
          const i18n = i18nModule.default;
          const { getLang } = utilsModule;

          // 客户端挂载后，读取实际的语言设置
          const actualLang = getLang();
          setCurrentLang(actualLang);

          // 监听 i18n 语言变化事件
          const handleLanguageChange = (lng: string) => {
            setCurrentLang(lng);
          };

          try {
            i18n.on("languageChanged", handleLanguageChange);
          } catch (error) {
            console.error("Failed to attach i18n listener:", error);
          }

          return () => {
            try {
              i18n.off("languageChanged", handleLanguageChange);
            } catch (error) {
              console.error("Failed to remove i18n listener:", error);
            }
          };
        })
        .catch((error) => {
          console.error("Failed to load i18n:", error);
        });
    }
  }, []);

  // 使用 useMemo 缓存 locale 对象
  const locale = useMemo(() => {
    return LOCALE_MAP[currentLang as keyof typeof LOCALE_MAP] || zhCN;
  }, [currentLang]);

  return (
    <AntdRegistry>
      <ConfigProvider
        locale={locale}
        theme={{
          components: {
            Layout: {
              headerBg: "#ffffff",
              headerHeight: 64,
            },
          },
        }}
      >
        {children}
      </ConfigProvider>
    </AntdRegistry>
  );
};

export default AntdConfigProvider;
