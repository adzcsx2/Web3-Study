import { ethers } from "hardhat";
import fs from "fs";
import path from "path";
// 如果找不到"../deployments/sepolia-latest.json",需要先部署合约
import sepolia_last from "../deployments/sepolia-latest.json";
import { Token } from "@uniswap/sdk-core";
import { encodeSqrtRatioX96 } from "@uniswap/v3-sdk";
import {
  delay,
  isNetworkError,
  executeTransactionWithRetry,
  retryExternalCall,
  retryAsyncOperation,
  deployWithRetry,
} from "./utils/retryHelpers";

const { getSelectors, FacetCutAction } = require("./utils/diamond.js");

async function deployDiamond() {
  console.log("Deploying contracts...");
  const [signer] = await ethers.getSigners();
  console.log("Using signer:", signer.address);
  console.log(
    "Balance:",
    ethers.formatEther(await ethers.provider.getBalance(signer.address)),
    "ETH"
  );

  // 部署DiamondInit合约
  // DiamondInit提供了一个在钻石升级或部署时调用的函数，用于初始化状态变量
  // 请阅读EIP2535钻石标准中关于diamondCut函数如何工作的文档
  const DiamondInit = await ethers.getContractFactory("DiamondInit");
  const diamondInit = await deployWithRetry(DiamondInit, "DiamondInit");
  const diamondInitAddress = await retryAsyncOperation(
    () => diamondInit.getAddress(),
    "Get DiamondInit address"
  );
  console.log("DiamondInit deployed to:", diamondInitAddress);

  // 部署切面并设置`facetCuts`变量
  console.log("");
  console.log("Deploying facets");
  const FacetNames = [
    "DiamondCutFacet", // 钻石切割切面
    "DiamondLoupeFacet", // 钻石放大镜切面
    "OwnershipFacet", // 所有权切面
    "ERC20Facet", // ERC20 基础功能切面
    "ShibMemeFacet", // ShibMeme 税费和限制功能切面
    "LiquidityManager", // 流动性管理器切面
  ];
  // `facetCuts`变量是FacetCut[]数组，包含在钻石部署期间要添加的函数
  const facetCuts = [];
  for (const FacetName of FacetNames) {
    const Facet = await ethers.getContractFactory(FacetName);
    const facet = await deployWithRetry(Facet, FacetName);
    const facetAddress = await retryAsyncOperation(
      () => facet.getAddress(),
      `Get ${FacetName} address`
    );
    // 构建切面切割对象
    facetCuts.push({
      facetAddress: facetAddress, // 切面地址
      action: FacetCutAction.Add, // 操作类型：添加
      functionSelectors: getSelectors(facet), // 函数选择器
    });
  }

  // 创建函数调用
  // 此调用在部署期间执行，也可以在升级中执行
  // 它使用delegatecall在DiamondInit地址上执行
  let functionCall = diamondInit.interface.encodeFunctionData("init");

  // 设置将在钻石构造函数中使用的参数
  const diamondArgs = {
    owner: signer.address, // 合约所有者地址
    init: diamondInitAddress, // 初始化合约地址
    initCalldata: functionCall, // 初始化调用数据
  };

  // 部署钻石合约
  const Diamond = await ethers.getContractFactory("Diamond");
  console.log("\n🔷 Deploying Diamond contract...");
  let diamond: any = null;
  let lastDiamondError: any;

  for (let i = 0; i < 5; i++) {
    try {
      console.log(`\n🔄 Diamond deployment (attempt ${i + 1}/5)...`);
      diamond = await Diamond.deploy(facetCuts, diamondArgs);
      console.log(`⏳ Waiting for Diamond deployment confirmation...`);
      await diamond.waitForDeployment();
      console.log(`✅ Diamond deployed successfully!`);
      break;
    } catch (error: any) {
      lastDiamondError = error;
      const isNetwork = isNetworkError(error);

      console.log(`❌ Diamond deployment attempt ${i + 1} failed`);
      console.log(
        `Error type: ${isNetwork ? "NETWORK ERROR" : "DEPLOYMENT ERROR"}`
      );
      console.log(`Error code: ${error.code || "UNKNOWN"}`);
      console.log(`Error message: ${error.message}`);

      if (i < 4) {
        const waitTime = isNetwork ? 5000 : (i + 1) * 5000;
        console.log(
          `⏱️  ${isNetwork ? "Network issue detected." : ""} Retrying in ${
            waitTime / 1000
          } seconds...`
        );
        await delay(waitTime);
      }
    }
  }

  if (!diamond) {
    console.log("\n❌ All Diamond deployment attempts failed");
    throw lastDiamondError || new Error("Failed to deploy Diamond contract");
  }

  const diamondAddress = (await retryAsyncOperation(
    () => diamond.getAddress(),
    "Get Diamond address"
  )) as string;
  console.log();
  console.log("Diamond deployed:", diamondAddress);
  await delay(3000); // 等待3秒确保链上状态同步

  // 初始化 ShibMeme Facet
  console.log();
  console.log("🔧 Initializing ShibMeme...");
  const shibMemeFacet = await ethers.getContractAt(
    "ShibMemeFacet",
    diamondAddress
  );

  await executeTransactionWithRetry(
    async () => {
      return await shibMemeFacet.initializeShibMeme(
        "ShibMeme",
        "SBMM",
        signer.address, // 税费接收地址
        ethers.parseEther("10000"), // 最大交易额度: 10,000 tokens
        100 // 每日交易限制: 100笔
      );
    },
    "ShibMeme Initialization",
    5, // 最大重试次数
    5000 // 网络错误时的初始延迟(5秒)
  );

  // 验证部署
  console.log();
  console.log("Verifying deployment...");
  const erc20Facet = await ethers.getContractAt("ERC20Facet", diamondAddress);
  const name = await retryAsyncOperation(
    () => erc20Facet.name(),
    "Get token name"
  );
  const symbol = await retryAsyncOperation(
    () => erc20Facet.symbol(),
    "Get token symbol"
  );
  const totalSupply = await retryAsyncOperation(
    () => erc20Facet.totalSupply(),
    "Get total supply"
  );
  const ownerBalance = await retryAsyncOperation(
    () => erc20Facet.balanceOf(signer.address),
    "Get owner balance"
  );

  console.log("Token Name:", name);
  console.log("Token Symbol:", symbol);
  console.log("Total Supply:", ethers.formatEther(totalSupply));
  console.log("Owner Balance:", ethers.formatEther(ownerBalance));

  //--------------------------------- 保存部署信息到 JSON 文件 ---------------------------
  console.log();
  console.log("Saving deployment info...");

  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "unknown" ? "localhost" : network.name;

  const deploymentInfo = {
    network: networkName,
    chainId: network.chainId.toString(),
    deployedAt: new Date().toISOString(),
    contracts: {
      diamond: diamondAddress,
      diamondInit: diamondInitAddress,
      facets: {
        DiamondCutFacet: facetCuts[0].facetAddress,
        DiamondLoupeFacet: facetCuts[1].facetAddress,
        OwnershipFacet: facetCuts[2].facetAddress,
        ERC20Facet: facetCuts[3].facetAddress,
        ShibMemeFacet: facetCuts[4].facetAddress,
        LiquidityManager: facetCuts[5].facetAddress,
      },
    },
    token: {
      name: name,
      symbol: symbol,
      decimals: 18,
      totalSupply: ethers.formatEther(totalSupply),
      ownerBalance: ethers.formatEther(ownerBalance),
      contractBalance: "0", // 合约本身的 ETH 余额，不是代币余额
    },
    config: {
      taxRecipient: signer.address,
      maxTransactionAmount: "10000",
      dailyTransactionLimit: 100,
    },
    abis: {
      fullABI: "abis/ShibMemeDiamond.json",
      facets: {
        ERC20Facet: "abis/ERC20Facet.json",
        ShibMemeFacet: "abis/ShibMemeFacet.json",
        LiquidityManager: "abis/LiquidityManager.json",
        DiamondLoupeFacet: "abis/DiamondLoupeFacet.json",
        OwnershipFacet: "abis/OwnershipFacet.json",
      },
    },
  };

  // 保存部署信息
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(
    deploymentsDir,
    `${networkName}-latest.json`
  );
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`Deployment info saved to: ${deploymentFile}`);

  // 保存 ABI 文件
  console.log("Saving ABIs...");

  const abisDir = path.join(__dirname, "..", "abis");
  if (!fs.existsSync(abisDir)) {
    fs.mkdirSync(abisDir, { recursive: true });
  }

  // 获取并保存各个 Facet 的 ABI
  const DiamondArtifact = await ethers.getContractFactory("Diamond");
  const ERC20FacetArtifact = await ethers.getContractFactory("ERC20Facet");
  const ShibMemeFacetArtifact = await ethers.getContractFactory(
    "ShibMemeFacet"
  );
  const LiquidityManagerArtifact = await ethers.getContractFactory(
    "LiquidityManager"
  );
  const DiamondLoupeFacetArtifact = await ethers.getContractFactory(
    "DiamondLoupeFacet"
  );
  const OwnershipFacetArtifact = await ethers.getContractFactory(
    "OwnershipFacet"
  );

  // 保存完整 ABI（合并所有 facet）
  const fullABI = [
    ...DiamondArtifact.interface.fragments,
    ...ERC20FacetArtifact.interface.fragments,
    ...ShibMemeFacetArtifact.interface.fragments,
    ...LiquidityManagerArtifact.interface.fragments,
    ...DiamondLoupeFacetArtifact.interface.fragments,
    ...OwnershipFacetArtifact.interface.fragments,
  ];

  const abiData = {
    contractName: "ShibMemeDiamond",
    address: diamondAddress,
    abi: fullABI.map((fragment) => JSON.parse(fragment.format("json"))),
  };

  fs.writeFileSync(
    path.join(abisDir, "ShibMemeDiamond.json"),
    JSON.stringify(abiData, null, 2)
  );
  console.log(
    `Full ABI saved to: ${path.join(abisDir, "ShibMemeDiamond.json")}`
  );

  // 分别保存各个 Facet 的 ABI
  const facetABIs = [
    {
      name: "ERC20Facet",
      artifact: ERC20FacetArtifact,
      address: facetCuts[3].facetAddress,
    },
    {
      name: "ShibMemeFacet",
      artifact: ShibMemeFacetArtifact,
      address: facetCuts[4].facetAddress,
    },
    {
      name: "LiquidityManager",
      artifact: LiquidityManagerArtifact,
      address: facetCuts[5].facetAddress,
    },
    {
      name: "DiamondLoupeFacet",
      artifact: DiamondLoupeFacetArtifact,
      address: facetCuts[1].facetAddress,
    },
    {
      name: "OwnershipFacet",
      artifact: OwnershipFacetArtifact,
      address: facetCuts[2].facetAddress,
    },
  ];

  facetABIs.forEach(({ name, artifact, address }) => {
    const facetAbiData = {
      contractName: name,
      address: address,
      abi: artifact.interface.fragments.map((f) =>
        JSON.parse(f.format("json"))
      ),
    };
    fs.writeFileSync(
      path.join(abisDir, `${name}.json`),
      JSON.stringify(facetAbiData, null, 2)
    );
  });
  console.log(`Individual facet ABIs saved to: ${abisDir}`);
  // 检查合约中的代币余额（初始化时已铸造给合约）
  const contractBalance = await retryAsyncOperation(
    () => erc20Facet.balanceOf(diamondAddress),
    "Get contract balance"
  );
  console.log();
  console.log("Deployment Summary:");
  console.log("===================");
  console.log("Diamond Address:", diamondAddress);
  console.log("Token Name:", name);
  console.log("Token Symbol:", symbol);
  console.log("Total Supply:", ethers.formatEther(totalSupply));
  console.log("Owner Balance:", ethers.formatEther(ownerBalance));
  console.log("Contract Balance:", ethers.formatEther(contractBalance));
  console.log(
    "Deployment info saved to:",
    `deployments/${networkName}-latest.json`
  );
}

