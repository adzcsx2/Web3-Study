import { Log } from "ethers";

export interface ChainEvent {
  id?: string;
  tx_hash: string;
  log_index: number;
  from_address?: string;
  to_address?: string;
  token_id?: string;
  block_number: number;
  block_hash: string;
  status: "pending" | "confirmed" | "reverted";
  confirmed_at_block?: number;
  confirmed_blocks_num?: number;
  reverted_at_block?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ContractEvent extends Log {
  eventName: string;
  args: any;
}

export interface NFTEvent {
  eventType: "Transfer" | "Approval" | "ApprovalForAll" | "Paused" | "Unpaused";
  transactionHash: string;
  blockNumber: number;
  blockHash: string;
  logIndex: number;
  from?: string;
  to?: string;
  tokenId?: string;
  approved?: string;
  owner?: string;
  operator?: string;
  account?: string;
  timestamp: Date;
}

export interface ListenerConfig {
  infuraProjectId: string;
  infuraWsProjectId?: string;
  nftContractAddress: string;
  networkName: string;
  networkChainId: number;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  logLevel: string;
}

export interface EventHandler {
  handle(event: NFTEvent): Promise<void>;
}
