# Gas 估算修复 - 修改总结

## 修改文件
- `src/utils/viemContractUtils.ts`

## 修改内容

### 1. 静态方法 `estimateGas`（第 831 行）
**变化**: 允许 `account` 参数
```typescript
// 之前：
options: Omit<ViemContractWriteOptions, "account" | "walletClient">

// 之后：
options: Omit<ViemContractWriteOptions, "walletClient">
```

### 2. 私有方法 `estimateGasInternal`（第 842 行）
**变化**: 
- 允许 `account` 参数
- 解构 `account` 参数
- 在 `estimateContractGas` 调用中传递 `account`

```typescript
// 之前：
private static async estimateGasInternal(
  options: Omit<ViemContractWriteOptions, "account" | "walletClient">
): Promise<ViemGasEstimation> {
  const {
    contractAddress,
    contractAbi,
    functionName,
    args = [],
    value,
    publicClient,
    chain = VIEM_CONFIG.defaultChain,
  } = options;
  // ...
  const estimatedGasLimit = await client.estimateContractGas({
    address: contractAddress,
    abi: contractAbi,
    functionName,
    args: args.length > 0 ? args : undefined,
    value,
  });

// 之后：
private static async estimateGasInternal(
  options: Omit<ViemContractWriteOptions, "walletClient">
): Promise<ViemGasEstimation> {
  const {
    contractAddress,
    contractAbi,
    functionName,
    args = [],
    value,
    publicClient,
    chain = VIEM_CONFIG.defaultChain,
    account,  // ✅ 添加
  } = options;
  // ...
  const estimatedGasLimit = await client.estimateContractGas({
    address: contractAddress,
    abi: contractAbi,
    functionName,
    args: args.length > 0 ? args : undefined,
    value,
    account,  // ✅ 添加
  });
```

### 3. `writeInternal` 方法调用（第 1020 行）
**变化**: 传递 `account` 参数到 `estimateGasInternal`

```typescript
// 之前：
gasEstimation = await this.estimateGasInternal({
  contractAddress,
  contractAbi,
  functionName,
  args,
  value,
  publicClient,
  chain,
});

// 之后：
gasEstimation = await this.estimateGasInternal({
  contractAddress,
  contractAbi,
  functionName,
  args,
  value,
  publicClient,
  chain,
  account,  // ✅ 添加
});
```

### 4. 包装类 `estimateGas` 方法（第 1781 行）
**变化**: 移除 `account` 从排除列表中，允许通过 `options` 传递

```typescript
// 之前：
async estimateGas(
  functionName: string,
  args?: readonly unknown[],
  options?: Partial<
    Omit<
      ViemContractWriteOptions,
      | "contractAddress"
      | "contractAbi"
      | "functionName"
      | "args"
      | "account"  // ❌ 被排除
      | "walletClient"
      | "publicClient"
      | "chain"
    >
  >
): Promise<ViemGasEstimation>

// 之后：
async estimateGas(
  functionName: string,
  args?: readonly unknown[],
  options?: Partial<
    Omit<
      ViemContractWriteOptions,
      | "contractAddress"
      | "contractAbi"
      | "functionName"
      | "args"
      // ✅ account 不再被排除
      | "walletClient"
      | "publicClient"
      | "chain"
    >
  >
): Promise<ViemGasEstimation>
```

### 5. 便捷函数 `estimateViemContractGas`（第 1441 行）
**变化**: 添加 `account` 参数并转发

```typescript
// 之前：
export async function estimateViemContractGas(
  contractAddress: Address,
  contractAbi: Abi,
  functionName: string,
  args: readonly unknown[] = [],
  value?: bigint,
  publicClient?: PublicClient,
  chain?: Chain
): Promise<ViemGasEstimation>

// 之后：
export async function estimateViemContractGas(
  contractAddress: Address,
  contractAbi: Abi,
  functionName: string,
  args: readonly unknown[] = [],
  value?: bigint,
  publicClient?: PublicClient,
  chain?: Chain,
  account?: Account  // ✅ 添加
): Promise<ViemGasEstimation>
```

## 问题解决流程

### 问题
```
⚠️ Gas 估算失败，将跳过 Gas 估算:
错误: The contract function "stakeInPool" reverted.
```

### 根本原因
`client.estimateContractGas()` 在没有 `account` 参数的情况下调用，导致 viem 无法正确模拟交易发送者的状态。

合约函数中的检查无法执行：
- 账户黑名单检查
- 授权额度检查
- 用户特定的状态验证

### 解决方案
确保 `account` 参数从 `writeInternal` 一直传递到 `estimateContractGas` 调用。

### 调用链
```
useApproveAndStake.executeStake()
  └─> stakeInPool() [MultiStakeViemService]
    └─> executeWrite() [wrapper]
      └─> writeInternal() [ViemContractService]
        └─> estimateGasInternal() [ViemContractService] ✅ 现在有 account
          └─> client.estimateContractGas({account}) ✅ 现在有 account
```

## 验证步骤

1. ✅ TypeScript 编译检查通过（viemContractUtils.ts 无错误）
2. ✅ `account` 参数类型正确（Account | undefined）
3. ✅ 所有签名更新一致
4. ✅ 向后兼容（account 参数是可选的）

## 预期结果

修复后，当执行质押操作时：
1. ✅ Gas 估算会成功
2. ✅ 控制台输出 `💰 Gas 估算结果:` 而不是 `⚠️ Gas 估算失败`
3. ✅ 正确显示 Gas Limit 和 估算费用
4. ✅ 交易可以正常发送
