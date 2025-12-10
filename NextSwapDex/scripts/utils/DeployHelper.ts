import { ethers, network, run, upgrades } from "hardhat";
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
import { libraries } from "../../typechain-types/contracts/contract/swap/core";

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
  libraries?: Record<string, string>; // 链接的库信息（库完整路径 -> 库地址）
}

/**
 * 合约的完整部署历史
 */
export interface ContractDeploymentHistory {
  contractName: string;
  proxyAddress: string; // 代理地址（不变）
  isProxyContract: boolean; // 是否为代理合约
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
  libraries?: Record<string, string>; // 库名称 -> 库地址的映射
}

export interface UpgradeProxyOptions {
  unsafeAllow?: string[];
  libraries?: Record<string, string>; // 库名称 -> 库地址的映射
}

export interface DeployContractOptions {
  tokenMetadata?: TokenMetadata;
  libraries?: Record<string, string>; // 库名称 -> 库地址的映射
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

/**
 * 库部署结果
 */
export interface LibraryDeploymentResult {
  name: string;
  address: string;
  transactionHash?: string;
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
   * 部署库合约
   * @param libraryName 库名称
   * @returns 库部署结果（包含 Hardhat 所需的完整路径格式）
   */
  async deployLibrary(libraryName: string): Promise<LibraryDeploymentResult> {
    console.log(`📚 部署库: ${libraryName}`);
    const [signer] = await ethers.getSigners();
    const deployerAddress = await signer.getAddress();

    const libraryFactory = await ethers.getContractFactory(libraryName, signer);

    // 提前获取 ABI
    const abiJson = libraryFactory.interface.formatJson();
    const abi: ABIItem[] = JSON.parse(abiJson);

    const library = await libraryFactory.deploy();
    console.log(`⏳ 等待库合约部署确认...`);
    await library.waitForDeployment();

    const libraryAddress = await library.getAddress();
    const deploymentTx = library.deploymentTransaction();

    // 获取库的完整路径（Hardhat 链接库时需要）
    const artifact = await hre.artifacts.readArtifact(libraryName);
    const fullPath = `${artifact.sourceName}:${libraryName}`;

    // 判断部署是否成功
    let deploymentSuccess = false;
    let gasUsed: string | undefined;
    let blockNumber: number | undefined;
    let transactionHash: string | undefined;

    if (deploymentTx) {
      try {
        const receipt = await deploymentTx.wait();
        if (receipt && receipt.status === 1) {
          deploymentSuccess = true;
          gasUsed = receipt.gasUsed?.toString();
          blockNumber = receipt.blockNumber;
          transactionHash = receipt.hash;
          console.log(`✅ 库 ${libraryName} 部署成功`);
          console.log(`   - 地址: ${libraryAddress}`);
          console.log(`   - 完整路径: ${fullPath}`);
          console.log(`   - 交易哈希: ${transactionHash}`);
          console.log(`   - Gas 使用: ${gasUsed}`);
        } else {
          console.error(
            `❌ 库 ${libraryName} 部署失败: 交易状态为 ${receipt?.status}`
          );
        }
      } catch (error) {
        console.error(`❌ 库 ${libraryName} 部署失败:`, error);
        throw error;
      }
    } else {
      console.warn(`⚠️  无法获取部署交易信息`);
    }

    // 如果部署成功，保存部署信息
    if (deploymentSuccess) {
      const versionInfo: ContractVersionInfo = {
        address: libraryAddress,
        transactionHash,
        blockNumber,
        gasUsed,
        version: "1",
        deployer: deployerAddress,
        deployedAt: new Date().toISOString(),
        isProxy: false,
        isActive: true,
        abi,
      };

      await this.saveContractDeployment(libraryName, versionInfo, false);
      console.log(`💾 库 ${libraryName} 部署信息已保存`);
    }

    return {
      name: libraryName,
      address: libraryAddress,
      transactionHash: deploymentTx?.hash,
    };
  }

