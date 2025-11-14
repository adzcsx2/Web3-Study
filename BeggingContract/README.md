# BeggingContract - 多代币捐赠平台

一个基于 Solidity 开发的智能合约，支持多种代币类型的去中心化捐赠平台，包含排行榜功能、时间限制和全面的资金管理。

## 🚀 主要特性

### 核心功能

- **多代币支持**: ETH、ERC20、ERC721 (NFT)、ERC1155 (多代币 NFT)
- **智能排行榜**: 自动维护捐赠金额最多的前 3 名捐赠者
- **时间限制**: 可配置的捐赠开始/结束时间
- **资金提取**: 合约所有者可以安全提取所有类型的捐赠
- **暂停功能**: 紧急情况下可暂停/恢复合约操作

### 安全特性

- **重入攻击防护**: 使用 OpenZeppelin 的 ReentrancyGuard
- **访问控制**: 基于所有者权限的管理机制
- **安全转账**: 所有代币转账使用 SafeTransfer 模式
- **输入验证**: 全面的参数验证和自定义错误
- **事件记录**: 完整的捐赠和提现事件日志

## 📋 合约架构

```
contracts/
├── contract/
│   └── BeggingContract.sol    # 主合约
├── events/
│   └── CustomEvents.sol       # 自定义事件定义
├── errors/
│   └── CustomErrors.sol       # 自定义错误
├── modify/
│   └── CustomModifier.sol     # 自定义修饰符
├── mocks/                     # 测试用模拟合约
│   ├── MockERC20.sol
│   ├── MockERC721.sol
│   └── MockERC1155.sol
└── interfaces/                # 接口定义
```

## 🛠 技术栈

- **Solidity**: 0.8.26
- **开发框架**: Hardhat
- **库依赖**: OpenZeppelin Contracts v5.4.0
- **测试框架**: Mocha + Chai
- **类型安全**: TypeScript
- **代码分析**: Slither (静态分析)

## 📦 安装与设置

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装依赖

```bash
# 克隆项目
git clone <repository-url>
cd BeggingContract

# 安装依赖
npm install
```

### 环境配置

创建 `.env` 文件并配置以下变量：

```bash
# Infura Project ID (用于网络连接)
INFURA_PROJECT_ID=your_infura_project_id

# 部署账户私钥 (注意：不要在生产环境提交真实私钥)
PRIVATE_KEY=your_private_key

```

## 🔧 开发命令

### 编译合约

```bash
# 编译所有合约
npx hardhat compile

# 带详细输出的编译
npx hardhat compile --verbose
```

### 测试

```bash
# 运行所有测试
npx hardhat test

# 运行特定测试文件
npx hardhat test test/BeggingContract.test.ts

# 运行测试并生成Gas报告
REPORT_GAS=true npx hardhat test

# 运行测试覆盖率
npx hardhat coverage

# 类型检查
npx tsc --noEmit
```

### 部署

```bash
# 部署到本地网络
npx hardhat run script/deploy_NFT.ts --network localhost

# 部署到Sepolia测试网
npx hardhat run script/deploy_NFT.ts --network sepolia

# 部署到主网 (谨慎操作)
npx hardhat run script/deploy_NFT.ts --network mainnet

# 复制ABI到前端
npm run copy:abis
```

### 安全分析

```bash
# 运行高优先级安全检查
npm run security

# 完整Slither分析
npm run slither

# 生成安全报告
npm run slither:report
```

## 📊 合约接口

### 核心函数

#### 捐赠功能

```solidity
// ETH捐赠
function donateETH() external payable

// ERC20代币捐赠
function donateERC20(address tokenAddress, uint256 amount) external

// ERC721 NFT捐赠
function donateNFT(address nftAddress, uint256 tokenId) external

// ERC1155多代币捐赠
function donateERC1155(
    address nftAddress,
    uint256 tokenId,
    uint256 amount,
    bytes calldata data
) external
```

#### 提取功能 (仅所有者)

```solidity
// 提取ETH
function withdrawETH() external onlyOwner

// 提取ERC20
function withdrawERC20(address tokenAddress) external onlyOwner

// 提取ERC721 NFT
function withdrawNFT(address nftAddress, uint256 tokenId) external onlyOwner

// 提取ERC1155
function withdrawERC1155(
    address nftAddress,
    uint256 tokenId,
    uint256 amount
) external onlyOwner

// 批量提取ERC1155
function batchWithdrawERC1155(
    address nftAddress,
    uint256[] calldata ids,
    uint256[] calldata amounts
) external onlyOwner
```

