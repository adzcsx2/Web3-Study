# 🎨 Web3 NFT 项目 - 升级版 ERC721 合约与完整生态

## 🌟 项目概览

这是一个完整的 Web3 NFT 项目，包含智能合约、链下监听服务、前端应用的全栈解决方案。项目实现了可升级的 ERC721 NFT 合约，支持版税功能，并配备企业级的事件监听服务和现代化的前端应用。

## 🏗️ 项目架构

```
Web3-NFT-Project/
├── 📜 contracts/                 # 智能合约
│   └── contract/
│       └── MyNFT.sol            # 主 NFT 合约 (可升级、版税、暂停)
├── 🔗 offchain-monitor-service/  # 链下监听服务
│   ├── src/
│   │   ├── services/            # 核心服务
│   │   ├── config/              # 配置管理
│   │   └── types/               # 类型定义
│   └── README.md                # 监听服务详细文档
├── 🖥️ front/                     # Next.js 前端应用
│   ├── src/
│   │   ├── app/                 # App Router 页面
│   │   ├── components/          # React 组件
│   │   ├── stores/              # Zustand 状态管理
│   │   └── i18n/                # 国际化系统
│   └── package.json             # 前端依赖
├── 🧪 test/                      # 智能合约测试
├── 🔧 scripts/                   # 部署和操作脚本
│   ├── script_mint.ts          # NFT 铸造脚本
│   └── script_transfer.ts       # NFT 转移脚本
├── 📦 artifacts/                  # 编译后的合约文件
└── ⚙️ hardhat.config.ts         # Hardhat 配置
```

## 🚀 核心特性

### 🎨 NFT 智能合约 (MyNFT.sol)

- **🔄 UUPS 可升级模式** - 支持合约逻辑升级
- **💰 ERC2981 版税标准** - 自动版税分配
- **🔒 暂停功能** - 紧急情况下的合约暂停
- **🛡️ 重入攻击保护** - 全面的安全防护
- **📊 ERC721 标准完整实现** - 包含扩展功能
- **🎯 最大供应量限制** - 100个 NFT 的稀缺性保障

### 🌐 链下监听服务

- **⚡ 实时事件监听** - WebSocket 高速监听
- **📦 批量处理架构** - 高并发场景优化
- **🔒 区块确认监控** - 6个区块确认机制
- **🔄 链重组检测** - 数据完整性保障
- **📊 性能监控** - 实时统计和日志
- **🏥 健康检查** - 自动故障恢复

### 🖥️ 现代化前端应用

- **⚛️ Next.js 15 + React 19** - 最新技术栈
- **🎨 Ant Design + Tailwind CSS** - 美观UI组件
- **🌐 RainbowKit + Wagmi** - 完整的 Web3 集成
- **🌍 国际化支持** - 中英文双语
- **📱 响应式设计** - 移动端适配
- **💾 Zustand 状态管理** - 轻量级状态方案

## 🛠️ 技术栈

### 智能合约开发
- **Solidity 0.8.26** - 最新版本，优化器200次运行
- **Hardhat** - 专业以太坊开发框架
- **OpenZeppelin** - 企业级安全合约库
- **TypeChain** - TypeScript 类型支持

### 后端服务
- **TypeScript** - 类型安全的 Node.js 开发
- **Ethers.js v6** - 最新以太坊交互库
- **Supabase** - 现代化 BaaS 服务
- **Winston** - 企业级日志系统

### 前端开发
- **Next.js 15** - 全栈 React 框架
- **TypeScript** - 类型安全开发
- **Ant Design** - 企业级UI组件库
- **Tailwind CSS** - 实用优先的CSS框架
- **RainbowKit** - 最佳Web3钱包连接体验

## 🚀 快速开始

### 环境准备

确保您的开发环境已安装：

```bash
# Node.js 18+ 和 npm
node --version
npm --version

# Git
git --version
```

### 1. 克隆项目

```bash
git clone <repository-url>
cd NFT
```

### 2. 安装依赖

```bash
# 安装主项目依赖
npm install

# 安装前端依赖
cd front && npm install && cd ..

# 安装监听服务依赖
cd offchain-monitor-service && npm install && cd ..
```

### 3. 环境变量配置

#### 智能合约环境 (.env)

```env
# Infura 配置
PRIVATE_KEY=your_private_key_here
INFURA_PROJECT_ID=your_infura_project_id

```

#### 前端环境 (front/.env.local)

```env
NEXT_PUBLIC_BASE_API=https://your-api-endpoint.com
NEXT_PUBLIC_APP_TITLE=NFT项目
NEXT_PUBLIC_DEFAULT_LANGUAGE=zh
NEXT_PUBLIC_SUPPORTED_LANGUAGES=zh,en
```

