import { ethers } from "hardhat";
import { DeployHelper } from "../utils/DeployHelper";
import { UniswapV3Factory, UniswapV3Pool } from "../../typechain-types";

async function main() {
  const deployHelper = new DeployHelper();
  const [signer] = await ethers.getSigners();
  const ownerAddress = await signer.getAddress();
  console.log("Deploying contracts with the account:", ownerAddress);

  const WETH9 = "0x816ebb59Fc2De6211B346E793A307031dD0d956c";
  const DAI = "0x7DF8F27851B4Ac3a62f486138E2b8D5cf64a0e33";
  const USDC = "0xa6a837cDAC2E15a0Ece92a0bCEA398Ba25E07E2F";
  const USDT = "0x627856ED0296954844237E4B56210F0692D8EA48";
  const TBTC = "0xA11bbb41A379F43AB6405DbF01732Fda63F32FD6";
  const WBTC = "0x58Ce2D568392D90622E55B122F4fB5E95494a663";

  // 部署合约（自动保存）

  await verifyTokens([
    { address: DAI, args: [], name: "DAI" },
    { address: TBTC, args: [], name: "TBTC" },
    { address: USDC, args: [], name: "USDC" },
    { address: USDT, args: [], name: "USDT" },
    { address: WBTC, args: [], name: "WBTC" },
    { address: WETH9, args: [], name: "WETH9" },
  ]);
}

async function verifyTokens(
  tokens: Array<{ address: string; args: any[]; name: string }>
) {
  const deployHelper = new DeployHelper();

  for (const token of tokens) {
    const { address, args, name } = token;
    console.log(`🚀 正在验证 ${name} (${address})...`);

    // ✅ 关键：指定合约路径，避免字节码匹配多个合约
    const contractPath = `contracts/contract/mock/${name}.sol:${name}`;

    await deployHelper.verifyContract(address, args, contractPath);
    console.log(`✅ ${name} 验证完成！args: ${JSON.stringify(args)}`);
    console.log("---");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
