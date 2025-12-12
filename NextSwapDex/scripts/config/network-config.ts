/**
 * 不同网络的代币地址配置
 * 用于部署 NonfungibleTokenPositionDescriptor 合约
 */
import local_deployment from "../../deployments/localhost-deployment.json";

export interface NetworkTokenAddresses {
  WETH9: string;
  DAI: string;
  USDC: string;
  USDT: string;
  TBTC: string;
  WBTC: string;
  nativeCurrencyLabel: string;
}

export interface NetworkConfig {
  [chainId: number]: NetworkTokenAddresses;
}

// 零地址，用于测试网或没有对应代币的网络
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const networkConfig: NetworkConfig = {
  // 以太坊主网 (chainId: 1)
  1: {
    WETH9: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    TBTC: "0x8dAEBADE922dF735c38C80C7eBD708Af50815fAa",
    WBTC: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    nativeCurrencyLabel: "ETH",
  },

  // Sepolia 测试网 (chainId: 11155111)
  11155111: {
    WETH9: "0x816ebb59Fc2De6211B346E793A307031dD0d956c", // Sepolia WETH9
    DAI: "0x7DF8F27851B4Ac3a62f486138E2b8D5cf64a0e33", // Sepolia DAI
    USDC: "0xa6a837cDAC2E15a0Ece92a0bCEA398Ba25E07E2F", // Sepolia USDC
    USDT: "0x627856ED0296954844237E4B56210F0692D8EA48", // Sepolia USDT
    TBTC: "0xA11bbb41A379F43AB6405DbF01732Fda63F32FD6", // Sepolia TBTC
    WBTC: "0x58Ce2D568392D90622E55B122F4fB5E95494a663", // Sepolia WBTC
    nativeCurrencyLabel: "ETH",
  },

  // Goerli 测试网 (chainId: 5) - 已弃用但保留配置
  5: {
    WETH9: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
    DAI: "0x11fE4B6AE13d2a6055C8D9cF65c55bac32B5d844",
    USDC: "0x07865c6E87B9F70255377e024ace6630C1Eaa37F",
    USDT: "0x509Ee0d083DdF8AC028f2a56731412edD63223B9",
    TBTC: ZERO_ADDRESS,
    WBTC: "0xC04B0d3107736C32e19F1c62b2aF67BE61d63a05",
    nativeCurrencyLabel: "ETH",
  },

  // Polygon 主网 (chainId: 137)
  137: {
    WETH9: "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619", // WETH on Polygon
    DAI: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
    USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    TBTC: ZERO_ADDRESS,
    WBTC: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6",
    nativeCurrencyLabel: "MATIC",
  },

  // Mumbai 测试网 (chainId: 80001)
  80001: {
    WETH9: "0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa",
    DAI: ZERO_ADDRESS,
    USDC: ZERO_ADDRESS,
    USDT: ZERO_ADDRESS,
    TBTC: ZERO_ADDRESS,
    WBTC: ZERO_ADDRESS,
    nativeCurrencyLabel: "MATIC",
  },

  // Arbitrum One 主网 (chainId: 42161)
  42161: {
    WETH9: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    USDC: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    TBTC: ZERO_ADDRESS,
    WBTC: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
    nativeCurrencyLabel: "ETH",
  },

  // Optimism 主网 (chainId: 10)
  10: {
    WETH9: "0x4200000000000000000000000000000000000006",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    USDC: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    TBTC: ZERO_ADDRESS,
    WBTC: "0x68f180fcCe6836688e9084f035309E29Bf0A2095",
    nativeCurrencyLabel: "ETH",
  },

  // Base 主网 (chainId: 8453)
  8453: {
    WETH9: "0x4200000000000000000000000000000000000006",
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    USDT: ZERO_ADDRESS,
    TBTC: ZERO_ADDRESS,
    WBTC: ZERO_ADDRESS,
    nativeCurrencyLabel: "ETH",
  },

  // Hardhat 本地网络 (chainId: 31337)// 需要在本地部署
  31337: {
    WETH9: local_deployment
      ? local_deployment.contracts.WETH9.proxyAddress
      : ZERO_ADDRESS,
    DAI: local_deployment
      ? local_deployment.contracts.DAI.proxyAddress
      : ZERO_ADDRESS,
    USDC: local_deployment
      ? local_deployment.contracts.USDC.proxyAddress
      : ZERO_ADDRESS,
    USDT: local_deployment
      ? local_deployment.contracts.USDT.proxyAddress
      : ZERO_ADDRESS,
    TBTC: local_deployment
      ? local_deployment.contracts.TBTC.proxyAddress
      : ZERO_ADDRESS,
    WBTC: local_deployment
      ? local_deployment.contracts.WBTC.proxyAddress
      : ZERO_ADDRESS,
    nativeCurrencyLabel: "ETH",
  },
};

/**
 * 获取当前网络的代币地址配置
 * @param chainId 链 ID
 * @returns 代币地址配置
 */
export function getNetworkConfig(chainId: number): NetworkTokenAddresses {
  const config = networkConfig[chainId];

  if (!config) {
    console.warn(`⚠️  未找到 chainId ${chainId} 的配置，使用零地址作为默认值`);
    return {
      WETH9: ZERO_ADDRESS,
      DAI: ZERO_ADDRESS,
      USDC: ZERO_ADDRESS,
      USDT: ZERO_ADDRESS,
      TBTC: ZERO_ADDRESS,
      WBTC: ZERO_ADDRESS,
      nativeCurrencyLabel: "ETH",
    };
  }

  return config;
}

/**
 * 将字符串转换为 bytes32 格式
 * @param str 要转换的字符串
 * @returns bytes32 格式的字符串
 */
export function stringToBytes32(str: string): string {
  // 将字符串转换为十六进制
  const hex = Buffer.from(str, "utf8").toString("hex");
  // 填充到 32 字节 (64 个十六进制字符)
  const padded = hex.padEnd(64, "0");
  return "0x" + padded;
}

/**
 * 获取网络名称
 * @param chainId 链 ID
 * @returns 网络名称
 */
export function getNetworkName(chainId: number): string {
  const networkNames: { [key: number]: string } = {
    1: "Ethereum Mainnet",
    5: "Goerli Testnet",
    11155111: "Sepolia Testnet",
    137: "Polygon Mainnet",
    80001: "Mumbai Testnet",
    42161: "Arbitrum One",
    10: "Optimism",
    8453: "Base",
    31337: "Hardhat Local",
  };

  return networkNames[chainId] || `Unknown Network (${chainId})`;
}
