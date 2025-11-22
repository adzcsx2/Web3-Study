# ShibMeme Diamond - Web3 代币项目

一个基于 EIP-2535 Diamond 标准的 DeFi 代币项目，实现了一个具有税费机制、交易限制和流动性管理功能的 MEME 代币。

## 📋 项目概述

### 核心特性

- **🔷 EIP-2535 Diamond 架构**: 使用模块化切面设计，支持合约升级和功能扩展
- **💰 阶梯式税费系统**:
  - < 1,000 tokens: 0% 税费
  - 1,000-10,000 tokens: 2% 税费
  - > 10,000 tokens: 5% 税费
- **🛡️ 交易保护机制**:
  - 最大交易额度限制 (默认: 10,000 tokens)
  - 每日交易次数限制 (默认: 100 笔)
- **🏛️ 权限管理**: 完善的所有者权限和白名单系统
- **💧 流动性管理**: 内置 Uniswap V2 流动性添加功能
- **🔒 安全特性**: 重入攻击防护、事件记录、自定义错误处理

### 代币经济模型

- **总供应量**: 100,000,000 tokens (1亿)
- **分配机制**:
  - 40% (40M) → 合约地址 (用于流动性提供)
  - 10% (10M) → 部署者 (用于测试和早期推广)
  - 50% (50M) → 销毁地址 (通缩机制)

## 🏗️ 架构设计

### Diamond 模块结构

```
Diamond (主合约)
├── DiamondCutFacet     # 钻石切割功能 (添加/替换/移除切面)
├── DiamondLoupeFacet   # 钻石放大镜功能 (查询切面信息)
├── OwnershipFacet      # 所有权管理
├── ERC20Facet         # ERC20 基础功能 (转账、授权、余额查询)
├── ShibMemeFacet      # 代币核心业务逻辑 (税费、限制、配置)
└── LiquidityManager   # 流动性管理 (Uniswap 集成)
```

### 核心组件说明

#### Diamond.sol
- **作用**: 主代理合约，实现 EIP-2535 标准
- **功能**: 函数调用路由、存储管理
- **特点**: 通过 `fallback()` 和 `delegatecall` 实现模块化调用

#### ShibMemeFacet.sol
- **作用**: 代币核心业务逻辑实现
- **功能**:
  - `initializeShibMeme()`: 初始化代币参数
  - `sbtransfer()` / `sbtransferFrom()`: 带税费的转账函数
  - `provideInitialLiquidity()`: 初始流动性提供
  - 白名单管理和配置更新功能

#### ERC20Facet.sol
- **作用**: 标准 ERC20 功能实现
- **功能**:
  - 基础转账: `transfer()`, `transferFrom()`
  - 授权机制: `approve()`, `allowance()`
  - 状态查询: `balanceOf()`, `totalSupply()`, `name()`, `symbol()`

## 🚀 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0
- Git

### 安装依赖

```bash
# 克隆项目
git clone <repository-url>
cd MEME

# 安装依赖
npm install
```

### 环境配置

创建 `.env` 文件并配置以下变量:

```bash
# 网络配置
INFURA_PROJECT_ID=your_infura_project_id
PRIVATE_KEY=your_private_key

# Sepolia 测试网 (可选)
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID

# 主网配置 (生产环境使用)
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
```

## 🔧 开发指南

### 智能合约开发

#### 编译合约

```bash
# 编译所有合约
npx hardhat compile

# 清理并重新编译
npx hardhat clean && npx hardhat compile
```

#### 运行测试

```bash
# 运行所有测试
npx hardhat test

# 运行特定测试文件
npx hardhat test test/Diamond.localhost.test.ts
npx hardhat test test/Diamond.sepolia.test.ts

# 运行测试并生成覆盖率报告
npx hardhat coverage

# 运行测试并报告 gas 使用情况
REPORT_GAS=true npx hardhat test
```

#### 类型检查

```bash
# TypeScript 类型检查
npx tsc --noEmit
```

### 安全分析

