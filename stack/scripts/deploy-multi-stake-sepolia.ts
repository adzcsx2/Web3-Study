// scripts/deploy-multi-stake-sepolia.ts
import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import {
  waitForTransactionWithTimeout,
  deployWithRetry,
  createDeploymentDir,
} from "./utils/deployment-utils";

// ============================= 配置常量 =============================

// Sepolia 测试网代币地址
const NETWORK_CONFIG = {
  USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  WETH: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
  NETWORK_NAME: "sepolia",
  MIN_ETH_BALANCE: "0.05", // 最低 ETH 余额要求
  FAUCET_URL: "https://sepoliafaucet.com/",
} as const;

// 代币数量常量 (使用乘法方式，更直观)
const TOKEN_AMOUNTS = {
  TOTAL_MINT: 40 * 1000000, // 4000万 MNT 总铸造量
  CONTRACT_REWARD: 40 * 1000000, // 4000万 MNT 转入合约作为奖励
  USDC_POOL_REWARD: 5 * 1000000, // 500万 MNT USDC池奖励
  WETH_POOL_REWARD: 15 * 1000000, // 1500万 MNT WETH池奖励
} as const;

// 池子配置
const POOL_CONFIG = {
  DURATION: 7 * 24 * 60 * 60, // 7天
  COOLDOWN_PERIOD: 600, // 10分钟冷却期
  USDC_MIN_DEPOSIT: 1000000, // 1 USDC (6位小数)
  WETH_MIN_DEPOSIT: "0.001", // 0.001 WETH
} as const;

// ============================= 工具函数 =============================

/**
 * 格式化代币数量显示
 */
function formatTokenDisplay(amount: number): string {
  if (amount >= 10000000) {
    return (amount / 10000000).toLocaleString() + "千万";
  } else if (amount >= 1000000) {
    return (amount / 1000000).toLocaleString() + "百万";
  } else if (amount >= 10000) {
    return (amount / 10000).toLocaleString() + "万";
  } else {
    return amount.toLocaleString();
  }
}

// ============================= 主要函数 =============================

