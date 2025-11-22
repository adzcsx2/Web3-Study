# Uniswap V3 快速开始指南

## 一、初始化配置

### 1. 网络地址配置

```typescript
// Sepolia 测试网
const SEPOLIA_V3 = {
  swapRouter: "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E",
  nonfungiblePositionManager: "0x1238536071E1c677A632429e3655c799b22cDA52",
  factory: "0x0227628f3F023bb0B980b67D528571c95c6DaC1c",
  WETH9: "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9",
};

// 主网
const MAINNET_V3 = {
  swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
  nonfungiblePositionManager: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
  factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
  WETH9: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
};
```

### 2. 初始化 V3 组件

```solidity
// 1. 初始化
await liquidityManager.initializeLiquidity(
  SEPOLIA_V3.swapRouter,
  SEPOLIA_V3.nonfungiblePositionManager,
  SEPOLIA_V3.factory,
  3000 // 0.3% 费率
);

// 2. 创建池子
await liquidityManager.createPool();

// 3. 验证
const poolAddress = await liquidityManager.getUniswapV3Pool();
console.log("池子地址:", poolAddress);
```

## 二、添加流动性

### 方式 1: 全范围流动性（类似 V2）

```solidity
// Tick 范围（全范围）
const tickLower = -887220;
const tickUpper = 887220;

// 准备参数
const params = {
  token0: TOKEN_ADDRESS,
  token1: WETH_ADDRESS,
  fee: 3000,
  tickLower: tickLower,
  tickUpper: tickUpper,
  amount0Desired: ethers.parseEther("1000"),
  amount1Desired: ethers.parseEther("0.5"),
  amount0Min: ethers.parseEther("900"),
  amount1Min: ethers.parseEther("0.45"),
  recipient: YOUR_ADDRESS,
  deadline: Math.floor(Date.now() / 1000) + 300
};

// 授权代币
await token0.approve(nftPositionManager, params.amount0Desired);
await token1.approve(nftPositionManager, params.amount1Desired);

// 添加流动性
const tx = await liquidityManager.mintNewPosition(
  params.token0,
  params.token1,
  params.fee,
  params.tickLower,
  params.tickUpper,
  params.amount0Desired,
  params.amount1Desired,
  params.amount0Min,
  params.amount1Min,
  params.recipient,
  params.deadline
);

const receipt = await tx.wait();
console.log("NFT Token ID:", receipt.logs[0].args.tokenId);
```

### 方式 2: 集中流动性（当前价格附近）

```typescript
// 获取当前价格信息
const slot0 = await pool.slot0();
const currentTick = slot0.tick;
const tickSpacing = 60; // 0.3% 费率的 tick spacing

// 计算范围（当前价格 ±10%）
function nearestUsableTick(tick: number, spacing: number) {
  return Math.round(tick / spacing) * spacing;
}

const tickRange = 100; // 调整这个值来控制范围宽度
const tickLower = nearestUsableTick(
  currentTick - tickRange * tickSpacing,
  tickSpacing
);
const tickUpper = nearestUsableTick(
  currentTick + tickRange * tickSpacing,
  tickSpacing
);

// 然后使用上面的参数添加流动性
```

### 方式 3: 增加现有头寸流动性

```solidity
const tokenId = 12345; // 你的 NFT Token ID

await liquidityManager.increaseLiquidity(
  tokenId,
  ethers.parseEther("500"),  // amount0Desired
  ethers.parseEther("0.25"), // amount1Desired
  ethers.parseEther("450"),  // amount0Min
  ethers.parseEther("0.22"), // amount1Min
  Math.floor(Date.now() / 1000) + 300 // deadline
);
```

## 三、移除流动性

```solidity
const tokenId = 12345;

// 1. 获取头寸信息
const position = await liquidityManager.getPositionInfo(tokenId);
const liquidity = position.liquidity;

// 2. 减少流动性
await liquidityManager.decreaseLiquidity(
  tokenId,
  liquidity / 2n, // 移除一半
  0,              // amount0Min
  0,              // amount1Min
  Math.floor(Date.now() / 1000) + 300
);

// 3. 收取代币（包括手续费）
await liquidityManager.collectFees(
  tokenId,
  YOUR_ADDRESS
);
```