```bash
# 高优先级安全问题检测
npm run security

# 完整 Slither 分析
npm run slither

# 仅高严重性问题
npm run slither:high

# 生成 JSON 报告
npm run slither:report
```

### 合约部署

#### 本地网络部署

```bash
# 启动本地 Hardhat 网络
npx hardhat node

# 部署到本地网络
npm run deploy:nft:local
# 或
npx hardhat run script/deploy.ts --network localhost
```

#### Sepolia 测试网部署

```bash
# 部署到 Sepolia 测试网
npm run deploy:nft:sepolia
# 或
npx hardhat run script/deploy.ts --network sepolia
```

#### 部署后操作

```bash
# 验证合约 (测试网)
npm run verify:deployment:sepolia

# 复制 ABI 到前端
npm run copy:abis
```

## 📊 测试覆盖

### 测试文件结构

- `test/Diamond.localhost.test.ts`: 本地环境完整功能测试
- `test/Diamond.sepolia.test.ts`: Sepolia 网络部署测试

### 测试覆盖范围

#### ✅ 部署和初始化测试
- Diamond 合约正确部署
- Facet 正确安装和初始化
- 代币基本信息设置
- 代币分配机制验证

#### ✅ ERC20 基础功能测试
- 代币转账 (`transfer`)
- 授权和代理转账 (`approve`, `transferFrom`)
- 余额查询和状态验证
- 边界条件测试

#### ✅ 税费机制测试
- 阶梯式税率计算验证
- 不同交易金额的税费应用
- 税费收取和分发机制
- 税费白名单功能

#### ✅ 交易限制测试
- 最大交易额度限制
- 每日交易次数限制
- 时间重置机制
- 白名单豁免功能

#### ✅ 权限管理测试
- 所有者权限验证
- 白名单设置管理
- 所有权转移功能
- 非授权访问防护

#### ✅ Diamond Loupe 测试
- Facet 信息查询
- 函数选择器验证
- 合约状态检查

#### ✅ 配置更新测试
- 最大交易额度更新
- 税费接收地址更新
- 参数验证和边界检查

## 🔐 安全特性

### 已实现的安全措施

1. **重入攻击防护**: 使用 OpenZeppelin 的 `ReentrancyGuard`
2. **整数溢出保护**: Solidity 0.8.26 内置溢出检查
3. **访问控制**: 基于所有者的权限管理系统
4. **输入验证**: 所有外部函数的参数验证
5. **事件记录**: 完整的事件日志用于监控和审计
6. **自定义错误**: 使用 OpenZeppelin v5 标准的自定义错误

### 安全审计建议

- 使用 Slither 进行静态分析
- 进行专业的第三方安全审计
- 在主网部署前进行充分的测试网测试
- 监控合约事件和异常行为

## 📈 部署信息

### 部署脚本特性

- **错误重试机制**: 最多 5 次重试，递增等待时间
- **部署验证**: 自动验证部署结果的正确性
- **信息保存**: 自动保存部署信息和 ABI 文件
- **网络适配**: 支持多网络部署配置

### 部署后生成的文件

- `deployments/{network}-latest.json`: 部署信息摘要
- `abis/ShibMemeDiamond.json`: 完整合约 ABI
- `abis/{FacetName}.json`: 各个 Facet 的独立 ABI

### 网络支持

- **localhost**: 本地开发环境
- **sepolia**: 以太坊 Sepolia 测试网
- **mainnet**: 以太坊主网 (生产环境)

## 🔍 关键合约详解

### 🏛️ Diamond.sol - EIP-2535 主合约

**作用**: 实现钻石标准的核心代理合约，作为所有功能调用的入口点。

#### 核心机制

```solidity
// 函数调用路由的核心逻辑
fallback() external payable {
    // 1. 获取钻石存储
    LibDiamond.DiamondStorage storage ds;
    bytes32 position = LibDiamond.DIAMOND_STORAGE_POSITION;
    assembly {
        ds.slot := position
    }

    // 2. 通过函数选择器查找对应的 Facet 地址
    address facet = ds.facetAddressAndSelectorPosition[msg.sig].facetAddress;
    if(facet == address(0)) {
        revert FunctionNotFound(msg.sig);
    }

    // 3. 使用 delegatecall 执行目标函数
    assembly {
        calldatacopy(0, 0, calldatasize())
        let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
        returndatacopy(0, 0, returndatasize())
        switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
    }
}
```

