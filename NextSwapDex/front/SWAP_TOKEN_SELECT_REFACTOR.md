# SwapTokenSelect 重构说明

## 重构概述

重构了 `swaptokenSelect.ts` 文件，将原来的基于 tag 的代币管理系统改为基于数组索引的系统。

## 主要变化

### 1. 状态结构变化

**之前的结构:**
```typescript
interface TokenState {
  token: Map<string, SwapToken | null> | null;  // 基于 tag 的 Map
  currentTag: string;                            // 当前操作的 tag
  // ... 其他方法
}
```

**重构后的结构:**
```typescript
interface TokenState {
  tokens: [SwapToken | null, SwapToken | null];  // 固定长度为2的数组
  token: SwapToken | null;                        // 全局单代币对象
  currentPosition: 0 | 1;                        // 当前选择的代币位置
  // ... 其他方法
}
```

### 2. API 变化

**新的主要方法:**
- `setSelectedToken(position: 0 | 1, token: SwapToken | null)` - 设置指定位置的代币
- `setGlobalToken(token: SwapToken | null)` - 设置全局单代币
- `handleTokenSelect(position: 0 | 1, token: SwapToken)` - 处理代币选择
- `swapTokens()` - 交换两个位置的代币
- `setCurrentPosition(position: 0 | 1)` - 设置当前选择位置
- `resetTokenSelect()` - 重置所有状态

**移除的旧方法:**
- `getToken(tag)` - 使用 `tokens[position]` 替代
- `setSelectedToken(tag, token)` - 使用 `setSelectedToken(position, token)` 替代
- `handleTokenSelect(tag, token)` - 使用 `handleTokenSelect(position, token)` 替代
- `currentTag`, `setCurrentTag` - 使用 `currentPosition`, `setCurrentPosition` 替代

### 3. 使用方式变化

**之前的使用方式:**
```typescript
// 获取代币
const token0 = useSwapTokenSelect((state) => state.getToken("1"));
const token1 = useSwapTokenSelect((state) => state.getToken("2"));

// 设置代币
swapTokenSelect.setSelectedToken("1", token);
swapTokenSelect.setSelectedToken("2", token);
```

**重构后的使用方式:**
```typescript
// 获取代币
const tokens = useSwapTokenSelect((state) => state.tokens);
const token0 = tokens[0];
const token1 = tokens[1];

// 设置代币
swapTokenSelect.setSelectedToken(0, token);
swapTokenSelect.setSelectedToken(1, token);
```

### 4. 组件更新

**TokenSelectButton 组件:**
- 旧: `<TokenSelectButton tag="1" />`
- 新: `<TokenSelectButton position={0} />`

**ExchangeSwapButton 组件:**
- 旧: `swapTokens(TAG_TOKEN_SELECT.TOP, TAG_TOKEN_SELECT.BOTTOM)`
- 新: `swapTokens()`

## 优势

1. **类型安全**: 使用 TypeScript 元组确保数组长度固定为2
2. **性能提升**: 数组操作比 Map 操作更高效
3. **代码简洁**: 减少了字符串匹配和转换逻辑
4. **易于理解**: 直接使用数组索引，更加直观
5. **向后兼容**: 移除了复杂的 tag 系统，简化了 API

## 更新的文件列表

- `src/hooks/swaptokenSelect.ts` - 主要重构文件
- `src/app/liquidity/add/page.tsx`
- `src/components/ui/AddLiquidityButton.tsx`
- `src/components/ui/button/TokenSelectButton.tsx`
- `src/components/ui/button/ExchangeSwapButton.tsx`
- `src/components/ui/list/TokenList.tsx`
- `src/components/ui/CreatePoolWarning.tsx`
- `src/components/ui/PriceRangeSelector.tsx`
- `src/components/ui/LiquidityInput.tsx`
- `src/components/ui/LiquidityDetails.tsx`
- `src/components/ui/LockedTokenDisplay.tsx`
- `src/components/ui/ExchangeCoinInput.tsx`

## 注意事项

- `tokens[0]` 对应原来的 tag "1" (TOP)
- `tokens[1]` 对应原来的 tag "2" (BOTTOM)
- `currentPosition` 用于跟踪当前要选择的代币位置
- 全局 `token` 对象用于存储单个代币，与交易对代币数组分离