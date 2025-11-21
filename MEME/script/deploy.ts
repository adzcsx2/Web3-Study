import { ethers } from "hardhat";
import fs from "fs";
import path from "path";
const { getSelectors, FacetCutAction } = require("./utils/diamond.js");

// 添加延迟函数，避免请求过快
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 带重试的部署函数
async function deployWithRetry(
  factory: any,
  name: string,
  maxRetries = 5
): Promise<any> {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`\n🔄 Deploying ${name} (attempt ${i + 1}/${maxRetries})...`);

      let contract;
      try {
        contract = await factory.deploy();
      } catch (deployError: any) {
        throw deployError;
      }

      console.log(`⏳ Waiting for deployment confirmation...`);

      try {
        await contract.waitForDeployment();
      } catch (waitError: any) {
        throw waitError;
      }

      const address = await contract.getAddress();
      console.log(`✅ ${name} deployed successfully: ${address}`);
      await delay(3000); // 部署后等待3秒
      return contract;
    } catch (error: any) {
      lastError = error;
      console.log(`❌ Deployment attempt ${i + 1} failed`);
      console.log(`Error code: ${error.code || "UNKNOWN"}`);
      console.log(`Error message: ${error.message}`);

      if (i < maxRetries - 1) {
        const waitTime = (i + 1) * 5000; // 递增等待时间：5s, 10s, 15s, 20s, 25s
        console.log(`⏱️  Retrying in ${waitTime / 1000} seconds...`);
        await delay(waitTime);
        console.log(`🔁 Resuming deployment...`);
      } else {
        console.log(
          `\n❌ All ${maxRetries} deployment attempts failed for ${name}`
        );
      }
    }
  }

  throw lastError;
}

async function main() {
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
  const diamondInitAddress = await diamondInit.getAddress();
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
    const facetAddress = await facet.getAddress();
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
      console.log(`❌ Diamond deployment attempt ${i + 1} failed`);
      console.log(`Error: ${error.message}`);

      if (i < 4) {
        const waitTime = (i + 1) * 5000;
        console.log(`⏱️  Retrying in ${waitTime / 1000} seconds...`);
        await delay(waitTime);
      }
    }
  }

  if (!diamond) {
    console.log("\n❌ All Diamond deployment attempts failed");
    throw lastDiamondError || new Error("Failed to deploy Diamond contract");
  }

  const diamondAddress = await diamond.getAddress();
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

  let initSuccess = false;
  for (let i = 0; i < 5; i++) {
    try {
      console.log(`\n🔄 Initialization attempt ${i + 1}/5...`);
      const initTx = await shibMemeFacet.initializeShibMeme(
        "ShibMeme",
        "SBMM",
        signer.address, // 税费接收地址
        ethers.parseEther("10000"), // 最大交易额度: 10,000 tokens
        100 // 每日交易限制: 100笔
      );
      console.log(`⏳ Waiting for initialization transaction...`);
      await initTx.wait();
      console.log(`✅ ShibMeme initialized successfully`);
      initSuccess = true;
      break;
    } catch (error: any) {
      console.log(`❌ Initialization attempt ${i + 1} failed`);
      console.log(`Error: ${error.message}`);

      if (i < 4) {
        const waitTime = (i + 1) * 5000;
        console.log(`⏱️  Retrying in ${waitTime / 1000} seconds...`);
        await delay(waitTime);
      }
    }
  }

  if (!initSuccess) {
    throw new Error("Failed to initialize ShibMeme after 5 attempts");
  }

  // 验证部署
  console.log();
  console.log("Verifying deployment...");
  const erc20Facet = await ethers.getContractAt("ERC20Facet", diamondAddress);
  const name = await erc20Facet.name();
  const symbol = await erc20Facet.symbol();
  const totalSupply = await erc20Facet.totalSupply();
  const ownerBalance = await erc20Facet.balanceOf(signer.address);

  console.log("Token Name:", name);
  console.log("Token Symbol:", symbol);
  console.log("Total Supply:", ethers.formatEther(totalSupply));
  console.log("Owner Balance:", ethers.formatEther(ownerBalance));

  // 获取合约代币余额
  const contractBalance = await erc20Facet.balanceOf(diamondAddress);
  console.log("Contract Balance:", ethers.formatEther(contractBalance));

  // // 提供初始流动性
  // console.log();
  // console.log("Providing initial liquidity...");

  // // Sepolia 测试网 UniswapV2Router 地址
  // const UNISWAP_V2_ROUTER = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506";

  // // 设置要提供的 ETH 数量（例如：0.01 ETH）
  // const ethAmount = ethers.parseEther("0.01");

  // // 检查合约中的代币余额（初始化时已铸造给合约）
  // const contractBalance = await erc20Facet.balanceOf(diamondAddress);
  // console.log(
  //   `Diamond contract token balance: ${ethers.formatEther(contractBalance)}`
  // );

  // // 调用 provideInitialLiquidity 方法
  // console.log(
  //   `Providing liquidity with ${ethers.formatEther(ethAmount)} ETH...`
  // );
  // const liquidityTx = await shibMemeFacet.provideInitialLiquidity(
  //   UNISWAP_V2_ROUTER,
  //   { value: ethAmount }
  // );
  // await liquidityTx.wait();
  // console.log("Initial liquidity provided successfully!");

  // // 验证流动性池
  // const contractBalanceAfter = await erc20Facet.balanceOf(diamondAddress);
  // console.log(
  //   "Diamond contract balance after liquidity:",
  //   ethers.formatEther(contractBalanceAfter)
  // );

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
      contractBalance: ethers.formatEther(contractBalance),
    },
    config: {
      taxRecipient: signer.address,
      maxTransactionAmount: "10000",
      dailyTransactionLimit: 100,
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

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
