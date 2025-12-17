# Nextswap - 企业级去中心化交易所

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.26-blue.svg)](https://solidity.readthedocs.io/)
[![Hardhat](https://img.shields.io/badge/Built%20with-Hardhat-brown.svg)](https://hardhat.org/)

基于以太坊构建的生产级企业去中心化交易所，采用 Nextswap V3 风格的集中流动性、NFT 头寸质押和流动性挖矿奖励机制。

## 🎯 项目概述

Nextswap 是一个综合性的 DEX 解决方案，集成了以下核心功能：

- **集中流动性**：采用 Nextswap V3 风格的资金效率，支持多级费率
- **NFT 头寸管理**：将流动性头寸作为 NFT 进行交易，具备完全的可组合性
- **流动性挖矿**：质押头寸 NFT 以获得 NST 奖励
- **企业级安全**：时间锁治理、多重签名控制和全面审计
- **实时分析**：基于 The Graph 提供透明的链上数据

### 核心特性

- 🔄 **兑换** - 即时代币交易，最小滑点
- 💧 **资金池** - 添加/移除流动性，支持灵活的价格范围
- 🌾 **挖矿** - 质押 V3 NFT 头寸赚取 NST 代币
- 📊 **分析** - 实时投资组合跟踪和奖励
- 🏛️ **治理** - 社区驱动的协议决策

## 📊 代币经济模型 (NST)

### 代币分配

**初始总供应量：1,000,000,000 NST (10 亿)**
_注：最终总供应量可通过社群投票决定增加_

| 类别            | 分配比例 | 数量        | 释放规则                                |
| --------------- | -------- | ----------- | --------------------------------------- |
| **流动性挖矿**  | 50%      | 500,000,000 | 4 年线性释放（每日约 342,465 NST）      |
| **团队 & 顾问** | 15%      | 150,000,000 | 1 年锁仓 + 3 年线性释放                 |
| **生态基金**    | 20%      | 200,000,000 | 多签控制，由 DAO 或核心团队管理         |
| **私募轮**      | 10%      | 100,000,000 | TGE 解锁 10%，之后 6 个月后每月解锁 10% |
| **社区空投**    | 5%       | 50,000,000  | TGE 时快照分发                          |

### 释放时间线

#### 流动性挖矿（50% - 5 亿 NST）

- **释放周期**：4 年（48 个月）
- **每日释放**：约 342,465 NST
- **释放机制**：
  - 自动进入挖矿合约
  - 根据流动性贡献分配
  - 支持多池挖矿激励

#### 团队 & 顾问（15% - 1.5 亿 NST）

- **悬崖期（Cliff）**：1 年完全锁仓
- **线性释放期**：之后 3 年线性释放
- **月度释放**：约 4,166,667 NST/月
- **目的**：防止早期抛压，确保长期参与

#### 生态基金（20% - 2 亿 NST）

- **控制方式**：3/5 多重签名钱包
- **用途**：
  - 战略合作伙伴激励
  - 社区活动与空投
  - 开发者激励计划
  - 流动性引导计划
- **透明度**：所有支出需社区公示

#### 私募轮（10% - 1 亿 NST）

**释放计划**：

- TGE 时解锁：10,000,000 NST（10%）
- 第 6 个月：解锁 10,000,000 NST（累计 20%）
- 第 7-16 个月：每月解锁 10,000,000 NST
- 全部解锁完成：TGE 后 16 个月

#### 社区空投（5% - 5000 万 NST）

- **发放方式**：TGE 时快照分发
- **目标群体**：
  - 早期测试用户
  - 活跃社区成员
  - 特定贡献者
  - 其他协议交互用户

### NST 用途

- **治理投票**：参与协议参数决策和提案投票
- **质押奖励**：质押 NST 获取协议手续费分成
- **手续费折扣**：NST 持有者享受交易手续费折扣
- **流动性挖矿**：作为挖矿奖励的主要代币
- **生态激励**：参与生态项目获得额外奖励

### 通缩机制

- **手续费回购**：部分协议收入用于回购并销毁 NST
- **提案销毁**：社区可提案销毁部分生态基金
- **生态消费**：生态项目消耗 NST 作为服务费用

## 🏗️ 技术架构

### 智能合约

```
contracts/
├── tokens/
│   ├── NSTToken.sol              # 原生治理代币
│   └── TokenDistributor.sol      # 团队/生态代币分发
├── mining/
│   └── LiquidityMining.sol       # NFT 质押与奖励
├── governance/
│   └── TimelockController.sol    # 安全治理
├── core/                         # Nextswap V3 核心合约
└── periphery/                    # Nextswap V3 外围合约
```

### 技术栈

- **智能合约**：Solidity 0.8.26, OpenZeppelin v5
- **开发框架**：Hardhat
- **前端**：Next.js 15, React 19, TypeScript
- **Web3**：Ethers.js v6, Wagmi, RainbowKit
- **UI**：Ant Design, Tailwind CSS
- **数据**：The Graph Protocol, GraphQL
- **测试**：Hardhat, Foundry（模糊测试）
- **安全**：Slither, MythX

## 📅 开发路线图

### 阶段 1：基础设施建设（第 1 周）

- [x] 初始化 Hardhat 项目
- [x] 集成 Nextswap V3 合约
- [x] 设计 NST 代币经济模型
- [x] 配置多网络支持
- [x] 搭建测试环境

### 阶段 2：核心合约开发（第 2-3 周）

- [x] 部署具有铸造控制的 NST Token
- [x] 实现代币分发的线性释放
- [x] 设置时间锁控制器
- [x] 与 Nextswap V3 集成
- [x] 开发流动性挖矿合约

### 阶段 3：测试与安全加固（第 4 周）

- [ ] 全面的单元测试
- [ ] 主网分叉测试
- [ ] Foundry 模糊测试
- [ ] 安全审计（Slither, MythX）
- [ ] 审计准备工作

### 阶段 4：前端开发（第 5-6 周）

- [ ] 实时定价的交易界面
- [ ] 流动性池管理界面
- [ ] 挖矿质押仪表板
- [ ] 投资组合跟踪
- [ ] 移动端响应式设计

### 阶段 5：The Graph 集成（第 7 周）

- [ ] 子图模式开发
- [ ] 事件映射实现
- [ ] 部署到 The Graph Studio
- [ ] 前端 GraphQL 集成
- [ ] 完整的 Sepolia 部署

### 阶段 6：文档与社区建设（第 8 周）

- [ ] 完善文档
- [ ] 代币经济学白皮书
- [ ] 用户指南
- [ ] 社区渠道
- [ ] 漏洞赏金计划

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm 或 yarn
- Git

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/your-org/next-swap.git
cd next-swap

# 安装依赖
npm install

# 安装前端依赖
cd front && npm install

# 安装监控服务依赖
cd ../offchain-monitor-service && npm install
```

### 环境配置

在根目录创建 `.env` 文件：

```bash
# 网络配置
INFURA_PROJECT_ID=your_infura_project_id
PRIVATE_KEY=your_private_key
PRIVATE_KEY_USER1=your_private_key_user1
PRIVATE_KEY_USER2=your_private_key_user2
PRIVATE_KEY_USER3=your_private_key_user3

# 网络地址
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID

# The Graph（用于监控）
GRAPH_API_KEY=your_graph_api_key

# 前端（在 front/.env.local 中）
NEXT_PUBLIC_BASE_API=https://your-api-endpoint.com
NEXT_PUBLIC_APP_TITLE=Nextswap DEX
NEXT_PUBLIC_DEFAULT_LANGUAGE=zh
NEXT_PUBLIC_SUPPORTED_LANGUAGES=zh,en
```

### 本地开发

```bash
# 启动本地 Hardhat 节点
npx hardhat node

# 编译合约
npx hardhat compile

# 运行测试
npx hardhat test

# 部署到本地网络
npm run deploy:all:local

# 启动前端
cd front && npm run dev

# 启动监控服务
cd offchain-monitor-service && npm run dev
```

## 🧪 测试

### 运行测试

```bash
# 所有测试
npx hardhat test

# 覆盖率报告
npx hardhat coverage

# Gas 分析
REPORT_GAS=true npx hardhat test

# 分叉测试
npx hardhat test --network hardhat --fork https://mainnet.infura.io/v3/YOUR_PROJECT_ID

# 模糊测试（需要 Foundry）
forge test --gas-report
```

### 安全分析

```bash
# 高优先级问题
npm run security

# 完整的 Slither 分析
npm run slither

# 生成报告
npm run slither:report
```

## 📚 文档

- [架构概览](./docs/architecture.md)
- [智能合约 API](./docs/contracts.md)
- [前端指南](./front/README.md)
- [部署指南](./docs/deployment.md)
- [安全审计](./docs/audits.md)

## 🔐 安全性

Nextswap 通过以下方式优先保障安全：

- **多重审计**：专业安全公司审计
- **漏洞赏金**：活跃的漏洞赏金计划
- **时间锁**：48 小时的治理变更延迟
- **多重签名**：团队资金由多重签名钱包控制
- **可暂停**：紧急暂停功能
- **开源**：完全透明的代码库

### 安全最佳实践

1. 绝不分享私钥或助记词
2. 始终在 Etherscan 上验证合约地址
3. 大额资金使用硬件钱包
4. 警惕钓鱼攻击
5. 交易前了解智能合约风险

## 🌐 部署

### 🔑 核心概念：POOL_INIT_CODE_HASH

在部署之前，必须理解 **POOL_INIT_CODE_HASH** 的重要性：

- **定义**：NextswapV3Pool 合约字节码的 keccak256 哈希值
- **用途**：用于 CREATE2 模式计算池子地址
- **关键**：必须在部署所有外围合约（NPM、SwapRouter、QuoterV2）之前确定

**何时需要更新 POOL_INIT_CODE_HASH：**

| 操作                          | 是否影响哈希 | 需要重新部署外围合约        |
| ----------------------------- | ------------ | --------------------------- |
| 重新编译（无改动）            | ❌ 不变      | ❌ 不需要                   |
| 修改 NextswapV3Pool.sol 代码  | ✅ 改变      | ✅ **需要**                 |
| 修改编译器版本或优化设置      | ✅ 改变      | ✅ **需要**                 |
| 修改 Pool 依赖的 Library      | ✅ 改变      | ✅ **需要**                 |
| 修改其他合约（NPM/Router 等） | ❌ 不变      | ⚠️ 仅需重新部署被修改的合约 |

### 📋 完整部署流程

#### 阶段 0️⃣：准备工作（关键步骤）

```bash
# 1. 编译所有合约
npx hardhat compile

# 2. 检查 POOL_INIT_CODE_HASH 是否匹配
npx hardhat run scripts/check_pool_init_code_hash.ts
```

**如果输出显示不匹配：**

```bash
# 输出示例：
# ❌ 不匹配！需要更新 PoolAddress.sol
# 请将 PoolAddress.sol 中的 POOL_INIT_CODE_HASH 更新为:
# bytes32 internal constant POOL_INIT_CODE_HASH = 0x88c776ac...;

# 3. 复制新哈希值到 contracts/contract/swap/periphery/libraries/PoolAddress.sol
# 手动更新以下行：
# bytes32 internal constant POOL_INIT_CODE_HASH = 0x新的哈希值;

# 4. 重新编译（重要！）
npx hardhat compile
```

#### 阶段 1️⃣：部署核心合约

```bash
# 步骤 1: 部署 NextswapV3Factory
npx hardhat test .\test\deploy_netxtswap.test.ts --network localhost --grep "应该能部署NextswapV3Factory"

# 输出：Factory 地址
# 手动操作：复制地址到 deployments/localhost-deployment.json
```

**依赖关系：** 无  
**输出文件：** `deployments/localhost-deployment.json`

```json
{
  "contracts": {
    "NextswapV3Factory": {
      "proxyAddress": "0x..." // ← 粘贴 Factory 地址
    }
  }
}
```

#### 阶段 2️⃣：部署 NFT 相关库和合约

```bash
# 步骤 2: 部署 NFTDescriptor 库
npx hardhat test .\test\deploy_netxtswap.test.ts --network localhost --grep "应该可以部署NFTDescriptor库"

# 步骤 3: 部署 NonfungibleTokenPositionDescriptor
npx hardhat test .\test\deploy_netxtswap.test.ts --network localhost --grep "应该可以部署NonfungibleTokenPositionDescriptor"
```

**依赖关系：**

- ✅ NFTDescriptor（步骤 2）
- ✅ 网络配置（WETH9, DAI, USDC 等）

#### 阶段 3️⃣：部署外围合约（使用 PoolAddress）

⚠️ **重要：这些合约都依赖 PoolAddress.POOL_INIT_CODE_HASH，必须在阶段 0 完成后部署！**

```bash
# 步骤 4: 部署 SwapRouter
npx hardhat test .\test\deploy_netxtswap.test.ts --network localhost --grep "应该能部署deploySwapRouter"

# 步骤 5: 部署 QuoterV2
npx hardhat test .\test\deploy_netxtswap.test.ts --network localhost --grep "应该能部署Quoter"

# 步骤 6: 部署 NonfungiblePositionManager
npx hardhat test .\test\deploy_netxtswap.test.ts --network localhost --grep "应该能部署 NonfungiblePositionManager"
```

**依赖关系：**

- ✅ NextswapV3Factory（阶段 1）
- ✅ NonfungibleTokenPositionDescriptor（阶段 2）
- ✅ PoolAddress.POOL_INIT_CODE_HASH（阶段 0）

#### 📊 部署依赖关系图

```
阶段 0: 编译 & 确定 POOL_INIT_CODE_HASH
    ↓
阶段 1: NextswapV3Factory
    ↓
阶段 2: NFTDescriptor → NonfungibleTokenPositionDescriptor
    ↓
阶段 3: SwapRouter, QuoterV2, NonfungiblePositionManager
```

#### 🔍 每次部署后的操作

1. **复制输出的合约地址**
2. **更新 `deployments/localhost-deployment.json`**
3. **确认下一个合约的依赖已就绪**

### Sepolia 测试网部署

```bash
# 阶段 0: 准备工作
npx hardhat compile
npx hardhat run scripts/check_pool_init_code_hash.ts
# 如需要，更新 PoolAddress.sol 并重新编译

# 阶段 1-3: 按顺序部署（将 --network localhost 改为 --network sepolia）
npx hardhat test .\test\deploy_netxtswap.test.ts --network sepolia --grep "应该能部署NextswapV3Factory"
# ... 依次执行其他步骤

# 验证合约
npm run verify:deployment:sepolia

# 复制 ABI 到前端
npm run copy:abis
```

### 主网生产环境部署

```bash
# 1. 确保所有测试通过
npm run test:all

# 2. 运行安全分析
npm run security

# 3. 检查 POOL_INIT_CODE_HASH
npx hardhat run scripts/check_pool_init_code_hash.ts --network mainnet

# 4. 部署（需要多重签名批准）
# 按照阶段 0-3 的顺序逐步部署到主网
npx hardhat test .\test\deploy_netxtswap.test.ts --network mainnet --grep "应该能部署NextswapV3Factory"
# ... 依次执行

# 5. 部署后检查
npm run verify:deployment:mainnet
```

### ⚠️ 重要提示

1. **POOL_INIT_CODE_HASH 只需在以下情况更新：**

   - 修改 NextswapV3Pool.sol 代码
   - 更改编译器版本或优化设置
   - 修改 Pool 依赖的 Library

2. **如果哈希不匹配：**

   - ❌ 流动性添加会失败（"Transaction reverted without a reason string"）
   - ❌ PoolAddress.computeAddress() 会计算错误的池地址
   - ❌ 所有依赖 PoolAddress 的合约（NPM、SwapRouter、QuoterV2）都需要重新部署

3. **验证命令：**
   ```bash
   # 随时运行此命令检查哈希是否正确
   npx hardhat run scripts/check_pool_init_code_hash.ts
   ```

## 🤝 贡献

我们欢迎社区贡献！详情请查看[贡献指南](./CONTRIBUTING.md)。

### 开发流程

1. Fork 仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 代码规范

- 遵循 TypeScript 最佳实践
- 使用 ESLint 和 Prettier
- 编写全面的测试
- 更新文档

## 📊 监控与分析

### 实时数据

- **The Graph**：实时链上数据
- **仪表板**：[app.nextswap.io](https://app.nextswap.io) 的分析数据
- **API**：公共 GraphQL 端点

### 关键指标

- 总锁仓价值（TVL）
- 24 小时交易量
- 活跃流动性头寸
- NST 质押 APR
- 协议手续费收入

## 🌍 社区

- **微信社区**：扫描二维码加入
- **Discord**：[加入社区](https://discord.gg/nextswap)
- **Twitter**：[@NextswapDEX](https://twitter.com/nextswapdex)
- **Medium**：[博客](https://medium.com/nextswap)
- **Telegram**：[t.me/nextswap](https://t.me/nextswap)

## 📄 许可证

本项目采用 MIT 许可证 - 详情请参阅 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- [Nextswap V3](https://nextswap.org/) - 核心 AMM 逻辑
- [OpenZeppelin](https://openzeppelin.com/) - 安全的智能合约
- [Hardhat](https://hardhat.org/) - 开发环境
- [The Graph](https://thegraph.com/) - 索引协议

## ⚠️ 免责声明

Nextswap 是一个实验性协议。用户应该：

- 了解智能合约风险
- 绝不投资超过可承受损失的金额
- 进行自己的研究（DYOR）
- 注意潜在的 bug 或漏洞

在 Nextswap 上交易涉及金融风险。团队不对任何损失负责。

## 🇨🇳 中文支持

- **语言支持**：完整的中英文双语界面
- **中文社区**：提供专门的中文客服和技术支持
- **本地化**：针对中国用户优化的使用体验
- **合规性**：遵循相关地区的法律法规

---

**由 Nextswap 团队用 ❤️ 构建**