#### 构造函数参数

```solidity
struct DiamondArgs {
    address owner;        // 合约所有者地址
    address init;         // 初始化合约地址
    bytes initCalldata;   // 初始化调用数据
}
```

#### 关键特性

1. **函数路由**: 通过 `fallback()` 函数实现函数调动的动态路由
2. **存储分离**: 所有状态存储在 `LibDiamond` 的存储槽中
3. **升级能力**: 支持通过 `diamondCut` 添加、替换、移除功能
4. **代理模式**: 使用 `delegatecall` 保持状态一致性

### 📚 LibDiamond.sol - 存储库和核心逻辑

**作用**: 集中管理所有合约状态、提供钻石切割操作的工具函数。

#### 存储结构

```solidity
struct DiamondStorage {
    // Diamond 核心数据
    mapping(bytes4 => FacetAddressAndSelectorPosition) facetAddressAndSelectorPosition;
    bytes4[] selectors;
    mapping(bytes4 => bool) supportedInterfaces;
    address contractOwner;

    // ERC20 标准数据
    string name;
    string symbol;
    uint8 decimals;
    uint256 totalSupply;
    mapping(address => uint256) balances;
    mapping(address => mapping(address => uint256)) allowances;

    // ShibMeme 特定数据
    TokenTax[] tokenTaxes;                    // 税费阶梯配置
    address taxRecipient;                     // 税费接收地址
    uint256 maxTransactionAmount;             // 最大交易额度
    uint256 dailyTransactionLimit;            // 每日交易限制
    mapping(address => uint256) dailyTransactionCount;
    mapping(address => uint256) lastTransactionDay;
    mapping(address => bool) isExcludedFromFee;      // 税费白名单
    mapping(address => bool) isExcludedFromMaxTx;    // 交易限制白名单

    // 流动性管理数据
    address uniswapV2Router;
    address uniswapV2Pair;
}
```

#### 税费结构

```solidity
struct TokenTax {
    uint256 threshold;  // 税费阈值 (wei单位)
    uint256 taxRate;    // 税率 (百分比单位)
}
```

#### 钻石切割操作

1. **Add** - 添加新功能
   ```solidity
   function addFunctions(address _facetAddress, bytes4[] memory _functionSelectors)
   ```

2. **Replace** - 替换现有功能
   ```solidity
   function replaceFunctions(address _facetAddress, bytes4[] memory _functionSelectors)
   ```

3. **Remove** - 移除功能
   ```solidity
   function removeFunctions(address _facetAddress, bytes4[] memory _functionSelectors)
   ```

### 💰 ShibMemeFacet.sol - 代币核心业务逻辑

**作用**: 实现代币的税费机制、交易限制和核心业务功能。

#### 初始化函数

```solidity
function initializeShibMeme(
    string memory _name,                    // 代币名称
    string memory _symbol,                  // 代币符号
    address _taxRecipient,                  // 税费接收地址
    uint256 _maxTransactionAmount,          // 最大交易额度
    uint256 _dailyTransactionLimit          // 每日交易限制
) external
```

**代币分配逻辑**:
- **总供应量**: 100,000,000 tokens (1亿)
- **合约地址**: 40% (40M) - 用于流动性提供
- **部署者**: 10% (10M) - 测试和推广
- **销毁地址**: 50% (50M) - 通缩机制

#### 税费计算机制

```solidity
function _getTaxRate(uint256 amount) internal view returns (uint256) {
    // 从后向前遍历税费阶梯，第一个满足条件 的规则生效
    for (uint256 i = ds.tokenTaxes.length; i > 0; i--) {
        if (amount >= ds.tokenTaxes[i - 1].threshold) {
            return ds.tokenTaxes[i - 1].taxRate;
        }
    }
    return 0;
}
```

