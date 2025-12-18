import { readFileSync } from "fs";
import { join } from "path";

/**
 * 获取关键CSS内容
 * 用于内联到HTML头部以防止FOUC
 */
export function getCriticalCSS(): string {
  if (process.env.NODE_ENV === "development") {
    try {
      const criticalCSSPath = join(process.cwd(), "src/styles/critical.css");
      return readFileSync(criticalCSSPath, "utf8");
    } catch (error) {
      console.warn("无法读取关键CSS文件:", error);
      return "";
    }
  }

  // 在生产环境中，你可以将CSS内联或使用其他策略
  return "";
}