#### 监听服务环境 (offchain-monitor-service/.env)

```env
INFURA_PROJECT_ID=your_infura_project_id
NFT_CONTRACT_ADDRESS=0xYourNFTContractAddress
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NETWORK_NAME=sepolia
NETWORK_CHAIN_ID=11155111
```

## 📜 智能合约

### 合约特性

#### MyNFT.sol - 主合约

```solidity
contract MyNFT is ERC721Upgradeable, ERC721BurnableUpgradeable,
                ERC721PausableUpgradeable, OwnableUpgradeable,
                ERC2981, UUPSUpgradeable, ReentrancyGuardUpgradeable {

    // 核心功能
    - mint(address to)                    // 所有者铸造
    - setDefaultRoyalty()                 // 设置版税
    - pause()/unpause()                   // 暂停/恢复
    - totalMinted()                       // 查询已铸造数量

    // 安全特性
    - 重入攻击保护
    - 角色权限控制
    - 版税标准支持
    - UUPS升级模式
}
```

#### 合约规范

- **最大供应量**: 100个 NFT
- **基础URI**: IPFS 元数据
- **版税**: 可配置 ERC2981 标准
- **版本控制**: 升级版本追踪

### 合约开发命令

```bash
# 编译合约
npx hardhat compile

# 运行测试
npx hardhat test

# 运行测试（包含Gas报告）
REPORT_GAS=true npx hardhat test

# 启动本地网络
npx hardhat node

# 部署合约到本地网络
npm run deploy:nft:local

# 部署合约到测试网
npm run deploy:nft:unsafe-demo

# 安全分析
npm run slither

# 验证合约
npm run verify:deployment

# 复制ABI
npm run copy:abis
```

### 合约测试

```bash
# 运行所有测试
npx hardhat test

# 运行特定测试文件
npx hardhat test test/MyNFT.test.ts

# 运行Gas基准测试
REPORT_GAS=true npx hardhat test
```

## 🌐 链下监听服务

### 服务特性

- **实时事件监听**: WebSocket 连接，毫秒级响应
- **批量处理**: 50个事件/批次，智能队列管理
- **确认监控**: 6个区块确认，确保交易最终性
- **链重组检测**: 自动检测和处理链重组
- **性能监控**: 实时统计和结构化日志

### 服务运行

```bash
cd offchain-monitor-service

# 开发模式
npm run dev

# 构建项目
npm run build

# 生产模式
npm start

# 测试连接
npm run test

# 测试数据库
npm run test:database
```

详细文档请参考: [offchain-monitor-service README](./offchain-monitor-service/README.md)

## 🖥️ 前端应用

### 应用特性

- **🎨 现代化UI**: Ant Design + Tailwind CSS
- **🔗 Web3集成**: RainbowKit + Wagmi 钱包连接
- **🌍 国际化**: 中英文双语支持
- **📱 响应式**: 移动端和桌面端适配
- **⚡ 高性能**: Next.js 15 App Router

### 前端开发

```bash
cd front

# 开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm run start

# 代码检查
npm run lint
```

### 项目结构

```
front/
├── src/
│   ├── app/                  # App Router 页面
│   ├── components/           # React 组件
│   ├── stores/              # Zustand 状态管理
│   ├── services/            # API 服务
│   ├── i18n/                # 国际化
│   └── types/               # TypeScript 类型
```

## 📊 脚本工具

### NFT 操作脚本

#### 铸造脚本 (script/script_mint.ts)

```bash
# 铸造 NFT 到指定地址
npx hardhat run scripts/script_mint.ts --network sepolia
```

#### 转移脚本 (script/script_transfer.ts)

```bash
# 转移 NFT
npx hardhat run scripts/script_transfer.ts --network sepolia
```

## 🔒 安全性

### 安全特性

- **🛡️ 重入攻击保护** - 所有外部函数使用 `nonReentrant`
- **🔐 暂停功能** - 紧急情况下的合约暂停
- **👥 角色控制** - 基于所有者的访问控制
- **🔄 升级控制** - 仅所有者可授权合约升级

### 安全工具

```bash
# 运行 Slither 静态分析
npm run slither

# 运行高级安全检查
npm run slither:high

# 运行安全分析
npm run security
```

### 安全最佳实践

1. **私钥管理**: 使用环境变量，不在代码中硬编码
2. **合约升级**: UUPS 模式，安全的升级流程
3. **权限控制**: 最小权限原则
4. **测试覆盖**: 全面的单元测试和集成测试

## 📈 性能优化

### 智能合约优化

