/**
 * 测试用的代币地址列表
 * 用于在不同链上进行代币搜索测试
 */

export interface TestToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  chainName: string;
  description?: string;
}

/**
 * 测试代币列表
 * 这些代币可以在对应的测试网络上找到
 */
export const TEST_TOKENS: TestToken[] = [
  // Sepolia 测试网
  {
    address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    chainId: 11155111,
    chainName: "Sepolia",
    description: "Circle在Sepolia测试网上的USDC"
  },
  {
    address: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
    chainId: 11155111,
    chainName: "Sepolia",
    description: "Sepolia测试网上的WETH"
  },

  // 以太坊主网 (仅作参考，测试时可能无法使用)
  {
    address: "0xA0b86a33E6412b0c8e0D0D0D9B3c3c0C0C0c0C0c",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    chainId: 1,
    chainName: "Ethereum Mainnet",
    description: "Circle发行的USDC稳定币"
  },
  {
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    chainId: 1,
    chainName: "Ethereum Mainnet",
    description: "Tether发行的USDT稳定币"
  },
  {
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
    chainId: 1,
    chainName: "Ethereum Mainnet",
    description: "以太坊的封装版本"
  },

  // 本地测试网 (Ganache默认chainId: 1337)
  {
    address: "0xC32609C91d6B6b51D48f2611308FEf121B02041f",
    symbol: "TEST",
    name: "Test Token",
    decimals: 18,
    chainId: 1337,
    chainName: "Localhost",
    description: "本地测试网上的测试代币"
  },
  {
    address: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    symbol: "MOCK",
    name: "Mock Token",
    decimals: 18,
    chainId: 1337,
    chainName: "Localhost",
    description: "本地测试网上的Mock代币"
  },
  {
    address: "0x997Ac6430F2Ef2a862214CD52A339034Ea9b299C",
    symbol: "TOKEN",
    name: "Test Token 2",
    decimals: 18,
    chainId: 1337,
    chainName: "Localhost",
    description: "本地测试网上的另一个测试代币"
  },

  // Polygon 主网
  {
    address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    chainId: 137,
    chainName: "Polygon",
    description: "Polygon上的USDC"
  },
  {
    address: "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0",
    symbol: "MATIC",
    name: "Polygon",
    decimals: 18,
    chainId: 137,
    chainName: "Polygon",
    description: "Polygon原生代币"
  },

  // Arbitrum 主网
  {
    address: "0xA0b86a33E6412b0c8e0D0D0D9B3c3c0C0C0c0C0c",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    chainId: 42161,
    chainName: "Arbitrum",
    description: "Arbitrum上的USDC"
  },
  {
    address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
    chainId: 42161,
    chainName: "Arbitrum",
    description: "Arbitrum上的WETH"
  }
];

/**
 * 根据链ID获取测试代币
 */
export const getTestTokensByChain = (chainId: number): TestToken[] => {
  return TEST_TOKENS.filter(token => token.chainId === chainId);
};

/**
 * 获取所有支持的链ID
 */
export const getSupportedChainIds = (): number[] => {
  return [...new Set(TEST_TOKENS.map(token => token.chainId))];
};

/**
 * 根据链ID获取链名称
 */
export const getChainNameById = (chainId: number): string => {
  const token = TEST_TOKENS.find(t => t.chainId === chainId);
  return token?.chainName || `Chain ID: ${chainId}`;
};