**税费阶梯配置**:
- `< 1,000 tokens`: 0% 税费
- `1,000-10,000 tokens`: 2% 税费
- `> 10,000 tokens`: 5% 税费

#### 带税费的转账函数

```solidity
function _applyTaxAndTransfer(address from, address to, uint256 amount) internal {
    // 1. 基础验证
    require(from != address(0), "Transfer from zero address");
    require(to != address(0), "Transfer to zero address");

    // 2. 交易限制检查 (白名单地址除外)
    if (!ds.isExcludedFromMaxTx[from] && !ds.isExcludedFromMaxTx[to]) {
        // 检查最大交易额度
        require(amount <= ds.maxTransactionAmount, "Exceeds max transaction limit");

        // 检查每日交易次数限制
        uint256 currentDay = block.timestamp / 1 days;
        if (ds.lastTransactionDay[from] != currentDay) {
            ds.lastTransactionDay[from] = currentDay;
            ds.dailyTransactionCount[from] = 0;
        }
        require(ds.dailyTransactionCount[from] < ds.dailyTransactionLimit,
                "Daily transaction limit exceeded");
        ds.dailyTransactionCount[from]++;
    }

    // 3. 税费计算
    uint256 taxAmount = 0;
    if (!ds.isExcludedFromFee[from] && !ds.isExcludedFromFee[to]) {
        uint256 taxRate = _getTaxRate(amount);
        if (taxRate > 0) {
            taxAmount = amount.mulDiv(taxRate, 100);
        }
    }

    // 4. 执行转账
    uint256 netAmount = amount - taxAmount;
    // ... 转账逻辑
}
```

#### 流动性提供功能

```solidity
function provideInitialLiquidity(address uniswapV2Router) external payable nonReentrant {
    LibDiamond.enforceIsContractOwner();  // 仅所有者可调用

    // 授权路由合约
    ds.allowances[address(this)][uniswapV2Router] = tokenAmount;

    // 添加流动性 (5% 滑点保护)
    uint256 minTokenAmount = tokenAmount.mulDiv(95, 100);
    uint256 minETHAmount = msg.value.mulDiv(95, 100);

    IUniswapV2Router(uniswapV2Router).addLiquidityETH{value: msg.value}(
        address(this),
        tokenAmount,
        minTokenAmount,
        minETHAmount,
        msg.sender,
        block.timestamp + 300
    );
}
```

#### 管理功能

- **`setTaxExempt(address account, bool exempt)`**: 设置税费白名单
- **`setMaxTxExempt(address account, bool exempt)`**: 设置交易限制白名单
- **`updateTaxRecipient(address newRecipient)`**: 更新税费接收地址
- **`updateMaxTransactionAmount(uint256 newAmount)`**: 更新最大交易额度

### 💳 ERC20Facet.sol - 标准 ERC20 实现

**作用**: 提供完整的 ERC20 标准功能，所有状态存储在 DiamondStorage 中。

#### 核心功能

1. **基础查询函数**
   ```solidity
   function name() external view returns (string memory)
   function symbol() external view returns (string memory)
   function decimals() external view returns (uint8)
   function totalSupply() external view returns (uint256)
   function balanceOf(address account) external view returns (uint256)
   ```

2. **转账功能**
   ```solidity
   function transfer(address to, uint256 amount) external returns (bool)
   function transferFrom(address from, address to, uint256 amount) external returns (bool)
   ```

3. **授权管理**
   ```solidity
   function approve(address spender, uint256 amount) external returns (bool)
   function increaseAllowance(address spender, uint256 addedValue) external returns (bool)
   function decreaseAllowance(address spender, uint256 subtractedValue) external returns (bool)
   ```

#### 设计特点

- **存储共享**: 所有状态存储在 `LibDiamond.DiamondStorage` 中
- **虚拟函数**: `_transfer()` 函数为 `virtual`，允许其他 Facet 重写
- **重入保护**: 使用 `unchecked` 块优化 Gas 消耗
- **标准兼容**: 完全符合 ERC20 标准

