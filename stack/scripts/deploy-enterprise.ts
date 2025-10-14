import hre from "hardhat";
import { formatEther } from "viem";

async function main() {
  console.log("🚀 Starting MetaNodeToken Enterprise Deployment...\n");

  try {
    // Get the public client and wallet client
    const publicClient = await hre.viem.getPublicClient();
    const [deployer] = await hre.viem.getWalletClients();
    
    console.log("📋 Deploying contracts with account:", deployer.account.address);
    
    // Get balance
    const balance = await publicClient.getBalance({ 
      address: deployer.account.address 
    });
    console.log("💰 Account balance:", formatEther(balance), "ETH\n");

    // Deploy the contract directly (simplified deployment)
    console.log("📦 Deploying MetaNodeToken...");
    const token = await hre.viem.deployContract("MetaNodeToken");
    
    console.log("✅ MetaNodeToken deployed to:", token.address);

    // Initialize the contract
    console.log("🔄 Initializing contract...");
    const initTx = await token.write.initialize();
    await publicClient.waitForTransactionReceipt({ hash: initTx });
    
    // Verify deployment
    console.log("\n🔍 Verifying deployment...");
    const name = await token.read.name();
    const symbol = await token.read.symbol();
    const decimals = await token.read.decimals();
    const totalSupply = await token.read.totalSupply();
    const maxSupply = await token.read.MAX_SUPPLY();
    const version = await token.read.CONTRACT_VERSION();

    console.log("📊 Contract Information:");
    console.log("   Name:", name);
    console.log("   Symbol:", symbol);
    console.log("   Decimals:", decimals);
    console.log("   Total Supply:", formatEther(totalSupply), symbol);
    console.log("   Max Supply:", formatEther(maxSupply), symbol);
    console.log("   Version:", version.toString());

    // Check roles
    const DEFAULT_ADMIN_ROLE = await token.read.DEFAULT_ADMIN_ROLE();
    const MINTER_ROLE = await token.read.MINTER_ROLE();
    const PAUSER_ROLE = await token.read.PAUSER_ROLE();
    const UPGRADER_ROLE = await token.read.UPGRADER_ROLE();

    console.log("\n🔐 Role Configuration:");
    console.log("   Admin Role:", await token.read.hasRole([DEFAULT_ADMIN_ROLE, deployer.account.address]));
    console.log("   Minter Role:", await token.read.hasRole([MINTER_ROLE, deployer.account.address]));
    console.log("   Pauser Role:", await token.read.hasRole([PAUSER_ROLE, deployer.account.address]));
    console.log("   Upgrader Role:", await token.read.hasRole([UPGRADER_ROLE, deployer.account.address]));

    // Security checks
    console.log("\n🛡️ Security Status:");
    console.log("   Contract Paused:", await token.read.paused());
    console.log("   Remaining Supply:", formatEther(await token.read.remainingSupply()), symbol);
    console.log("   Burned Supply:", formatEther(await token.read.getBurnedSupply()), symbol);

    // Get network info
    const chainId = await publicClient.getChainId();
    
    // Save deployment info
    const deploymentInfo = {
      network: publicClient.chain?.name || "unknown",
      chainId: chainId,
      contractAddress: token.address,
      deployer: deployer.account.address,
      timestamp: new Date().toISOString(),
      contractInfo: {
        name: name,
        symbol: symbol,
        decimals: decimals,
        totalSupply: totalSupply.toString(),
        maxSupply: maxSupply.toString(),
        version: version.toString()
      },
      roles: {
        DEFAULT_ADMIN_ROLE: DEFAULT_ADMIN_ROLE,
        MINTER_ROLE: MINTER_ROLE,
        PAUSER_ROLE: PAUSER_ROLE,
        UPGRADER_ROLE: UPGRADER_ROLE
      }
    };

    console.log("\n📝 Deployment Summary:");
    console.log(JSON.stringify(deploymentInfo, null, 2));

    console.log("\n🎉 Deployment completed successfully!");
    console.log("🔗 Contract Address:", token.address);

    return {
      address: token.address,
      contract: token
    };

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }
}

// Export the main function for testing
export default main;

// Execute if run directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}