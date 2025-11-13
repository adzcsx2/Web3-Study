# DeployHelper - 智能合约部署助手

## 📋 概述

`DeployHelper` 是一个强大的 TypeScript 工具类，专为 Hardhat 项目设计，用于简化和自动化智能合约的部署、升级和版本管理流程。

### ✨ 核心特性

- ✅ **自动化部署管理**：一键部署 UUPS/Transparent 代理合约
- ✅ **智能版本控制**：自动追踪所有合约版本历史
- ✅ **重名智能处理**：同名合约部署到不同地址时自动生成唯一键名
- ✅ **无缝升级支持**：升级合约时自动更新版本信息，无需创建新记录
- ✅ **完整 ABI 管理**：自动保存 ABI 到前端目录
- ✅ **类型安全**：完整的 TypeScript 类型定义
- ✅ **多网络支持**：支持多网络部署信息隔离

---

## 🏗️ 架构设计

### 核心接口

#### ContractVersionInfo
单个合约版本的详细信息
```typescript
interface ContractVersionInfo {
  address: string;                    // 代理地址（首次部署）或实现地址（升级）
  implementationAddress?: string;     // 实现合约地址
  proxyAddress?: string;              // 代理地址（升级时使用）
  transactionHash?: string;           // 部署交易哈希
  blockNumber?: number;               // 部署区块号
  gasUsed?: string;                   // 消耗的 Gas
  version: string;                    // 版本号（如 "1", "2"）
  deployer: string;                   // 部署者地址
  deployedAt: string;                 // ISO 时间戳
  abi: ABIItem[];                     // 合约 ABI
  isProxy?: boolean;                  // 是否为代理合约
  isActive: boolean;                  // 是否为当前激活版本
}
```

#### ContractDeploymentHistory
合约的完整部署历史
```typescript
interface ContractDeploymentHistory {
  contractName: string;               // 合约名称
  proxyAddress: string;               // 代理地址（不变）
  currentVersion: string;             // 当前版本
  versions: ContractVersionInfo[];    // 版本历史数组
}
```

#### NetworkDeploymentInfo
网络部署信息（JSON 文件格式）
```typescript
interface NetworkDeploymentInfo {
  network: string;                                          // 网络名称
  chainId: string;                                          // 链 ID
  lastUpdated: string;                                      // 最后更新时间
  contracts: Record<string, ContractDeploymentHistory>;     // 合约记录
  tokens?: Record<string, TokenMetadata>;                   // Token 元数据
}
```

---

## 🚀 快速开始

### 安装与初始化

```typescript
import { DeployHelper } from "./script/utils/DeployHelper";

const deployHelper = new DeployHelper();
```

### 部署代理合约

```typescript
// 基础部署
const { contract, versionInfo } = await deployHelper.deployProxy(
  "MyNFT",
  [
    "My NFT Collection",
    "MNFT",
    receiverAddress,
    250, // 2.5% 版税
    ownerAddress
  ]
);

// 带选项的部署
const { contract, versionInfo } = await deployHelper.deployProxy(
  "MyToken",
  [initialSupply],
  {
    kind: "transparent",
    initializer: "initialize",
    unsafeAllow: ["constructor"],
    tokenMetadata: {
      name: "My Token",
      symbol: "MTK",
      decimals: 18
    }
  }
);
```

### 升级代理合约

```typescript
const { contract, versionInfo, newImplementation } = 
  await deployHelper.upgradeProxy(
    proxyAddress,
    "MyNFTV2",
    {
      unsafeAllow: ["constructor", "delegatecall"]
    }
  );
```

---

## 🎯 核心功能详解

### 1. 智能重名处理

当部署同名合约到不同地址时，自动生成唯一键名：

**场景示例**：
- 第一次部署 `MyNFT` → 键名：`MyNFT`
- 再次部署 `MyNFT` 到不同地址 → 键名：`MyNFT_0x21dF544947ba3E8b3c32561399E88B52Dc8b2823`

**实现逻辑**：
```typescript
private generateStorageKey(
  contractName: string,
  proxyAddress: string,
  deploymentInfo: NetworkDeploymentInfo
): string {
  const existingContract = deploymentInfo.contracts[contractName];
  
  if (!existingContract) {
    return contractName; // 不存在同名合约
  }
  
  if (existingContract.proxyAddress === proxyAddress) {
    return contractName; // 同名且同地址
  }
  
  // 同名但不同地址，生成新键名
  return `${contractName}_${proxyAddress}`;
}
```

### 2. 无缝升级合约

升级合约时**不创建新的 contract 记录**，而是更新原有记录：

**升级前**：
```json
{
  "MyNFT": {
    "contractName": "MyNFT",
    "proxyAddress": "0x21dF...",
    "currentVersion": "1",
    "versions": [
      { "version": "1", "isActive": true, ... }
    ]
  }
}
```

