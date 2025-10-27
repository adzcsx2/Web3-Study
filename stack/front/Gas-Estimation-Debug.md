# Gas 估算失败诊断指南

## 错误信息分析

```
❌ Gas 估算失败: ContractFunctionExecutionError:
The contract function "stakeInPool" reverted.

Contract Call:
  address:   0xA1e941c8f85A7d73c7EC81f8C562af9cb5E9b2EE
  function:  stakeInPool(uint256 poolId, uint256 amount)
  args:                 (6, 10000000000000000)  // poolId: 6, amount: 0.01 ETH
```

## 🔍 可能原因（按概率排序）

### 1. ❌ **池子ID不存在或不活跃** (最可能)

- 使用 `poolId = 6` 可能该池子不存在
- 或者该池子已停用 (V2 deactivated)
- **验证方法**:
  ```typescript
  const exists = await service.poolExists(6);
  const active = await service.isPoolActive(6, true); // true 强制刷新
  const poolInfo = await service.getPoolInfo(6, true);
  console.log("Pool Info:", poolInfo);
  ```

### 2. ❌ **池子未启动或已结束**

- `poolInfo.startTime > 当前时间` → 尚未启动
- `poolInfo.endTime < 当前时间` → 已结束
- **验证方法**:
  ```typescript
  const canStake = await service.validatePoolForStaking(6, true);
  console.log("Can stake validation:", canStake);
  ```

### 3. ❌ **质押金额太小或不符合要求**

- 质押金额 `10000000000000000` wei = 0.01 ETH
- 可能低于最小质押金额 `poolInfo.minDepositAmount`
- **验证方法**:

  ```typescript
  const poolInfo = await service.getPoolInfo(6, true);
  console.log("Min deposit:", poolInfo.minDepositAmount.toString());
  console.log("Your amount:", "10000000000000000");

  const canStake = await service.canUserStake(
    6,
    BigInt("10000000000000000"),
    true
  );
  console.log("Can stake:", canStake);
  ```

### 4. ❌ **用户被黑名单或没有权限**

- 当前用户地址在黑名单中
- **验证方法**:
  ```typescript
  const isPaused = await service.isPaused(true);
  const isBlacklisted = await service.isBlacklisted(
    "your_wallet_address",
    true
  );
  console.log("Contract paused:", isPaused);
  console.log("User blacklisted:", isBlacklisted);
  ```

### 5. ❌ **合约暂停或处于特殊状态**

- 合约被暂停 (paused)
- 合约被紧急暂停 (emergencyPaused)
- **验证方法**:
  ```typescript
  const paused = await service.isPaused(true);
  if (paused) {
    console.error("合约已暂停，无法进行质押操作");
  }
  ```

### 6. ❌ **余额不足**

- 账户 ETH 余额不足支付交易费 + 质押金额
- **验证方法**:
  ```typescript
  const walletClient = getWalletClient();
  const balance = await publicClient.getBalance({ account: "your_address" });
  console.log("Balance (wei):", balance.toString());
  console.log("Balance (ETH):", formatEther(balance));
  ```

### 7. ⚠️ **网络/RPC 问题** (概率最低)

- Sepolia RPC 服务暂时不稳定
- 但这通常会显示不同的错误信息

---

## 🛠️ 完整诊断脚本