### 💧 LiquidityManager.sol - 流动性管理

**作用**: 集成 Uniswap V2 协议，提供完整的流动性管理功能。

#### 初始化功能

```solidity
function initializeLiquidity(address _uniswapV2Router) external {
    LibDiamond.enforceIsContractOwner();  // 权限检查
    require(ds.uniswapV2Router == address(0), "Already initialized");
    ds.uniswapV2Router = _uniswapV2Router;
}
```

#### 交易对创建

```solidity
function createPair() external {
    LibDiamond.enforceIsContractOwner();
    address factoryAddress = IUniswapV2Router(ds.uniswapV2Router).factory();
    address weth = IUniswapV2Router(ds.uniswapV2Router).WETH();

    // 创建 Token-WETH 交易对
    ds.uniswapV2Pair = uniswapFactory.createPair(address(this), weth);

    // 自动将交易对地址加入白名单
    ds.isExcludedFromFee[ds.uniswapV2Pair] = true;
    ds.isExcludedFromMaxTx[ds.uniswapV2Pair] = true;
}
```

#### 流动性操作

1. **添加流动性**
   ```solidity
   function addLiquidity(...)      // Token-Token 流动性
   function addLiquidityETH(...)   // Token-ETH 流动性
   ```

2. **移除流动性**
   ```solidity
   function removeLiquidity(...)
   ```

3. **交换功能**
   ```solidity
   function swapExactTokensForTokens(...)      // 精确输入交换
   function swapExactETHForTokens(...)         // ETH 交换
   function swapTokensForExactETH(...)         // 精确输出 ETH 交换
   ```

4. **价格计算**
   ```solidity
   function getAmountOut(...)     // 计算输出数量
   function getAmountIn(...)      // 计算输入数量
   function getAmountsOut(...)    // 计算多步输出
   function getAmountsIn(...)     // 计算多步输入
   ```

#### 安全特性

- **权限控制**: 所有管理函数仅合约所有者可调用
- **自动白名单**: 交易对创建后自动加入税费和交易限制白名单
- **滑点保护**: 在流动性操作中实施滑点保护
- **重入保护**: 使用 `nonReentrant` 修饰符防止重入攻击

## 🔧 交易成功判断最佳实践

### 问题分析

```typescript
// ❌ 不够严谨的写法
if(tx){
    await tx.wait();
    console.log("LiquidityManager initialized successfully!");
}
```

**问题**:
1. 没有检查交易是否真正成功
2. 没有捕获可能的错误
3. 没有验证交易后的状态

### ✅ 推荐的改进方案

#### 方案一: 基础成功检查

```typescript
try {
    const tx = await liquidityManager.initializeLiquidity(routerAddress);
    console.log("Transaction sent:", tx.hash);

    const receipt = await tx.wait();

    // 检查交易状态
    if (receipt.status === 1) {
        console.log("✅ LiquidityManager initialized successfully!");
        console.log("Gas used:", receipt.gasUsed.toString());
    } else {
        throw new Error("Transaction failed on-chain");
    }
} catch (error) {
    console.error("❌ Failed to initialize LiquidityManager:", error);
    throw error;
}
```

#### 方案二: 带重试机制的完整检查

