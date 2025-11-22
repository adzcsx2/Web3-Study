# MEME - Web3 代币项目

## 📋 项目简介

MEME 是一个基于 Ethereum 的 Web3 代币项目，采用 **EIP-2535 Diamond 标准** 构建的高性能、模块化智能合约系统。该项目实现了具有税费机制、交易限制和流动性管理功能的 Meme 代币，并集成了 Uniswap V3 去中心化交易所支持。

## 🏗️ 项目架构

### 核心特性

- **🔧 Diamond 架构**: 采用 EIP-2535 标准，支持模块化升级和无限扩展
- **💰 代币税费机制**: 自动收取交易税费并分配到指定地址
- **🛡️ 交易限制**: 设置最大交易金额和每日交易限额
- **🔄 批量处理**: 支持批量交易和流动性管理
- **🏦 Uniswap V3 集成**: 原生支持 Uniswap V3 流动性池交易
- **🎯 重入保护**: 完善的安全机制防止重入攻击
- **⚡ 高性能**: 优化的 gas 使用和交易执行速度

### 技术栈

- **Solidity ^0.8.26**: 最新的 Solidity 版本，支持高级特性
- **Hardhat**: 专业级的以太坊开发环境
- **OpenZeppelin**: 行业标准的安全合约库
- **EIP-2535 Diamond**: 模块化智能合约架构
- **Uniswap V3 SDK**: 集成最新的去中心化交易协议
- **TypeScript**: 类型安全的开发体验

## 📁 项目结构

```
MEME/
├── contracts/                   # 📄 智能合约
│   ├── contract/               # 🏗️ Diamond 核心合约
│   │   ├── Diamond.sol         # 💎 主钻石合约
│   │   ├── facets/             # 🔧 功能切面
│   │   │   ├── ShibMemeFacet.sol      # 💰 代币核心功能
│   │   │   ├── ERC20Facet.sol         # 🪙 ERC20 标准实现
│   │   │   ├── LiquidityManager.sol   # 💧 流动性管理
│   │   │   ├── DiamondCutFacet.sol    # ✂️ 钻石切割
│   │   │   ├── DiamondLoupeFacet.sol  # 🔍 钻石放大镜
│   │   │   └── OwnershipFacet.sol     # 👤 所有权管理
│   │   ├── interfaces/         # 📋 合约接口
│   │   │   ├── IDiamond.sol          # 💎 钻石接口
│   │   │   ├── IDiamondCut.sol        # ✂️ 钻石切割接口
│   │   │   ├── IDiamondLoupe.sol      # 🔍 钻石放大镜接口
│   │   │   ├── IERC173.sol            # 👤 所有权接口
│   │   │   ├── IERC20.sol             # 🪙 ERC20 接口
│   │   │   ├── IUniswapV2*.sol        # 🏦 Uniswap V2 接口(废弃保留)
│   │   │   └── IUniswapV3*.sol        # 🏦 Uniswap V3 接口
│   │   ├── libraries/           # 📚 库文件
│   │   │   ├── LibDiamond.sol         # 💎 钻石存储库
│   │   │   └── TickMath.sol           # 📊 Uniswap V3 数学库
│   │   └── upgradeInitializers/ # 🔄 升级初始化器
│   │       ├── DiamondInit.sol        # 🚀 钻石初始化
│   │       └── DiamondMultiInit.sol   # 🚀 多重初始化
│   ├── events/                # 📡 事件定义
│   │   ├── ShibMemeEvents.sol         # 💰 代币事件
│   │   └── CustomEvents.sol           # 🎛️ 自定义事件
│   ├── errors/                # ❌ 自定义错误
│   │   └── CustomErrors.sol           # 🚨 错误定义
│   └── modify/                # 🔧 修饰符
│       └── CustomModifier.sol         # 🛡️ 自定义修饰符
├── script/                     # 🚀 部署脚本
│   ├── deploy.ts              # 🎯 主部署脚本
│   └── utils/                 # 🛠️ 部署工具
│       ├── DeployHelper.ts    # 📋 部署助手
│       └── diamond.js         # 💎 钻石工具
├── test/                       # 🧪 测试文件
│   ├── Diamond.localhost.test.ts  # 🏠 本地测试
│   └── Diamond.sepolia.test.ts    # 🌐 Sepolia 测试
├── deployments/                # 📦 部署记录
│   └── sepolia-latest.json         # 📊 Sepolia 部署信息
├── offchain-monitor-service/   # 🔍 链下监听服务
│   ├── src/                   # 📄 源代码
│   │   ├── services/         # 🏗️ 核心服务
│   │   ├── config/           # ⚙️ 配置管理
│   │   ├── utils/            # 🛠️ 工具函数
│   │   └── types/            # 📝 类型定义
│   ├── abis/                 # 📋 合约 ABI
│   ├── logs/                 # 📊 日志文件
│   └── dist/                 # 🔨 编译输出
├── front/                     # 🎨 前端应用
│   ├── src/                  # 📄 前端源码
│   ├── public/               # 🌐 静态资源
│   └── docs/                 # 📖 文档
├── hardhat.config.ts          # ⚙️ Hardhat 配置
├── package.json               # 📦 项目依赖
├── tsconfig.json             # ⚙️ TypeScript 配置
└── CLAUDE.md                 # 📖 Claude Code 指南
```

