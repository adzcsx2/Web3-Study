# ShibMeme Diamond 测试指南

## 测试文件说明

### 1. `Diamond.localhost.test.ts` - 本地单元测试

全面的单元测试，在本地 Hardhat 网络上运行，无需真实 ETH。

**测试覆盖范围：**

- ✅ Diamond 合约部署和初始化
- ✅ ERC20 基础功能（transfer, approve, transferFrom）
- ✅ 税费机制（0%, 2%, 5% 阶梯税率）
- ✅ 交易限制（最大交易额度、每日交易次数）
- ✅ 白名单功能（税费白名单、交易限制白名单）
- ✅ 权限管理（owner 权限、权限转移）
- ✅ Diamond Loupe 功能
- ✅ 配置更新功能

### 2. `Diamond.sepolia.test.ts` - Sepolia 集成测试

在 Sepolia 测试网上运行，测试与真实 Uniswap 的集成。

**测试覆盖范围：**

- ✅ 部署验证
- ✅ 实际网络上的 ERC20 功能
- ✅ 税费机制验证
- ✅ Uniswap 流动性池集成
- ✅ Gas 消耗分析
- ✅ 事件验证
- ✅ 边界情况测试

---

## 运行测试

### Localhost 测试（推荐用于开发）

```bash
# 运行所有 localhost 测试
npx hardhat test test/Diamond.localhost.test.ts

# 运行特定测试套件
npx hardhat test test/Diamond.localhost.test.ts --grep "税费机制"

# 显示 gas 报告
REPORT_GAS=true npx hardhat test test/Diamond.localhost.test.ts

# 生成覆盖率报告
npx hardhat coverage --testfiles "test/Diamond.localhost.test.ts"
```

### Sepolia 测试（需要真实 ETH）

**前提条件：**

1. 已在 Sepolia 部署合约
2. `.env` 文件配置了 Sepolia RPC 和私钥
3. 账户有足够的 Sepolia ETH

```bash
# 首先部署到 Sepolia
npx hardhat run script/deploy.ts --network sepolia

# 运行 Sepolia 测试
npx hardhat test test/Diamond.sepolia.test.ts --network sepolia

# 运行特定测试
npx hardhat test test/Diamond.sepolia.test.ts --network sepolia --grep "流动性"
```

---

## 测试详细说明

### Localhost 测试详情

#### 1. 部署和初始化测试

```typescript
✓ 应该正确部署 Diamond 合约
✓ 应该正确初始化代币信息
✓ 应该正确设置总供应量
✓ 应该将 50% 代币铸造给合约地址
✓ 应该将 50% 代币销毁
✓ 应该正确设置 owner
✓ 应该正确设置税费接收地址
```

#### 2. ERC20 基础功能测试

```typescript
✓ 应该支持代币转账
✓ 应该支持授权
✓ 应该支持 transferFrom
✓ 余额不足时应该失败
```

#### 3. 税费机制测试

```typescript
✓ 小额转账（< 1000）应该无税费
✓ 中额转账（1000-10000）应该收取 2% 税费
✓ 大额转账（> 10000）应该收取 5% 税费
```

#### 4. 交易限制测试

```typescript
✓ 超过最大交易额度应该失败
✓ 白名单地址应该可以绕过交易限制
✓ 应该限制每日交易次数
✓ 新的一天应该重置交易计数
```

#### 5. 权限管理测试

```typescript
✓ 非 owner 不能设置税费白名单
✓ 非 owner 不能更新税费接收地址
✓ owner 可以转移所有权
✓ 新 owner 可以管理合约
```

### Sepolia 测试详情

#### 1. 部署验证

```typescript
✓ 应该能读取代币基本信息
✓ 应该有正确的总供应量
✓ 合约应该持有代币
```

#### 2. Uniswap 集成测试

```typescript
✓ 应该能获取 Uniswap Router 信息
✓ 应该能检查流动性池地址
✓ 应该能创建流动性池（如果不存在）
```

#### 3. Gas 消耗分析

```typescript
✓ 记录普通转账的 gas 消耗
✓ 记录税费转账的 gas 消耗
```

---

## 测试最佳实践

### 1. 开发流程

```bash
# 1. 修改合约
vim contracts/contract/facets/ShibMemeFacet.sol

# 2. 运行 localhost 测试
npx hardhat test test/Diamond.localhost.test.ts

# 3. 确认无误后部署到 Sepolia
npx hardhat run script/deploy.ts --network sepolia

# 4. 运行 Sepolia 集成测试
npx hardhat test test/Diamond.sepolia.test.ts --network sepolia
```

### 2. 持续集成

```yaml
# .github/workflows/test.yml 示例
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npx hardhat test test/Diamond.localhost.test.ts
```

### 3. 测试覆盖率目标

- 行覆盖率：> 90%
- 分支覆盖率：> 85%
- 函数覆盖率：> 95%

---

## 常见问题

### Q1: Localhost 测试失败

**A:** 确保 Hardhat 网络正常运行：

```bash
npx hardhat clean
npx hardhat compile
npx hardhat test
```

### Q2: Sepolia 测试超时

**A:** 增加超时时间或检查网络连接：

```javascript
describe("测试", function () {
  this.timeout(120000); // 2 分钟超时
});
```

### Q3: Gas 估算不准确

**A:** 在 `hardhat.config.ts` 中调整 gas 设置：

```typescript
networks: {
  sepolia: {
    gas: 5000000,
    gasPrice: 20000000000,
  }
}
```

### Q4: 部署信息文件不存在

**A:** 先运行部署脚本：

```bash
npx hardhat run script/deploy.ts --network sepolia
```

---

## 调试技巧

### 1. 使用 console.log

```solidity
import "hardhat/console.sol";

function myFunction() {
    console.log("Debug value:", myValue);
}
```

### 2. 使用 Hardhat Network Helpers

```typescript
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";

// 时间旅行
await time.increase(86400); // 前进 1 天

// 快照和恢复
const snapshot = await time.latest();
```

### 3. 事件监听

```typescript
const tx = await contract.myFunction();
const receipt = await tx.wait();
console.log("Events:", receipt.logs);
```

---

## 扩展测试

### 添加新测试用例

```typescript
describe("新功能测试", function () {
  it("应该...", async function () {
    // 测试代码
  });
});
```

### 性能测试

```typescript
it("批量转账性能测试", async function () {
  const startTime = Date.now();

  for (let i = 0; i < 100; i++) {
    await erc20Facet.transfer(user1.address, ethers.parseEther("1"));
  }

  const endTime = Date.now();
  console.log("100 次转账耗时:", endTime - startTime, "ms");
});
```

---

## 测试报告

运行测试后会生成以下报告：

- `coverage/` - 覆盖率报告（HTML）
- `test-results.xml` - JUnit 格式测试报告
- `gas-report.txt` - Gas 使用报告

查看覆盖率报告：

```bash
npx hardhat coverage
open coverage/index.html
```

---

## 参考资料

- [Hardhat Testing](https://hardhat.org/tutorial/testing-contracts)
- [Chai Matchers](https://ethereum-waffle.readthedocs.io/en/latest/matchers.html)
- [OpenZeppelin Test Helpers](https://docs.openzeppelin.com/test-helpers/)
- [EIP-2535 Diamond Standard](https://eips.ethereum.org/EIPS/eip-2535)
