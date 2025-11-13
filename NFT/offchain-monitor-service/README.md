# NFT 事件监听服务 (Offchain Monitor Service)

## 项目简介

这是一个企业级的 NFT 合约事件监听服务，具备高性能、高可靠性的链下数据索引功能。该服务通过 WebSocket 实时监听区块链上的 NFT 事件，支持批量处理、区块确认监控、链重组检测等高级特性，并将事件数据持久化到 Supabase 数据库中。

## 🚀 核心特性

- **实时事件监听** - 基于 WebSocket 的高速事件监听，毫秒级响应
- **批量处理机制** - 智能批量处理，支持高并发场景（50个事件/批次）
- **区块确认监控** - 6个区块确认机制，确保交易最终性
- **链重组检测** - 自动检测和处理链重组事件
- **自动重连机制** - 最多10次重连，指数退避策略
- **并发控制** - 最大10个并发处理任务
- **性能监控** - 实时统计事件接收、处理、确认数量
- **优雅关闭** - 完整的资源清理和状态保存

## 🛠 技术栈

- **TypeScript** - 类型安全的 JavaScript 开发
- **ethers.js v6** - 最新版本的以太坊交互库
- **Supabase** - 现代化的后端即服务平台
- **Infura** - 企业级以太坊节点服务
- **Winston** - 结构化日志记录系统
- **Node.js 18+** - 现代化的 JavaScript 运行时

## 📁 项目架构

```
offchain-monitor-service/
├── src/
│   ├── config/          # 🔧 配置管理
│   │   └── index.ts     # 环境变量验证与配置
│   ├── services/        # 🏗️ 核心服务层
│   │   ├── nftEventListener.ts  # NFT事件监听器（批量处理、确认监控）
│   │   ├── eventProcessor.ts     # 事件业务逻辑处理器
│   │   └── supabase.ts          # Supabase 数据库操作服务
│   ├── types/           # 📝 TypeScript 类型定义
│   │   └── index.ts     # 事件、配置、服务接口类型
│   ├── utils/           # 🛠️ 工具函数
│   │   └── logger.ts    # Winston 日志配置
│   ├── index.ts         # 🚀 应用主入口
│   ├── test.ts          # 🧪 连接与功能测试
│   └── testDatabaseQuery.ts  # 🗄️ 数据库查询测试
├── abis/                # 📋 智能合约 ABI
│   └── MyNFT.json       # NFT合约应用二进制接口
├── logs/                # 📊 日志文件目录（自动创建）
├── dist/                # 🔨 TypeScript 编译输出
├── .env                 # 🔐 环境变量配置（需手动创建）
├── package.json         # 📦 项目依赖与脚本
├── tsconfig.json        # ⚙️ TypeScript 编译配置
├── Procfile             # 🚢 Railway 部署配置
└── railway.toml         # 🚂 Railway 云平台配置
```

## ⚡ 核心功能详解

### 1. 🎯 高性能事件监听与批量处理

#### 实时监听机制
- **WebSocket 连接** - 使用 ethers.js v6 WebSocketProvider 建立持久连接
- **多事件类型** - 同时监听 Transfer、Approval 等 NFT 标准事件
- **智能重连** - 指数退避重连策略，最多重试 10 次
- **连接监控** - 实时监控连接状态，异常自动恢复

#### 批量处理架构
- **事件队列** - 智能事件队列，支持高并发场景
- **批量大小** - 每批处理 50 个事件，可配置
- **定时处理** - 3秒强制处理机制，避免事件堆积
- **并发控制** - 最大 10 个并发任务，防止资源耗尽

### 2. 🔒 区块确认与安全机制

#### 确认监控系统
- **确认要求** - 6个区块确认，确保交易最终性
- **实时跟踪** - 每30秒检查一次待确认事件
- **批量更新** - 高效的批量确认区块数更新
- **状态流转** - pending → confirmed/reverted

#### 链重组检测
- **交易验证** - 验证交易是否仍然存在于链上
- **区块一致性** - 检查交易区块号是否发生变化
- **状态回滚** - 自动将重组事件标记为 reverted
- **数据完整性** - 确保索引数据的准确性和一致性

### 3. 🗄️ 企业级数据管理

#### 数据库操作
- **批量插入** - 支持高性能批量事件插入
- **去重机制** - tx_hash + log_index 唯一约束
- **分页查询** - 高效的分页查询待确认事件
- **事务安全** - 完整的错误处理和事务回滚

