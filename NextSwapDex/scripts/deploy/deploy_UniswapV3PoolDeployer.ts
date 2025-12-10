import { ethers } from "hardhat";
import { DeployHelper } from "../utils/DeployHelper";
import { UniswapV3Factory, UniswapV3Pool } from "../../typechain-types";
import fs from "fs";
import path from "path";

async function main() {
  const deployHelper = new DeployHelper();
  const [signer] = await ethers.getSigners();
  const ownerAddress = await signer.getAddress();
  console.log("使用账户:", ownerAddress);

  console.log("\n📝 说明: UniswapV3PoolDeployer 的 deploy 方法是 internal 的");
  console.log("   只能在 UniswapV3Factory 合约中通过 createPool 调用");
  console.log("   下面将演示如何通过 Factory 创建池来间接调用 deploy 方法\n");

  // 读取已部署的 Factory 合约地址
  const deploymentPath = path.join(
    __dirname,
    "../deployments/hardhat-deployment.json"
  );
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ 未找到部署记录，请先部署 UniswapV3Factory");
    return;
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  const factoryAddress = deployment.contracts?.UniswapV3Factory?.proxyAddress;

  if (!factoryAddress) {
    console.error("❌ 未找到 UniswapV3Factory 地址");
    return;
  }

  console.log("✅ 找到已部署的 UniswapV3Factory:", factoryAddress);

  // 连接到 Factory 合约
  const factory = await ethers.getContractAt(
    "UniswapV3Factory",
    factoryAddress
  );

  // 部署两个测试代币（如果没有的话）
  console.log("\n📦 部署测试代币...");

  const { contract: token0 } = await deployHelper.deployContract(
    "NextSwapToken",
    ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"]
  );

  const { contract: token1 } = await deployHelper.deployContract(
    "NextSwapToken",
    ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"]
  );

  console.log("✅ Token0 地址:", await token0.getAddress());
  console.log("✅ Token1 地址:", await token1.getAddress());

  // 通过 Factory 的 createPool 方法创建池
  // 这会内部调用 UniswapV3PoolDeployer.deploy 方法
  const fee = 3000; // 0.3% 手续费
  console.log(`\n🔨 通过 Factory 创建池（手续费: ${fee / 10000}%）...`);
  console.log("   这将触发 UniswapV3PoolDeployer.deploy() 的调用");

  const tx = await factory.createPool(
    await token0.getAddress(),
    await token1.getAddress(),
    fee
  );

  const receipt = await tx.wait();
  console.log("✅ 交易成功！Gas 使用:", receipt?.gasUsed.toString());

  // 获取创建的池地址
  const token0Addr = await token0.getAddress();
  const token1Addr = await token1.getAddress();
  const [sortedToken0, sortedToken1] =
    token0Addr < token1Addr
      ? [token0Addr, token1Addr]
      : [token1Addr, token0Addr];

  const poolAddress = await factory.getPool(sortedToken0, sortedToken1, fee);
  console.log("\n🎉 池创建成功！");
  console.log("📍 池地址:", poolAddress);
  console.log("\n💡 deploy 方法的调用过程:");
  console.log("   1. Factory.createPool() 被调用");
  console.log(
    "   2. 内部调用 deploy(factory, token0, token1, fee, tickSpacing)"
  );
  console.log("   3. deploy 方法设置临时参数");
  console.log("   4. 使用 CREATE2 部署 UniswapV3Pool");
  console.log("   5. 新池从 deployer 读取参数并初始化");
  console.log("   6. deploy 方法清除临时参数");

  // 验证池合约
  const pool = await ethers.getContractAt("UniswapV3Pool", poolAddress);
  const poolFactory = await pool.factory();
  const poolToken0 = await pool.token0();
  const poolToken1 = await pool.token1();
  const poolFee = await pool.fee();

  console.log("\n🔍 池合约信息验证:");
  console.log("   Factory:", poolFactory);
  console.log("   Token0:", poolToken0);
  console.log("   Token1:", poolToken1);
  console.log("   Fee:", poolFee);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