## 四、代币交换

### 单次交换（两个代币直接交换）

```solidity
// Token A -> Token B
await liquidityManager.swapExactInputSingle(
  TOKEN_A_ADDRESS,
  TOKEN_B_ADDRESS,
  3000, // 0.3% fee
  ethers.parseEther("100"), // amountIn
  ethers.parseEther("90"),  // amountOutMinimum
  YOUR_ADDRESS,
  Math.floor(Date.now() / 1000) + 300
);
```

### 多跳交换（经过多个池子）

```solidity
// Token A -> Token B -> Token C
// 路径编码: A (20字节) + fee (3字节) + B (20字节) + fee (3字节) + C (20字节)

const path = ethers.solidityPacked(
  ["address", "uint24", "address", "uint24", "address"],
  [
    TOKEN_A_ADDRESS,
    3000,           // A->B 使用 0.3%
    TOKEN_B_ADDRESS,
    500,            // B->C 使用 0.05%
    TOKEN_C_ADDRESS
  ]
);

await liquidityManager.swapExactInput(
  path,
  ethers.parseEther("100"), // amountIn
  ethers.parseEther("85"),  // amountOutMinimum
  YOUR_ADDRESS,
  Math.floor(Date.now() / 1000) + 300
);
```

### 精确输出交换

```solidity
// 我想得到精确数量的 Token B，最多花费多少 Token A
await liquidityManager.swapExactOutputSingle(
  TOKEN_A_ADDRESS,
  TOKEN_B_ADDRESS,
  3000,
  ethers.parseEther("100"),  // amountOut (想要得到的)
  ethers.parseEther("120"),  // amountInMaximum (最多花费)
  YOUR_ADDRESS,
  Math.floor(Date.now() / 1000) + 300
);
```

## 五、查询功能

### 查询头寸信息

```solidity
const tokenId = 12345;

const info = await liquidityManager.getPositionInfo(tokenId);
console.log("Token0:", info.token0);
console.log("Token1:", info.token1);
console.log("Fee Tier:", info.fee);
console.log("Tick Lower:", info.tickLower);
console.log("Tick Upper:", info.tickUpper);
console.log("Liquidity:", info.liquidity);
```

### 查询池子状态

```solidity
const slot0 = await liquidityManager.getPoolSlot0();

console.log("Current Price (sqrtPriceX96):", slot0.sqrtPriceX96);
console.log("Current Tick:", slot0.tick);
console.log("Pool Unlocked:", slot0.unlocked);

// 将 sqrtPriceX96 转换为实际价格
const Q96 = 2n ** 96n;
const price = (slot0.sqrtPriceX96 / Q96) ** 2;
console.log("Price:", price);
```

### 查询所有流动性 NFT

```solidity
const tokenIds = await liquidityManager.getLiquidityTokenIds();
console.log("所有 NFT Token IDs:", tokenIds);

// 遍历所有头寸
for (const tokenId of tokenIds) {
  const info = await liquidityManager.getPositionInfo(tokenId);
  console.log(`Token ${tokenId}:`, info);
}
```

## 六、收取手续费

```solidity
const tokenId = 12345;

// 收取所有累积的手续费
const tx = await liquidityManager.collectFees(
  tokenId,
  YOUR_ADDRESS
);

const receipt = await tx.wait();
console.log("收取成功:", receipt.transactionHash);
```

## 七、费率选择指南

| 费率  | 值    | Tick Spacing | 适用场景               |
| ----- | ----- | ------------ | ---------------------- |
| 0.05% | 500   | 10           | 稳定币对（USDC/USDT）  |
| 0.3%  | 3000  | 60           | 主流币对（ETH/USDC）   |
| 1%    | 10000 | 200          | 长尾币对或波动大的代币 |

## 八、常见价格范围策略

### 1. 全范围（保守策略）

```javascript
tickLower: -887220;
tickUpper: 887220;
// 优点：不需要管理，永远在范围内
// 缺点：手续费收益较低
```

### 2. 窄范围（激进策略）

```javascript
// 当前价格 ±5%
const range = calculateTickRange(currentTick, 0.05);
// 优点：手续费收益高
// 缺点：需要频繁调整
```

