import { Colors } from '../styles/colors';

// 获取 CSS 变量值的函数
export const getColorVar = (colorName: keyof typeof Colors) => {
  return `var(--${colorName.replace(/([A-Z])/g, '-$1').toLowerCase()})`;
};

// 使用示例：
// getColorVar('themeColor') -> 'var(--theme-color)'
// getColorVar('bgGray') -> 'var(--bg-gray)'

// 直接获取颜色值
export const getColor = (colorName: keyof typeof Colors) => {
  return Colors[colorName];
};