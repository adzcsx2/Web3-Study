# 代币选择器组件使用说明

## 概述

本代币选择器组件提供了一个完整的代币搜索、选择和缓存解决方案，支持通过代币地址查询区块链上的代币信息。

## 功能特性

1. **地址验证** - 验证输入是否为有效的以太坊地址格式
2. **实时搜索** - 通过代币地址搜索区块链上的代币信息
3. **自动链检测** - 自动使用RainbowKit当前连接钱包的区块链网络
4. **链切换响应** - 切换网络时自动清空搜索结果，确保搜索正确的链
5. **骨架屏动画** - 搜索过程中显示加载动画
6. **浏览器缓存** - 缓存最近使用的10个代币
7. **错误处理** - 完善的错误提示和处理机制
8. **代币信息展示** - 显示代币图标、符号、地址等信息

## 组件结构

### 核心组件

1. **SelectTokenModal** - 代币选择模态框
2. **TokenSelectButton** - 代币选择按钮
3. **TokenService** - 代币服务类（处理区块链查询）

### 文件位置

```
src/
├── components/
│   ├── ui/
│   │   ├── modal/
│   │   │   └── SelectTokenModal.tsx     # 代币选择模态框
│   │   └── button/
│   │       └── TokenSelectButton.tsx    # 代币选择按钮
├── services/
│   └── tokenService.ts                  # 代币服务类
├── examples/
│   └── TokenSelectorExample.tsx         # 使用示例
└── types/
    └── SwapToken.d.ts                   # 代币类型定义
```

## 使用方法

### 1. 基础使用

```tsx
import React, { useState } from "react";
import { SwapToken } from "@/types/";
import TokenSelectButton from "@/components/ui/button/TokenSelectButton";

const MyComponent = () => {
  const [selectedToken, setSelectedToken] = useState<SwapToken>();

  const handleTokenSelect = (token: SwapToken) => {
    setSelectedToken(token);
    console.log("选择的代币:", token);
  };

  return (
    <TokenSelectButton
      token={selectedToken}
      onTokenSelect={handleTokenSelect}
    />
  );
};
```

### 2. 交换界面示例

```tsx
import React, { useState } from "react";
import { Space, Typography } from "antd";
import { SwapToken } from "@/types/";
import TokenSelectButton from "@/components/ui/button/TokenSelectButton";

const SwapInterface = () => {
  const [fromToken, setFromToken] = useState<SwapToken>();
  const [toToken, setToToken] = useState<SwapToken>();

  return (
    <Space>
      <div>
        <Typography.Text>你支付</Typography.Text>
        <TokenSelectButton
          token={fromToken}
          onTokenSelect={setFromToken}
        />
      </div>

      <Typography.Text>⇄</Typography.Text>

      <div>
        <Typography.Text>你获得</Typography.Text>
        <TokenSelectButton
          token={toToken}
          onTokenSelect={setToToken}
        />
      </div>
    </Space>
  );
};
```

## 组件属性

### TokenSelectButton Props

| 属性 | 类型 | 描述 |
|------|------|------|
| token | `SwapToken \| undefined` | 当前选择的代币 |
| className | `string \| undefined` | 自定义样式类名 |
| onTokenSelect | `(token: SwapToken) => void` | 代币选择回调函数 |

### SelectTokenModal Props

| 属性 | 类型 | 描述 |
|------|------|------|
| open | `boolean` | 是否显示模态框 |
| onClose | `() => void` | 关闭模态框回调 |
| onTokenSelect | `(token: SwapToken) => void` | 代币选择回调函数 |

## SwapToken 类型定义

```typescript
type SwapToken = {
  chainId: number;           // 链ID
  tokenSymbol: string;       // 代币符号
  tokenAddress: string;      // 代币地址
  tokenDecimals: number;     // 代币精度
  tokenLogoURI: string;      // 代币图标URL
  balance: string;           // 余额（字符串格式）
};
```

## TokenService API

### 静态方法

#### `isValidEthereumAddress(address: string): boolean`
验证是否为有效的以太坊地址。

#### `getTokenInfo(tokenAddress: string, chainId?: number): Promise<SwapToken | null>`
从区块链获取代币基本信息。

#### `getUserTokenBalance(tokenAddress: string, userAddress: string, chainId?: number): Promise<string>`
获取用户在指定代币的余额。

#### `getBatchUserTokenBalance(tokens: Array<{tokenAddress: string, userAddress: string}>, chainId?: number): Promise<{[tokenAddress: string]: string}>`
批量获取用户代币余额。

#### `isTokenContract(address: string, chainId?: number): Promise<boolean>`
检查地址是否为代币合约。

#### `searchToken(query: string, chainId?: number): Promise<SwapToken | null>`
搜索代币（支持地址搜索）。

## 缓存机制

- 使用浏览器的 `localStorage` 缓存代币信息
- 缓存键名: `cached_tokens_list`
- 最多缓存10个最近使用的代币
- 新选择的代币会添加到缓存列表开头
- 重复的代币会被移除并添加到最新位置

## 错误处理

组件内置了完善的错误处理机制：

1. **地址格式错误** - 提示用户输入有效的以太坊地址
2. **网络连接错误** - 提示网络连接失败
3. **合约调用错误** - 提示该地址不是有效的ERC20代币合约
4. **其他错误** - 通用错误提示

## 注意事项

1. 确保项目已正确配置 wagmi 和相关依赖
2. 需要有效的 RPC 端点配置
3. 用户需要连接钱包才能搜索代币和查询余额
4. 代币搜索会自动使用当前连接钱包的区块链网络
5. 切换网络时搜索结果会被清空，需要重新搜索
6. 代币图标使用第三方服务，可能需要处理加载失败的情况

## 依赖项

- `react` - React框架
- `antd` - UI组件库
- `@wagmi/core` - Web3工具库
- `viem` - 以太坊工具库
- `@ant-design/icons` - 图标库

## 扩展功能

可以根据需要扩展以下功能：

1. **代币搜索优化** - 支持按符号名称搜索
2. **热门代币列表** - 显示常用代币
3. **代币收藏** - 用户可以收藏常用代币
4. **多链支持** - 支持更多区块链网络
5. **代币价格显示** - 集成价格查询API