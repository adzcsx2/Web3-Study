# NFT AUCTION 🎭

一个基于 Hardhat 框架开发的 NFT 拍卖市场，集成 Chainlink 预言机价格功能，使用 UUPS 代理模式实现合约升级。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Solidity](https://img.shields.io/badge/solidity-0.8.26+-black.svg)
![Hardhat](https://img.shields.io/badge/hardhat-2.27.0-yellowgreen.svg)

## ✨ 功能特性

### 🎯 核心功能

- **NFT 拍卖市场**：完整的创建、出价、结束拍卖流程
- **Chainlink 预言机**：实时获取 ETH/USD 价格，实现精确的价格转换
- **UUPS 代理模式**：支持合约升级，便于后续功能扩展
- **动态手续费**：根据拍卖金额动态调整平台手续费
- **多语言支持**：前端支持中英文国际化
- **链下监听服务**：基于 WebSocket 的事件监听和处理

### 🛡️ 安全特性

- **重入攻击防护**：使用 OpenZeppelin 的 ReentrancyGuard
- **暂停/恢复功能**：紧急情况下可暂停合约操作
- **权限控制**：基于 OpenZeppelin 的访问控制机制
- **输入验证**：全面的参数验证和边界检查
- **价格稳定性检查**：验证 Chainlink 价格数据的合理性

## 🏗️ 架构设计

### 项目结构

```
NTF_AUCTION/
├── contracts/                 # 智能合约
│   ├── contract/              # 合约实现
│   │   ├── MyNFT.sol         # ERC721 NFT 合约
│   │   └── NFTAuction.sol    # 拍卖市场合约
│   ├── structs/              # 数据结构定义
│   ├── events/               # 事件定义
│   ├── errors/               # 自定义错误
│   └── modify/               # 修饰符定义
├── script/                   # 部署脚本
├── test/                     # 测试文件
├── offchain-monitor-service/ # 链下监听服务
├── front/                    # Next.js 前端应用
└── deployments/              # 部署记录
```

### 技术栈

#### 智能合约

- **Solidity ^0.8.26**：使用最新的 Solidity 特性
- **OpenZeppelin v5**：行业标准的合约库
- **Hardhat**：专业的以太坊开发框架
- **Chainlink**：去中心化预言机网络
- **UUPS 代理模式**：高效的合约升级方案

#### 前端应用

- **Next.js 15.5.3**：React 全栈框架
- **React 19**：最新版本 React
- **TypeScript**：类型安全的 JavaScript
- **Tailwind CSS 4**：现代 CSS 框架
- **Ant Design**：企业级 UI 组件库
- **Wagmi & Viem**：React Web3 工具库
- **i18next**：国际化解决方案

#### 链下服务

- **Node.js**：服务端运行环境
- **Express**：Web 框架
- **Winston**：日志记录
- **Supabase**：后端服务和数据库

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm 或 yarn
- Git

### 安装依赖

```bash
# 安装主项目依赖
npm install

# 安装前端依赖
cd front
npm install

# 安装链下监听服务依赖
cd offchain-monitor-service
npm install
```

### 环境配置

创建 `.env` 文件并配置以下变量：

```bash
# 网络配置
INFURA_PROJECT_ID=your_infura_project_id
PRIVATE_KEY=your_private_key

# Supabase 配置（链下服务）
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# 网络特定的 RPC URL
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
```

## 📋 开发命令

### 智能合约开发

```bash
# 编译合约
npx hardhat compile

# 运行测试
npx hardhat test                              # 所有测试
npx hardhat test test/MyNFT.test.ts          # 单元测试
npx hardhat test test/MyNFT.gas.test.ts      # Gas 分析
npx hardhat test test/MyNFT.integration.test.ts  # 集成测试
npx hardhat test test/MyNFT.deployment.test.ts   # 部署测试

# 运行测试并生成 Gas 报告
REPORT_GAS=true npx hardhat test

# 运行测试覆盖率
npx hardhat coverage

# 类型检查
npx tsc --noEmit
```

### 合约部署

```bash
# 部署 NFT 合约
npm run deploy:nft                    # 本地网络
npm run deploy:nft:local              # 明确在 localhost 部署
npm run deploy:nft:sepolia            # 在 Sepolia 测试网部署

# 部署所有合约
npm run deploy:all                    # 本地网络
npm run deploy:all:local              # 明确在 localhost 部署
npm run deploy:all:sepolia            # 在 Sepolia 测试网部署

# 使用不安全演示选项部署（仅用于测试）
npm run deploy:nft:unsafe-demo        # 本地网络不安全部署

# 在 Etherscan 上验证合约
npm run verify:deployment             # 本地验证
npm run verify:deployment:sepolia     # Sepolia 验证

# 部署后复制 ABI 到前端
npm run copy:abis
```

### 安全分析

```bash
# 运行安全分析
npm run security                      # 高优先级安全问题
npm run slither                       # 完整 Slither 分析
npm run slither:high                  # 仅高严重性问题
npm run slither:report                # 生成 JSON 报告
```

### 链下监听服务

```bash
cd offchain-monitor-service

# 开发模式
npm run dev                           # 使用 ts-node 运行
npm run build                         # 编译 TypeScript
npm run start                         # 运行编译后的版本

# 测试
npm run test                          # 基础测试
npm run test:database                 # 数据库查询测试

# 工具命令
npm run clean                         # 清理 dist 文件夹
npm run lint                          # ESLint 检查
```

### 前端开发

```bash
cd front

# 开发
npm run dev                           # 启动开发服务器
npm run build                         # 构建生产版本
npm run start                         # 启动生产服务器

# 代码检查
npm run lint                          # ESLint 检查
npm run format                        # 代码格式化
```

## 💡 智能合约详解

### MyNFT 合约

基于 ERC721Upgradeable 的 NFT 合约，具备以下特性：

- **UUPS 升级模式**：高效的代理升级实现
- **ERC2981 版税**：支持 NFT 版税标准
- **暂停功能**：紧急情况下可暂停合约操作
- **批量铸造**：支持批量铸造 NFT
- **供应量限制**：最大供应量 100 个代币
- **OpenZeppelin v5**：使用最新版本和自定义错误

### NFTAuction 合约

拍卖市场核心合约，功能包括：

#### 拍卖管理

- **创建拍卖**：支持设置起始价、结束时间、手续费等参数
- **开始拍卖**：卖家可设置拍卖开始时间
- **取消拍卖**：在特定条件下可取消拍卖
- **结算拍卖**：手动或自动结算已结束的拍卖

#### 出价系统

- **ETH 出价**：支持使用 ETH 进行出价
- **价格转换**：通过 Chainlink 预言机实时转换 ETH/USD 价格
- **自动退款**：前一出价者的资金自动退款
- **时间延长**：出价时自动延长拍卖时间
- **最小加价**：可配置的最小加价幅度

#### 安全机制

- **重入保护**：防止重入攻击
- **暂停功能**：支持紧急暂停
- **权限控制**：严格的访问控制
- **参数验证**：全面的输入验证
- **价格检查**：Chainlink 价格数据验证

## 🔗 集成说明

### Chainlink 预言机集成

合约集成 Chainlink ETH/USD 价格预言机：

- **地址**：`0x694AA1769357215DE4FAC081bf1f309aDC325306`（Sepolia）
- **精度**：8 位小数
- **价格验证**：检查价格合理性和数据新鲜度
- **安全范围**：$100 - $100,000 USD

### 前端集成

前端通过 wagmi 和 ethers.js 与智能合约交互：

- **ABI 文件**：部署后自动复制到 `front/src/app/abi/`
- **合约地址**：通过环境变量配置
- **Web3 连接**：支持 MetaMask 等钱包
- **实时更新**：监听区块链事件

### 链下监听服务

Node.js 服务提供以下功能：

- **WebSocket 监听**：实时监听区块链事件
- **事件处理**：处理 NFT 转移和铸造事件
- **数据存储**：将事件数据存储到 Supabase
- **多网络支持**：支持多个网络和 Infura 集成
- **日志记录**：使用 Winston 进行结构化日志

## 🧪 测试策略

### 测试分类

- **MyNFT.test.ts**：核心单元测试，覆盖所有合约功能
- **MyNFT.gas.test.ts**：Gas 优化分析和性能指标
- **MyNFT.integration.test.ts**：端到端工作流测试
- **MyNFT.deployment.test.ts**：部署验证和升级测试
- **MyNFT.typesafe.test.ts**：TypeScript 类型安全验证

### 测试要求

- 所有新合约必须具有全面的测试覆盖
- 包含 Gas 优化测试用于性能分析
- 测试成功和失败场景及适当的断言
- 所有测试文件使用 TypeScript 类型检查
- 遵循现有的测试文件组织模式

## 🚀 部署指南

### 部署系统

项目使用增强的部署系统，包含 `DeployHelper` 类：

- 自动在 JSON 文件中跟踪部署历史
- 将 ABI 保存到前端目录以实现无缝集成
- 支持初始部署和升级
- 为可升级合约维护版本历史
- 处理多个网络（localhost、Sepolia、mainnet）

### 部署最佳实践

- 使用 `DeployHelper` 类进行所有部署以保持一致的历史记录
- 部署到测试网后始终验证合约
- 部署后将 ABI 复制到前端目录
- 在部署到测试网之前在 localhost 上测试部署
- 保持环境变量（`.env`）为不同网络正确配置

### 生产部署

1. 在测试网（Sepolia）上完整测试
2. 运行安全分析检查
3. 准备部署脚本和环境变量
4. 执行部署并验证
5. 更新前端配置
6. 启动链下监听服务

## 🛡️ 安全考虑

### 安全最佳实践

- 在每次部署前使用 Slither 进行安全分析
- 注意重入保护和整数溢出检查
- 为紧急响应使用暂停模式
- 在所有外部函数上实施适当的输入验证
- 保持 OpenZeppelin 合约更新到最新稳定版本

### 已知安全措施

- ✅ 重入攻击防护
- ✅ 整数溢出检查
- ✅ 访问控制机制
- ✅ 暂停/恢复功能
- ✅ 输入验证
- ✅ 价格数据验证
- ✅ 时间戳验证

## 📊 监控与维护

### 链下监控

- **事件监听**：实时监听所有合约事件
- **数据库同步**：事件数据同步到 Supabase
- **健康检查**：服务健康状态监控
- **日志记录**：详细的操作日志

### 性能监控

- **Gas 使用分析**：持续监控合约 gas 消耗
- **事件处理延迟**：监控事件处理时间
- **API 响应时间**：前端 API 调用性能

## 🤝 贡献指南

### 开发流程

1. Fork 项目
2. 创建功能分支
3. 编写代码和测试
4. 运行安全分析
5. 提交 Pull Request

### 代码规范

- 遵循 Solidity 风格指南
- 使用 TypeScript 进行类型安全
- 编写全面的测试
- 添加适当的注释和文档

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🔗 相关链接

- **Hardhat 文档**：https://hardhat.org/docs
- **OpenZeppelin 文档**：https://docs.openzeppelin.com/
- **Chainlink 文档**：https://docs.chain.link/
- **Next.js 文档**：https://nextjs.org/docs

**注意**：这是一个 Web3 项目，专注于使用可升级智能合约的 NFT 开发。在整个项目中使用 TypeScript 以确保类型安全，实施与 Slither 集成的行业标准安全实践，并为生产环境提供全面的监控服务。所有合约都使用 OpenZeppelin 的 UUPS 模式进行可升级。