## 🚀 快速开始

### 环境要求

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0
- **Git**

### 安装依赖

```bash
# 克隆仓库
git clone <repository-url>
cd MEME

# 安装项目依赖
npm install

# 安装前端依赖
cd front
npm install
cd ..

# 安装监听服务依赖
cd offchain-monitor-service
npm install
cd ..
```

### 环境配置

创建 `.env` 文件：

```env
# 网络配置
INFURA_PROJECT_ID=your_infura_project_id
PRIVATE_KEY=your_private_key
PRIVATE_KEY_USER1=your_private_key_user1
PRIVATE_KEY_USER2=your_private_key_user2
PRIVATE_KEY_USER3=your_private_key_user3

# 网络RPC
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
```

### 编译合约

```bash
# 编译所有合约
npx hardhat compile

# 类型检查
npx tsc --noEmit
```

## 🧪 测试

### 运行测试

```bash
# 运行所有测试
npx hardhat test

# 运行本地测试
npx hardhat test test/Diamond.localhost.test.ts

# 运行 Sepolia 测试
npx hardhat test test/Diamond.sepolia.test.ts

# 运行测试并生成覆盖率报告
npx hardhat coverage

# 运行测试并报告 gas 使用情况
REPORT_GAS=true npx hardhat test
```

### 测试分类

- **单元测试**: 测试各个 Facet 的功能
- **集成测试**: 测试 Diamond 架构的整体运行
- **Gas 分析**: 分析合约的 gas 使用效率
- **部署测试**: 验证部署流程的正确性

## 🚀 部署

### 本地部署

```bash
# 启动本地 Hardhat 网络
npx hardhat node

# 部署到本地网络
npx hardhat run script/deploy.ts --network localhost

# 部署完成后复制 ABI 到前端
npm run copy:abis
```

### Sepolia 测试网部署

```bash
# 部署到 Sepolia 测试网
npx hardhat run script/deploy.ts --network sepolia

# 验证合约
npm run verify:deployment:sepolia

# 复制 ABI 到前端
npm run copy:abis
```

### 主网部署

```bash
# 部署到以太坊主网（请谨慎操作）
npx hardhat run script/deploy.ts --network mainnet

# 验证合约
npm run verify:deployment

# 复制 ABI 到前端
npm run copy:abis
```

## 🔒 安全分析

### 运行安全分析

```bash
# 运行高优先级安全检查
npm run security

# 运行完整的 Slither 分析
npm run slither

# 仅检查高严重性问题
npm run slither:high

# 生成 JSON 格式报告
npm run slither:report
```

### 安全特性

- **重入保护**: 所有关键函数都有重入保护机制
- **访问控制**: 基于角色的权限管理系统
- **溢出保护**: 使用 SafeMath 和内置溢出检查
- **暂停机制**: 紧急情况下可以暂停合约操作
- **升级控制**: 安全的合约升级流程

## 🔍 链下监听服务

### 服务简介

项目包含一个企业级的链下监听服务，用于实时监控区块链事件并提供数据索引功能。

### 启动服务

```bash
cd offchain-monitor-service

# 开发模式
npm run dev

# 生产模式
npm run build
npm start

# 测试连接
npm run test
```

### 服务特性

- **实时事件监听**: WebSocket 连接，毫秒级响应
- **批量处理机制**: 高效的事件队列管理
- **区块确认监控**: 6 个区块确认机制
- **链重组检测**: 自动处理链重组事件
- **自动重连机制**: 网络断线自动恢复
- **Supabase 集成**: 数据持久化和查询

## 🎨 前端应用

### 启动前端