#### 数据模型
```typescript
interface ChainEvent {
  tx_hash: string;           // 交易哈希
  log_index: number;         // 日志索引
  from_address?: string;     // 发送方地址
  to_address?: string;       // 接收方地址
  token_id?: string;         // Token ID
  block_number: number;      // 区块号
  status: "pending" | "confirmed" | "reverted";  // 事件状态
  confirmed_blocks_num?: number;  // 确认区块数
  // ... 其他字段
}
```

### 4. 📊 性能监控与日志

#### 实时统计
- **事件接收计数** - 实时统计接收到的事件数量
- **处理进度跟踪** - 监控事件处理进度
- **队列状态** - 实时显示队列大小和峰值
- **确认统计** - 跟踪已确认事件数量

#### 结构化日志
- **分级日志** - debug、info、warn、error 四个级别
- **日志文件** - 自动创建和管理日志文件
- **格式化输出** - 结构化的日志格式，便于分析
- **性能监控** - 记录关键操作的性能指标

### 5. 🏥 健康检查与容错

#### 自动健康检查
- **连接状态** - 每5分钟检查 Supabase 和 WebSocket 连接
- **服务状态** - 监控事件监听器是否正常运行
- **异常恢复** - 检测到异常时自动尝试恢复
- **告警机制** - 异常情况下的详细日志记录

#### 优雅关闭
- **信号处理** - 响应 SIGTERM、SIGINT 等系统信号
- **资源清理** - 完整清理所有资源和连接
- **数据保存** - 处理剩余队列中的事件
- **状态同步** - 确保数据一致性

## 环境变量配置

创建 `.env` 文件并配置以下变量：

```env
# Infura 配置
INFURA_PROJECT_ID=your_infura_project_id
INFURA_WS_PROJECT_ID=your_infura_ws_project_id  # 可选，默认使用 INFURA_PROJECT_ID

# NFT 合约配置
NFT_CONTRACT_ADDRESS=0xYourNFTContractAddress
NETWORK_NAME=sepolia
NETWORK_CHAIN_ID=11155111

# Supabase 配置
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 日志级别
LOG_LEVEL=info  # debug, info, warn, error
```

## 安装依赖

```bash
npm install
```

## 可用命令

```bash
# 开发模式运行
npm run dev

# 构建项目
npm run build

# 生产模式运行
npm start

# 测试连接
npm run test

# 测试数据库查询
npm run test:database

# 清理构建文件
npm run clean

# 代码检查
npm run lint
```

## 运行服务

### 开发环境

```bash
npm run dev
```

### 生产环境

```bash
# 1. 构建项目
npm run build

# 2. 启动服务
npm start
```

## 测试

### 测试连接

验证 Infura、Supabase 和 NFT 合约连接：

```bash
npm run test
```

### 测试数据库查询

查询数据库中的事件数据：

```bash
npm run test:database
```

## 监听事件类型

### Transfer 事件

- **参数**: from, to, tokenId
- **触发**: NFT 转移时
- **存储**: 记录发送方、接收方、Token ID

### Approval 事件

- **参数**: owner, approved, tokenId
- **触发**: NFT 授权时
- **存储**: 记录所有者、被授权者、Token ID

## 数据库表结构

```sql
CREATE TABLE chain_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tx_hash TEXT NOT NULL,
  log_index INTEGER NOT NULL,
  from_address TEXT,
  to_address TEXT,
  token_id TEXT,
  block_number BIGINT NOT NULL,
  block_hash TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tx_hash, log_index)
);
```

## 错误处理

### WebSocket 断连

- 自动重连，延迟递增（5 秒 × 重试次数）
- 最多重试 10 次
- 超过重试次数后自动退出

### 数据库错误

- 重复事件：忽略并记录警告日志
- 连接失败：记录错误并尝试重连
- 插入失败：记录详细错误信息

### 未捕获异常

- 捕获所有未处理的异常
- 记录完整错误堆栈
- 优雅关闭服务

## 日志

日志文件位于 `logs/` 目录：

- `combined.log` - 所有日志
- `error.log` - 错误日志

日志格式：

```
2024-01-01 12:00:00 [info]: 🚀 启动 NFT 监听服务
2024-01-01 12:00:01 [info]: ✅ Supabase 连接验证成功
2024-01-01 12:00:02 [info]: 🎯 接收到 Transfer 事件 { from: '0x...', to: '0x...', tokenId: '1' }
```

