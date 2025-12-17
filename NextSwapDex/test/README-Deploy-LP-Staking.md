# LP 质押系统部署指南

## 📋 快速开始

### 1. 部署合约

使用测试方式部署（推荐，自动保存配置）：

```bash
# 在 localhost 网络部署
npx hardhat test test/deploy_lp_staking.test.ts --network localhost

# 在 sepolia 网络部署
npx hardhat test test/deploy_lp_staking.test.ts --network sepolia
```

### 2. 运行质押测试

部署完成后，运行质押功能测试：

```bash
npx hardhat test test/lp_staking.test.ts --network localhost
```

## 📦 部署的合约

部署脚本会按顺序部署以下合约：

1. **NextswapToken** - 治理和奖励代币
2. **NextswapTimeLock** - 时间锁合约（用于治理）
3. **LiquidityMiningReward** - 流动性挖矿奖励分配合约
4. **LpPoolManager** - LP 质押池管理器

### 额外功能

- ✅ 自动转移 10,000,000 代币到奖励池
- ✅ 自动配置 TimeLock 权限
- ✅ 自动创建 USDC-DAI 测试质押池
- ✅ 自动激活测试池

## 🔧 配置文件

部署信息会自动保存到：

- `deployments/localhost-deployment.json` (localhost 网络)
- `deployments/sepolia-deployment.json` (sepolia 网络)

## 📝 部署参数

### NextswapToken

- `owner`: 部署账户地址

### NextswapTimeLock

- `minDelay`: 2 天 (172800 秒)
- `proposers`: [部署账户]
- `executors`: [部署账户]
- `admin`: 部署账户

### LiquidityMiningReward

- `nextSwapToken`: NextswapToken 地址
- `nextSwapPerSecond`: 0.1 代币/秒
- `startTime`: 部署时的当前时间
- `bonusEndTime`: 开始时间 + 1 年

### LpPoolManager

- `liquidityMiningReward`: LiquidityMiningReward 地址
- `positionManager`: NonfungiblePositionManager 地址

### 测试质押池 (USDC-DAI)

- `tokenA`: USDC 地址
- `tokenB`: DAI 地址
- `fee`: 500 (0.05%)
- `allocPoint`: 100

## 🎯 验证合约

部署脚本包含验证测试，可以单独运行：

```bash
# 验证 NextswapToken
npx hardhat test test/deploy_lp_staking.test.ts --grep "NextswapToken"

# 验证 LpPoolManager
npx hardhat test test/deploy_lp_staking.test.ts --grep "LpPoolManager"
```

## 📊 部署后检查

### 检查合约状态

```bash
# 检查 NextswapToken 余额
npx hardhat console --network localhost
> const token = await ethers.getContractAt("NextswapToken", "TOKEN_ADDRESS")
> await token.balanceOf("REWARD_CONTRACT_ADDRESS")

# 检查质押池
> const manager = await ethers.getContractAt("LpPoolManager", "MANAGER_ADDRESS")
> await manager.getPoolsCount()
> await manager.totalAllocPoint()
```

## 🚀 使用示例

### 创建新的质押池

```typescript
const lpPoolManager = await ethers.getContractAt(
  "LpPoolManager",
  managerAddress
);

const poolConfig = {
  poolId: 0,
  poolAddress: ethers.ZeroAddress,
  tokenA: token0Address,
  tokenB: token1Address,
  fee: 3000, // 0.3%
  allocPoint: 200,
};

await lpPoolManager.addLpPool(poolConfig);
```

### 激活质押池

```typescript
const poolId = 1; // 从 0 开始
const poolData = await lpPoolManager.lpPools(poolId);
const lpPoolContract = await ethers.getContractAt(
  "LpPoolContract",
  poolData.poolAddress
);

await lpPoolContract.activatePool(true);
```

## ⚠️ 注意事项

1. **前置条件**：必须先部署 DEX 核心合约（NonfungiblePositionManager 等）
2. **测试代币**：确保 USDC 和 DAI 已部署（用于测试池）
3. **奖励代币**：部署后会自动转移 10,000,000 代币到奖励池
4. **权限管理**：TimeLock 自动获得管理权限
5. **池子激活**：新创建的池子默认未激活，需要手动激活

## 🔍 故障排除

### 问题：找不到 NonfungiblePositionManager

**解决**：先部署 DEX 核心合约

```bash
npx hardhat test test/deploy_netxtswap.test.ts --network localhost
```

### 问题：验证时时间参数不匹配

**解决**：从部署文件中获取准确的时间参数，或跳过时间相关合约的验证

### 问题：测试池创建失败

**解决**：检查 USDC 和 DAI 是否已部署，或在部署脚本中跳过测试池创建

## 📚 相关文档

- [LP 质押测试说明](./README-LP-Staking.md)
- [LpPoolContract.sol](../contracts/contract/LpPoolContract.sol)
- [LpPoolManager.sol](../contracts/contract/LpPoolManager.sol)
- [LiquidityMiningReward.sol](../contracts/contract/token_distribution/LiquidityMiningReward.sol)
