# 🔧 Gas 估算修复 - 快速参考

## 问题
```
⚠️ Gas 估算失败，将跳过 Gas 估算:
错误: The contract function "stakeInPool" reverted.
```

## 原因
Gas 估算时没有传递 `account` 参数给 `estimateContractGas()`，导致合约无法检查账户特定的状态。

## 解决方案
在 `viemContractUtils.ts` 中的 5 个位置添加 `account` 参数转发：

| 行号 | 方法 | 改动 |
|------|------|------|
| 831 | `estimateGas()` 静态方法 | 移除 account 从排除列表 |
| 842 | `estimateGasInternal()` 私有方法 | 移除 account 从排除列表，解构并传递 |
| 860 | `estimateContractGas()` 调用 | 添加 account 参数 |
| 1020 | `writeInternal()` 调用 | 添加 account 参数传递 |
| 1781 | `estimateGas()` 包装类方法 | 移除 account 从排除列表 |
| 1441 | `estimateViemContractGas()` 便捷函数 | 添加 account 参数 |

## 关键改动

### 核心修复（2 处）
```typescript
// estimateGasInternal - 添加 account
const { ..., account } = options;
const estimatedGasLimit = await client.estimateContractGas({
  ...,
  account,  // ✅ 关键
});

// writeInternal - 传递 account
gasEstimation = await this.estimateGasInternal({
  ...,
  account,  // ✅ 关键
});
```

### 类型签名修改（3 处）
```typescript
// 1. estimateGas 静态方法
options: Omit<ViemContractWriteOptions, "walletClient">  // 移除 "account"

// 2. estimateGasInternal 私有方法
options: Omit<ViemContractWriteOptions, "walletClient">  // 移除 "account"

// 3. 包装类 estimateGas 方法
options?: Partial<Omit<...>>  // 移除 "account" 从排除列表

// 4. 便捷函数 estimateViemContractGas
account?: Account  // 添加参数
```

## 文件变更
- **修改**: `src/utils/viemContractUtils.ts`
- **新增**: `GAS_ESTIMATION_FIX.md` （详细说明）
- **新增**: `GAS_ESTIMATION_FIX_SUMMARY.md` （修改总结）

## 测试验证
1. ✅ TypeScript 编译检查通过
2. ✅ 类型定义一致
3. ✅ 向后兼容（account 参数可选）

## 预期效果
质押操作时显示：
```
💰 Gas 估算结果:
  Gas Limit: 250000
  估算费用: 0.0123 ETH
```

而不是：
```
⚠️ Gas 估算失败，将跳过 Gas 估算:
```
