/**
 * 关键CSS样式 - 防止FOUC (Flash of Unstyled Content)
 * 这些样式会内联到HTML头部，确保页面立即可用
 */
export const CRITICAL_CSS = `
  body {
    margin: 0;
    padding: 0;
    min-height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;  /* 设置基础字体大小 */
    background: #ffffff;
  }
  
  .ant-layout {
    background: #ffffff;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  
  .ant-layout-header {
    background: #ffffff;
    color: #000000;
    display: flex;
    align-items: center;
    height: 64px;
    padding: 0 24px;
    flex-shrink: 0;
  }
  
  .ant-layout-content {
    flex: 1;
    padding: 48px;
    min-height: calc(100vh - 134px);
  }
  
  .ant-layout-footer {
    background: #ffffff;
    text-align: center;
    padding: 24px 50px;
    flex-shrink: 0;
  }
  
  .ant-typography h4 {
    color: inherit;
    margin: 0;
    line-height: 64px;
  }
  
  #__next {
    opacity: 0;
    transition: opacity 0.1s ease-in-out;
  }
  
  #__next.loaded {
    opacity: 1;
  }
`;