  /**
   * 批量部署库合约
   * @param libraryNames 库名称数组
   * @returns 库地址映射对象（键为完整路径，值为地址）
   */
  async deployLibraries(
    libraryNames: string[]
  ): Promise<Record<string, string>> {
    console.log(`\n📚 开始批量部署 ${libraryNames.length} 个库...\n`);

    const libraries: Record<string, string> = {};

    for (const libName of libraryNames) {
      await this.deployLibrary(libName);
    }

    console.log(`\n✅ 所有库部署完成！`);
    return libraries;
  }

  /**
   * 获取合约源文件路径（用于验证）
   * @param contractName 合约名称
   * @returns 合约源文件路径，格式如 "contracts/contract/NextswapGovernor.sol:NextswapGovernor"
   */
  async getContractSourcePath(contractName: string): Promise<string> {
    try {
      // 从 Hardhat artifacts 中读取合约信息
      const artifact = await hre.artifacts.readArtifact(contractName);

      // artifact.sourceName 包含源文件相对路径，如 "contracts/contract/NextswapGovernor.sol"
      if (artifact.sourceName) {
        return `${artifact.sourceName}:${contractName}`;
      }
    } catch (error) {
      console.warn(`⚠️  无法从 artifacts 获取合约路径: ${error}`);
    }

    // 降级方案：假设合约在 contracts 根目录
    return `contracts/${contractName}.sol:${contractName}`;
  }

  /**
   * 同步 deployments 目录的所有文件到前端目录
   * 将 deployments 目录下的所有 JSON 文件复制到前端 ABI 目录
   */
  async syncDeploymentsToFrontend(): Promise<void> {
    console.log("\n🔄 开始同步部署文件到前端目录...");

    try {
      // 确保前端目录存在
      if (!fs.existsSync(this.frontendAbiDir)) {
        fs.mkdirSync(this.frontendAbiDir, { recursive: true });
      }

      // 读取 deployments 目录下的所有文件
      const files = fs.readdirSync(this.deploymentDir);

      let syncedCount = 0;
      for (const file of files) {
        // 只同步 JSON 文件
        if (file.endsWith(".json")) {
          const sourcePath = path.join(this.deploymentDir, file);
          const targetPath = path.join(this.frontendAbiDir, file);

          // 读取源文件内容
          const content = fs.readFileSync(sourcePath, "utf-8");

          // 写入到目标文件（覆盖）
          fs.writeFileSync(targetPath, content, "utf-8");

          console.log(`   ✅ 已同步: ${file}`);
          syncedCount++;
        }
      }

      console.log(`\n✅ 同步完成！共同步 ${syncedCount} 个文件`);
      console.log(`   📂 源目录: ${this.deploymentDir}`);
      console.log(`   📂 目标目录: ${this.frontendAbiDir}`);
    } catch (error) {
      console.error("❌ 同步部署文件失败:", error);
      throw error;
    }
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

    // 写入部署目录
    fs.writeFileSync(filePath, JSON.stringify(info, null, 2), "utf-8");

    console.log(`✅ 部署信息已保存: ${filePath}`);
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
   * @param isProxyContract 是否为代理合约
   * @param tokenMetadata Token元数据（可选）
   * @param libraries 链接的库信息（可选）
   */
  async saveContractDeployment(
    contractName: string,
    versionInfo: ContractVersionInfo,
    isProxyContract: boolean,
    tokenMetadata?: TokenMetadata,
    libraries?: Record<string, string>
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
          isProxyContract,
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
        isProxyContract: isProxyContract,
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
  }

  /**
   * 保存部署信息（不包含 ABI）
   * @deprecated 使用 saveContractDeployment 替代
   */
  async saveDeploymentInfo(
    isProxyContract: boolean,
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
      await this.saveContractDeployment(
        contractName,
        versionInfo,
        isProxyContract,
        token
      );
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

    console.log(`🚀 开始部署代理合约: ${contractName}`);
    console.log(`📍 部署者地址: ${deployerAddress}`);
    console.log(`🌐 网络: ${network.name}`);

    // 处理库链接
    if (options.libraries && Object.keys(options.libraries).length > 0) {
      console.log(`🔗 链接库:`);
      for (const [libName, libAddress] of Object.entries(options.libraries)) {
        console.log(`   - ${libName}: ${libAddress}`);
      }
    }

    // 创建合约工厂，根据是否有库链接使用不同的方式
    let contractFactory;
    if (options.libraries && Object.keys(options.libraries).length > 0) {
      // 有库链接时，传递 libraries 对象
      contractFactory = await ethers.getContractFactory(contractName, {
        libraries: options.libraries,
      });
    } else {
      // 无库链接时，正常创建
      contractFactory = await ethers.getContractFactory(contractName, signer);
    }

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
    )) as unknown as T;

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
      ...(options.libraries &&
        Object.keys(options.libraries).length > 0 && {
          libraries: options.libraries,
        }),
    };