// 保存部署信息和 ABI 的函数
async function saveDeploymentInfo(
  metaNodeTokenAddress: string,
  multiStakeAddress: string,
  usdcAddress: string,
  wethAddress: string,
  metaNodeDeploymentInfo?: { transactionHash: string; blockNumber: number },
  multiStakeDeploymentInfo?: { transactionHash: string; blockNumber: number }
) {
  // 创建部署目录
  const deploymentDir = createDeploymentDir(NETWORK_CONFIG.NETWORK_NAME);

  // 获取合约 ABI
  const metaNodeTokenArtifact = await ethers.getContractFactory(
    "MetaNodeToken"
  );
  const multiStakeArtifact = await ethers.getContractFactory(
    "MultiStakePledgeContract"
  );

  // 保存 MetaNodeToken ABI 和地址
  const metaNodeTokenInfo = {
    address: metaNodeTokenAddress,
    abi: JSON.parse(metaNodeTokenArtifact.interface.formatJson()),
    contractName: "MetaNodeToken",
    network: NETWORK_CONFIG.NETWORK_NAME,
    deployedAt: new Date().toISOString(),
    transactionHash: metaNodeDeploymentInfo?.transactionHash || "",
    blockNumber: metaNodeDeploymentInfo?.blockNumber || 0,
  };

  // 保存 MultiStakePledgeContract ABI 和地址
  const multiStakeInfo = {
    address: multiStakeAddress,
    abi: JSON.parse(multiStakeArtifact.interface.formatJson()),
    contractName: "MultiStakePledgeContract",
    network: NETWORK_CONFIG.NETWORK_NAME,
    deployedAt: new Date().toISOString(),
    transactionHash: multiStakeDeploymentInfo?.transactionHash || "",
    blockNumber: multiStakeDeploymentInfo?.blockNumber || 0,
  };

  // 综合部署信息
  const deploymentInfo = {
    network: NETWORK_CONFIG.NETWORK_NAME,
    deployedAt: new Date().toISOString(),
    contracts: {
      MetaNodeToken: {
        address: metaNodeTokenAddress,
        contractName: "MetaNodeToken",
      },
      MultiStakePledgeContract: {
        address: multiStakeAddress,
        contractName: "MultiStakePledgeContract",
      },
    },
    tokens: {
      USDC: {
        address: usdcAddress,
        name: "Sepolia USDC",
        symbol: "USDC",
        decimals: 6,
      },
      WETH: {
        address: wethAddress,
        name: "Sepolia Wrapped Ether",
        symbol: "WETH",
        decimals: 18,
      },
    },
    pools: [
      {
        id: 0,
        name: "Sepolia USDC Pool",
        stakeToken: usdcAddress,
        rewardToken: metaNodeTokenAddress,
        totalRewards: ethers.formatEther(
          ethers.parseEther(TOKEN_AMOUNTS.USDC_POOL_REWARD.toString())
        ),
        duration: POOL_CONFIG.DURATION,
        minDepositAmount: POOL_CONFIG.USDC_MIN_DEPOSIT.toString(),
      },
      {
        id: 1,
        name: "Sepolia WETH Pool",
        stakeToken: wethAddress,
        rewardToken: metaNodeTokenAddress,
        totalRewards: ethers.formatEther(
          ethers.parseEther(TOKEN_AMOUNTS.WETH_POOL_REWARD.toString())
        ),
        duration: POOL_CONFIG.DURATION,
        minDepositAmount: ethers
          .parseEther(POOL_CONFIG.WETH_MIN_DEPOSIT)
          .toString(),
      },
    ],
  };

  // 写入文件
  fs.writeFileSync(
    path.join(deploymentDir, "MetaNodeToken.json"),
    JSON.stringify(metaNodeTokenInfo, null, 2)
  );

  fs.writeFileSync(
    path.join(deploymentDir, "MultiStakePledgeContract.json"),
    JSON.stringify(multiStakeInfo, null, 2)
  );

  fs.writeFileSync(
    path.join(deploymentDir, "deployment-info.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("📁 ABI 文件已保存到:", deploymentDir);
}

async function main() {
  console.log("🚀 开始部署多币种质押合约到 Sepolia 测试网...\n");

  // 获取部署账户
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(deployerAddress);

  console.log("部署账户:", deployerAddress);
  console.log("账户余额:", ethers.formatEther(balance), "ETH\n");

  if (balance < ethers.parseEther(NETWORK_CONFIG.MIN_ETH_BALANCE)) {
    console.log(
      `⚠️ 余额不足，建议至少有 ${NETWORK_CONFIG.MIN_ETH_BALANCE} ETH`
    );
    console.log(`请访问 ${NETWORK_CONFIG.FAUCET_URL} 获取测试 ETH\n`);
  }

  try {
    // 1. 部署 MetaNodeToken
    console.log("📄 1. 部署 MetaNodeToken...");

    const { metaNodeTokenAddress, metaNodeDeploymentInfo } =
      await deployWithRetry(
        async () => {
          const MetaNodeTokenFactory = await ethers.getContractFactory(
            "MetaNodeToken"
          );
          const metaNodeTokenImpl = await MetaNodeTokenFactory.deploy();
          await metaNodeTokenImpl.waitForDeployment();

          // 部署代理
          const ProxyFactory = await ethers.getContractFactory("ProxyContract");
          const metaNodeTokenProxy = await ProxyFactory.deploy(
            await metaNodeTokenImpl.getAddress(),
            "0x"
          );
          await metaNodeTokenProxy.waitForDeployment();
          const metaNodeTokenAddress = await metaNodeTokenProxy.getAddress();

          // 初始化
          const metaNodeToken = await ethers.getContractAt(
            "MetaNodeToken",
            metaNodeTokenAddress
          );
          const initTx = await metaNodeToken.initialize();
          await waitForTransactionWithTimeout(
            initTx,

            "MetaNodeToken 初始化"
          );

          // 获取部署交易信息
          const metaNodeDeploymentReceipt = await metaNodeTokenImpl
            ?.deploymentTransaction()
            ?.wait();
          if (!metaNodeDeploymentReceipt) {
            throw new Error("MetaNodeDeploymentReceipt is null");
          }

          const metaNodeDeploymentInfo = {
            transactionHash: metaNodeDeploymentReceipt.hash,
            blockNumber: metaNodeDeploymentReceipt.blockNumber,
          };

          console.log(
            "📝 MetaNodeToken 部署交易:",
            metaNodeDeploymentInfo.transactionHash
          );
          console.log("📦 部署区块号:", metaNodeDeploymentInfo.blockNumber);
          console.log("✅ MetaNodeToken 部署到:", metaNodeTokenAddress);

          return { metaNodeTokenAddress, metaNodeDeploymentInfo };
        },
        3,
        "MetaNodeToken 部署"
      );

    // 2. 部署 MultiStakePledgeContract
    console.log("\n📄 2. 部署 MultiStakePledgeContract...");

    const { multiStakeAddress, multiStakeDeploymentInfo } =
      await deployWithRetry(
        async () => {
          const ProxyFactory = await ethers.getContractFactory("ProxyContract");
          const MultiStakeFactory = await ethers.getContractFactory(
            "MultiStakePledgeContract"
          );
          const multiStakeImpl = await MultiStakeFactory.deploy();
          await multiStakeImpl.waitForDeployment();

          // 部署代理
          const multiStakeProxy = await ProxyFactory.deploy(
            await multiStakeImpl.getAddress(),
            "0x"
          );
          await multiStakeProxy.waitForDeployment();
          const multiStakeAddress = await multiStakeProxy.getAddress();

          // 初始化
          const multiStakeContract = await ethers.getContractAt(
            "MultiStakePledgeContract",
            multiStakeAddress
          );
          const initMultiTx = await multiStakeContract.initialize(
            metaNodeTokenAddress
          );
          await waitForTransactionWithTimeout(
            initMultiTx,

            "MultiStakePledgeContract 初始化"
          );

          // 获取部署交易信息
          const multiStakeDeploymentTx = multiStakeImpl.deploymentTransaction();
          if (!multiStakeDeploymentTx) {
            throw new Error(
              "MultiStakePledgeContract deployment transaction is null"
            );
          }
          const multiStakeDeploymentReceipt =
            await multiStakeDeploymentTx.wait();
          if (!multiStakeDeploymentReceipt) {
            throw new Error("MmultiStakeDeploymentReceipt is null");
          }

          const multiStakeDeploymentInfo = {
            transactionHash: multiStakeDeploymentReceipt.hash,
            blockNumber: multiStakeDeploymentReceipt.blockNumber,
          };

          console.log(
            "📝 MultiStakePledgeContract 部署交易:",
            multiStakeDeploymentInfo.transactionHash
          );
          console.log("📦 部署区块号:", multiStakeDeploymentInfo.blockNumber);
          console.log("✅ MultiStakePledgeContract 部署到:", multiStakeAddress);

          return {
            multiStakeAddress,
            multiStakeDeploymentInfo,
            multiStakeContract,
          };
        },
        3,
        "MultiStakePledgeContract 部署"
      );

    // 重新获取合约实例
    const metaNodeToken = await ethers.getContractAt(
      "MetaNodeToken",
      metaNodeTokenAddress
    );
    const multiStakeContract = await ethers.getContractAt(
      "MultiStakePledgeContract",
      multiStakeAddress
    );

    // 3. 铸造一些奖励代币
    console.log("\n💰 3. 铸造奖励代币...");
    const rewardAmount = ethers.parseEther(TOKEN_AMOUNTS.TOTAL_MINT.toString());
    const mintTx = await metaNodeToken.mint(deployerAddress, rewardAmount);
    await waitForTransactionWithTimeout(mintTx, "代币铸造");
    console.log(
      "✅ 铸造了",
      ethers.formatEther(rewardAmount),
      `个 MNT 代币 (${formatTokenDisplay(TOKEN_AMOUNTS.TOTAL_MINT)})`
    );

    // 4. 创建 USDC 质押池
    console.log("\n🏊 4. 创建 USDC 质押池...");
    console.log(
      `   - 奖励数量: ${formatTokenDisplay(TOKEN_AMOUNTS.USDC_POOL_REWARD)} MNT`
    );
    console.log(`   - 质押期限: ${POOL_CONFIG.DURATION / (24 * 60 * 60)} 天`);
    console.log(
      `   - 最小质押: ${POOL_CONFIG.USDC_MIN_DEPOSIT / 1000000} USDC`
    );
    const usdcPoolParams = {
      stakeToken: NETWORK_CONFIG.USDC,
      rewardToken: metaNodeTokenAddress,
      totalRewards: ethers.parseEther(
        TOKEN_AMOUNTS.USDC_POOL_REWARD.toString()
      ),
      duration: POOL_CONFIG.DURATION,
      minDepositAmount: POOL_CONFIG.USDC_MIN_DEPOSIT,
      cooldownPeriod: POOL_CONFIG.COOLDOWN_PERIOD,
      name: "Sepolia USDC Pool",
    };

    const createUsdcTx = await multiStakeContract.createPool(usdcPoolParams);
    const receipt1 = await waitForTransactionWithTimeout(
      createUsdcTx,
      "USDC 池创建"
    );
    console.log("✅ USDC 池创建成功，交易:", receipt1?.hash);

    // 5. 创建 WETH 质押池
    console.log("\n🏊 5. 创建 WETH 质押池...");
    console.log(
      `   - 奖励数量: ${formatTokenDisplay(TOKEN_AMOUNTS.WETH_POOL_REWARD)} MNT`
    );
    console.log(`   - 质押期限: ${POOL_CONFIG.DURATION / (24 * 60 * 60)} 天`);
    console.log(`   - 最小质押: ${POOL_CONFIG.WETH_MIN_DEPOSIT} WETH`);
    const wethPoolParams = {
      stakeToken: NETWORK_CONFIG.WETH,
      rewardToken: metaNodeTokenAddress,
      totalRewards: ethers.parseEther(
        TOKEN_AMOUNTS.WETH_POOL_REWARD.toString()
      ),
      duration: POOL_CONFIG.DURATION,
      minDepositAmount: ethers.parseEther(POOL_CONFIG.WETH_MIN_DEPOSIT),
      cooldownPeriod: POOL_CONFIG.COOLDOWN_PERIOD,
      name: "Sepolia WETH Pool",
    };

    const createWethTx = await multiStakeContract.createPool(wethPoolParams);
    const receipt2 = await waitForTransactionWithTimeout(
      createWethTx,
      "WETH 池创建"
    );
    console.log("✅ WETH 池创建成功，交易:", receipt2?.hash);

    // 6. 向合约转入奖励代币
    console.log("\n🎁 6. 向质押合约转入奖励代币...");
    const contractRewardAmount = ethers.parseEther(
      TOKEN_AMOUNTS.CONTRACT_REWARD.toString()
    );
    const transferTx = await metaNodeToken.transfer(
      multiStakeAddress,
      contractRewardAmount
    );
    await waitForTransactionWithTimeout(transferTx, "代币转移");
    console.log(
      "✅ 转入",
      ethers.formatEther(contractRewardAmount),
      `个 MNT 作为奖励 (${formatTokenDisplay(TOKEN_AMOUNTS.CONTRACT_REWARD)})`
    );

    // 7. 启动质押池
    console.log("\n🏁 7. 启动质押池...");

    // 启动 USDC 池 (ID=0)
    const startUsdcTx = await multiStakeContract.startPool(0, 7 * 24 * 60 * 60);
    await waitForTransactionWithTimeout(startUsdcTx, "USDC 池启动");
    console.log("✅ USDC 池已启动");

    // 启动 WETH 池 (ID=1)
    const startWethTx = await multiStakeContract.startPool(1, 7 * 24 * 60 * 60);
    await waitForTransactionWithTimeout(startWethTx, "WETH 池启动");
    console.log("✅ WETH 池已启动");

    // 8. 保存 ABI 和部署信息
    console.log("\n💾 8. 保存 ABI 和部署信息...");
    await saveDeploymentInfo(
      metaNodeTokenAddress,
      multiStakeAddress,
      NETWORK_CONFIG.USDC,
      NETWORK_CONFIG.WETH,
      metaNodeDeploymentInfo,
      multiStakeDeploymentInfo
    );
    console.log("✅ ABI 和部署信息已保存");

    // 输出部署信息
    console.log("\n" + "=".repeat(60));
    console.log("🎉 部署完成! Sepolia 测试网合约地址:");
    console.log("=".repeat(60));
    console.log("MetaNodeToken:         ", metaNodeTokenAddress);
    console.log("MultiStakePledgeContract:", multiStakeAddress);
    console.log("");
    console.log("📊 质押池信息:");
    console.log("- 池 ID 0: USDC 池", NETWORK_CONFIG.USDC);
    console.log("- 池 ID 1: WETH 池", NETWORK_CONFIG.WETH);
    console.log("");
    console.log("📁 ABI 文件保存位置:");
    console.log("- ./deployments/sepolia/MetaNodeToken.json");
    console.log("- ./deployments/sepolia/MultiStakePledgeContract.json");
    console.log("- ./deployments/sepolia/deployment-info.json");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ 部署失败:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
