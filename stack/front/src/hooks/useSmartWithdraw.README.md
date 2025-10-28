# useSmartWithdraw Hook 文档

## 📚 概述

`useSmartWithdraw` 是一个智能提取 Hook，用于自动处理解质押的完整流程。它会智能判断当前状态并执行相应操作，让用户无需关心复杂的流程细节。

## ✨ 核心特性

- ✅ **智能判断**：自动检测解质押状态，执行相应步骤
- ✅ **时间计算**：精确计算冷却期剩余时间
- ✅ **完整回调**：支持所有关键步骤的回调函数
- ✅ **状态管理**：提供详细的处理状态
- ✅ **手动控制**：同时提供手动方法满足高级需求
- ✅ **错误处理**：完善的错误提示和处理机制

## 🚀 快速开始

### 基础用法

```typescript
import { useSmartWithdraw } from '@/hooks/useSmartWithdraw';
import { parseUnits } from 'viem';

function MyComponent() {
  const { smartWithdraw, isProcessing } = useSmartWithdraw();

  const handleWithdraw = async () => {
    try {
      await smartWithdraw({
        poolId: 0,
        amount: parseUnits('100', 18),
      });
      alert('操作成功！');
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <button onClick={handleWithdraw} disabled={isProcessing}>
      {isProcessing ? '处理中...' : '提取'}
    </button>
  );
}
```

### 带回调的完整用法

```typescript
const handleWithdraw = async () => {
  await smartWithdraw(
    {
      poolId: 0,
      amount: parseUnits("100", 18),
    },
    {
      // 申请解质押回调
      onRequestStart: () => console.log("开始申请..."),
      onRequestSuccess: (hash) => console.log("申请成功:", hash),
      onRequestError: (error) => console.error("申请失败:", error),

      // 执行提取回调
      onWithdrawStart: () => console.log("开始提取..."),
      onWithdrawSuccess: (hash) => console.log("提取成功:", hash),
      onWithdrawError: (error) => console.error("提取失败:", error),

      // 冷却期回调
      onCooldownRemaining: (blocks, time) => {
        alert(`还需等待 ${time}（${blocks} 个区块）`);
      },
    }
  );
};
```

## 📖 API 文档

### 返回值

```typescript
interface UseSmartWithdrawReturn {
  isProcessing: boolean; // 是否正在处理中
  isRequesting: boolean; // 是否正在申请解质押
  isWithdrawing: boolean; // 是否正在执行提取
  smartWithdraw: (params, callbacks?) => Promise<void>; // 智能提取
  checkWithdrawStatus: (poolId) => Promise<WithdrawStatus>; // 检查状态
  requestUnstake: (params, callbacks?) => Promise<void>; // 手动申请
  executeWithdraw: (poolId, callbacks?) => Promise<void>; // 手动提取
}
```

### 参数类型

```typescript
interface WithdrawParams {
  poolId: number; // 池子ID
  amount: bigint; // 要解质押的数量
}

interface WithdrawCallbacks {
  onRequestStart?: () => void;
  onRequestSuccess?: (hash: string) => void;
  onRequestError?: (error: Error) => void;
  onWithdrawStart?: () => void;
  onWithdrawSuccess?: (hash: string) => void;
  onWithdrawError?: (error: Error) => void;
  onCooldownRemaining?: (blocks: bigint, time: string) => void;
}

interface WithdrawStatus {
  hasRequest: boolean; // 是否有解质押请求
  isInCooldown: boolean; // 是否在冷却期
  canWithdraw: boolean; // 是否可以提取
  pendingRequests: UnstakeRequest[]; // 所有待处理请求
  executableRequests: UnstakeRequest[]; // 可执行的请求
  remainingBlocks?: bigint; // 剩余区块数
  estimatedTime?: string; // 估算剩余时间
}
```

## 🔄 工作流程

### 场景1：首次提取（未申请解质押）

```
用户点击提取
    ↓
检测到没有解质押请求
    ↓
自动执行申请解质押
    ↓
触发 onRequestSuccess
    ↓
触发 onCooldownRemaining
    ↓
告知用户需要等待的时间
```

### 场景2：冷却期中再次点击

```
用户点击提取
    ↓
检测到有请求但仍在冷却期
    ↓
触发 onCooldownRemaining
    ↓
抛出错误："还需等待约 X 时间"
    ↓
不执行任何链上操作
```

### 场景3：冷却期结束后点击