```typescript
import { multiStakeViemContract } from "@/services/MultiStakeViemService";
import { formatEther } from "viem";

async function diagnoseStakingIssue(
  poolId: number,
  amount: bigint,
  userAddress: string
) {
  console.log("🔍 开始诊断 Gas 估算失败问题...\n");

  try {
    // 1. 检查池子是否存在
    console.log("1️⃣ 检查池子是否存在...");
    const exists = await multiStakeViemContract.poolExists(poolId, true);
    console.log(`   池子存在: ${exists}\n`);

    if (!exists) {
      console.error("❌ 池子 ID 不存在！请检查 poolId");
      return;
    }

    // 2. 获取池子信息
    console.log("2️⃣ 获取池子信息...");
    const poolInfo = await multiStakeViemContract.getPoolInfo(poolId, true);
    console.log(`   池子活跃: ${poolInfo.isActive}`);
    console.log(`   最小质押: ${formatEther(poolInfo.minDepositAmount)} ETH`);
    console.log(
      `   开始时间: ${new Date(Number(poolInfo.startTime) * 1000).toLocaleString()}`
    );
    console.log(
      `   结束时间: ${new Date(Number(poolInfo.endTime) * 1000).toLocaleString()}`
    );
    console.log(`   当前时间: ${new Date().toLocaleString()}\n`);

    // 3. 验证池子是否可以质押
    console.log("3️⃣ 验证池子可用性...");
    const validation = await multiStakeViemContract.validatePoolForStaking(
      poolId,
      true
    );
    console.log(`   验证结果: ${JSON.stringify(validation, null, 2)}\n`);

    if (!validation.canStake) {
      console.error("❌", validation.error);
      return;
    }

    // 4. 检查用户是否可以质押
    console.log("4️⃣ 检查用户质押资格...");
    const userStakeCheck = await multiStakeViemContract.canUserStake(
      poolId,
      amount,
      true
    );
    console.log(`   用户可质押: ${JSON.stringify(userStakeCheck, null, 2)}\n`);

    if (!userStakeCheck.canStake) {
      console.error("❌", userStakeCheck.reason);
      return;
    }

    // 5. 检查合约状态
    console.log("5️⃣ 检查合约状态...");
    const isPaused = await multiStakeViemContract.isPaused(true);
    const isBlacklisted = await multiStakeViemContract.isBlacklisted(
      userAddress,
      true
    );
    console.log(`   合约暂停: ${isPaused}`);
    console.log(`   用户被黑名单: ${isBlacklisted}\n`);

    if (isPaused) {
      console.error("❌ 合约已暂停，无法进行质押");
      return;
    }

    if (isBlacklisted) {
      console.error("❌ 用户已被黑名单");
      return;
    }

    // 6. 检查余额
    console.log("6️⃣ 检查账户余额...");
    const publicClient = getPublicClient();
    const balance = await publicClient.getBalance({ account: userAddress });
    console.log(`   账户余额: ${formatEther(balance)} ETH`);
    console.log(`   质押金额: ${formatEther(amount)} ETH`);
    console.log(`   足够支付: ${balance > amount}\n`);

    if (balance <= amount) {
      console.error("❌ 账户余额不足");
      return;
    }

    // 7. 尝试估算 Gas
    console.log("7️⃣ 尝试估算 Gas...");
    try {
      const gasEstimation = await multiStakeViemContract.estimateStakeInPoolGas(
        poolId,
        amount
      );
      console.log("✅ Gas 估算成功:");
      console.log(`   Gas Limit: ${gasEstimation.gasLimit.toString()}`);
      console.log(`   预估费用: ${gasEstimation.estimatedCost} ETH\n`);
    } catch (gasError) {
      console.error("❌ Gas 估算失败:");
      console.error(gasError);
    }
  } catch (error) {
    console.error("❌ 诊断过程中出错:", error);
  }
}

// 使用方法
// await diagnoseStakingIssue(6, BigInt("10000000000000000"), "0x...");
```

---

## 🚀 改进 Gas 估算的方案

### 方案 1: 添加重试机制

```typescript
// 在 viemContractUtils.ts 中修改 estimateGasInternal
async estimateGasInternal(options: ViemGasEstimationOptions) {
  const { maxRetries = 3, retryDelay = 1000 } = options;
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      // ... 现有的估算逻辑
      const estimatedGasLimit = await client.estimateContractGas({
        address: contractAddress,
        abi: contractAbi,
        functionName,
        args: args.length > 0 ? args : undefined,
        value,
      });
      return { gasLimit: estimatedGasLimit, /* ... */ };
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        console.warn(`⚠️ Gas 估算失败，${retryDelay}ms 后重试 (${i + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  throw lastError || new Error("Gas estimation failed after retries");
}
```

### 方案 2: 跳过 Gas 估算，使用固定值

```typescript
const result = await service.stakeInPool(poolId, amount, {
  account: walletAccount,
  estimateGas: false, // 不估算 Gas
  gasLimit: BigInt(300000), // 直接指定 Gas Limit
});
```

### 方案 3: 添加更详细的错误日志

修改 `viemContractUtils.ts` 的 `estimateGasInternal`:

```typescript
catch (error) {
  const errorDetails = {
    message: error instanceof Error ? error.message : String(error),
    cause: error instanceof Error ? error.cause : null,
    timestamp: new Date().toISOString(),
    contractAddress,
    functionName,
    args,
  };
  console.error("❌ Gas 估算详细错误:", JSON.stringify(errorDetails, null, 2));
  throw error instanceof Error ? error : new Error(String(error));
}
```

---

## 📋 检查清单

- [ ] 池子 ID 是否正确存在
- [ ] 池子是否处于活跃期间 (startTime < now < endTime)
- [ ] 质押金额是否满足最小要求
- [ ] 合约是否处于暂停状态
- [ ] 用户是否被黑名单
- [ ] 账户 ETH 余额是否足够
- [ ] RPC 端点是否可用
- [ ] 是否使用了正确的网络 (Sepolia)

---

## 🔗 参考链接

- [Viem Gas Estimation 文档](https://viem.sh/docs/contract/estimateContractGas)
- [Sepolia 测试网状态](https://sepolia.etherscan.io)
- [合约 Reverted 错误诊断](https://github.com/wevm/viem/discussions)
