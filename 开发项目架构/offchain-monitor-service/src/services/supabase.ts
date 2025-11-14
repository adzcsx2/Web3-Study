import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ChainEvent } from "../types";
import { config } from "../config";
import { logger } from "../utils/logger";

export class SupabaseService {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(
      config.supabaseUrl,
      config.supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }

  /**
   * 插入新的区块链事件
   */
  async insertEvent(
    event: Omit<ChainEvent, "id" | "created_at" | "updated_at">
  ): Promise<string | null> {
    try {
      const { data, error } = await this.client
        .from("chain_events")
        .insert(event)
        .select("id")
        .single();

      if (error) {
        // 处理唯一约束冲突（重复事件）
        if (error.code === "23505") {
          logger.warn("Event already exists", {
            tx_hash: event.tx_hash,
            log_index: event.log_index,
          });
          return null;
        }
        throw error;
      }

      logger.info("Event inserted successfully", { eventId: data.id });
      return data.id;
    } catch (error) {
      logger.error("Failed to insert event", { event, error });
      throw error;
    }
  }

  /**
   * 更新事件状态为已确认
   */
  async confirmEvent(
    txHash: string,
    logIndex: number,
    confirmedAtBlock: number,
    confirmedBlocksNum: number
  ): Promise<void> {
    try {
      const { error } = await this.client
        .from("chain_events")
        .update({
          status: "confirmed",
          confirmed_at_block: confirmedAtBlock,
          confirmed_blocks_num: confirmedBlocksNum,
          updated_at: new Date().toISOString(),
        })
        .eq("tx_hash", txHash)
        .eq("log_index", logIndex);

      if (error) {
        throw error;
      }

      logger.info("Event confirmed successfully", {
        tx_hash: txHash,
        log_index: logIndex,
        confirmed_at_block: confirmedAtBlock,
        confirmed_blocks_num: confirmedBlocksNum,
      });
    } catch (error) {
      logger.error("Failed to confirm event", {
        txHash,
        logIndex,
        confirmedAtBlock,
        error,
      });
      throw error;
    }
  }

  /**
   * 更新事件状态为已回滚
   */
  async revertEvent(
    txHash: string,
    logIndex: number,
    revertedAtBlock: number
  ): Promise<void> {
    try {
      const { error } = await this.client
        .from("chain_events")
        .update({
          status: "reverted",
          reverted_at_block: revertedAtBlock,
          updated_at: new Date().toISOString(),
        })
        .eq("tx_hash", txHash)
        .eq("log_index", logIndex);

      if (error) {
        throw error;
      }

      logger.info("Event reverted successfully", {
        tx_hash: txHash,
        log_index: logIndex,
        reverted_at_block: revertedAtBlock,
      });
    } catch (error) {
      logger.error("Failed to revert event", {
        txHash,
        logIndex,
        revertedAtBlock,
        error,
      });
      throw error;
    }
  }

  /**
   * 更新待确认事件的确认区块数
   */
  async updateConfirmedBlocksNum(
    txHash: string,
    logIndex: number,
    confirmedBlocksNum: number
  ): Promise<void> {
    try {
      const { error } = await this.client
        .from("chain_events")
        .update({
          confirmed_blocks_num: confirmedBlocksNum,
          updated_at: new Date().toISOString(),
        })
        .eq("tx_hash", txHash)
        .eq("log_index", logIndex)
        .eq("status", "pending");

      if (error) {
        throw error;
      }

      logger.debug("Updated confirmed blocks num", {
        tx_hash: txHash.substring(0, 10) + "...",
        log_index: logIndex,
        confirmed_blocks_num: confirmedBlocksNum,
      });
    } catch (error) {
      logger.error("Failed to update confirmed blocks num", {
        txHash,
        logIndex,
        confirmedBlocksNum,
        error,
      });
      throw error;
    }
  }

