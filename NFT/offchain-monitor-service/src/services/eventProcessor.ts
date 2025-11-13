import { NFTEvent, EventHandler, ChainEvent } from '../types';
import { SupabaseService } from './supabase';
import { logger } from '../utils/logger';

export class EventProcessor implements EventHandler {
  private supabaseService: SupabaseService;

  constructor(supabaseService: SupabaseService) {
    this.supabaseService = supabaseService;
  }

  /**
   * 处理NFT事件
   */
  async handle(event: NFTEvent): Promise<void> {
    try {
      logger.info(`Processing ${event.eventType} event`, {
        transactionHash: event.transactionHash,
        logIndex: event.logIndex
      });

      // 检查事件是否已经处理
      const exists = await this.supabaseService.eventExists(
        event.transactionHash,
        event.logIndex
      );

      if (exists) {
        logger.debug('Event already processed, skipping', {
          transactionHash: event.transactionHash,
          logIndex: event.logIndex
        });
        return;
      }

      // 转换事件数据为数据库格式
      const chainEvent = await this.transformEvent(event);

      // 插入事件到数据库
      await this.supabaseService.insertEvent(chainEvent);

      logger.info('Event processed successfully', {
        eventType: event.eventType,
        transactionHash: event.transactionHash,
        logIndex: event.logIndex
      });
    } catch (error) {
      logger.error('Failed to process event', {
        event,
        error: error instanceof Error ? error.message : String(error)
      });
      // 不抛出错误，避免影响其他事件的处理
    }
  }

  /**
   * 将NFT事件转换为ChainEvent格式
   */
  private async transformEvent(nftEvent: NFTEvent): Promise<Omit<ChainEvent, 'id' | 'created_at' | 'updated_at'>> {
    const baseEvent: Omit<ChainEvent, 'id' | 'created_at' | 'updated_at'> = {
      tx_hash: nftEvent.transactionHash,
      log_index: nftEvent.logIndex,
      block_number: nftEvent.blockNumber,
      block_hash: nftEvent.blockHash,
      status: 'pending' // 初始状态为pending，需要确认
    };

    // 根据事件类型设置不同的字段
    switch (nftEvent.eventType) {
      case 'Transfer':
        return {
          ...baseEvent,
          from_address: nftEvent.from,
          to_address: nftEvent.to,
          token_id: nftEvent.tokenId
        };

      case 'Approval':
        return {
          ...baseEvent,
          from_address: nftEvent.owner,
          to_address: nftEvent.approved,
          token_id: nftEvent.tokenId
        };

      case 'ApprovalForAll':
        return {
          ...baseEvent,
          from_address: nftEvent.owner,
          to_address: nftEvent.operator
        };

      case 'Paused':
      case 'Unpaused':
        return {
          ...baseEvent,
          to_address: nftEvent.account
        };

      default:
        return baseEvent;
    }
  }

  /**
   * 批量处理事件
   */
  async handleBatch(events: NFTEvent[]): Promise<void> {
    logger.info(`Processing batch of ${events.length} events`);

    const results = await Promise.allSettled(
      events.map(event => this.handle(event))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    logger.info('Batch processing completed', {
      total: events.length,
      successful,
      failed
    });

    if (failed > 0) {
      const rejectedResults = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
      rejectedResults.forEach(result => {
        logger.error('Batch processing error', { error: result.reason });
      });
    }
  }
}