// scripts/deployment-utils.ts
import * as fs from "fs";
import * as path from "path";
import { ethers } from "hardhat";

// ============================= 部署相关工具函数 =============================

/**
 * 带超时的交易等待函数
 */
export async function waitForTransactionWithTimeout(
  tx: any,
  description: string = "交易",
  timeoutMs: number = 10 * 60 * 1000 // 5分钟默认超时
): Promise<any> {
  console.log(`⏳ 等待${description}确认 (超时: ${timeoutMs / 1000}秒)...`);

  const startTime = Date.now();

  return Promise.race([
    tx.wait(),
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${description}超时 (${timeoutMs / 1000}秒)`));
      }, timeoutMs);
    }),
  ]).then((receipt: any) => {
    const duration = (Date.now() - startTime) / 1000;
    console.log(`✅ ${description}确认成功 (耗时: ${duration.toFixed(1)}秒)`);
    return receipt;
  });
}

/**
 * 重试机制的部署函数
 */
export async function deployWithRetry<T>(
  deployFn: () => Promise<T>,
  maxRetries: number = 3,
  description: string = "部署"
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`🚀 ${description} (尝试 ${i + 1}/${maxRetries})`);
      return await deployFn();
    } catch (error) {
      console.log(
        `❌ ${description}失败 (尝试 ${i + 1}/${maxRetries}):`,
        error
      );

      if (i === maxRetries - 1) {
        throw new Error(`${description}最终失败: ${error}`);
      }

      const delay = Math.pow(2, i) * 1000; // 指数退避: 1s, 2s, 4s
      console.log(`⏱️ ${delay / 1000}秒后重试...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error(`${description}重试失败`);
}

// ============================= 文件操作工具函数 =============================

/**
 * 读取部署信息
 */
export function getDeploymentInfo(network: string = "sepolia"): any {
  try {
    const deploymentPath = path.join(
      __dirname,
      "..",
      "..",
      "deployments",
      network,
      "deployment-info.json"
    );

    if (fs.existsSync(deploymentPath)) {
      const data = fs.readFileSync(deploymentPath, "utf-8");
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.warn("无法读取部署信息:", error);
    return null;
  }
}

/**
 * 获取合约 ABI
 */
export function getContractABI(
  contractName: string,
  network: string = "sepolia"
): any {
  try {
    const abiPath = path.join(
      __dirname,
      "..",
      "..",
      "deployments",
      network,
      `${contractName}.json`
    );
    if (fs.existsSync(abiPath)) {
      const data = fs.readFileSync(abiPath, "utf-8");
      const contractInfo = JSON.parse(data);
      return contractInfo.abi;
    }
    return null;
  } catch (error) {
    console.warn(`无法读取 ${contractName} ABI:`, error);
    return null;
  }
}

/**
 * 获取最新部署的合约地址
 */
export function getLatestDeploymentAddresses(network: string = "sepolia"): {
  MetaNodeToken?: string;
  MultiStakePledgeContract?: string;
  USDC?: string;
  WETH?: string;
} {
  const deploymentInfo = getDeploymentInfo(network);
  if (!deploymentInfo) {
    return {};
  }

  return {
    MetaNodeToken: deploymentInfo.contracts?.MetaNodeToken?.address,
    MultiStakePledgeContract: deploymentInfo.contracts?.MultiStakePledgeContract?.address,
    USDC: deploymentInfo.tokens?.USDC?.address,
    WETH: deploymentInfo.tokens?.WETH?.address,
  };
}

/**
 * 创建部署目录
 */
export function createDeploymentDir(network: string = "sepolia"): string {
  const deploymentDir = path.join(
    __dirname,
    "..",
    "..",
    "deployments",
    network
  );
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }
  return deploymentDir;
}

/**
 * 连接到已部署的合约 (优雅降级)
 */
export async function connectToDeployedContract(
  contractName: string,
  network: string = "sepolia"
): Promise<any> {
  try {
    // 首先尝试通过 Hardhat 获取合约工厂
    const contractFactory = await ethers.getContractFactory(contractName);

    // 获取已部署的地址
    const addresses = getLatestDeploymentAddresses(network);
    const contractAddress = addresses[contractName as keyof typeof addresses];

    if (!contractAddress) {
      throw new Error(`未找到 ${contractName} 的部署地址`);
    }

    console.log(`🔗 连接到 ${contractName}:`, contractAddress);
    return contractFactory.attach(contractAddress);
  } catch (error) {
    // 降级到使用 ABI 文件
    console.warn(`通过 Hardhat 连接失败，尝试使用 ABI 文件:`, error);

    const abi = getContractABI(contractName, network);
    const addresses = getLatestDeploymentAddresses(network);
    const contractAddress = addresses[contractName as keyof typeof addresses];

    if (!abi || !contractAddress) {
      throw new Error(`无法获取 ${contractName} 的 ABI 或地址`);
    }

    console.log(`🔗 通过 ABI 连接到 ${contractName}:`, contractAddress);
    return new ethers.Contract(contractAddress, abi, ethers.provider);
  }
}
