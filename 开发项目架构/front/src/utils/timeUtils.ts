// 时间工具
// 提供：
// - toDate(timestamp) -> Date | null  （支持秒或毫秒）
// - format(timestampOrDate, pattern) -> string  （支持常见占位符 YYYY MM DD hh mm ss）
// - toTimestamp(dateOrNumber, unit?) -> number  （返回毫秒）
// - isValidTimestamp(value) -> boolean

export const isNumber = (v: unknown): v is number => typeof v === "number" && !Number.isNaN(v);

// 将秒或毫秒时间戳或者 Date 转为 Date 对象，失败返回 null
export function toDate(value?: number | Date | string | null): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === "string") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "number") {
    // 判断是秒还是毫秒（秒一般是 10 位；毫秒是 13 位）
    const abs = Math.abs(value);
    const maybeSeconds = abs < 1e11; // 小于 1000亿 约为 10 位或更少
    const ms = maybeSeconds ? value * 1000 : value;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

// 将 Date 或 时间戳（秒或毫秒）转为毫秒时间戳
export function toTimestamp(value?: number | Date | string | null): number | null {
  if (value == null) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value.getTime();
  if (typeof value === "number") {
    const abs = Math.abs(value);
    const maybeSeconds = abs < 1e11;
    return maybeSeconds ? value * 1000 : value;
  }
  if (typeof value === "string") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d.getTime();
  }
  return null;
}

// 简单的 format，支持常见占位符：YYYY MM DD hh mm ss
export function format(value?: number | Date | string | null, pattern = "YYYY-MM-DD hh:mm:ss"): string {
  const d = toDate(value);
  if (!d) return "";
  const YYYY = String(d.getFullYear());
  const MM = pad(d.getMonth() + 1);
  const DD = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());

  return pattern
    .replace(/YYYY/g, YYYY)
    .replace(/MM/g, MM)
    .replace(/DD/g, DD)
    .replace(/hh/g, hh)
    .replace(/mm/g, mm)
    .replace(/ss/g, ss);
}

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

export function isValidTimestamp(value?: number | Date | string | null): boolean {
  return toDate(value) !== null;
}

const timeUtils = {
  toDate,
  toTimestamp,
  format,
  isValidTimestamp,
};

export default timeUtils;
