import { ethers, network } from "hardhat";
import { upgrades } from "hardhat";
import hre from "hardhat";
import type {
  ContractTransactionResponse,
  ContractFactory,
  Signer,
  Contract,
  BaseContract,
} from "ethers";
import * as fs from "fs";
import * as path from "path";

// ABI 类型定义
export interface ABIItem {
  anonymous?: boolean;
  inputs?: ABIInput[];
  name?: string;
  outputs?: ABIOutput[];
  stateMutability?: string;
  type: string;
}

export interface ABIInput {
  internalType: string;
  name: string;
  type: string;
  indexed?: boolean;
}

export interface ABIOutput {
  internalType: string;
  name: string;
  type: string;
}

// 部署相关接口

/**
 * 单个合约版本的详细信息
 */
export interface ContractVersionInfo {
  address: string; // 代理地址（首次部署）或实现地址（升级）
  implementationAddress?: string; // 实现合约地址
  proxyAddress?: string; // 代理地址（升级时使用，避免混淆）
  transactionHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  version: string; // 版本号（如 "1", "2"）
  deployer: string;
  deployedAt: string; // ISO时间戳
  abi: ABIItem[]; // 直接存储ABI对象数组
  isProxy?: boolean; // 是否为代理合约
  isActive: boolean; // 是否为当前激活版本
}

/**
 * 合约的完整部署历史
 */
export interface ContractDeploymentHistory {
  contractName: string;
  proxyAddress: string; // 代理地址（不变）
  currentVersion: string; // 当前版本
  versions: ContractVersionInfo[]; // 版本历史数组
}

/**
 * Token元数据信息
 */
export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
}

/**
 * 网络部署信息（JSON文件格式）
 */
export interface NetworkDeploymentInfo {
  network: string;
  chainId: string;
  lastUpdated: string;
  contracts: Record<string, ContractDeploymentHistory>; // 合约名 -> 历史记录
  tokens?: Record<string, TokenMetadata>;
}

// 合约实例类型 - 定义部署合约的实例方法
export interface ContractInstance {
  getAddress(): Promise<string>;
  name?(): Promise<string>;
  symbol?(): Promise<string>;
  decimals?(): Promise<number>;
  getVersion?(): Promise<string | number | bigint>;
  paused?(): Promise<boolean>;
  deploymentTransaction(): ContractTransactionResponse | null;
  waitForDeployment(): Promise<ContractInstance>;

  // 允许动态访问合约方法
  [key: string]: any;
}

// 部署选项类型
export interface DeployProxyOptions {
  kind?: "uups" | "transparent";
  initializer?: string;
  unsafeAllow?: string[];
  tokenMetadata?: TokenMetadata;
}

export interface UpgradeProxyOptions {
  unsafeAllow?: string[];
}

/**
 * 部署结果（用于方法返回）
 */
export interface DeploymentResult {
  contract: BaseContract;
  versionInfo: ContractVersionInfo;
}

/**
 * 升级结果（用于方法返回）
 */
export interface UpgradeResult {
  contract: BaseContract;
  versionInfo: ContractVersionInfo;
  newImplementation: string;
}
export class DeployHelper {
  private readonly deploymentDir: string;
  private readonly abiDir: string;
  private readonly frontendAbiDir: string;