**升级后**：
```json
{
  "MyNFT": {
    "contractName": "MyNFT2",     // ✅ 更新为新合约名
    "proxyAddress": "0x21dF...",
    "currentVersion": "2",         // ✅ 更新版本号
    "versions": [
      { "version": "1", "isActive": false, ... },  // ✅ 旧版本失活
      { "version": "2", "isActive": true, ... }    // ✅ 新版本激活
    ]
  }
}
```

**实现逻辑**：
```typescript
// 查找使用相同代理地址的合约键名
const existingKey = this.findContractKeyByProxy(proxyAddress, deploymentInfo);

if (existingKey) {
  const history = deploymentInfo.contracts[existingKey];
  
  // 将所有旧版本失活
  history.versions.forEach((v) => {
    v.isActive = false;
  });
  
  // 添加新版本
  history.versions.push(versionInfo);
  
  // 更新合约名称和版本
  history.contractName = contractName;
  history.currentVersion = versionInfo.version;
}
```

### 3. 自动版本推断

如果合约未实现 `getVersion()` 方法，自动推断下一个版本号：

```typescript
let version = "1";
try {
  if (typeof (upgradedContract as any).getVersion === "function") {
    const contractVersion = await (upgradedContract as any).getVersion();
    version = contractVersion.toString();
  }
} catch (error) {
  // 从现有部署信息推断
  const existingKey = this.findContractKeyByProxy(proxyAddress, deploymentInfo);
  if (existingKey) {
    const currentVersion = parseInt(
      deploymentInfo.contracts[existingKey].currentVersion || "0"
    );
    version = (currentVersion + 1).toString();
  }
}
```

### 4. ABI 管理

自动保存 ABI 到两个位置：
- 部署目录：`deployments/{network}-deployment.json`
- 前端目录：`front/src/app/abi/{contractName}.json`

**ABI 文件格式**：
```json
{
  "address": "0x21dF...",
  "abi": [...],
  "network": "localhost",
  "deployedAt": "2025-11-13T14:36:38.555Z"
}
```

---

## 📁 文件结构

```
deployments/
├── localhost-deployment.json      # 本地网络部署信息
├── sepolia-deployment.json        # Sepolia 测试网部署信息
└── mainnet-deployment.json        # 主网部署信息

front/src/app/abi/
├── localhost-deployment.json      # 同步的部署信息
├── MyNFT.json                     # 合约 ABI
└── MyToken.json                   # 合约 ABI
```

---

## 🔍 API 参考

### deployProxy

部署代理合约并自动保存部署信息。

**签名**：
```typescript
async deployProxy<T extends BaseContract>(
  contractName: string,
  args?: unknown[],
  options?: DeployProxyOptions
): Promise<DeploymentResult>
```

**参数**：
- `contractName`: 合约名称
- `args`: 初始化参数数组（可选）
- `options`: 部署选项
  - `kind`: 代理类型（`"uups"` | `"transparent"`），默认 `"uups"`
  - `initializer`: 初始化方法名，默认 `"initialize"`
  - `unsafeAllow`: 安全豁免选项数组
  - `tokenMetadata`: Token 元数据（可选）

**返回值**：
```typescript
{
  contract: BaseContract;          // 部署的合约实例
  versionInfo: ContractVersionInfo; // 版本信息
}
```

**示例**：
```typescript
const { contract, versionInfo } = await deployHelper.deployProxy(
  "MyNFT",
  ["Collection", "MNFT", receiver, 250, owner],
  {
    kind: "uups",
    unsafeAllow: ["constructor"]
  }
);
```

### upgradeProxy

升级代理合约并自动保存升级历史。

**签名**：
```typescript
async upgradeProxy<T extends BaseContract>(
  proxyAddress: string,
  newContractName: string,
  options?: UpgradeProxyOptions
): Promise<UpgradeResult>
```

**参数**：
- `proxyAddress`: 代理合约地址
- `newContractName`: 新合约名称
- `options`: 升级选项
  - `unsafeAllow`: 安全豁免选项数组

**返回值**：
```typescript
{
  contract: BaseContract;          // 升级后的合约实例
  versionInfo: ContractVersionInfo; // 新版本信息
  newImplementation: string;        // 新实现合约地址
}
```

**示例**：
```typescript
const { contract, versionInfo, newImplementation } = 
  await deployHelper.upgradeProxy(
    "0x21dF...",
    "MyNFTV2",
    { unsafeAllow: ["constructor"] }
  );
```

### saveContractDeployment

手动保存或更新合约部署信息。

**签名**：
```typescript
async saveContractDeployment(
  contractName: string,
  versionInfo: ContractVersionInfo,
  tokenMetadata?: TokenMetadata
): Promise<void>
```

---

## 🎨 最佳实践

### 1. 合约版本管理

在合约中实现 `getVersion()` 方法：

```solidity
contract MyNFT {
    uint16 private constant VERSION = 1;
    
    function getVersion() public pure returns (uint16) {
        return VERSION;
    }
}
```