    console.log(`✅ 代理合约部署成功:`);
    console.log(`   - 代理地址: ${contractAddress}`);
    console.log(`   - 实现地址: ${implementationAddress}`);
    console.log(`   - 交易哈希: ${deploymentTx?.hash}`);
    console.log(`   - 版本: ${version}`);

    // 显示链接的库信息
    if (options.libraries && Object.keys(options.libraries).length > 0) {
      console.log(`   - 链接的库: ${Object.keys(options.libraries).length} 个`);
      for (const [libPath, libAddr] of Object.entries(options.libraries)) {
        console.log(`     • ${libPath}: ${libAddr}`);
      }
    }

    // 获取并显示合约大小
    try {
      const contractCode = await ethers.provider.getCode(implementationAddress);
      const sizeBytes = (contractCode.length - 2) / 2; // 减去0x前缀，每2个字符代表1字节
      const sizeKB = (sizeBytes / 1024).toFixed(2);
      console.log(
        `   - 合约大小: ${sizeKB} KB (${sizeBytes.toLocaleString()} 字节)`
      );
    } catch (error) {
      console.warn("⚠️  无法获取合约大小:", error);
    }

    // 自动保存部署信息
    await this.saveContractDeployment(
      contractName,
      versionInfo,
      true,
      options.tokenMetadata,
      options.libraries // 传递库信息
    );

