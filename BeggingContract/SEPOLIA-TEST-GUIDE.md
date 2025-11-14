# Sepolia 测试网测试指南

本指南帮助您在 Sepolia 测试网上部署和测试 BeggingContract。

## 🚀 快速开始

### 1. 环境准备

确保您的 `.env` 文件包含以下配置：

```bash
# Sepolia 网络配置
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key

# 可选：如果使用其他RPC提供商
# SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
```

### 2. 获取测试ETH

从以下水龙头获取 Sepolia 测试ETH：
- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
- [Chainlink Faucet](https://faucets.chain.link/sepolia)

### 3. 部署和测试选项

#### 选项A: 一键部署和验证（推荐）

```bash
npm run deploy:sepolia
```

这个命令会：
- 部署所有必要的合约到 Sepolia
- 执行基本功能测试
- 保存部署信息到 `deployment-sepolia.json`

#### 选项B: 快速功能测试

```bash
npm run test:sepolia
```

如果合约已经部署，这个命令会：
- 连接到已部署的合约
- 执行完整的功能测试
- 验证所有接口支持

#### 选项C: 完整测试套件

```bash
npm run test:sepolia-full
```

运行完整的测试套件，包括所有场景测试。

## 📋 测试内容

### 合约部署验证
- ✅ MockERC20 代币合约部署
- ✅ MockERC721 NFT合约部署
- ✅ MockERC1155 多代币合约部署
- ✅ BeggingContract 主合约部署

### 功能测试
- ✅ ETH 捐赠功能
- ✅ ERC20 代币捐赠
- ✅ 榜单功能
- ✅ 提现功能
- ✅ 暂停/恢复功能
- ✅ 时间限制功能

### 接口测试
- ✅ ERC1155Receiver 接口
- ✅ ERC721Receiver 接口
- ✅ IERC165 接口

## 📊 部署信息

部署完成后，所有合约地址会保存在 `deployment-sepolia.json` 文件中：

```json
{
  "network": "sepolia",
  "chainId": "11155111",
  "deployer": "0x...",
  "contracts": {
    "BeggingContract": "0x...",
    "MockERC20": "0x...",
    "MockERC721": "0x...",
    "MockERC1155": "0x..."
  }
}
```

## 🔧 手动测试

如果您想测试特定功能：

### 设置合约地址环境变量

```bash
export BEGGING_CONTRACT_ADDRESS=0x_your_contract_address
npm run test:sepolia
```

### 直接运行Hardhat命令

```bash
# 部署脚本
npx hardhat run script/verify-sepolia-deployment.ts --network sepolia

# 测试脚本
npx hardhat run script/test-sepolia-contract.ts --network sepolia

# 完整测试
npx hardhat test test/BeggingContract.sepolia.test.ts --network sepolia
```

## 🌐 区块链浏览器

所有交易和合约都可以在 Etherscan 上查看：

- **主合约**: https://sepolia.etherscan.io/address/{CONTRACT_ADDRESS}
- **交易历史**: https://sepolia.etherscan.io/tx/{TRANSACTION_HASH}

## ⚠️ 注意事项

### Gas 费用
- Sepolia 测试网使用真实的 ETH，但可以通过水龙头免费获取
- 建议在测试时设置合理的 gas 限制以节省成本

### 网络延迟
- 测试网可能会有延迟，测试超时时间设置为 5-10 分钟
- 如果交易卡住，可以检查 RPC 提供商状态

### 合约交互
- 确保捐赠时间在设定的时间范围内
- 测试提现时确保是合约 owner
- 注意暂停状态会影响捐赠功能

## 🐛 故障排除

### 常见问题

**1. 账户余额不足**
```bash
# 检查余额
npx hardhat console --network sepolia
> const [signer] = await ethers.getSigners()
> const balance = await signer.provider.getBalance(signer.address)
> console.log(ethers.formatEther(balance))
```

**2. 网络连接问题**
- 尝试更换 RPC URL
- 检查网络连接
- 使用 Infura 或 Alchemy 备用节点

**3. 交易失败**
- 检查 gas 设置
- 确认合约状态（时间、暂停等）
- 查看交易详情获取错误信息

### 调试技巧

**1. 查看交易详情**
```bash
# 在 etherscan 上查看交易
# 或在控制台中
npx hardhat console --network sepolia
> const tx = await provider.getTransaction("TRANSACTION_HASH")
> const receipt = await provider.getTransactionReceipt("TRANSACTION_HASH")
```

**2. 检查合约状态**
```bash
# 运行状态检查脚本
npm run test:sepolia
```

## 📈 性能监控

测试会记录以下性能指标：
- ⛽ Gas 使用量
- ⏱️ 交易时间
- 💰 余额变化
- 🔗 交易哈希

## 🔄 清理

如果需要重新部署：

```bash
# 删除部署信息文件
rm deployment-sepolia.json

# 重新部署
npm run deploy:sepolia
```

## 📞 支持

如果遇到问题：
1. 检查本指南的故障排除部分
2. 查看 Hardhat 控制台输出
3. 在 Etherscan 上检查交易状态
4. 确认网络和账户配置正确