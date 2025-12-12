import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🔍 检查 Pool Init Code Hash...\n");

  // 获取 Pool 合约的字节码
  const poolFactory = await ethers.getContractFactory("NextswapV3Pool");
  const poolBytecode = poolFactory.bytecode;

  // 计算 keccak256
  const poolInitCodeHash = ethers.keccak256(poolBytecode);

  console.log("📝 NextswapV3Pool 字节码哈希:");
  console.log("   ", poolInitCodeHash);
  console.log();

  // PoolAddress.sol 文件路径
  const poolAddressPath = path.join(
    __dirname,
    "../contracts/contract/swap/periphery/libraries/PoolAddress.sol"
  );

  // 读取 PoolAddress.sol 文件内容
  let poolAddressContent = fs.readFileSync(poolAddressPath, "utf8");

  // 使用正则表达式匹配当前的哈希值
  const hashRegex =
    /bytes32 internal constant POOL_INIT_CODE_HASH\s*=\s*0x[0-9a-fA-F]{64};/;
  const match = poolAddressContent.match(hashRegex);

  if (!match) {
    console.log("❌ 无法在 PoolAddress.sol 中找到 POOL_INIT_CODE_HASH 定义");
    process.exit(1);
  }

  const currentHashLine = match[0];
  const currentHashMatch = currentHashLine.match(/0x[0-9a-fA-F]{64}/);
  const currentHash = currentHashMatch ? currentHashMatch[0] : null;

  console.log("📋 PoolAddress.sol 中的当前值:");
  console.log("   ", currentHash);
  console.log();

  // 比较
  if (poolInitCodeHash.toLowerCase() === currentHash?.toLowerCase()) {
    console.log("✅ 匹配！POOL_INIT_CODE_HASH 正确，无需更新");
  } else {
    console.log("❌ 不匹配！正在自动更新 PoolAddress.sol...");
    console.log();

    // 替换哈希值
    const newHashLine = `bytes32 internal constant POOL_INIT_CODE_HASH =\n        ${poolInitCodeHash};`;
    poolAddressContent = poolAddressContent.replace(hashRegex, newHashLine);

    // 写回文件
    fs.writeFileSync(poolAddressPath, poolAddressContent, "utf8");

    console.log("✅ 已成功更新 PoolAddress.sol");
    console.log("📍 文件路径:", poolAddressPath);
    console.log("🔄 新哈希值:", poolInitCodeHash);
    console.log();
    console.log("⚠️  重要提示:");
    console.log("   1. 请重新编译合约: npx hardhat compile");
    console.log("   2. 重新部署以下合约:");
    console.log("      - NonfungiblePositionManager");
    console.log("      - SwapRouter");
    console.log("      - QuoterV2");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