    return { contract: deployedContract, versionInfo };
  }

  /**
   * 部署普通合约（非代理合约，自动保存部署信息）
   * @param contractName 合约名称
   * @param args 构造函数参数
   * @param options 部署选项（包含 libraries 和 tokenMetadata）
   */
  async deployContract<T extends BaseContract>(
    contractName: string,
    args: unknown[] = [],
    options: DeployContractOptions = {}
  ): Promise<DeploymentResult> {
    const [signer] = await ethers.getSigners();
    const deployerAddress = await signer.getAddress();

    console.log(`🚀 开始部署普通合约: ${contractName}`);
    console.log(`📍 部署者地址: ${deployerAddress}`);
    console.log(`🌐 网络: ${network.name}`);

    if (args.length > 0) {
      console.log(`📦 构造函数参数:`, args);
    }

    // 处理库链接
    if (options.libraries && Object.keys(options.libraries).length > 0) {
      console.log(`🔗 链接库:`);
      for (const [libName, libAddress] of Object.entries(options.libraries)) {
        console.log(`   - ${libName}: ${libAddress}`);
      }
    }

    // 创建合约工厂，根据是否有库链接使用不同的方式
    let contractFactory;
    if (options.libraries && Object.keys(options.libraries).length > 0) {
      // 有库链接时，传递 libraries 对象
      contractFactory = await ethers.getContractFactory(contractName, {
        libraries: options.libraries,
      });
    } else {
      // 无库链接时，正常创建
      contractFactory = await ethers.getContractFactory(contractName, signer);
    }

    // 提前获取 ABI
    const abiJson = contractFactory.interface.formatJson();
    const abi: ABIItem[] = JSON.parse(abiJson);

    console.log(`⏳ 正在部署合约...`);
    const deployedContract = (await contractFactory.deploy(
      ...args
    )) as unknown as T;

    const deploymentTx = deployedContract.deploymentTransaction();

    console.log(`⏳ 等待合约部署确认...`);
    await deployedContract.waitForDeployment();
    const contractAddress = await deployedContract.getAddress();

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

    // 获取版本号
    let version = "1";
    try {
      if (typeof (deployedContract as any).getVersion === "function") {
        const contractVersion = await (deployedContract as any).getVersion();
        version = contractVersion.toString();
      }
    } catch (error) {
      // 普通合约可能没有版本号，使用默认值
    }

    const versionInfo: ContractVersionInfo = {
      address: contractAddress,
      transactionHash,
      blockNumber,
      gasUsed,
      version,
      deployer: deployerAddress,
      deployedAt: new Date().toISOString(),
      isProxy: false,
      isActive: true,
      abi,
      ...(options.libraries &&
        Object.keys(options.libraries).length > 0 && {
          libraries: options.libraries,
        }),
    };

    console.log(`✅ 普通合约 ${contractName} 部署成功:`);
    console.log(`   - 合约地址: ${contractAddress}`);
    console.log(`   - 交易哈希: ${transactionHash}`);
    console.log(`   - 区块号: ${blockNumber}`);
    console.log(`   - Gas 使用: ${gasUsed}`);
    console.log(`   - 版本: ${version}`);

    // 显示链接的库信息
    if (options.libraries && Object.keys(options.libraries).length > 0) {
      console.log(`   - 链接的库: ${Object.keys(options.libraries).length} 个`);
      for (const [libPath, libAddr] of Object.entries(options.libraries)) {
        console.log(`     • ${libPath}: ${libAddr}`);
      }
    }

    // 获取并显示合约大小
    try {
      const contractCode = await ethers.provider.getCode(contractAddress);
      const sizeBytes = (contractCode.length - 2) / 2; // 减去0x前缀，每2个字符代表1字节
      const sizeKB = (sizeBytes / 1024).toFixed(2);
      console.log(
        `   - 合约大小: ${sizeKB} KB (${sizeBytes.toLocaleString()} 字节)`
      );
    } catch (error) {
      console.warn("⚠️  无法获取合约大小:", error);
    }

    // 自动保存部署信息
    await this.saveContractDeployment(
      contractName,
      versionInfo,
      false,
      options.tokenMetadata,
      options.libraries // 传递库信息
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

    // 处理库链接
    if (options.libraries && Object.keys(options.libraries).length > 0) {
      console.log(`🔗 链接库:`);
      for (const [libName, libAddress] of Object.entries(options.libraries)) {
        console.log(`   - ${libName}: ${libAddress}`);
      }
    }

    // 创建合约工厂，根据是否有库链接使用不同的方式
    let contractFactory;
    if (options.libraries && Object.keys(options.libraries).length > 0) {
      // 有库链接时，传递 libraries 对象
      contractFactory = await ethers.getContractFactory(newContractName, {
        libraries: options.libraries,
      });
    } else {
      // 无库链接时，正常创建
      contractFactory = await ethers.getContractFactory(
        newContractName,
        signer
      );
    }

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
    )) as unknown as T;

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
      ...(options.libraries &&
        Object.keys(options.libraries).length > 0 && {
          libraries: options.libraries,
        }),
    };

    console.log(`✅ ${newContractName} 合约升级成功:`);
    console.log(`   - 代理地址: ${proxyAddress}`);
    console.log(`   - 新实现地址: ${newImplementation}`);
    console.log(`   - 版本: ${version}`);
    console.log(`   - 交易哈希: ${transactionHash}`);

    // 显示链接的库信息
    if (options.libraries && Object.keys(options.libraries).length > 0) {
      console.log(`   - 链接的库: ${Object.keys(options.libraries).length} 个`);
      for (const [libPath, libAddr] of Object.entries(options.libraries)) {
        console.log(`     • ${libPath}: ${libAddr}`);
      }
    }

    // 获取并显示新实现的合约大小
    try {
      const contractCode = await ethers.provider.getCode(newImplementation);
      const sizeBytes = (contractCode.length - 2) / 2; // 减去0x前缀，每2个字符代表1字节
      const sizeKB = (sizeBytes / 1024).toFixed(2);
      console.log(
        `   - 新实现合约大小: ${sizeKB} KB (${sizeBytes.toLocaleString()} 字节)`
      );
    } catch (error) {
      console.warn("⚠️  无法获取合约大小:", error);
    }

    // 自动保存升级历史
    await this.saveContractDeployment(
      newContractName,
      versionInfo,
      true,
      undefined, // tokenMetadata
      options.libraries // 传递库信息
    );

    return {
      contract: upgradedContract,
      versionInfo,
      newImplementation,
    };
  }

  /**
   * 验证智能合约
   * @param contractAddress 合约地址
   * @param constructorArgs 构造函数参数
   * @param contractName 合约名称（可选），当未提供 contractPath 时用于自动获取路径
   * @param delayToVerify 等待时间（秒），确保区块浏览器已索引合约
   */
  async verifyContract(
    contractAddress: string,
    constructorArgs: any[] = [],
    contractName?: string,
    delayToVerify: number = 0
  ): Promise<boolean> {
    // 本地网络不需要验证
    if (network.name === "hardhat" || network.name === "localhost") {
      console.log("ℹ️  本地网络跳过验证");
      return false;
    }

    console.log("\n🔍 开始验证合约...");
    console.log("📍 合约地址:", contractAddress);

    // 如果未提供 contractPath 但提供了 contractName，自动获取路径
    let finalContractPath = "";
    if (!finalContractPath && contractName) {
      console.log(`📦 自动获取合约路径: ${contractName}`);
      finalContractPath = await this.getContractSourcePath(contractName);
      console.log(`   - 路径: ${finalContractPath}`);
    }

    // 等待几秒，确保 Etherscan 已索引合约 如果是自动验证需要
    if (delayToVerify > 0) {
      console.log(`⏳ 等待 ${delayToVerify} 秒，确保区块浏览器已索引合约...`);
      await new Promise((resolve) => setTimeout(resolve, delayToVerify * 1000));
    }

    try {
      // 使用 Promise 包装，验证成功后立即返回，不等待插件完全结束
      await Promise.race([
        run("verify:verify", {
          address: contractAddress,
          constructorArguments: constructorArgs,
          contract: finalContractPath,
        }),
        // 备用：如果 run 挂起，30秒后自动返回
        new Promise((resolve) => setTimeout(resolve, 30000)),
      ]);

      console.log("✅ 合约验证成功！");
      console.log(
        `🔗 查看合约: https://${network.name}.etherscan.io/address/${contractAddress}#code`
      );
      return true;
    } catch (error: any) {
      const errorMessage = error?.message?.toLowerCase() || "";

      // 检查是否为"已验证"错误（支持多种表述）
      if (
        errorMessage.includes("already verified") ||
        errorMessage.includes("has already been verified") ||
        errorMessage.includes("already been verified") ||
        errorMessage.includes("contract source code already verified")
      ) {
        console.log("ℹ️  合约已经验证过了");
        console.log(
          `🔗 查看合约: https://${network.name}.etherscan.io/address/${contractAddress}#code`
        );
      } else {
        console.error("❌ 验证失败:", error.message);
        console.log("💡 你可以稍后手动验证:");
        console.log(
          `npx hardhat verify --network ${network.name} ${contractAddress}`
        );
      }
      return false;
    }

    console.log("✅ 验证流程完成\n");
    return true;
  }
}
