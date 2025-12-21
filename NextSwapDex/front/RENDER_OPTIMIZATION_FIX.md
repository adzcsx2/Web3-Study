# 代币选择组件渲染优化和 SSR 修复

## 问题描述

1. **多次渲染问题**: 每次选择代币时组件会渲染多次
2. **SSR 水合警告**: `getServerSnapshot should be cached to avoid an infinite loop`

## 解决方案

### 1. 多次渲染优化

#### 问题根源
- `TokenSelectButton` 组件中存在重复的 `SelectTokenModal` 实例
- Zustand store 订阅过多，每次状态变化都触发重渲染
- 缺少 `React.memo`、`useCallback` 和 `useMemo` 优化
- `TokenList` 组件中的钱包状态处理不当

#### 优化措施

**A. 重构 TokenSelectButton 组件**
```typescript
// 优化前: 存在重复的 Modal 实例
const HasTokenButton = () => {
  return (
    <>
      <Button />
      <SelectTokenModal />  // 实例 1
    </>
  );
};

const NotHasTokenButton = () => {
  return (
    <>
      <Button />
      <SelectTokenModal />  // 实例 2
    </>
  );
};

// 优化后: 只有一个 Modal 实例
const TokenSelectModalWrapper = React.memo(() => {
  return <SelectTokenModal />;
});
```

**B. 优化 Zustand Store 订阅**
```typescript
// 创建专门的选择器 hooks
export const useTokenSelectState = () => {
  return useSwapTokenSelect((state) => ({
    tokens: state.tokens,
    token: state.token,
    currentPosition: state.currentPosition,
    showTokenSelect: state.showTokenSelect,
  }));
};

export const useTokenSelectActions = () => {
  return useSwapTokenSelect((state) => ({
    setSelectedToken: state.setSelectedToken,
    setCurrentPosition: state.setCurrentPosition,
    setShowTokenSelect: state.setShowTokenSelect,
    handleTokenSelect: state.handleTokenSelect,
  }));
};
```

**C. 组件级优化**
- 所有组件使用 `React.memo` 包装
- 使用 `useCallback` 优化事件处理函数
- 使用 `useMemo` 缓存计算结果
- 将代币列表项拆分为独立的 `TokenListItem` 组件

### 2. SSR 水合问题修复

#### 问题根源
Zustand store 在服务器端渲染时没有正确处理持久化和水合，导致 `getServerSnapshot` 警告。

#### 解决方案

**A. 添加 Zustand Persist 中间件**
```typescript
export const useSwapTokenSelect = create<TokenState>()(
  persist(
    (set, get) => ({
      // store 状态和方法
    }),
    {
      name: 'token-select-storage',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') {
          return localStorage;
        }
        // 服务器端返回空的存储对象
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      partialize: (state) => ({
        tokens: state.tokens,
        token: state.token,
        currentPosition: state.currentPosition,
      }),
      skipHydration: true,  // 服务器端跳过水合
    }
  )
);
```

**B. 创建水合处理 Hook**
```typescript
export const useHydratedTokenStore = () => {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      useSwapTokenSelect.persist.rehydrate();
      setHasHydrated(true);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, []);

  return hasHydrated;
};
```

**C. 安全的 Store Hooks**
```typescript
export const useSafeTokenSelectState = () => {
  const hasHydrated = useHydratedTokenStore();
  const state = useTokenSelectState();

  return hasHydrated ? state : {
    tokens: [null, null],
    token: null,
    currentPosition: 0,
    showTokenSelect: false,
  };
};

export const useSafeTokenByPosition = (position: 0 | 1) => {
  const hasHydrated = useHydratedTokenStore();
  const token = useTokenByPosition(position);

  return hasHydrated ? token : null;
};
```

## 性能提升效果

### 渲染优化
- ✅ 减少不必要的组件重渲染
- ✅ 消除重复的 Modal 实例
- ✅ 优化状态订阅数量
- ✅ 提升代币选择响应速度

### SSR 兼容性
- ✅ 解决 `getServerSnapshot` 缓存警告
- ✅ 正确处理服务器端和客户端状态同步
- ✅ 避免水合不匹配问题
- ✅ 支持状态持久化

## 使用方式

更新组件导入：
```typescript
// 之前
import { useSwapTokenSelect } from "@/hooks/useSwaptokenSelect";

// 现在
import {
  useSafeTokenSelectState,
  useTokenSelectActions,
  useSafeTokenByPosition
} from "@/hooks/useSwapTokenSelectOptimized";
```

组件中使用：
```typescript
const TokenSelectButton = ({ position }) => {
  const token = useSafeTokenByPosition(position);
  const { setCurrentPosition, setShowTokenSelect } = useTokenSelectActions();

  // 组件逻辑...
};
```

## 注意事项

1. **持久化字段**: 只持久化必要的状态字段，`showTokenSelect` 不持久化
2. **水合时机**: 使用 `setTimeout` 确保在客户端完全挂载后再进行水合
3. **类型安全**: 所有 hooks 都保持了 TypeScript 类型安全
4. **向后兼容**: 保持了原有的 API 接口不变

这些优化确保了代币选择组件在 SSR 环境下的稳定运行，同时显著提升了渲染性能。