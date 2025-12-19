"use client";
import { useEffect } from "react";

/**
 * 安全的关键CSS注入组件
 * 避免使用 dangerouslySetInnerHTML 的替代方案
 */
export default function CriticalStylesInjector() {
  useEffect(() => {
    // 检查是否已经注入过样式
    if (document.getElementById("critical-styles")) {
      return;
    }

    // 创建 style 元素
    const styleElement = document.createElement("style");
    styleElement.id = "critical-styles";
    styleElement.type = "text/css";

    // 定义关键CSS（可以从外部文件导入）
    const criticalCSS = `
      #__next {
        opacity: 0;
        transition: opacity 0.1s ease-in-out;
      }
      
      #__next.loaded {
        opacity: 1;
      }
      
      /* 其他关键样式可以在这里添加 */
    `;

    // 安全的方式插入CSS（现代浏览器）
    styleElement.appendChild(document.createTextNode(criticalCSS));

    // 插入到 head 中
    document.head.appendChild(styleElement);

    return () => {
      // 清理函数：组件卸载时移除样式
      const existingStyle = document.getElementById("critical-styles");
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  return null;
}
