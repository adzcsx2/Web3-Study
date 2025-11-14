# Web3 项目架构模板

一个标准化的 Web3 智能合约项目模板，包含完整的开发工具链、测试套件、部署系统和链下监听服务。

## 🏗️ 项目架构

```
BeggingContract/
├── contracts/                     # 智能合约源码
│   ├── constants/                 # 合约常量定义
│   ├── contract/                  # 主合约实现
│   ├── errors/                    # 自定义错误定义
│   ├── events/                    # 事件定义
│   ├── interfaces/                # 接口定义
│   ├── modify/                    # 自定义修饰符
│   ├── structs/                   # 结构体定义
│   └── utils/                     # 合约工具函数
├── script/                        # 部署和工具脚本
│   └── utils/                     # 部署辅助工具
├── test/                          # 测试套件
├── offchain-monitor-service/      # 链下监听服务
│   ├── abis/                      # 合约ABI文件
│   ├── logs/                      # 服务日志
│   └── src/                       # 服务源码
│       ├── config/                # 配置文件
│       ├── services/              # 核心服务
│       ├── types/                 # 类型定义
│       └── utils/                 # 工具函数
├── front/                         # 前端应用
│   ├── public/                    # 静态资源
│   ├── scripts/                   # 构建脚本
│   └── src/                       # 前端源码
│       ├── app/                   # App Router (Next.js)
│       │   ├── abi/               # 合约ABI
│       │   ├── api/               # API路由
│       │   └── [pages]/           # 页面组件
│       ├── components/            # 可复用组件
│       ├── config/                # 前端配置
│       ├── constants/             # 常量定义
│       ├── hooks/                 # 自定义Hooks
│       ├── http/                  # HTTP客户端
│       ├── i18n/                  # 国际化
│       ├── lib/                   # 第三方库配置
│       ├── locales/               # 语言包
│       ├── middleware/            # 中间件
│       ├── router/                # 路由配置
│       ├── scripts/               # 页面脚本
│       ├── services/              # 业务服务
│       ├── stores/                # 状态管理
│       ├── styles/                # 样式文件
│       ├── types/                 # TypeScript类型
│       └── utils/                 # 工具函数
├── src/                           # 后端服务源码（可选）
│   ├── config/                    # 配置文件
│   ├── images/                    # 图片资源
│   ├── metadata/                  # 元数据文件
│   ├── services/                  # 后端服务
│   ├── types/                     # 类型定义
│   └── utils/                     # 工具函数
├── deployments/                   # 部署历史记录
├── docs/                          # 项目文档
├── abis/                          # 合约ABI文件
├── logs/                          # 日志文件
├── .vscode/                       # VS Code配置
├── .openzeppelin/                 # OpenZeppelin配置
├── typechain-types/               # TypeScript类型生成
└── artifacts/                     # 编译产物
```

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
cd front && npm install

# 安装链下监听服务依赖
cd offchain-monitor-service && npm install
```

### 环境配置

创建 `.env` 文件并配置以下变量：

```bash
# 网络配置
INFURA_PROJECT_ID=your_infura_project_id
PRIVATE_KEY=your_private_key

# Supabase配置（链下服务）
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

## 🛠️ 开发指南

### 智能合约开发

```bash
# 编译合约
npx hardhat compile

# 运行测试
npx hardhat test

# 运行特定测试
npx hardhat test test/MyNFT.test.ts

# 测试覆盖率
npx hardhat coverage

# Gas分析
REPORT_GAS=true npx hardhat test

# 类型检查
npx tsc --noEmit
```

### 合约部署

```bash
# 部署到本地网络
npm run deploy:nft:local

# 部署到Sepolia测试网
npm run deploy:nft:sepolia

# 部署所有合约
npm run deploy:all:sepolia

# 验证合约
npm run verify:deployment:sepolia

# 复制ABI到前端
npm run copy:abis
```

### 安全分析

```bash
# 运行安全分析
npm run security

# 生成详细报告
npm run slither:report
```

### 前端开发