## 部署

### Railway 部署

项目已配置 Railway 支持：

- `Procfile` - 启动命令
- `railway.toml` - Railway 配置

部署步骤：

1. 连接 GitHub 仓库
2. 配置环境变量
3. 自动部署

## 📈 性能指标与优化

### 🎯 性能基准

- **事件延迟** - < 100ms（从接收到处理完成）
- **批处理吞吐** - 50个事件/批次
- **并发处理** - 最大10个并发任务
- **确认监控** - 30秒检查间隔
- **重连延迟** - 指数退避（5s × 重试次数）

### ✅ 已实现的优化

- [x] **WebSocket 实时监听** - 毫秒级事件响应
- [x] **智能批量处理** - 高效的事件队列管理
- [x] **自动重连机制** - 网络断线自动恢复
- [x] **事件去重保护** - 防止重复处理
- [x] **区块确认监控** - 确保交易最终性
- [x] **链重组检测** - 数据完整性保障
- [x] **健康检查机制** - 服务状态监控
- [x] **优雅关闭流程** - 完整的资源清理
- [x] **结构化日志** - 详细的操作记录
- [x] **并发控制** - 防止资源耗尽
- [x] **分页查询** - 高效的数据处理

### 🚀 可扩展功能

- [ ] **多合约监听** - 支持同时监听多个合约
- [ ] **历史事件回溯** - 处理历史区块事件
- [ ] **Webhook 通知** - 事件触发时推送通知
- [ ] **GraphQL API** - 提供数据查询接口
- [ ] **Redis 缓存** - 提高查询性能
- [ ] **监控面板** - 实时性能监控界面
- [ ] **告警系统** - 集成监控告警服务
- [ ] **分布式部署** - 支持多实例部署

## 🚀 部署指南

### Railway 云平台部署

项目已预配置 Railway 支持，一键部署：

1. **Fork 仓库** 到您的 GitHub
2. **连接 Railway** - 导入 GitHub 仓库
3. **配置环境变量** - 在 Railway 控制台设置
4. **自动部署** - Railway 会自动构建和部署

#### 环境变量配置

在 Railway 控制台设置以下环境变量：

```env
INFURA_PROJECT_ID=your_infura_project_id
NFT_CONTRACT_ADDRESS=0xYourNFTContractAddress
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NETWORK_NAME=sepolia
NETWORK_CHAIN_ID=11155111
LOG_LEVEL=info
```

### Docker 部署

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### 本地开发部署

```bash
# 克隆仓库
git clone <repository-url>
cd offchain-monitor-service

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入配置

# 启动服务
npm run dev
```

## 🧪 测试与验证

### 连接测试

```bash
# 测试所有连接
npm run test

# 测试数据库连接
npm run test:database
```

### 事件验证

1. 发送一个 NFT Transfer 交易
2. 观察日志输出中的事件接收情况
3. 检查 Supabase 数据库中的事件记录
4. 等待区块确认，观察状态变化

### 性能测试

```bash
# 发送大量交易，观察批处理效果
# 监控日志中的性能指标
# 检查数据库插入性能
```

## 🛠️ 故障排查

### 常见问题

#### 1. WebSocket 连接失败
- 检查 INFURA_PROJECT_ID 配置
- 确认网络名称和链ID正确
- 查看防火墙和网络设置

#### 2. 数据库连接失败
- 验证 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY
- 检查数据库表结构
- 确认网络访问权限

#### 3. 事件处理延迟
- 检查批处理配置参数
- 观察队列堆积情况
- 确认数据库性能

### 日志分析

```bash
# 查看实时日志
tail -f logs/combined.log

# 查看错误日志
tail -f logs/error.log

# 搜索特定事件
grep "Transfer" logs/combined.log
```

## 📞 支持与贡献

### 问题报告

如果遇到问题，请提供以下信息：
- 错误日志
- 环境配置
- 复现步骤
- 预期行为

### 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 创建 Pull Request

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

## 🔗 相关链接

- [主项目仓库](../README.md)
- [智能合约文档](../contracts/)
- [前端应用](../front/)
- [API 文档](./API.md)

---

**注意**: 这是一个专业的企业级监听服务，建议在生产环境部署前进行充分的测试和验证。
