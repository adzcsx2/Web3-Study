# LP 质押功能测试说明

## 测试文件
- `lp_staking.test.ts` - LP NFT 质押功能的完整测试套件

## 测试覆盖功能

### 1. 初始化和配置
- ✅ 获取 LpPoolManager 合约
- ✅ 创建 LP 质押池
- ✅ 激活质押池

### 2. 准备流动性 NFT
- ✅ 创建并初始化 USDC-DAI 交易池
- ✅ 添加流动性并获取 NFT

### 3. 单个 NFT 质押
- ✅ 质押单个 LP NFT
- ✅ 查询用户的所有质押
- ✅ 验证 NFT 转移和质押状态

### 4. 批量质押
- ✅ 创建多个流动性 NFT
- ✅ 批量质押多个 LP NFT
- ✅ Gas 优化验证

### 5. 奖励领取
- ✅ 等待奖励积累（时间模拟）
- ✅ 领取单个 NFT 的质押奖励
- ✅ 批量领取多个 NFT 的奖励
- ✅ 验证 NextswapToken 余额变化

### 6. 解除质押
- ✅ 请求解除质押
- ✅ 冷却期限制测试
- ✅ 冷却期后解除质押
- ✅ 验证 NFT 返还和状态清除

### 7. 池子管理
- ✅ 停用质押池
- ✅ 查询池子统计信息

## 运行测试

### 前提条件
1. 确保本地 Hardhat 节点正在运行：
   ```bash
   npx hardhat node
   ```

2. 确保已部署所有必要的合约：
   - NextswapV3Factory
   - NonfungiblePositionManager
   - LpPoolManager
   - LiquidityMiningReward
   - NextswapToken
   - 测试代币（USDC、DAI）

### 运行完整测试套件
```bash
npx hardhat test test/lp_staking.test.ts --network localhost
```

### 运行特定测试组
```bash
# 只测试初始化
npx hardhat test test/lp_staking.test.ts --grep "初始化和配置" --network localhost

# 只测试质押功能
npx hardhat test test/lp_staking.test.ts --grep "单个 NFT 质押" --network localhost

# 只测试奖励领取
npx hardhat test test/lp_staking.test.ts --grep "奖励领取" --network localhost
```

## 测试数据

### 默认配置
- **测试代币对**: USDC-DAI
- **池子费率**: 500 (0.05%)
- **初始流动性**: 100,000 tokens
- **分配权重**: 100
- **解质押冷却时间**: 3 天

### 测试场景
1. **单次质押**: 1 个 NFT，100,000 USDC + 100,000 DAI
2. **批量质押**: 3 个 NFT，每个 10,000 USDC + 10,000 DAI
3. **奖励积累**: 模拟 24 小时时间流逝
4. **冷却期**: 模拟 3 天时间流逝

## 关键测试点

### 权限验证
- ✅ NFT 所有者可以质押
- ✅ NFT 授权操作者可以质押
- ✅ 只有 NFT 所有者可以请求解质押
- ✅ 只有管理员可以激活/停用池子

### 状态验证
- ✅ 质押后 NFT 转移到合约
- ✅ 质押信息正确记录
- ✅ 池子统计数据正确更新
- ✅ 解质押后状态正确清除

### 奖励机制
- ✅ 奖励正确计算
- ✅ 奖励可以成功领取
- ✅ 余额正确更新
- ✅ 批量操作正确执行

### 安全性
- ✅ 重入攻击保护
- ✅ 暂停机制
- ✅ 冷却期限制
- ✅ 权限控制

## 预期输出示例

```
  LP 质押功能测试
    📋 合约地址信息:
      NPM: 0x...
      Factory: 0x...
      USDC: 0x...
      DAI: 0x...

    1. 初始化和配置
      ✓ 能获取LpPoolManager合约吗？
      ✓ 能创建 LP 质押池吗？
      ✓ 能激活质押池吗？

    2. 准备流动性 NFT
      ✓ 能创建并初始化 USDC-DAI 池子吗？
      ✓ 能添加流动性并获取 NFT 吗？

    3. 单个 NFT 质押
      ✓ 能质押单个 LP NFT 吗？
      ✓ 能查询用户的所有质押吗？

    4. 批量质押
      ✓ 能创建多个流动性 NFT 吗？
      ✓ 能批量质押多个 LP NFT 吗？

    5. 奖励领取
      ✓ 能等待一段时间积累奖励吗？
      ✓ 能领取单个 NFT 的质押奖励吗？
      ✓ 能批量领取多个 NFT 的奖励吗？

    6. 解除质押
      ✓ 能请求解除质押吗？
      ✓ 在冷却期内应该无法解除质押
      ✓ 能在冷却期后解除质押吗？

    7. 池子管理
      ✓ 能停用质押池吗？
      ✓ 能查询池子总体统计信息吗？

  17 passing (XXs)
```

## 故障排除

### 常见错误

#### 1. "LpPoolManager 未部署"
**原因**: LpPoolManager 合约未在 localhost 网络上部署
**解决**: 运行部署脚本
```bash
npx hardhat run scripts/deploy/xxx.ts --network localhost
```

#### 2. "池子已存在"
**原因**: 测试池子已经创建过
**解决**: 这不是错误，测试会自动跳过创建步骤

#### 3. "UnstakeCooldownNotPassed"
**原因**: 解质押冷却期未到
**解决**: 测试会自动增加区块时间，确保测试正确执行

#### 4. "余额不足"
**原因**: 测试账户没有足够的测试代币
**解决**: 运行代币分发脚本或直接 mint 测试代币

## 扩展测试

可以基于此测试文件扩展以下场景：

1. **多用户测试**: 测试不同用户之间的质押和奖励分配
2. **极端值测试**: 测试大额质押、最小质押等边界情况
3. **并发测试**: 测试同时质押、解质押的情况
4. **长期测试**: 测试长时间运行后的奖励计算准确性
5. **安全测试**: 测试各种攻击场景的防护

## 注意事项

1. **时间模拟**: 测试使用 `evm_increaseTime` 模拟时间流逝，仅适用于开发网络
2. **Gas 成本**: 批量操作相比单次操作可以节省显著的 Gas
3. **事件监听**: 所有重要操作都会触发事件，可以通过监听事件验证执行结果
4. **状态一致性**: 测试确保所有状态变量在操作前后保持一致性

## 相关文档

- [LpPoolContract.sol](../contracts/contract/LpPoolContract.sol) - 质押池合约
- [LpPoolManager.sol](../contracts/contract/LpPoolManager.sol) - 质押池管理器
- [NextswapStructs.sol](../contracts/types/NextswapStructs.sol) - 数据结构定义
- [liquidity_add.test.ts](./liquidity_add.test.ts) - 流动性添加测试（参考）