### 2. 部署脚本规范

```typescript
async function main() {
  const deployHelper = new DeployHelper();
  
  // 1. 部署新合约
  const { contract } = await deployHelper.deployProxy(
    "MyNFT",
    [name, symbol, receiver, royalty, owner]
  );
  
  // 2. 验证部署
  console.log("✅ 合约地址:", await contract.getAddress());
  console.log("📦 版本:", await contract.getVersion());
  
  // 3. 执行初始化操作
  await contract.setBaseURI("https://api.example.com/metadata/");
}
```

### 3. 升级脚本规范

```typescript
async function main() {
  const deployHelper = new DeployHelper();
  const networkName = hre.network.name;
  
  // 1. 读取现有部署信息
  const deploymentInfo = require(`../deployments/${networkName}-deployment.json`);
  const proxyAddress = deploymentInfo.contracts["MyNFT"].proxyAddress;
  
  // 2. 验证合约存在
  const code = await ethers.provider.getCode(proxyAddress);
  if (code === "0x") {
    throw new Error("合约不存在");
  }
  
  // 3. 执行升级
  const { contract, newImplementation } = await deployHelper.upgradeProxy(
    proxyAddress,
    "MyNFTV2"
  );
  
  // 4. 验证升级
  console.log("✅ 新版本:", await contract.getVersion());
  console.log("📍 新实现:", newImplementation);
}
```

### 4. 多环境管理

```typescript
// 开发环境
npx hardhat run script/deploy.ts --network localhost

// 测试网
npx hardhat run script/deploy.ts --network sepolia

// 主网
npx hardhat run script/deploy.ts --network mainnet
```

---

## 🛡️ 安全考虑

### 1. 代理模式安全

- ✅ 默认使用 UUPS 代理模式
- ✅ 支持 `unsafeAllow` 选项处理特殊情况
- ✅ 自动验证实现合约兼容性

### 2. 文件系统安全

- ✅ 自动创建必要目录
- ✅ 异常捕获和错误提示
- ✅ 文件写入原子性保证

### 3. 版本控制安全

- ✅ 自动失活旧版本
- ✅ 防止版本冲突
- ✅ 完整的部署历史追踪

---

## 🧪 代码质量审计报告

### ✅ 通过项目

#### 1. TypeScript 类型安全
- ✅ 所有接口定义完整
- ✅ 泛型使用正确 (`<T extends BaseContract>`)
- ✅ 无 `any` 类型滥用
- ✅ 类型推断准确

#### 2. 错误处理
- ✅ 完善的 try-catch 异常捕获
- ✅ 清晰的错误日志输出
- ✅ 边界条件处理（文件不存在、合约不存在等）
- ✅ 用户友好的警告信息

#### 3. 代码规范
- ✅ 命名符合 TypeScript 规范（驼峰命名、大写常量）
- ✅ JSDoc 注释完整
- ✅ 方法职责单一
- ✅ 代码可读性强

#### 4. 逻辑正确性
- ✅ 部署逻辑清晰
- ✅ 升级逻辑准确（不创建新记录）
- ✅ 重名处理智能
- ✅ 版本管理完善

#### 5. 性能优化
- ✅ 文件操作合理
- ✅ 无不必要的重复计算
- ✅ 异步操作处理得当

---

## 📊 使用统计

### 支持的功能
- ✅ UUPS 代理部署
- ✅ Transparent 代理部署
- ✅ 合约升级
- ✅ 版本管理
- ✅ ABI 管理
- ✅ 多网络支持
- ✅ Token 元数据管理
- ✅ 自动重名处理

### 兼容性
- ✅ Hardhat ^2.0.0
- ✅ OpenZeppelin Upgrades ^3.0.0
- ✅ Ethers.js ^6.0.0
- ✅ TypeScript ^5.0.0

---

## 🤝 贡献指南

### 代码规范
- 遵循 TypeScript 最佳实践
- 保持单一职责原则
- 编写清晰的注释
- 添加完整的类型定义

### 提交规范
- feat: 新功能
- fix: 修复 Bug
- docs: 文档更新
- refactor: 代码重构
- test: 测试相关

---

## 📝 变更日志

### v2.0.0 (2025-11-13)
- ✨ 移除 `storageKey` 参数，简化 API
- ✨ 实现智能重名处理（`contractName_address` 格式）
- ✨ 升级合约时不创建新记录，而是更新原有记录
- ✨ 优化版本推断逻辑
- 📝 完善代码注释和文档

### v1.0.0
- 🎉 初始版本
- ✅ 基础部署和升级功能
- ✅ ABI 管理
- ✅ 多网络支持

---

## 📞 支持

如有问题或建议，请通过以下方式联系：
- GitHub Issues
- Email: support@example.com

---

## 📄 许可证

MIT License

---

**Made with ❤️ by NFT Team**