async function liquidityManagerInitialization() {
  console.log("🔧 Initializing LiquidityManager (Uniswap V3)...");
  const [signer] = await ethers.getSigners();
  const diamondAddress = sepolia_last.contracts.diamond;
  const liquidityManager = await ethers.getContractAt(
    "LiquidityManager",
    diamondAddress
  );

  // Sepolia Uniswap V3 地址
  const UNISWAP_V3_ADDRESSES = {
    swapRouter: "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E",
    nonfungiblePositionManager: "0x1238536071E1c677A632429e3655c799b22cDA52",
    factory: "0x0227628f3F023bb0B980b67D528571c95c6DaC1c",
    poolFee: 3000, // 0.3% fee tier
  };

  // 检查是否已经初始化
  try {
    const factory = await retryAsyncOperation(
      () => liquidityManager.getFactory(),
      "Check initialization status",
      2
    );

    if (factory && factory !== ethers.ZeroAddress) {
      console.log("✅ LiquidityManager already initialized!");
      console.log("  Factory:", factory);

      // 显示当前配置
      const poolFee = await retryAsyncOperation(
        () => liquidityManager.getPoolFee(),
        "Get pool fee",
        2
      );
      console.log("  Pool Fee:", poolFee);

      // 尝试获取WETH (需要调用外部合约)
      try {
        const weth = await retryExternalCall(
          () => liquidityManager.getWETH(),
          "Get WETH address (external call)"
        );
        console.log("  WETH9:", weth);
      } catch (e: any) {
        console.log(
          "  WETH9: ⚠️  Unable to retrieve (external call may be slow)"
        );
      }

      return; // 已初始化,直接返回
    } else {
      console.log(
        "📝 LiquidityManager not yet initialized (factory is zero address)"
      );
    }
  } catch (error: any) {
    console.log("⚠️  Unable to check initialization status:", error.message);
    console.log("📝 Proceeding with initialization...");
  }
  console.log("Initializing with Uniswap V3 contracts:");
  console.log("  SwapRouter:", UNISWAP_V3_ADDRESSES.swapRouter);
  console.log(
    "  Position Manager:",
    UNISWAP_V3_ADDRESSES.nonfungiblePositionManager
  );
  console.log("  Factory:", UNISWAP_V3_ADDRESSES.factory);
  console.log("  Pool Fee:", UNISWAP_V3_ADDRESSES.poolFee, "(0.3%)");

  const receipt = await executeTransactionWithRetry(
    async () => {
      return await liquidityManager.initializeLiquidity(
        UNISWAP_V3_ADDRESSES.swapRouter,
        UNISWAP_V3_ADDRESSES.nonfungiblePositionManager,
        UNISWAP_V3_ADDRESSES.factory,
        UNISWAP_V3_ADDRESSES.poolFee
      );
    },
    "LiquidityManager Initialization",
    5,
    5000
  );

  console.log("✅ LiquidityManager (V3) initialized successfully!");
  console.log(`Transaction hash: ${receipt.hash}`);

  // 等待一下,确保链上状态同步
  await delay(5000);

  // 验证初始化
  console.log("\n🔍 Verifying initialization...");

  const factory = await retryAsyncOperation(
    () => liquidityManager.getFactory(),
    "Get factory address",
    5
  );

  const poolFee = await retryAsyncOperation(
    () => liquidityManager.getPoolFee(),
    "Get pool fee",
    5
  );

  console.log("  Factory:", factory);
  console.log("  Pool Fee:", poolFee);

  // WETH 需要调用外部合约,可能失败,设为可选
  try {
    const weth = await retryExternalCall(
      () => liquidityManager.getWETH(),
      "Get WETH address (external call)"
    );
    console.log("  WETH9:", weth);
  } catch (error: any) {
    console.log("  WETH9: ⚠️  Unable to retrieve (external call failed)");
    console.log(
      "  Note: This is expected if the Position Manager contract is slow to respond"
    );
  }

  console.log("\n✅ LiquidityManager verification completed!");
}