  constructor() {
    this.deploymentDir = path.join(__dirname, "../../deployments");
    this.abiDir = path.join(__dirname, "../../artifacts");
    this.frontendAbiDir = path.join(__dirname, "../../front/src/app/abi");

    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    [this.deploymentDir, this.frontendAbiDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * 保存ABI到前端目录
   */
  private async saveABIToFrontend(
    contractName: string,
    address: string,
    abi: ABIItem[]
  ): Promise<void> {
    const abiFilePath = path.join(this.frontendAbiDir, `${contractName}.json`);
    const abiContent = {
      address,
      abi,
      network: network.name,
      deployedAt: new Date().toISOString(),
    };

    fs.writeFileSync(abiFilePath, JSON.stringify(abiContent, null, 2));
    console.log(`✅ ABI已保存到前端: ${abiFilePath}`);
  }

  /**
   * 读取现有部署信息
   */
  private readDeploymentInfo(): NetworkDeploymentInfo | null {
    const fileName = `${hre.network.name}-deployment.json`;
    const filePath = path.join(this.deploymentDir, fileName);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(content) as NetworkDeploymentInfo;
    } catch (error) {
      console.warn(`⚠️  读取部署信息失败: ${filePath}`, error);
      return null;
    }
  }

  /**
   * 保存部署信息到网络专用JSON文件
   */
  private async writeDeploymentInfo(
    info: NetworkDeploymentInfo
  ): Promise<void> {
    const fileName = `${hre.network.name}-deployment.json`;
    const filePath = path.join(this.deploymentDir, fileName);
    const frontendPath = path.join(
      this.frontendAbiDir,
      `${hre.network.name}-deployment.json`
    );

    // 写入部署目录
    fs.writeFileSync(filePath, JSON.stringify(info, null, 2), "utf-8");

    // 同步到前端目录
    fs.writeFileSync(frontendPath, JSON.stringify(info, null, 2), "utf-8");

    console.log(`✅ 部署信息已保存: ${filePath}`);
    console.log(`✅ 前端部署信息已同步: ${frontendPath}`);
  }

  /**
   * 生成唯一的合约存储键名
   * 如果合约名称已存在但代理地址不同，则返回 contractName_address 格式
   */
  private generateStorageKey(
    contractName: string,
    proxyAddress: string,
    deploymentInfo: NetworkDeploymentInfo
  ): string {
    // 检查是否存在同名但不同地址的合约
    const existingContract = deploymentInfo.contracts[contractName];

    if (!existingContract) {
      // 不存在同名合约，直接使用合约名
      return contractName;
    }

    if (existingContract.proxyAddress === proxyAddress) {
      // 同名且同地址，直接使用合约名
      return contractName;
    }

    // 同名但不同地址，生成新的键名
    const newKey = `${contractName}_${proxyAddress}`;
    console.log(`⚠️  检测到合约名称重复，使用新键名: ${newKey}`);
    return newKey;
  }

  /**
   * 查找使用指定代理地址的合约键名
   */
  private findContractKeyByProxy(
    proxyAddress: string,
    deploymentInfo: NetworkDeploymentInfo
  ): string | null {
    for (const [key, contractHistory] of Object.entries(
      deploymentInfo.contracts
    )) {
      if (contractHistory.proxyAddress === proxyAddress) {
        return key;
      }
    }
    return null;
  }

  /**
   * 添加或更新合约部署信息
   * @param contractName 合约名称
   * @param versionInfo 版本信息
   * @param tokenMetadata Token元数据（可选）
   */
  async saveContractDeployment(
    contractName: string,
    versionInfo: ContractVersionInfo,
    tokenMetadata?: TokenMetadata
  ): Promise<void> {
    // 读取现有部署信息
    let deploymentInfo = this.readDeploymentInfo();

    // 如果不存在，创建新的
    if (!deploymentInfo) {
      const chainId = (
        await hre.ethers.provider.getNetwork()
      ).chainId.toString();
      deploymentInfo = {
        network: hre.network.name,
        chainId,
        lastUpdated: new Date().toISOString(),
        contracts: {},
      };
    }

    // 更新时间戳
    deploymentInfo.lastUpdated = new Date().toISOString();

    // 确定代理地址
    const proxyAddress = versionInfo.proxyAddress || versionInfo.address;

    // 如果是升级操作（versionInfo 包含 proxyAddress 且 isProxy=false）
    if (versionInfo.proxyAddress && !versionInfo.isProxy) {
      // 查找使用相同代理地址的合约键名
      const existingKey = this.findContractKeyByProxy(
        proxyAddress,
        deploymentInfo
      );

      if (existingKey) {
        // 找到现有合约记录，更新它
        const history = deploymentInfo.contracts[existingKey];

        // 将所有旧版本的 isActive 设置为 false
        history.versions.forEach((v) => {
          v.isActive = false;
        });

        // 添加新版本
        history.versions.push(versionInfo);

        // 更新合约名称和当前版本
        history.contractName = contractName;
        history.currentVersion = versionInfo.version;

        console.log(`✅ 已更新合约 ${existingKey} 的版本信息`);
        console.log(`   - 当前版本: ${versionInfo.version}`);
        console.log(`   - 代理地址: ${proxyAddress}`);
      } else {
        // 未找到现有记录，创建新记录（理论上不应该发生）
        console.warn(
          `⚠️  未找到代理地址 ${proxyAddress} 的现有记录，创建新记录`
        );
        const storageKey = this.generateStorageKey(
          contractName,
          proxyAddress,
          deploymentInfo
        );

        deploymentInfo.contracts[storageKey] = {
          contractName,
          proxyAddress,
          currentVersion: versionInfo.version,
          versions: [versionInfo],
        };
      }
    } else {
      // 首次部署代理合约
      const storageKey = this.generateStorageKey(
        contractName,
        proxyAddress,
        deploymentInfo
      );

      deploymentInfo.contracts[storageKey] = {
        contractName,
        proxyAddress,
        currentVersion: versionInfo.version,
        versions: [versionInfo],
      };

      console.log(`✅ 已创建新合约记录: ${storageKey}`);
    }

    // 处理Token元数据
    if (tokenMetadata) {
      if (!deploymentInfo.tokens) {
        deploymentInfo.tokens = {};
      }
      deploymentInfo.tokens[contractName] = tokenMetadata;
    }

    // 写入文件
    await this.writeDeploymentInfo(deploymentInfo);

    // 单独保存ABI到前端（便于前端直接导入）
    await this.saveABIToFrontend(
      contractName,
      versionInfo.address,
      versionInfo.abi
    );
  }

  /**
   * 保存部署信息（不包含 ABI）
   * @deprecated 使用 saveContractDeployment 替代
   */
  async saveDeploymentInfo(
    deployments: Record<
      string,
      {
        versionInfo: ContractVersionInfo;
        token?: TokenMetadata;
      }
    >
  ): Promise<void> {
    for (const [contractName, { versionInfo, token }] of Object.entries(
      deployments
    )) {
      await this.saveContractDeployment(contractName, versionInfo, token);
    }
  }

  /**
   * 部署代理合约（自动保存部署信息）
   * @param contractName 合约名称
   * @param args 初始化参数
   * @param options 部署选项
   * @param options.tokenMetadata Token元数据（可选，自动保存）
   */
  async deployProxy<T extends BaseContract>(
    contractName: string,
    args: unknown[] = [],
    options: DeployProxyOptions = {}
  ): Promise<DeploymentResult> {
    const [signer] = await ethers.getSigners();
    const deployerAddress = await signer.getAddress();

    console.log(`🚀 开始部署合约: ${contractName}`);
    console.log(`📍 部署者地址: ${deployerAddress}`);
    console.log(`🌐 网络: ${network.name}`);

    const contractFactory = await ethers.getContractFactory(
      contractName,
      signer
    );

    // 提前获取 ABI
    const abiJson = contractFactory.interface.formatJson();
    const abi: ABIItem[] = JSON.parse(abiJson);

    const deployOptions: Record<string, unknown> = {
      kind: options.kind || "uups",
    };

    if (options.initializer) {
      deployOptions.initializer = options.initializer;
    }

    if (options.unsafeAllow && options.unsafeAllow.length > 0) {
      console.log(`⚠️  使用安全豁免选项: ${options.unsafeAllow.join(", ")}`);
      deployOptions.unsafeAllow = options.unsafeAllow;
    }

    const deployedContract = (await upgrades.deployProxy(
      contractFactory,
      args,
      deployOptions
    )) as T;

    const deploymentTx = deployedContract.deploymentTransaction();
    await deployedContract.waitForDeployment();
    const contractAddress = await deployedContract.getAddress();

    const implementationAddress =
      await upgrades.erc1967.getImplementationAddress(contractAddress);

    let gasUsed: string | undefined;
    let blockNumber: number | undefined;
    if (deploymentTx) {
      try {
        const receipt = await deploymentTx.wait();
        gasUsed = receipt?.gasUsed?.toString();
        blockNumber = receipt?.blockNumber;
      } catch (error) {
        console.warn("⚠️  无法获取交易收据:", error);
      }
    }

    // 获取版本号
    let version = "1";
    try {
      if (typeof (deployedContract as any).getVersion === "function") {
        const contractVersion = await (deployedContract as any).getVersion();
        version = contractVersion.toString();
      }
    } catch (error) {
      console.warn("⚠️  无法获取合约版本，使用默认版本 1");
    }

    const versionInfo: ContractVersionInfo = {
      address: contractAddress,
      implementationAddress,
      transactionHash: deploymentTx?.hash,
      blockNumber,
      gasUsed,
      version,
      deployer: deployerAddress,
      deployedAt: new Date().toISOString(),
      isProxy: true,
      isActive: true, // 新部署的版本默认激活
      abi,
    };

    console.log(`✅ 代理合约部署成功:`);
    console.log(`   - 代理地址: ${contractAddress}`);
    console.log(`   - 实现地址: ${implementationAddress}`);
    console.log(`   - 交易哈希: ${deploymentTx?.hash}`);
    console.log(`   - 版本: ${version}`);

    // 自动保存部署信息
    await this.saveContractDeployment(
      contractName,
      versionInfo,
      options.tokenMetadata
    );

    return { contract: deployedContract, versionInfo };
  }
  /**
   * 升级代理合约（自动保存升级历史）
   * @param proxyAddress 代理合约地址
   * @param newContractName 新合约名称
   * @param options 升级选项
   */
  async upgradeProxy<T extends BaseContract>(
    proxyAddress: string,
    newContractName: string,
    options: UpgradeProxyOptions = {}
  ): Promise<UpgradeResult> {
    const [signer] = await ethers.getSigners();
    const deployerAddress = await signer.getAddress();

    console.log(`🔄 开始升级合约: ${newContractName}`);
    console.log(`📍 代理地址: ${proxyAddress}`);
    console.log(`📍 升级者地址: ${deployerAddress}`);

    const contractFactory = await ethers.getContractFactory(
      newContractName,
      signer
    );

    // 提前获取 ABI
    const abiJson = contractFactory.interface.formatJson();
    const abi: ABIItem[] = JSON.parse(abiJson);

    // 构建升级选项
    const upgradeOptions: Record<string, unknown> = {};

    // 添加安全豁免选项（如果指定）
    if (options.unsafeAllow && options.unsafeAllow.length > 0) {
      console.log(
        `⚠️  升级使用安全豁免选项: ${options.unsafeAllow.join(", ")}`
      );
      upgradeOptions.unsafeAllow = options.unsafeAllow;
    }

    const upgradedContract = (await upgrades.upgradeProxy(
      proxyAddress,
      contractFactory,
      upgradeOptions
    )) as T;

    const newImplementation = await upgrades.erc1967.getImplementationAddress(
      proxyAddress
    );

    // 获取升级交易信息
    const deploymentTx = upgradedContract.deploymentTransaction();
    let gasUsed: string | undefined;
    let blockNumber: number | undefined;
    let transactionHash: string | undefined;

    if (deploymentTx) {
      try {
        const receipt = await deploymentTx.wait();
        gasUsed = receipt?.gasUsed?.toString();
        blockNumber = receipt?.blockNumber;
        transactionHash = receipt?.hash;
      } catch (error) {
        console.warn("⚠️  无法获取交易收据:", error);
      }
    }

    // 获取新版本号
    let version = "1";
    try {
      if (typeof (upgradedContract as any).getVersion === "function") {
        const contractVersion = await (upgradedContract as any).getVersion();
        version = contractVersion.toString();
      }
    } catch (error) {
      console.warn("⚠️  无法获取合约版本，尝试自动推断");
      // 尝试从现有部署信息推断下一个版本
      const deploymentInfo = this.readDeploymentInfo();
      if (deploymentInfo) {
        // 查找使用相同代理地址的合约
        const existingKey = this.findContractKeyByProxy(
          proxyAddress,
          deploymentInfo
        );
        if (existingKey) {
          const currentVersion = parseInt(
            deploymentInfo.contracts[existingKey].currentVersion || "0"
          );
          version = (currentVersion + 1).toString();
          console.log(`📦 推断版本号: ${version}`);
        }
      }
    }

    const versionInfo: ContractVersionInfo = {
      address: newImplementation,
      implementationAddress: newImplementation,
      proxyAddress: proxyAddress, // 保存代理地址，用于正确识别升级操作
      transactionHash,
      blockNumber,
      gasUsed,
      version,
      deployer: deployerAddress,
      deployedAt: new Date().toISOString(),
      isProxy: false, // 这是实现合约
      isActive: true, // 升级后的新版本默认激活
      abi,
    };

    console.log(`✅ 合约升级成功:`);
    console.log(`   - 代理地址: ${proxyAddress}`);
    console.log(`   - 新实现地址: ${newImplementation}`);
    console.log(`   - 版本: ${version}`);
    console.log(`   - 交易哈希: ${transactionHash}`);

    // 自动保存升级历史
    await this.saveContractDeployment(newContractName, versionInfo);

    return {
      contract: upgradedContract,
      versionInfo,
      newImplementation,
    };
  }
}
