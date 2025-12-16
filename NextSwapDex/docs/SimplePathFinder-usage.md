# SimplePathFinder 使用指南

## 快速开始

### 1. 基本用法

```typescript
import { ethers } from "hardhat";
import { SimplePathFinder } from "../scripts/utils/SimplePathFinder";
import { encodeV3Path } from "../scripts/utils/Maths";
import { Decimals } from "../scripts/types/Enum";

// 导入部署配置
import deployment from "../deployments/localhost-deployment.json";

// 初始化
const pathFinder = new SimplePathFinder(
  deployment.contracts.NextswapV3Factory.proxyAddress,
  deployment.contracts.Quoter.proxyAddress,
  [WETH_ADDRESS, DAI_ADDRESS, USDT_ADDRESS] // 中间代币
);

// 查找最优路径
const pathInfo = await pathFinder.findBestPath(
  USDC_ADDRESS,
  WBTC_ADDRESS,
  ethers.parseUnits("100", Decimals.USDC) // 100 USDC
);

// 查看结果
console.log("路径:", pathFinder.formatPath(pathInfo));
console.log(
  "预期输出:",
  ethers.formatUnits(pathInfo.expectedOutput, Decimals.WBTC)
);
```

### 2. 执行交换

```typescript
// 批准代币
const swapRouterAddress = deployment.contracts.SwapRouter.proxyAddress;
const usdcContract = await ethers.getContractAt("ERC20", USDC_ADDRESS);
await usdcContract.approve(swapRouterAddress, amountIn);

// 编码路径
const encodedPath = encodeV3Path(pathInfo.tokens, pathInfo.fees);

// 执行交换
const swapRouter = await ethers.getContractAt("SwapRouter", swapRouterAddress);
const tx = await swapRouter.exactInput({
  path: encodedPath,
  recipient: userAddress,
  deadline: Math.floor(Date.now() / 1000) + 60 * 20,
  amountIn: amountIn,
  amountOutMinimum: (pathInfo.expectedOutput * 995n) / 1000n, // 0.5% 滑点
});

await tx.wait();
console.log("交换成功!", tx.hash);
```

### 3. 完整示例

```typescript
async function smartSwap(
  tokenInAddress: string,
  tokenOutAddress: string,
  amountIn: bigint,
  decimalsIn: number,
  decimalsOut: number
) {
  // 1. 创建路径查找器
  const pathFinder = new SimplePathFinder(
    factoryAddress,
    quoterAddress,
    [WETH, DAI, USDT] // 常用中间代币
  );

  // 2. 查找最优路径
  console.log("正在查找最优路径...");
  const pathInfo = await pathFinder.findBestPath(
    tokenInAddress,
    tokenOutAddress,
    amountIn
  );

  console.log("找到最优路径:", pathFinder.formatPath(pathInfo));
  console.log("跳数:", pathInfo.hops);
  console.log(
    "预期输出:",
    ethers.formatUnits(pathInfo.expectedOutput, decimalsOut)
  );

  // 3. 批准代币
  const tokenIn = await ethers.getContractAt("ERC20", tokenInAddress);
  await tokenIn.approve(swapRouterAddress, amountIn);

  // 4. 编码路径
  const encodedPath = encodeV3Path(pathInfo.tokens, pathInfo.fees);

  // 5. 执行交换
  const swapRouter = await ethers.getContractAt(
    "SwapRouter",
    swapRouterAddress
  );

  const tx = await swapRouter.exactInput({
    path: encodedPath,
    recipient: await ethers.provider.getSigner().getAddress(),
    deadline: Math.floor(Date.now() / 1000) + 60 * 20,
    amountIn: amountIn,
    amountOutMinimum: (pathInfo.expectedOutput * 995n) / 1000n,
  });

  const receipt = await tx.wait();
  console.log("交换成功!");
  console.log("交易哈希:", tx.hash);
  console.log("Gas 使用:", receipt.gasUsed.toString());

  return { pathInfo, tx, receipt };
}

// 使用示例
const result = await smartSwap(
  USDC_ADDRESS,
  WBTC_ADDRESS,
  ethers.parseUnits("100", Decimals.USDC),
  Decimals.USDC,
  Decimals.WBTC
);
```

## API 文档

### SimplePathFinder 类

#### 构造函数

```typescript
constructor(
  factoryAddress: string,    // NextswapV3Factory 合约地址
  quoterAddress: string,     // Quoter 合约地址
  intermediateTokens: string[] // 中间代币数组
)
```

#### findBestPath()

查找两个代币之间的最优交换路径。

```typescript
async findBestPath(
  tokenIn: string,   // 输入代币地址
  tokenOut: string,  // 输出代币地址
  amountIn: bigint   // 输入数量（原始单位）
): Promise<PathInfo>
```

**返回值：PathInfo**

```typescript
interface PathInfo {
  tokens: string[]; // 代币地址数组
  fees: number[]; // 费率数组
  expectedOutput: bigint; // 预期输出（原始单位）
  hops: number; // 跳数
}
```

#### formatPath()

格式化路径用于显示。