async function createV3Pool() {
  console.log("\n🏊 Creating Uniswap V3 Pool...");
  const diamondAddress = sepolia_last.contracts.diamond;
  const liquidityManager = await ethers.getContractAt(
    "LiquidityManager",
    diamondAddress
  );

  // 检查池子是否已存在
  try {
    const existingPool = await retryAsyncOperation(
      () => liquidityManager.getUniswapV3Pool(),
      "Check existing pool",
      2
    );

    if (existingPool && existingPool !== ethers.ZeroAddress) {
      console.log("✅ V3 Pool already exists!");
      console.log(`Pool Address: ${existingPool}`);
      return existingPool;
    } else {
      console.log("📝 V3 Pool not yet created (pool address is zero)");
    }
  } catch (error: any) {
    console.log("⚠️  Unable to check pool status:", error.message);
    console.log("📝 Proceeding with pool creation...");
  }
  const receipt = await executeTransactionWithRetry(
    async () => {
      return await liquidityManager.createPool();
    },
    "V3 Pool Creation",
    5,
    5000
  );

  const poolAddress = await retryAsyncOperation(
    () => liquidityManager.getUniswapV3Pool(),
    "Get V3 pool address"
  );
  console.log("✅ V3 Pool created successfully!");
  console.log(`Pool Address: ${poolAddress}`);
  console.log(`Transaction hash: ${receipt.hash}`);

  return poolAddress;
}