```typescript
async function initializeLiquidityWithRetry(
    liquidityManager: any,
    routerAddress: string,
    maxRetries = 3
) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            console.log(`🔄 Attempt ${i + 1}/${maxRetries}...`);

            // 发送交易
            const tx = await liquidityManager.initializeLiquidity(routerAddress, {
                gasLimit: 300000, // 设置合适的 gas limit
                gasPrice: ethers.parseUnits("20", "gwei") // 设置 gas price
            });

            console.log(`📤 Transaction sent: ${tx.hash}`);
            console.log("⏳ Waiting for confirmation...");

            // 等待交易确认
            const receipt = await tx.wait(2); // 等待2个确认

            // 详细检查交易状态
            if (receipt.status === 1) {
                console.log("✅ LiquidityManager initialized successfully!");
                console.log("📊 Transaction Details:");
                console.log(`   - Block Number: ${receipt.blockNumber}`);
                console.log(`   - Gas Used: ${receipt.gasUsed.toString()}`);
                console.log(`   - Cumulative Gas: ${receipt.cumulativeGasUsed.toString()}`);

                // 验证合约状态
                const initializedRouter = await liquidityManager.getFactory();
                if (initializedRouter && initializedRouter !== ethers.ZeroAddress) {
                    console.log("✅ Router initialization verified on-chain");
                    return receipt;
                } else {
                    throw new Error("Router not properly initialized");
                }
            } else {
                throw new Error(`Transaction failed with status: ${receipt.status}`);
            }

        } catch (error: any) {
            console.error(`❌ Attempt ${i + 1} failed:`, error.message);

            // 特定错误处理
            if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
                console.log("⛽ Gas estimation failed, trying with higher limit...");
            } else if (error.code === 'NETWORK_ERROR') {
                console.log("🌐 Network error, retrying...");
            }

            if (i === maxRetries - 1) {
                throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
            }

            // 等待后重试
            await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
        }
    }
}
```

#### 方案三: 事件验证方式

```typescript
async function initializeAndVerify(liquidityManager: any, routerAddress: string) {
    try {
        console.log("🔧 Initializing LiquidityManager...");

        // 监听相关事件
        const filter = liquidityManager.filters.LiquidityInitialized();

        // 发送交易
        const tx = await liquidityManager.initializeLiquidity(routerAddress);
        const receipt = await tx.wait();

        if (receipt.status !== 1) {
            throw new Error("Transaction failed on-chain");
        }

        // 检查事件日志
        const events = receipt.logs?.filter(log => {
            try {
                const parsedLog = liquidityManager.interface.parseLog(log);
                return parsedLog?.name === "LiquidityInitialized";
            } catch {
                return false;
            }
        });

        if (events && events.length > 0) {
            console.log("✅ Initialization confirmed by event emission");

            // 解析事件数据
            const parsedEvent = liquidityManager.interface.parseLog(events[0]);
            console.log("📋 Event details:", parsedEvent.args);
        } else {
            console.warn("⚠️ No initialization event found, but transaction succeeded");
        }

        // 最终状态验证
        const factory = await liquidityManager.getFactory();
        if (factory && factory !== ethers.ZeroAddress) {
            console.log("✅ State verification passed");
            console.log(`🏭 Factory address: ${factory}`);
        } else {
            throw new Error("State verification failed");
        }

    } catch (error) {
        console.error("❌ Initialization failed:", error);
        throw error;
    }
}
```

#### 方案四: 实际部署脚本中的应用

```typescript
// 在 deploy.ts 中的应用示例
async function initializeLiquidityManager() {
    const liquidityManager = await ethers.getContractAt("LiquidityManager", diamondAddress);

    try {
        console.log("🔧 Initializing LiquidityManager...");

        const UNISWAP_V2_ROUTER = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"; // Sepolia

        const tx = await liquidityManager.initializeLiquidity(UNISWAP_V2_ROUTER, {
            gasLimit: 200000,
            gasPrice: ethers.parseUnits("15", "gwei")
        });

        console.log(`📤 Transaction hash: ${tx.hash}`);

        const receipt = await tx.wait(1); // 等待1个确认

        if (receipt.status === 1) {
            console.log("✅ LiquidityManager initialized successfully!");

            // 验证初始化结果
            const factory = await liquidityManager.getFactory();
            const weth = await liquidityManager.getWETH();

            console.log("📋 Initialization verification:");
            console.log(`   - Factory: ${factory}`);
            console.log(`   - WETH: ${weth}`);
            console.log(`   - Gas Used: ${receipt.gasUsed.toString()}`);

            return { success: true, receipt, factory, weth };
        } else {
            throw new Error("Transaction failed");
        }

    } catch (error: any) {
        console.error("❌ LiquidityManager initialization failed:");
        console.error(`   - Error: ${error.message}`);
        console.error(`   - Code: ${error.code}`);

        // 提供详细的错误信息
        if (error.message.includes("Already initialized")) {
            console.log("ℹ️ LiquidityManager was already initialized");
            return { success: false, alreadyInitialized: true };
        }

        throw error;
    }
}
```