  /**
   * 获取待确认的事件（支持分页）
   */
  async getPendingEvents(
    limit?: number,
    offset?: number
  ): Promise<ChainEvent[]> {
    try {
      let query = this.client
        .from("chain_events")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (limit !== undefined) {
        query = query.limit(limit);
      }

      if (offset !== undefined) {
        query = query.range(offset, offset + (limit || 50) - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error("Failed to get pending events", { error });
      throw error;
    }
  }

  /**
   * 批量插入事件
   */
  async batchInsertEvents(
    events: Array<Omit<ChainEvent, "id" | "created_at" | "updated_at">>
  ): Promise<void> {
    if (events.length === 0) return;

    try {
      const { error } = await this.client.from("chain_events").insert(events);

      if (error) {
        // 处理部分失败的情况
        if (error.code === "23505") {
          logger.warn("Some events already exist in batch", {
            count: events.length,
          });
          // 尝试逐个插入以找出重复的
          await this.insertEventsOneByOne(events);
          return;
        }
        throw error;
      }

      logger.info("✅ 批量插入事件成功", { count: events.length });
    } catch (error) {
      logger.error("❌ 批量插入事件失败", { error, count: events.length });
      throw error;
    }
  }

  /**
   * 逐个插入事件（批量插入失败时的后备方案）
   */
  private async insertEventsOneByOne(
    events: Array<Omit<ChainEvent, "id" | "created_at" | "updated_at">>
  ): Promise<void> {
    let successCount = 0;
    let duplicateCount = 0;

    for (const event of events) {
      try {
        await this.insertEvent(event);
        successCount++;
      } catch (error: any) {
        if (error.code === "23505") {
          duplicateCount++;
        } else {
          throw error;
        }
      }
    }

    logger.info("逐个插入完成", { successCount, duplicateCount });
  }

  /**
   * 批量更新确认区块数
   */
  async batchUpdateConfirmedBlocksNum(
    updates: Array<{
      tx_hash: string;
      log_index: number;
      confirmed_blocks_num: number;
    }>
  ): Promise<void> {
    if (updates.length === 0) return;

    try {
      // 使用 Promise.all 并发更新，但限制并发数
      const CONCURRENT_LIMIT = 10;
      const chunks: (typeof updates)[] = [];

      for (let i = 0; i < updates.length; i += CONCURRENT_LIMIT) {
        chunks.push(updates.slice(i, i + CONCURRENT_LIMIT));
      }

      for (const chunk of chunks) {
        await Promise.all(
          chunk.map(({ tx_hash, log_index, confirmed_blocks_num }) =>
            this.updateConfirmedBlocksNum(
              tx_hash,
              log_index,
              confirmed_blocks_num
            )
          )
        );
      }

      logger.info("✅ 批量更新确认区块数成功", { count: updates.length });
    } catch (error) {
      logger.error("❌ 批量更新确认区块数失败", { error });
      throw error;
    }
  }

  /**
   * 检查事件是否已存在
   */
  async eventExists(txHash: string, logIndex: number): Promise<boolean> {
    try {
      const { data, error } = await this.client
        .from("chain_events")
        .select("id")
        .eq("tx_hash", txHash)
        .eq("log_index", logIndex)
        .single();

      return !error && !!data;
    } catch (error) {
      // 记录不存在时返回false
      return false;
    }
  }

  /**
   * 批量更新事件状态
   */
  async batchUpdateStatus(
    updates: Array<{
      txHash: string;
      logIndex: number;
      status: "confirmed" | "reverted";
      blockNumber: number;
    }>
  ): Promise<void> {
    try {
      const promises = updates.map(
        ({ txHash, logIndex, status, blockNumber }) => {
          const updateData: any = {
            status,
            updated_at: new Date().toISOString(),
          };

          if (status === "confirmed") {
            updateData.confirmed_at_block = blockNumber;
          } else {
            updateData.reverted_at_block = blockNumber;
          }

          return this.client
            .from("chain_events")
            .update(updateData)
            .eq("tx_hash", txHash)
            .eq("log_index", logIndex);
        }
      );

      await Promise.all(promises);
      logger.info("Batch update completed", { count: updates.length });
    } catch (error) {
      logger.error("Failed to batch update events", { updates, error });
      throw error;
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await this.client
        .from("chain_events")
        .select("id")
        .limit(1);

      return !error;
    } catch (error) {
      logger.error("Supabase health check failed", { error });
      return false;
    }
  }
}