async function initializePoolPrice() {
  console.log("\n💰 Initializing V3 Pool Price...");
  const diamondAddress = sepolia_last.contracts.diamond;
  const liquidityManager = await ethers.getContractAt(
    "LiquidityManager",
    diamondAddress
  );

  // 获取池子地址
  const poolAddress = await retryAsyncOperation(
    () => liquidityManager.getUniswapV3Pool(),
    "Get pool address"
  );

  if (!poolAddress || poolAddress === ethers.ZeroAddress) {
    console.log("❌ Pool not created yet, skipping price initialization");
    return;
  }

  // 检查池子是否已初始化
  try {
    const slot0 = await retryAsyncOperation(
      () => liquidityManager.getPoolSlot0(),
      "Check pool slot0",
      3
    );

    if (slot0.sqrtPriceX96 !== 0n) {
      console.log("✅ Pool already initialized!");
      console.log(`  Current Price: ${slot0.sqrtPriceX96.toString()}`);
      console.log(`  Current Tick: ${slot0.tick.toString()}`);
      return;
    }
  } catch (error: any) {
    console.log("📝 Pool not initialized, proceeding...");
  }

  // 获取 WETH 地址
  const weth = await retryExternalCall(
    () => liquidityManager.getWETH(),
    "Get WETH address"
  );

  // 确定 token0 和 token1 顺序
  const isToken0 = diamondAddress.toLowerCase() < weth.toLowerCase();

  // ============ 🎯 池子价格初始化逻辑 ============
  // 目标价格：1,000,000 Diamond Token = 1 ETH
  // encodeSqrtRatioX96 要求整数参数,不能用小数!
  let initialPrice: bigint;

  if (isToken0) {
    // Diamond 是 token0，WETH 是 token1
    // price = WETH / Diamond = 1 / 1000000 = 0.000001
    // 使用 encodeSqrtRatioX96(1 ETH, 1000000 Diamond)
    initialPrice = BigInt(encodeSqrtRatioX96(1, 1000000).toString());
    console.log(
      "  ✓ 初始化价格: 1,000,000 Diamond = 1 WETH (Diamond 是 token0)"
    );
  } else {
    // Diamond 是 token1，WETH 是 token0
    // price = Diamond / WETH = 1000000 / 1 = 1000000
    // 使用 encodeSqrtRatioX96(1000000 Diamond, 1 ETH)
    initialPrice = BigInt(encodeSqrtRatioX96(1000000, 1).toString());
    console.log(
      "  ✓ 初始化价格: 1,000,000 Diamond = 1 WETH (Diamond 是 token1)"
    );
  }

  console.log(`  Calculated sqrtPriceX96: ${initialPrice.toString()}`);

  // 初始化池子价格
  const poolABI = [
    "function initialize(uint160 sqrtPriceX96) external",
    "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
  ];
  const pool = await ethers.getContractAt(poolABI, poolAddress);

  const receipt = await executeTransactionWithRetry(
    async () => {
      return await pool.initialize(initialPrice);
    },
    "Pool Price Initialization",
    5,
    5000
  );

  await delay(3000);

  const slot0 = await pool.slot0();
  console.log("✅ Pool price initialized successfully!");
  console.log(`  SqrtPriceX96: ${slot0.sqrtPriceX96.toString()}`);
  console.log(`  Current Tick: ${slot0.tick.toString()}`);
  console.log(`  Price ratio: 10000 Token = 0.01 ETH`);
  console.log(`  Transaction hash: ${receipt.hash}`);
}