#### 查询功能

```solidity
// 获取用户捐赠总额
function getDonation(address donator) external view returns (uint256)

// 获取排行榜前三名
function getTopDonators() external view returns (address[] memory)
```

#### 管理功能 (仅所有者)

```solidity
// 暂停合约
function pause() external onlyOwner

// 恢复合约
function unpause() external onlyOwner
```

### 事件

```solidity
// 捐赠事件
event DonationETH(address indexed donator, uint256 amount, uint256 timestamp);
event DonationERC20(address indexed donator, address indexed tokenAddress, uint256 amount, uint256 timestamp);
event DonationERC721(address indexed donator, address indexed tokenAddress, uint256 tokenId, uint256 timestamp);
event DonationERC1155(address indexed donator, address indexed tokenAddress, uint256 tokenId, uint256 amount, uint256 timestamp);

// 提现事件
event WithdrawETH(address indexed to, uint256 amount, uint256 timestamp);
event WithdrawERC20(address indexed to, address indexed tokenAddress, uint256 amount, uint256 timestamp);
event WithdrawERC721(address indexed to, address indexed tokenAddress, uint256 tokenId, uint256 timestamp);
event WithdrawERC1155(address indexed to, address indexed tokenAddress, uint256 tokenId, uint256 amount, uint256 timestamp);

// 排行榜事件
event RankDonator(address indexed donator, uint256 amount, uint256 timestamp);
```

## 🚀 部署指南

### 本地部署

```bash
# 启动本地Hardhat节点
npx hardhat node

# 在新终端中部署合约
npx hardhat run script/deploy_NFT.ts --network localhost
```

### 测试网部署 (Sepolia)

```bash
# 确保有足够的测试ETH
# 部署到Sepolia
npx hardhat run script/deploy_NFT.ts --network sepolia

# 验证合约 (可选)
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

### 生产环境部署

⚠️ **警告**: 生产环境部署需要谨慎操作，建议先进行全面的安全审计。

```bash
# 部署到主网
npx hardhat run script/deploy_NFT.ts --network mainnet

# 验证合约
npx hardhat verify --network mainnet <CONTRACT_ADDRESS>
```

## 🧪 测试

项目包含全面的测试套件，覆盖：

- **单元测试**: 各个函数的功能测试
- **集成测试**: 完整的捐赠流程测试
- **Gas 分析**: 优化 Gas 消耗
- **边界测试**: 极端情况处理
- **安全测试**: 重入攻击、权限控制等

```bash
# 运行特定类型测试
npx hardhat test test/BeggingContract.test.ts
npx hardhat test test/BeggingContract.sepolia.test.ts --network sepolia
```

## 🔒 安全考虑

### 已实现的安全措施

- ✅ 重入攻击防护 (ReentrancyGuard)
- ✅ 访问控制 (Ownable)
- ✅ 时间限制验证
- ✅ 余额检查
- ✅ 安全转账模式
- ✅ 暂停机制
- ✅ 事件日志记录

### 安全建议

1. **定期安全审计**: 建议每次部署前进行代码审计
2. **渐进式部署**: 先在测试网充分测试
3. **权限管理**: 谨慎管理合约所有者权限
4. **监控机制**: 建立链上事件监控系统
5. **应急计划**: 制定合约暂停和资金提取应急预案

## 📈 Gas 优化

- **优化的数据结构**: 使用高效的存储布局
- **批量操作**: 支持批量 ERC1155 提现
- **IR 编译器**: 启用 viaIR 优化
- **运行次数优化**: 编译器优化设置为 200 次

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 代码规范

- 遵循 Solidity 样式指南
- 编写全面的测试
- 添加适当的注释
- 更新相关文档

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 支持

如有问题或建议，请：

1. 查看 [FAQ](docs/FAQ.md)
2. 搜索现有的 [Issues](../../issues)
3. 创建新的 Issue 描述问题

---

**⚠️ 免责声明**: 本合约仅用于教育和演示目的。在生产环境使用前，请进行充分的安全审计和测试。开发者不对资金损失承担责任。