```
用户点击提取
    ↓
检测到有可执行的请求
    ↓
自动执行提取操作
    ↓
触发 onWithdrawSuccess
    ↓
代币和奖励转入钱包
```

## 💡 高级用法

### 检查状态

```typescript
const { checkWithdrawStatus } = useSmartWithdraw();

const status = await checkWithdrawStatus(0);

if (status.canWithdraw) {
  console.log("可以提取了！");
} else if (status.isInCooldown) {
  console.log(`还需等待 ${status.estimatedTime}`);
} else {
  console.log("还没有解质押请求");
}
```

### 手动控制流程

```typescript
const { requestUnstake, executeWithdraw } = useSmartWithdraw();

// 第一步：手动申请解质押
await requestUnstake({ poolId: 0, amount: parseUnits("100", 18) });

// 等待冷却期...

// 第二步：手动执行提取
await executeWithdraw(0);
```

### 显示倒计时

```typescript
const [countdown, setCountdown] = useState<string>("");

await smartWithdraw(
  { poolId: 0, amount },
  {
    onCooldownRemaining: (blocks, time) => {
      setCountdown(`还需等待 ${time}（${blocks} 个区块）`);
    },
  }
);
```

## ⚙️ 时间计算

Hook 会自动计算冷却期剩余时间：

- **基于区块数**：准确计算剩余区块
- **估算时间**：基于 Sepolia 平均出块时间（12秒）
- **友好显示**：自动转换为秒/分钟/小时/天

```typescript
// 示例输出
"48秒"; // < 1分钟
"5分钟"; // < 1小时
"2小时"; // < 1天
"3天"; // >= 1天
```

## 🎯 最佳实践

### 1. 总是处理错误

```typescript
try {
  await smartWithdraw(params);
} catch (error) {
  if (error.message.includes("冷却期")) {
    // 显示倒计时
  } else if (error.message.includes("钱包")) {
    // 提示连接钱包
  } else {
    // 其他错误处理
  }
}
```

### 2. 提供用户反馈

```typescript
await smartWithdraw(params, {
  onRequestStart: () => showToast("正在申请解质押..."),
  onRequestSuccess: () => showToast("申请成功！"),
  onWithdrawStart: () => showToast("正在提取..."),
  onWithdrawSuccess: () => showToast("提取成功！"),
  onCooldownRemaining: (_, time) => showToast(`还需等待 ${time}`),
});
```

### 3. 禁用按钮防止重复点击

```typescript
<button
  onClick={handleWithdraw}
  disabled={isProcessing}
>
  {isProcessing ? '处理中...' : '提取'}
</button>
```

### 4. 定期检查状态

```typescript
useEffect(() => {
  const interval = setInterval(async () => {
    const status = await checkWithdrawStatus(poolId);
    if (status.canWithdraw) {
      setShowWithdrawButton(true);
    }
  }, 30000); // 每30秒检查一次

  return () => clearInterval(interval);
}, [poolId]);
```

## 🔍 调试

Hook 提供详细的控制台日志：

```
🔍 步骤1: 检查提取状态...
📝 步骤2: 未发现解质押请求，开始申请...
🔄 开始申请解质押: Pool 0, 数量: 100000000000000000000
✅ 申请解质押成功: 0x123...
⏳ 申请成功！需要等待约 2小时（600 个区块）后才能提取
```

或者：

```
🔍 步骤1: 检查提取状态...
✅ 步骤4: 冷却期已结束，开始提取... (1 个可执行请求)
🔄 开始执行提取: Pool 0
✅ 提取成功: 0x456...
🎉 提取完成！
```

## 🛠️ 故障排除

### 错误：钱包未连接

- 确保在调用前已连接钱包
- 检查 `wallet.address` 是否存在

### 错误：无法获取当前区块号

- 检查网络连接
- 确认 Sepolia 测试网是否可用
- 验证 RPC 节点是否正常

### 错误：提取失败

- 检查是否有足够的 Gas
- 确认解质押请求是否真的可执行
- 查看合约事件日志排查原因

## 📝 注意事项

1. **冷却期时间**：仅为估算，实际以区块数为准
2. **多个请求**：如有多个可执行请求，会一次性全部提取
3. **Gas 费用**：申请和提取都需要支付 Gas
4. **网络延迟**：区块确认可能需要等待几秒到几分钟

## 🔗 相关文档

- [useApproveAndStake](./useApproveAndStake.ts) - 质押相关操作
- [MultiStakeViemService](../services/MultiStakeViemService.ts) - 合约服务
- [合约文档](../../docs/) - 合约详细说明
