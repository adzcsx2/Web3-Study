import { ethers } from "hardhat";

// 验证合约是否有代码--用于测试合约部署是否成功
export async function verifyContractCode(address: string): Promise<boolean> {
  const code = await ethers.provider.getCode(address);
  if (code === "0x") {
    console.log(`✅ 合约在地址 ${address} 上没有代码`);
    return false;
  }
  console.log(`✅ 合约在地址 ${address} 上有代码`);
  return true;
}