### 3. 中等范围（平衡策略）

```javascript
// 当前价格 ±20%
const range = calculateTickRange(currentTick, 0.2);
// 优点：平衡收益和管理成本
// 缺点：仍需定期检查
```

## 九、完整示例：从初始化到添加流动性

```typescript
import { ethers } from "hardhat";

async function main() {
  // 1. 获取合约实例
  const diamond = await ethers.getContractAt(
    "ShibMemeDiamond",
    DIAMOND_ADDRESS
  );

  const liquidityManager = await ethers.getContractAt(
    "LiquidityManagerV3",
    DIAMOND_ADDRESS
  );

  // 2. 初始化 V3
  console.log("初始化 V3 组件...");
  await liquidityManager.initializeLiquidity(
    SEPOLIA_V3.swapRouter,
    SEPOLIA_V3.nonfungiblePositionManager,
    SEPOLIA_V3.factory,
    3000
  );

  // 3. 创建池子
  console.log("创建池子...");
  const createPoolTx = await liquidityManager.createPool();
  await createPoolTx.wait();

  const poolAddress = await liquidityManager.getUniswapV3Pool();
  console.log("池子地址:", poolAddress);

  // 4. 准备流动性参数
  const diamondAddr = await diamond.getAddress();
  const weth = SEPOLIA_V3.WETH9;

  // 确定 token0 和 token1 顺序
  const [token0, token1] =
    diamondAddr.toLowerCase() < weth.toLowerCase()
      ? [diamondAddr, weth]
      : [weth, diamondAddr];

  // 5. 授权代币
  const erc20 = await ethers.getContractAt("ERC20Facet", diamondAddr);
  await erc20.approve(
    SEPOLIA_V3.nonfungiblePositionManager,
    ethers.parseEther("10000")
  );

  // 6. 添加流动性
  console.log("添加流动性...");
  const mintTx = await liquidityManager.mintNewPosition(
    token0,
    token1,
    3000,
    -887220, // 全范围
    887220,
    ethers.parseEther("1000"),
    ethers.parseEther("0.1"),
    ethers.parseEther("900"),
    ethers.parseEther("0.09"),
    await ethers.getSigners()[0].getAddress(),
    Math.floor(Date.now() / 1000) + 300
  );

  const receipt = await mintTx.wait();
  console.log("添加成功! Gas:", receipt.gasUsed.toString());

  // 7. 获取 NFT Token ID
  const tokenIds = await liquidityManager.getLiquidityTokenIds();
  console.log("NFT Token ID:", tokenIds[tokenIds.length - 1]);
}

main().catch(console.error);
```

## 十、故障排查

### 问题 1: "STF" (SafeTransferFrom failed)

**原因**: 代币未授权或余额不足  
**解决**: 检查授权和余额

```solidity
await token.approve(nftPositionManager, amount);
const balance = await token.balanceOf(yourAddress);
```

### 问题 2: "Price slippage check"

**原因**: 价格波动超过设定的滑点保护  
**解决**: 增加 `amount0Min` 和 `amount1Min` 的容错范围

### 问题 3: "TLU" (Tick Lower > Tick Upper)

**原因**: tick 范围设置错误  
**解决**: 确保 tickLower < tickUpper

### 问题 4: "TLM" (Tick Lower Mismatch)

**原因**: tick 不符合 tickSpacing 要求  
**解决**: 使用 `nearestUsableTick` 函数

```javascript
function nearestUsableTick(tick, spacing) {
  return Math.round(tick / spacing) * spacing;
}
```

## 十一、Gas 优化建议

1. **批量操作**: 使用 `multicall` 减少交易次数
2. **合理范围**: 避免频繁调整头寸
3. **费率选择**: 高流动性池使用低费率
4. **收费时机**: 累积一定金额后再收取

## 十二、安全检查清单

- [ ] 代币授权量合理（不要授权过多）
- [ ] 设置合理的滑点保护
- [ ] 使用 deadline 防止交易被长时间挂起
- [ ] 验证代币地址的正确性
- [ ] 测试网充分测试后再上主网
- [ ] 监控头寸是否仍在价格范围内