```bash
cd front

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start

# 类型检查
npm run type-check

# 代码检查
npm run lint
```

### 链下监听服务

```bash
cd offchain-monitor-service

# 开发模式
npm run dev

# 构建项目
npm run build

# 启动服务
npm start

# 测试服务
npm run test
```

## 🧪 测试策略

### 测试文件组织

```
test/
├── MyNFT.test.ts                 # 核心功能测试
├── MyNFT.gas.test.ts            # Gas消耗分析
├── MyNFT.integration.test.ts    # 集成测试
├── MyNFT.deployment.test.ts     # 部署测试
├── MyNFT.typesafe.test.ts       # 类型安全测试
└── README.md                    # 测试说明文档
```

### 测试覆盖范围

- ✅ 合约初始化和配置
- ✅ NFT 铸造和转移
- ✅ 访问控制和权限管理
- ✅ 暂停/恢复机制
- ✅ 版税功能
- ✅ 合约升级机制
- ✅ 错误处理和边界条件
- ✅ Gas 消耗分析
- ✅ 集成测试场景

## 🔒 安全最佳实践

### 智能合约安全

- 使用 OpenZeppelin v5 标准库
- 实施重入攻击保护
- 整数溢出检查
- 访问控制机制
- 暂停功能支持
- 定期安全扫描

### 代码质量

- TypeScript 类型安全
- ESLint 代码规范
- Prettier 代码格式化
- 全面的单元测试
- 集成测试覆盖
- Gas 优化分析

## 📦 部署流程

### 1. 本地开发和测试

```bash
# 启动本地Hardhat网络
npx hardhat node

# 部署到本地网络
npm run deploy:nft:local

# 运行测试验证
npx hardhat test
```

### 2. 测试网部署

```bash
# 配置环境变量
# 编辑 .env 文件

# 部署到Sepolia
npm run deploy:nft:sepolia

# 验证合约
npm run verify:deployment:sepolia
```

### 3. 生产部署

```bash
# 运行完整安全分析
npm run security

# 部署到主网
npm run deploy:nft:mainnet

# 验证合约
npm run verify:deployment:mainnet

# 启动链下监听服务
cd offchain-monitor-service && npm run build && npm start
```

## 🧩 项目组件说明

### DeployHelper 部署工具

- 自动化部署流程
- 部署历史记录
- ABI 管理
- 多网络支持
- 合约升级支持

### 链下监听服务

- 实时事件监听
- 数据持久化
- 多网络支持
- 结构化日志
- 健康检查端点

### 前端应用

- Next.js 14 App Router
- TypeScript 支持
- 国际化支持
- Web3 集成
- 响应式设计

## 🔄 CI/CD 集成

### GitHub Actions 工作流

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm run test:all
      - name: Security scan
        run: npm run security
```

## 📚 文档

- [CLAUDE.md](./CLAUDE.md) - Claude Code 开发指南
- [test/README.md](./test/README.md) - 测试文档
- [API 文档](./docs/api.md) - API 接口文档
- [部署指南](./docs/deployment.md) - 详细部署说明

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

### 代码规范

- 遵循 TypeScript 最佳实践
- 使用 ESLint 和 Prettier
- 编写全面的测试
- 更新相关文档
- 通过所有 CI 检查

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 支持

如果您遇到问题或有疑问：

1. 查看 [FAQ](./docs/faq.md)
2. 搜索 [Issues](../../issues)
3. 创建新的 [Issue](../../issues/new)
4. 联系维护者

## 🏆 致谢

- [OpenZeppelin](https://openzeppelin.com/) - 安全的智能合约库
- [Hardhat](https://hardhat.org/) - 以太坊开发环境
- [Ethers.js](https://ethers.org/) - 以太坊交互库
- [Next.js](https://nextjs.org/) - React 框架
- [Supabase](https://supabase.com/) - 后端即服务
- [Railway](https://railway.app/) - 部署平台

---

**注意**: 这是一个项目模板，请根据具体需求进行相应的修改和配置。