### 🔍 关键检查点

1. **交易状态检查**: `receipt.status === 1` 表示交易成功
2. **错误处理**: 捕获并分类不同类型的错误
3. **重试机制**: 对临时性错误进行重试
4. **状态验证**: 交易后检查合约状态是否符合预期
5. **事件验证**: 通过事件日志确认操作完成
6. **Gas 优化**: 设置合适的 gas 限制和价格

### 📊 推荐的实用函数

```typescript
/**
 * 安全执行合约函数并验证结果
 */
async function safeContractCall(
    contract: any,
    functionName: string,
    args: any[],
    options: any = {}
) {
    try {
        console.log(`🔄 Calling ${functionName} with args:`, args);

        const tx = await contract[functionName](...args, {
            gasLimit: 300000,
            gasPrice: ethers.parseUnits("15", "gwei"),
            ...options
        });

        console.log(`📤 Transaction: ${tx.hash}`);
        const receipt = await tx.wait(1);

        if (receipt.status !== 1) {
            throw new Error(`Transaction failed with status ${receipt.status}`);
        }

        console.log(`✅ ${functionName} executed successfully`);
        console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);

        return { success: true, receipt, tx };

    } catch (error: any) {
        console.error(`❌ ${functionName} failed:`, error.message);
        return { success: false, error };
    }
}
```

这些改进方案能够确保：
- 准确检测交易成功状态
- 提供详细的错误信息和调试信息
- 支持重试机制处理临时故障
- 验证合约状态的正确性
- 优化 Gas 使用和交易确认

## 🔍 代码结构

```
MEME/
├── contracts/                 # 智能合约
│   ├── contract/             # Diamond 相关合约
│   │   ├── Diamond.sol       # 主 Diamond 合约
│   │   ├── facets/           # 功能切面
│   │   ├── interfaces/       # 接口定义
│   │   ├── libraries/        # 库文件
│   │   └── upgradeInitializers/ # 升级初始化合约
│   ├── events/               # 事件定义
│   ├── errors/               # 自定义错误
│   └── modify/               # 修饰符
├── script/                   # 部署脚本
│   ├── deploy.ts            # 主部署脚本
│   └── utils/               # 工具函数
├── test/                    # 测试文件
├── deployments/             # 部署信息
├── abis/                    # 合约 ABI
├── front/                   # 前端项目
└── offchain-monitor-service/ # 链下监控服务
```

## 🛠️ 开发工具和依赖

### 主要依赖

- **Hardhat**: 以太坊开发环境
- **OpenZeppelin**: 安全的智能合约库
- **Ethers.js**: 以太坊交互库
- **TypeScript**: 类型安全的 JavaScript
- **Chai**: 测试断言库
- **Slither**: 静态分析工具

### 开发工具

- **TypeChain**: TypeScript 类型生成
- **Hardhat Gas Reporter**: Gas 使用分析
- **Solidity Coverage**: 测试覆盖率分析
- **Solhint**: Solidity 代码检查

## 📚 相关资源

- [EIP-2535 Diamond Standard](https://eips.ethereum.org/EIPS/eip-2535)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/5.x)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Ethers.js Documentation](https://docs.ethers.org)

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

### 代码规范

- 遵循 Solidity Style Guide
- 使用 TypeScript 进行类型安全开发
- 编写完整的测试用例
- 添加详细的代码注释
- 使用 NatSpec 格式编写文档

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## ⚠️ 免责声明

本项目仅用于教育和研究目的。在生产环境中使用前，请进行充分的安全审计。作者不对因使用本合约造成的任何损失承担责任。

---

**🚨 重要提醒**: 在处理真实资金时，请务必：
1. 进行专业的安全审计
2. 在测试网上充分测试
3. 实施适当的监控机制
4. 考虑保险和风险管理措施