- **Gas 优化**: 编译器优化器200次运行
- **存储优化**: 高效的数据结构设计
- **批量操作**: 支持批量NFT操作

### 服务优化

- **批量处理**: 事件批量处理减少数据库压力
- **并发控制**: 限制并发数防止资源耗尽
- **连接池**: 数据库连接复用

### 前端优化

- **代码分割**: Next.js 自动代码分割
- **图片优化**: Next.js Image 组件
- **缓存策略**: 智能的缓存机制

## 🚀 部署指南

### 本地部署

1. **启动本地网络**
   ```bash
   npx hardhat node
   ```

2. **部署合约**
   ```bash
   npm run deploy:nft:local
   ```

3. **启动监听服务**
   ```bash
   cd offchain-monitor-service
   npm run dev
   ```

4. **启动前端**
   ```bash
   cd front
   npm run dev
   ```

### 生产部署

#### Railway 部署 (推荐)

1. **Fork 仓库** 到 GitHub
2. **连接 Railway** - 导入仓库
3. **配置环境变量** - 在 Railway 控制台
4. **自动部署** - Railway 自动构建部署

#### 其他云平台

支持部署到 Vercel、Heroku、AWS 等主流云平台。

## 🧪 测试

### 智能合约测试

```bash
# 运行所有测试
npx hardhat test

# Gas 报告测试
REPORT_GAS=true npx hardhat test

# 覆盖率测试
npx hardhat coverage
```

### 服务测试

```bash
cd offchain-monitor-service

# 连接测试
npm run test

# 数据库测试
npm run test:database
```

### 前端测试

```bash
cd front

# 单元测试
npm test

# E2E 测试
npm run test:e2e
```

## 📝 API 文档

### 智能合约接口

#### 主要函数

```solidity
// 铸造 NFT
function mint(address to) external onlyOwner

// 设置版税
function setDefaultRoyalty(address receiver, uint96 feeNumerator) external onlyOwner

// 暂停合约
function pause() external onlyOwner

// 查询已铸造数量
function totalMinted() external view returns (uint256)

// 基础 URI
function _baseURI() internal pure override returns (string memory)
```

#### 事件

```solidity
event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
```

## 🔄 升级指南

### 合约升级流程

1. **准备新实现合约**
2. **部署新实现**
3. **调用升级函数**
4. **验证升级结果**

```bash
# 升级合约脚本示例
npx hardhat run scripts/upgrade.ts --network mainnet
```

## 🛠️ 故障排查

### 常见问题

#### 1. 合约部署失败
- 检查 Gas 限制
- 验证网络配置
- 确认私钥权限

#### 2. 监听服务连接失败
- 检查 Infura 配置
- 验证 Supabase 连接
- 查看 WebSocket 状态

#### 3. 前端钱包连接问题
- 检查 MetaMask 配置
- 验证网络 ID
- 确认合约地址

### 日志分析

```bash
# 智能合约日志
npx hardhat console

# 监听服务日志
tail -f offchain-monitor-service/logs/combined.log

# 前端日志
# 查看浏览器开发者工具 Console
```

## 🤝 贡献指南

### 开发流程

1. **Fork 项目** 到您的 GitHub
2. **创建功能分支** - `git checkout -b feature/amazing-feature`
3. **提交更改** - `git commit -m 'Add amazing feature'`
4. **推送分支** - `git push origin feature/amazing-feature`
5. **创建 Pull Request**

### 代码规范

- **TypeScript**: 严格类型检查
- **Solidity**: 遵循官方样式指南
- **测试**: 新功能需要完整测试
- **文档**: 更新相关文档

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🔗 相关链接

- **智能合约文档**: [contracts/README.md](./contracts/)
- **监听服务文档**: [offchain-monitor-service/README.md](./offchain-monitor-service/README.md)
- **前端应用文档**: [front/README.md](./front/README.md)
- **API 文档**: [docs/API.md](./docs/API.md)
- **部署指南**: [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)

## 📞 联系与支持

- **问题反馈**: [GitHub Issues](https://github.com/your-repo/issues)
- **功能建议**: [GitHub Discussions](https://github.com/your-repo/discussions)
- **技术支持**: support@yourproject.com

---

## 🎉 致谢

感谢以下开源项目：

- [Hardhat](https://hardhat.org/) - 以太坊开发环境
- [OpenZeppelin](https://openzeppelin.com/) - 安全的智能合约库
- [Next.js](https://nextjs.org/) - React 全栈框架
- [RainbowKit](https://rainbowkit.com/) - 最好的 Web3 钱包连接库
- [Supabase](https://supabase.com/) - 开源 Firebase 替代品

---

**注意**: 这是一个学习和演示项目，生产环境使用前请进行充分的审计和测试。