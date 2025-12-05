import dotenv from 'dotenv';
import { ListenerConfig } from '../types';

dotenv.config();

export const config: ListenerConfig = {
  infuraProjectId: process.env.INFURA_PROJECT_ID || '',
  infuraWsProjectId: process.env.INFURA_WS_PROJECT_ID || process.env.INFURA_PROJECT_ID || '',
  nftContractAddress: process.env.NFT_CONTRACT_ADDRESS || '',
  networkName: process.env.NETWORK_NAME || 'sepolia',
  networkChainId: parseInt(process.env.NETWORK_CHAIN_ID || '11155111'),
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  logLevel: process.env.LOG_LEVEL || 'info'
};

// 验证必需的环境变量
export function validateConfig(): void {
  const requiredFields = [
    'infuraProjectId',
    'nftContractAddress',
    'supabaseUrl',
    'supabaseServiceRoleKey'
  ];

  const missing = requiredFields.filter(field => !config[field as keyof ListenerConfig]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// 获取RPC端点
export function getRpcUrl(): string {
  return `https://${config.networkName}.infura.io/v3/${config.infuraProjectId}`;
}

// 获取WebSocket端点
export function getWsUrl(): string {
  return `wss://${config.networkName}.infura.io/ws/v3/${config.infuraWsProjectId}`;
}