import { ethers } from "hardhat";
import path from "path";
import fs from "fs";

import { expect } from "chai";

describe("PoolAddress里的POOL_INIT_CODE_HASH应该为本地编译的POOL_INIT_CODE_HASH", function () {
  let pool_init_code_hash_in_compile: string;
  let pool_init_code_hash_in_file: string | null;

  it("检查当前编译Pool的POOL_INIT_CODE_HASH", async function () {
    console.log("🔍 检查 Pool Init Code Hash...\n");
    // 获取 Pool 合约的字节码
    const poolFactory = await ethers.getContractFactory("NextswapV3Pool");
    const poolBytecode = poolFactory.bytecode;
    console.log("📝 NextswapV3Pool 字节码哈希:");

    // 计算 keccak256
    pool_init_code_hash_in_compile = ethers.keccak256(poolBytecode);
    console.log("   ", pool_init_code_hash_in_compile);
    expect(pool_init_code_hash_in_compile).to.be.has.length(66);
  });
  it("检查PoolAddress的POOL_INIT_CODE_HASH", async function () {
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
    pool_init_code_hash_in_file = currentHashMatch ? currentHashMatch[0] : null;

    console.log("📋 PoolAddress.sol 中的当前值:");
    console.log("   ", pool_init_code_hash_in_file);
    console.log();
  });
  it("比较两者是否相等", async function () {
    console.log("🔍 比较两者是否相等...");
    expect(pool_init_code_hash_in_compile.toLowerCase()).to.equal(
      pool_init_code_hash_in_file?.toLowerCase()
    );
  });
});
