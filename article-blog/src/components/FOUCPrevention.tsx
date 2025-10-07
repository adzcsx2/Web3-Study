"use client";
import { useEffect } from "react";

/**
 * FOUC (Flash of Unstyled Content) 防护组件
 * 确保样式加载完成后才显示内容
 */
export default function FOUCPrevention() {
  useEffect(() => {
    function markAsLoaded() {
      const root = document.getElementById("__next");
      if (root) {
        root.classList.add("loaded");
      }
    }

    // 如果DOM已经加载完成，立即标记为已加载
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", markAsLoaded);
    } else {
      markAsLoaded();
    }

    return () => {
      document.removeEventListener("DOMContentLoaded", markAsLoaded);
    };
  }, []);

  return null; // 这个组件不渲染任何内容
}
