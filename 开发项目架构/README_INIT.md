# 项目初始化说明

这是一个已经初始化的 Web3 项目模板，保留了完整的项目结构和依赖配置，但已清理所有业务代码文件。

## 项目结构

### 后端 (Hardhat)
```
├── contracts/          # 智能合约目录（已清空，保留结构）
├── scripts/            # 部署脚本目录（已清空，保留结构）
├── test/              # 测试目录（已保留，包含测试框架说明）
├── hardhat.config.ts   # Hardhat 配置文件
├── package.json        # 后端依赖配置
└── tsconfig.json      # TypeScript 配置
```

### 前端 (Next.js)
```
front/
├── src/
│   ├── app/           # Next.js App Router 目录（已清空，保留结构）
│   ├── components/    # 组件目录（已清空，保留结构）
│   ├── hooks/         # 自定义 Hooks 目录（已清空，保留结构）
│   ├── services/      # 服务层目录（已清空，保留结构）
│   ├── stores/        # 状态管理目录（已清空，保留结构）
│   ├── types/         # TypeScript 类型定义目录（已清空，保留结构）
│   ├── utils/         # 工具函数目录（已清空，保留结构）
│   └── styles/        # 样式文件目录（已清空，保留结构）
├── database/          # 数据库目录（已清空，保留结构）
├── public/            # 静态资源目录
├── package.json       # 前端依赖配置
└── tsconfig.json      # TypeScript 配置
```

## 技术栈

### 后端
- **Hardhat**: 以太坊开发环境
- **TypeScript**: 类型安全的 JavaScript
- **OpenZeppelin**: 安全的智能合约库
- **Ethers.js**: 以太坊交互库

### 前端
- **Next.js 15**: React 全栈框架
- **TypeScript**: 类型安全
- **Ant Design**: UI 组件库
- **Tailwind CSS**: 实用优先的 CSS 框架
- **Wagmi & RainbowKit**: Web3 React 钱包集成
- **Ethers.js & Viem**: 以太坊交互库
- **Supabase**: 后端即服务
- **Zustand**: 轻量级状态管理
- **React Query**: 数据获取和缓存

## 快速开始

### 1. 安装依赖

```bash
# 安装后端依赖
npm install

# 安装前端依赖
cd front
npm install
```

### 2. 环境配置

创建环境变量文件：

```bash
# 后端环境变量
cp .env.example .env

# 前端环境变量
cd front
cp .env.example .env.local
```

### 3. 启动开发环境

```bash
# 启动前端开发服务器
cd front
npm run dev
```

## 开发指南

### 智能合约开发
1. 在 `contracts/` 目录下编写 Solidity 合约
2. 在 `scripts/` 目录下编写部署脚本
3. 在 `test/` 目录下编写测试用例（测试框架已配置）
4. 使用 Hardhat 编译和部署合约

### 前端开发
1. 在 `src/app/` 目录下使用 Next.js App Router
2. 在 `src/components/` 目录下创建 React 组件
3. 在 `src/hooks/` 目录下创建自定义 Hooks
4. 在 `src/services/` 目录下处理 API 调用
5. 在 `src/stores/` 目录下管理全局状态

### 代码规范
- 使用 TypeScript 进行类型安全开发
- 遵循 ESLint 和 Prettier 配置
- 使用 Ant Design 组件库
- 使用 Tailwind CSS 进行样式补充
- 组件采用函数式写法和 Hooks

## 部署

### 前端部署
```bash
cd front
npm run build
npm start
```

### 合约部署
```bash
# 编译合约
npx hardhat compile

# 部署到测试网
npx hardhat run scripts/deploy.ts --network sepolia
```

## 注意事项

- 所有业务代码已清理，这是一个空白模板
- 保留了完整的项目结构和配置文件
- 可以直接开始开发新的功能
- 请根据实际需求修改配置文件

## 获取帮助

- 查看 [Hardhat 文档](https://hardhat.org/docs)
- 查看 [Next.js 文档](https://nextjs.org/docs)
- 查看 [Ant Design 文档](https://ant.design/docs/react/introduce)