```bash
cd front

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

### 前端特性

- **Next.js**: 现代化的 React 框架
- **TypeScript**: 类型安全的前端开发
- **Web3 集成**: 原生支持钱包连接和合约交互
- **多语言支持**: 中英文国际化
- **响应式设计**: 适配各种设备和屏幕

## 📊 Diamond 架构详解

### 什么是 Diamond？

Diamond (EIP-2535) 是一种模块化的智能合约架构，允许：

- **无限扩展**: 合约可以拥有无限数量的函数
- **模块化升级**: 可以单独升级任何功能模块
- **Gas 优化**: 只部署使用的功能，减少 gas 成本
- **代理模式**: 保持合约地址不变的情况下升级代码

### Facet 功能划分

#### ShibMemeFacet

- **代币核心功能**: 转账、授权、余额查询
- **税费机制**: 自动收取和分配交易税费
- **交易限制**: 最大交易金额和每日限额
- **批量操作**: 支持批量转账和授权

#### ERC20Facet

- **标准接口**: 完整实现 ERC20 标准
- **元数据**: 代币名称、符号、小数位数
- **标准事件**: Transfer、Approval 事件

#### LiquidityManager

- **流动性管理**: 添加和移除流动性
- **Uniswap 集成**: 与 Uniswap V3 的交互
- **费用管理**: 流动性费用的处理

#### DiamondCutFacet

- **升级管理**: 添加、替换、移除 Facet
- **版本控制**: 跟踪合约版本信息
- **权限控制**: 仅管理员可执行升级

#### DiamondLoupeFacet

- **信息查询**: 查询 Facet 和函数信息
- **透明性**: 提供合约结构的完全可见性
- **调试支持**: 开发和调试工具

## 🔄 升级流程

### 升级步骤

1. **开发新功能**: 在对应的 Facet 中实现新功能
2. **测试验证**: 确保新功能正常工作
3. **部署新 Facet**: 部署新的 Facet 合约
4. **执行 DiamondCut**: 调用 `diamondCut` 函数升级
5. **验证升级**: 确认升级成功

### 升级示例

```typescript
// 1. 获取 DiamondCutFacet
const diamondCutFacet = await ethers.getContractAt(
  "DiamondCutFacet",
  diamondAddress
);

// 2. 准备升级数据
const facetCut = [
  {
    facetAddress: newFacetAddress,
    action: FacetCutAction.Replace,
    functionSelectors: getSelectors(newFacetContract),
  },
];

// 3. 执行升级
await diamondCutFacet.diamondCut(facetCut, ethers.ZeroAddress, "0x");
```

## 🛠️ 开发工具

### Hardhat 任务

```bash
# 编译合约
npx hardhat compile

# 运行测试
npx hardhat test

# 部署合约
npx hardhat run script/deploy.ts

# 验证合约
npx hardhat verify --network sepolia <contract-address>

# 查看账户余额
npx hardhat console

# 导出合约 ABI
npx hardhat export-abi
```

### 脚本工具

- **deploy.ts**: 主部署脚本，支持网络重试和错误处理
- **DeployHelper.ts**: 部署助手类，简化部署流程
- **diamond.js**: Diamond 相关的工具函数

## 📈 Gas 优化

### 优化策略

- **Diamond 架构**: 只部署使用的功能
- **打包操作**: 支持批量操作减少交易数量
- **存储优化**: 高效的存储布局
- **计算优化**: 复用计算结果

### Gas 分析

```bash
# 运行 gas 分析测试
REPORT_GAS=true npx hardhat test

# 生成 gas 报告
npx hardhat test --gas-report
```

## 🔗 相关链接

- **[EIP-2535 Diamond 标准](https://eips.ethereum.org/EIPS/eip-2535)**
- **[OpenZeppelin 合约库](https://docs.openzeppelin.com/contracts)**
- **[Hardhat 开发环境](https://hardhat.org/docs)**
- **[Uniswap V3 文档](https://docs.uniswap.org/contracts/v3)**
- **[Sepolia 测试网](https://sepolia.dev/)**

## 🤝 贡献指南

### 开发流程

1. **Fork 项目**: Fork 仓库到您的 GitHub
2. **创建分支**: `git checkout -b feature/amazing-feature`
3. **提交更改**: `git commit -m 'Add some amazing feature'`
4. **推送分支**: `git push origin feature/amazing-feature`
5. **创建 PR**: 创建 Pull Request

### 代码规范

- **Solidity**: 遵循官方 Solidity Style Guide
- **TypeScript**: 使用 ESLint 和 Prettier
- **测试**: 保持 90% 以上的测试覆盖率
- **文档**: 为新功能添加详细文档

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## ⚠️ 免责声明

本项目仅用于学习和研究目的。在生产环境使用前，请：

- 进行全面的安全审计
- 在测试网充分测试
- 了解相关法规要求
- 评估潜在风险

**风险提示**: 加密货币投资具有高风险，可能导致资金损失。

---

## 🎯 快速命令参考

```bash
# 🔧 开发
npm install                # 安装依赖
npx hardhat compile       # 编译合约
npx hardhat test          # 运行测试

# 🚀 部署
npx hardhat run script/deploy.ts --network localhost
npx hardhat run script/deploy.ts --network sepolia

# 🔒 安全
npm run security          # 安全检查
npm run slither           # Slither 分析

# 🔄 工具
npm run copy:abis         # 复制 ABI 到前端
npm run verify:deployment # 验证合约

# 📊 服务
cd offchain-monitor-service && npm run dev  # 启动监听服务
cd front && npm run dev                    # 启动前端
```

**开始您的 Web3 开发之旅！** 🚀