```typescript
formatPath(pathInfo: PathInfo): string
```

返回示例：`0x9fE4...6e0 --(0.05%)--> 0xe7f1...0b9 --(0.3%)--> 0xDc64...6C9`

## 配置建议

### 中间代币选择

选择流动性最好的代币作为中间代币：

```typescript
const intermediateTokens = [
  config.WETH9, // ✅ 最重要 - ETH 的包装版本
  config.DAI, // ✅ 稳定币桥接
  config.USDT, // ✅ 另一个主流稳定币
  config.USDC, // 可选 - 如果 USDC 不是输入/输出代币
];
```

### 滑点设置

根据代币类型设置合理的滑点：

```typescript
// 稳定币对（USDC <-> DAI）
const minOut = (expectedOutput * 999n) / 1000n; // 0.1% 滑点

// 相关资产（WETH <-> WBTC）
const minOut = (expectedOutput * 995n) / 1000n; // 0.5% 滑点

// 波动资产
const minOut = (expectedOutput * 970n) / 1000n; // 3% 滑点
```

## 常见问题

### Q: 如何处理"未找到有效的交换路径"错误？

**A:**

1. 增加中间代币数量
2. 确保相关池子存在且有流动性
3. 降低交换数量

```typescript
// 添加更多中间代币
const pathFinder = new SimplePathFinder(
  factoryAddress,
  quoterAddress,
  [WETH, DAI, USDT, USDC, WBTC] // 更多选择
);
```

### Q: 如何优化查询速度？

**A:**

1. 限制中间代币数量（3-5 个最常用的）
2. 使用缓存存储已知路径
3. 并行查询多个路径

```typescript
// 缓存示例
const pathCache = new Map<string, PathInfo>();
const cacheKey = `${tokenIn}-${tokenOut}-${amountIn}`;

if (pathCache.has(cacheKey)) {
  return pathCache.get(cacheKey);
}

const path = await pathFinder.findBestPath(...);
pathCache.set(cacheKey, path);
```

### Q: 如何处理大额交换的价格影响？

**A:**

1. 分批执行
2. 检查多个路径
3. 设置合理的滑点保护

```typescript
// 分批示例
const batchSize = ethers.parseUnits("1000", Decimals.USDC);
const batches = Number(amountIn / batchSize);

for (let i = 0; i < batches; i++) {
  const path = await pathFinder.findBestPath(tokenIn, tokenOut, batchSize);
  await executeSwap(path);
  await new Promise((resolve) => setTimeout(resolve, 5000)); // 等待5秒
}
```

## 高级用法

### 比较多个路径

```typescript
// 获取所有可能的路径
async function getAllPaths(
  tokenIn: string,
  tokenOut: string,
  amountIn: bigint
) {
  const paths = [];

  // 尝试不同的中间代币组合
  const intermediateTokenSets = [
    [WETH],
    [DAI],
    [WETH, DAI],
    [WETH, USDT],
    [DAI, WETH],
  ];

  for (const intermediates of intermediateTokenSets) {
    try {
      const pathFinder = new SimplePathFinder(
        factoryAddress,
        quoterAddress,
        intermediates
      );

      const path = await pathFinder.findBestPath(tokenIn, tokenOut, amountIn);
      paths.push(path);
    } catch (error) {
      continue; // 跳过无效路径
    }
  }

  // 返回输出最大的路径
  return paths.reduce((best, current) =>
    current.expectedOutput > best.expectedOutput ? current : best
  );
}
```

### 实时价格监控

```typescript
async function monitorPrice(
  tokenIn: string,
  tokenOut: string,
  interval: number = 5000
) {
  const pathFinder = new SimplePathFinder(factoryAddress, quoterAddress, [
    WETH,
    DAI,
    USDT,
  ]);

  const amountIn = ethers.parseUnits("1", Decimals.USDC);

  setInterval(async () => {
    try {
      const path = await pathFinder.findBestPath(tokenIn, tokenOut, amountIn);
      const price = ethers.formatUnits(path.expectedOutput, Decimals.WBTC);

      console.log(`当前价格: 1 USDC = ${price} WBTC`);
      console.log(`路径: ${pathFinder.formatPath(path)}`);
    } catch (error) {
      console.error("获取价格失败:", error.message);
    }
  }, interval);
}
```

## 总结

SimplePathFinder 提供了一个简单但强大的智能路由解决方案：

✅ **优点**

- 无外部依赖，避免兼容性问题
- 直接使用链上合约查询，结果准确
- 代码简洁，易于理解和维护
- 支持多跳路径（最多 3 跳）
- 自动选择最优费率

⚠️ **限制**

- 需要预先配置中间代币
- 查询速度取决于尝试的路径数量
- 仅支持 V3 协议

💡 **最佳实践**

- 选择流动性最好的 3-5 个代币作为中间代币
- 为不同场景设置合理的滑点
- 使用缓存提高性能
- 监控 Gas 成本

## 相关资源

- [完整代码](../scripts/utils/SimplePathFinder.ts)
- [测试用例](../test/swap.test.ts)
- [智能路由指南](./smart-routing-guide.md)
