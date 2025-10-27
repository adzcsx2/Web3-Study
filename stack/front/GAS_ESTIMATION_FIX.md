# Gas 估算失败修复说明

## 问题描述
Gas 估算失败，错误信息：
```
⚠️ Gas 估算失败，将跳过 Gas 估算:
错误: The contract function "stakeInPool" reverted.
```

## 根本原因
在 `estimateGasInternal` 方法中调用 `client.estimateContractGas()` 时，**没有提供 `account` 参数**。

这导致：
1. Viem 无法正确模拟交易发送者的状态
2. 合约无法检查账户特定的状态（如黑名单、授权额度等）
3. 合约函数 revert，导致 gas 估算失败

## 修复方案

### 修改 1：更新 `estimateGas` 方法签名
**文件**: `src/utils/viemContractUtils.ts` - 第 831 行

从：
```typescript
static async estimateGas(
  options: Omit<ViemContractWriteOptions, "account" | "walletClient">
): Promise<ViemGasEstimation>
```

改为：
```typescript
static async estimateGas(
  options: Omit<ViemContractWriteOptions, "walletClient">
): Promise<ViemGasEstimation>
```

这样允许 `account` 参数被传递到 `estimateGas` 方法。

### 修改 2：更新 `estimateGasInternal` 方法
**文件**: `src/utils/viemContractUtils.ts` - 第 841 行

从：
```typescript
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
```

改为：
```typescript
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
    account,
  } = options;
  
  // ...
  const estimatedGasLimit = await client.estimateContractGas({
    address: contractAddress,
    abi: contractAbi,
    functionName,
    args: args.length > 0 ? args : undefined,
    value,
    account,  // ✅ 添加 account 参数
  });
```

### 修改 3：在 `writeInternal` 中传递 `account`
**文件**: `src/utils/viemContractUtils.ts` - 第 1020 行

从：
```typescript
if (estimateGas) {
  try {
    gasEstimation = await this.estimateGasInternal({
      contractAddress,
      contractAbi,
      functionName,
      args,
      value,
      publicClient,
      chain,
    });
```

改为：
```typescript
if (estimateGas) {
  try {
    gasEstimation = await this.estimateGasInternal({
      contractAddress,
      contractAbi,
      functionName,
      args,
      value,
      publicClient,
      chain,
      account,  // ✅ 传递 account 参数
    });
```

### 修改 4：更新包装类的 `estimateGas` 方法
**文件**: `src/utils/viemContractUtils.ts` - 第 1781 行

从：
```typescript
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
      | "account"        // ❌ 被排除
      | "walletClient"
      | "publicClient"
      | "chain"
    >
  >
): Promise<ViemGasEstimation>
```

改为：
```typescript
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
      // ✅ account 不再被排除，现在可以作为 options 的一部分传递
      | "walletClient"
      | "publicClient"
      | "chain"
    >
  >
): Promise<ViemGasEstimation>
```

同时更新文档说明 `account` 可以通过 `options` 参数传递。

### 修改 5：更新便捷函数 `estimateViemContractGas`
**文件**: `src/utils/viemContractUtils.ts` - 第 1441 行

从：
```typescript
export async function estimateViemContractGas(
  contractAddress: Address,
  contractAbi: Abi,
  functionName: string,
  args: readonly unknown[] = [],
  value?: bigint,
  publicClient?: PublicClient,
  chain?: Chain
): Promise<ViemGasEstimation>
```

改为：
```typescript
export async function estimateViemContractGas(
  contractAddress: Address,
  contractAbi: Abi,
  functionName: string,
  args: readonly unknown[] = [],
  value?: bigint,
  publicClient?: PublicClient,
  chain?: Chain,
  account?: Address  // ✅ 添加 account 参数
): Promise<ViemGasEstimation>
```

并在函数体中传递 `account`：
```typescript
return ViemContractService.estimateGas({
  contractAddress,
  contractAbi,
  functionName,
  args,
  value,
  publicClient: clientToUse,
  chain,
  account,  // ✅ 传递 account
});
```

## 验证修复

修复后的流程：
1. ✅ `useApproveAndStake.ts` 调用 `stakeInPool` 时传递 `account`
2. ✅ `stakeInPool` 调用 `executeWrite` 时传递 `account`
3. ✅ `executeWrite` 内部调用 `estimateGasInternal` 时传递 `account`
4. ✅ `estimateGasInternal` 调用 `client.estimateContractGas()` 时传递 `account`
5. ✅ Viem 可以正确模拟交易，合约能检查账户状态
6. ✅ Gas 估算成功！

## 测试建议

1. 再次尝试质押操作
2. 检查浏览器控制台是否显示：
   - `💰 Gas 估算结果:` 而不是 `⚠️ Gas 估算失败`
   - 正确的 Gas Limit 和 估算费用

## 相关文件
- `src/utils/viemContractUtils.ts` - 核心修改
- `src/services/MultiStakeViemService.ts` - 无需修改（已经传递 account 到 wrapper）
- `src/hooks/useApproveAndStake.ts` - 无需修改（已经传递 account）