async function addInitialLiquidity() {
  console.log("\n🌊 Adding Initial Liquidity (40% tokens + 0.01 ETH)...");
  const [signer] = await ethers.getSigners();
  const diamondAddress = sepolia_last.contracts.diamond;

  const liquidityManager = await ethers.getContractAt(
    "LiquidityManager",
    diamondAddress
  );
  const erc20Facet = await ethers.getContractAt("ERC20Facet", diamondAddress);

  // 获取 owner 的代币余额
  const ownerBalance = await retryAsyncOperation(
    () => erc20Facet.balanceOf(signer.address),
    "Get owner balance"
  );

  console.log(`  Owner balance: ${ethers.formatEther(ownerBalance)} tokens`);

  // 计算 40% 的代币数量
  const liquidityTokenAmount = (ownerBalance * 40n) / 100n;
  const liquidityEthAmount = ethers.parseEther("0.01");

  console.log(`  Adding liquidity:`);
  console.log(`    Tokens: ${ethers.formatEther(liquidityTokenAmount)} (40%)`);
  console.log(`    ETH: ${ethers.formatEther(liquidityEthAmount)}`);

  // 检查 owner ETH 余额
  const ethBalance = await ethers.provider.getBalance(signer.address);
  console.log(`  Owner ETH balance: ${ethers.formatEther(ethBalance)} ETH`);

  if (ethBalance < liquidityEthAmount) {
    console.log("❌ Insufficient ETH balance for adding liquidity");
    return;
  }

  // 获取 WETH 地址
  const weth = await retryExternalCall(
    () => liquidityManager.getWETH(),
    "Get WETH address"
  );

  console.log(`  WETH address: ${weth}`);

  // 确定 token0 和 token1 顺序
  const isToken0 = diamondAddress.toLowerCase() < weth.toLowerCase();
  const token0 = isToken0 ? diamondAddress : weth;
  const token1 = isToken0 ? weth : diamondAddress;

  const amount0Desired = isToken0 ? liquidityTokenAmount : liquidityEthAmount;
  const amount1Desired = isToken0 ? liquidityEthAmount : liquidityTokenAmount;

  console.log(`  Token0: ${token0} ${isToken0 ? "(ShibMeme)" : "(WETH)"}`);
  console.log(`  Token1: ${token1} ${isToken0 ? "(WETH)" : "(ShibMeme)"}`);

  // 授权合约使用代币
  console.log("\n  Approving tokens...");
  const approveReceipt = await executeTransactionWithRetry(
    async () => {
      return await erc20Facet.approve(diamondAddress, liquidityTokenAmount);
    },
    "Approve tokens for liquidity",
    5,
    5000
  );

  console.log(`  ✅ Approval confirmed: ${approveReceipt.hash}`);
  await delay(3000);

  // 添加流动性
  console.log("\n  Adding liquidity to pool...");

  const tickLower = -887220; // 最小 tick (全价格范围)
  const tickUpper = 887220; // 最大 tick
  const deadline = Math.floor(Date.now() / 1000) + 3600; // 1小时后过期

  const receipt = await executeTransactionWithRetry(
    async () => {
      return await liquidityManager.mintNewPosition(
        token0,
        token1,
        3000, // 0.3% fee
        tickLower,
        tickUpper,
        amount0Desired,
        amount1Desired,
        0, // amount0Min - 允许滑点
        0, // amount1Min - 允许滑点
        signer.address, // NFT 接收者
        deadline,
        { value: liquidityEthAmount } // 发送 ETH
      );
    },
    "Add Initial Liquidity",
    5,
    5000
  );

  console.log("✅ Initial liquidity added successfully!");
  console.log(`  Transaction hash: ${receipt.hash}`);
  console.log(`  Gas used: ${receipt.gasUsed.toString()}`);

  await delay(3000);

  // 验证流动性
  try {
    const tokenIds = await retryAsyncOperation(
      () => liquidityManager.getLiquidityTokenIds(),
      "Get liquidity token IDs"
    );

    console.log(`\n  ✅ Liquidity positions: ${tokenIds.length}`);
    if (tokenIds.length > 0) {
      console.log(`  Latest NFT Token ID: ${tokenIds[tokenIds.length - 1]}`);
    }

    // 查询池子流动性
    const poolAddress = await liquidityManager.getUniswapV3Pool();
    const poolABI = ["function liquidity() external view returns (uint128)"];
    const pool = await ethers.getContractAt(poolABI, poolAddress);
    const poolLiquidity = await pool.liquidity();
    console.log(`  Pool total liquidity: ${poolLiquidity.toString()}`);
  } catch (error: any) {
    console.log("  ⚠️  Unable to verify liquidity:", error.message);
  }
}
// 转0.011 eth合约用于初始化流动性 40%代币 + 0.01 eth
async function transferEthToContract() {
  const [signer] = await ethers.getSigners();
  const diamondAddress = sepolia_last.contracts.diamond;
  console.log(`Transferring 0.011 ETH to contract: ${diamondAddress}...`);

  const receipt = await executeTransactionWithRetry(
    async () => {
      return await signer.sendTransaction({
        to: diamondAddress,
        value: ethers.parseEther("0.011"),
      });
    },
    "Transfer ETH to Contract",
    5,
    5000
  );

  console.log(`✅ Transfer completed!`);
  console.log(`  Transaction hash: ${receipt.hash}`);
  console.log(`  Gas used: ${receipt.gasUsed.toString()}`);
}

async function main() {
  // await deployDiamond();
  // 如果找不到,需要先部署,再执行下面的"../deployments/sepolia-latest.json";
  await transferEthToContract();
  await liquidityManagerInitialization();
  await createV3Pool();
  await initializePoolPrice();
  await addInitialLiquidity();

  console.log("\n🎉 Deployment and liquidity setup completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
