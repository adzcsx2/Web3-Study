import { ethers } from "ethers";
import { config, getWsUrl } from "../config";
import { logger } from "../utils/logger";
import { NFTEvent, EventHandler, ChainEvent } from "../types";
import { SupabaseService } from "./supabase";
import MyNFTABI from "../../abis/MyNFT.json";

/**
 * NFT 事件监听器
 * 集成了事件监听和确认监控功能
 * 支持批量处理和队列机制以应对高并发场景
 */
export class NFTEventListener {
  // WebSocket 连接
  private provider: ethers.WebSocketProvider | null = null;
  private contract: ethers.Contract | null = null;

  // 事件处理
  private eventHandler: EventHandler;
  private supabaseService: SupabaseService;

  // 状态管理
  private isListening: boolean = false;

  // 重连机制
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 5000;
  private reconnectTimer: NodeJS.Timeout | null = null;

  // 确认监控
  private confirmationInterval: NodeJS.Timeout | null = null;
  private readonly confirmationBlocks: number = 6; // 6个区块确认
  private readonly checkInterval: number = 30000; // 30秒检查一次

  // 🆕 批量处理相关
  private eventQueue: Array<{
    type: string;
    data: any;
    event: any;
  }> = [];
  private batchProcessTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 50; // 批量处理大小
  private readonly BATCH_TIMEOUT = 5000; // 5秒后强制处理

  // 🆕 并发控制
  private processingCount = 0;
  private readonly MAX_CONCURRENT_PROCESSING = 10;

  // 🆕 性能监控
  private stats = {
    eventsReceived: 0,
    eventsProcessed: 0,
    eventsConfirmed: 0,
    lastBatchSize: 0,
    queueMaxSize: 0,
    lastStatsOutput: 0, // 🆕 上次输出统计的时间戳
    // 🆕 记录上次输出时的状态
    lastOutputEventsReceived: 0,
    lastOutputEventsProcessed: 0,
    lastOutputEventsConfirmed: 0,
  };

  constructor(eventHandler: EventHandler, supabaseService: SupabaseService) {
    this.eventHandler = eventHandler;
    this.supabaseService = supabaseService;
  }

  /**
   * 启动监听器（包含事件监听和确认监控）
   */
  async start(): Promise<void> {
    try {
      logger.info("🚀 启动 NFT 事件监听器...");

      await this.connect();
      this.setupEventListeners();
      this.startConfirmationMonitor();
      this.startBatchProcessor(); // 🆕 启动批量处理器

      this.isListening = true;
      this.reconnectAttempts = 0;

      logger.info("✅ NFT 事件监听器启动成功", {
        contract: config.nftContractAddress,
        network: config.networkName,
        chainId: config.networkChainId,
        confirmationBlocks: this.confirmationBlocks,
        batchSize: this.BATCH_SIZE,
        batchTimeout: this.BATCH_TIMEOUT,
        maxConcurrent: this.MAX_CONCURRENT_PROCESSING,
      });
    } catch (error) {
      logger.error("❌ 启动 NFT 事件监听器失败", { error });
      throw error;
    }
  }

  /**
   * 停止监听器
   */
  async stop(): Promise<void> {
    try {
      logger.info("🛑 停止 NFT 事件监听器...");

      this.isListening = false;

      // 🆕 停止批量处理器
      if (this.batchProcessTimer) {
        clearTimeout(this.batchProcessTimer);
        this.batchProcessTimer = null;
      }

      // 🆕 处理剩余队列
      if (this.eventQueue.length > 0) {
        logger.info(`📦 处理剩余的 ${this.eventQueue.length} 个事件...`);
        await this.processBatch();
      }

      // 停止确认监控
      if (this.confirmationInterval) {
        clearInterval(this.confirmationInterval);
        this.confirmationInterval = null;
      }

      // 停止重连定时器
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      // 移除事件监听器
      if (this.contract) {
        await this.contract.removeAllListeners();
        this.contract = null;
      }

      // 关闭 WebSocket 连接
      if (this.provider) {
        await this.provider.destroy();
        this.provider = null;
      }

      logger.info("✅ NFT 事件监听器已停止");
    } catch (error) {
      logger.error("❌ 停止 NFT 事件监听器时出错", { error });
    }
  }

  /**
   * 建立 WebSocket 连接
   */
  private async connect(): Promise<void> {
    const wsUrl = getWsUrl();
    logger.info("🔌 连接到 WebSocket...", {
      url: wsUrl.replace(/\/v3\/.*/, "/v3/***"),
    });

    this.provider = new ethers.WebSocketProvider(wsUrl, {
      chainId: config.networkChainId,
      name: config.networkName,
    });

    // 验证网络连接
    const network = await this.provider.getNetwork();
    logger.info("🌐 网络连接成功", {
      chainId: network.chainId.toString(),
      name: network.name,
    });

    // 创建合约实例
    this.contract = new ethers.Contract(
      config.nftContractAddress,
      MyNFTABI,
      this.provider
    );

    // 监听 WebSocket 错误和关闭事件
    this.setupWebSocketHandlers();
  }

  /**
   * 设置 WebSocket 连接处理器
   */
  private setupWebSocketHandlers(): void {
    if (!this.provider || !this.provider.websocket) {
      return;
    }

    const ws = this.provider.websocket as any;

    // WebSocket 关闭事件
    ws.addEventListener("close", (event: any) => {
      logger.warn("⚠️ WebSocket 连接关闭", {
        code: event.code,
        reason: event.reason,
      });
      if (this.isListening) {
        this.handleReconnect();
      }
    });

    // WebSocket 错误事件
    ws.addEventListener("error", (error: any) => {
      logger.error("❌ WebSocket 错误", { error });
      if (this.isListening) {
        this.handleReconnect();
      }
    });
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    if (!this.contract) {
      throw new Error("Contract not initialized");
    }

    logger.info("📡 设置事件监听器...");

    // 监听 Transfer 事件 - 🆕 使用队列
    this.contract.on(
      "Transfer",
      (from: string, to: string, tokenId: bigint, event: any) => {
        this.stats.eventsReceived++;

        logger.info("🎯 接收到 Transfer 事件", {
          from,
          to,
          tokenId: tokenId.toString(),
          txHash: event.log.transactionHash,
          blockNumber: event.log.blockNumber,
          queueSize: this.eventQueue.length, // 🆕 显示队列大小
        });

        // 🆕 添加到队列而不是直接处理
        this.queueEvent("Transfer", { from, to, tokenId }, event);
      }
    );

    // 监听 Approval 事件 - 🆕 使用队列
    this.contract.on(
      "Approval",
      (owner: string, approved: string, tokenId: bigint, event: any) => {
        this.stats.eventsReceived++;

        logger.info("🎯 接收到 Approval 事件", {
          owner,
          approved,
          tokenId: tokenId.toString(),
          txHash: event.log.transactionHash,
          blockNumber: event.log.blockNumber,
          queueSize: this.eventQueue.length, // 🆕 显示队列大小
        });

        // 🆕 添加到队列而不是直接处理
        this.queueEvent("Approval", { owner, approved, tokenId }, event);
      }
    );

    logger.info("✅ 事件监听器设置完成");
  }

  /**
   * 处理 Transfer 事件
   */
  private async handleTransferEvent(
    from: string,
    to: string,
    tokenId: bigint,
    event: any
  ): Promise<void> {
    try {
      const nftEvent: NFTEvent = {
        eventType: "Transfer",
        transactionHash: event.log.transactionHash,
        blockNumber: event.log.blockNumber,
        blockHash: event.log.blockHash,
        logIndex: event.log.index,
        from,
        to,
        tokenId: tokenId.toString(),
        timestamp: new Date(),
      };

      logger.info("📝 处理 Transfer 事件数据", nftEvent);
      await this.eventHandler.handle(nftEvent);
      logger.info("✅ Transfer 事件处理成功");
    } catch (error) {
      logger.error("❌ 处理 Transfer 事件失败", { error });
      throw error;
    }
  }

  /**
   * 处理 Approval 事件
   */
  private async handleApprovalEvent(
    owner: string,
    approved: string,
    tokenId: bigint,
    event: any
  ): Promise<void> {
    try {
      const nftEvent: NFTEvent = {
        eventType: "Approval",
        transactionHash: event.log.transactionHash,
        blockNumber: event.log.blockNumber,
        blockHash: event.log.blockHash,
        logIndex: event.log.index,
        owner,
        approved,
        tokenId: tokenId.toString(),
        timestamp: new Date(),
      };

      logger.info("📝 处理 Approval 事件数据", nftEvent);
      await this.eventHandler.handle(nftEvent);
      logger.info("✅ Approval 事件处理成功");
    } catch (error) {
      logger.error("❌ 处理 Approval 事件失败", { error });
      throw error;
    }
  }

  /**
   * 🆕 启动批量处理器
   */
  private startBatchProcessor(): void {
    const processBatchPeriodically = async () => {
      if (this.eventQueue.length > 0) {
        await this.processBatch();
      }

      // 🔧 修复:只在有新活动时输出统计
      const now = Date.now();
      const hasNewActivity =
        this.stats.eventsReceived > this.stats.lastOutputEventsReceived ||
        this.stats.eventsProcessed > this.stats.lastOutputEventsProcessed ||
        this.stats.eventsConfirmed > this.stats.lastOutputEventsConfirmed ||
        this.eventQueue.length > 0;

      // 只在有新活动或距离上次输出超过5分钟时输出
      const shouldOutput =
        hasNewActivity || now - this.stats.lastStatsOutput > 300000;

      if (this.stats.eventsReceived > 0 && shouldOutput) {
        logger.info("📊 监听器统计", {
          eventsReceived: this.stats.eventsReceived,
          eventsProcessed: this.stats.eventsProcessed,
          eventsConfirmed: this.stats.eventsConfirmed,
          lastBatchSize: this.stats.lastBatchSize,
          queueMaxSize: this.stats.queueMaxSize,
          queueSize: this.eventQueue.length,
          processingCount: this.processingCount,
        });

        // 更新记录
        this.stats.lastStatsOutput = now;
        this.stats.lastOutputEventsReceived = this.stats.eventsReceived;
        this.stats.lastOutputEventsProcessed = this.stats.eventsProcessed;
        this.stats.lastOutputEventsConfirmed = this.stats.eventsConfirmed;
      }

      this.batchProcessTimer = setTimeout(
        processBatchPeriodically,
        this.BATCH_TIMEOUT
      );
    };

    processBatchPeriodically();
    logger.info("🔄 批量处理器已启动", {
      batchSize: this.BATCH_SIZE,
      timeout: this.BATCH_TIMEOUT,
      maxConcurrent: this.MAX_CONCURRENT_PROCESSING,
    });
  }

  /**
   * 🆕 批量处理事件队列
   */
  private async processBatch(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    // 取出一批事件
    const batch = this.eventQueue.splice(0, this.BATCH_SIZE);
    const batchSize = batch.length;
    this.stats.lastBatchSize = batchSize;

    logger.info(`📦 开始批量处理事件`, {
      batchSize,
      remaining: this.eventQueue.length,
    });

    try {
      // 并发处理，但限制并发数
      const chunks = this.chunkArray(batch, this.MAX_CONCURRENT_PROCESSING);

      for (const chunk of chunks) {
        await Promise.allSettled(
          chunk.map((item) =>
            this.processEvent(item.type, item.data, item.event)
          )
        );
      }

      this.stats.eventsProcessed += batchSize;
      logger.info(`✅ 批量处理完成`, {
        batchSize,
        totalProcessed: this.stats.eventsProcessed,
      });
    } catch (error) {
      logger.error(`❌ 批量处理失败`, { error, batchSize });
      // 失败的事件不放回队列，避免死循环
    }
  }

  /**
   * 🆕 数组分块
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 🆕 添加事件到队列
   */
  private queueEvent(type: string, data: any, event: any): void {
    this.eventQueue.push({ type, data, event });

    // 更新队列最大值统计
    if (this.eventQueue.length > this.stats.queueMaxSize) {
      this.stats.queueMaxSize = this.eventQueue.length;
    }

    // 如果队列达到批量大小，立即处理
    if (this.eventQueue.length >= this.BATCH_SIZE) {
      logger.info(`🚀 队列已满，立即处理`, {
        queueSize: this.eventQueue.length,
      });
      this.processBatch();
    }
  }

  /**
   * 🆕 处理单个事件
   */
  private async processEvent(
    type: string,
    data: any,
    event: any
  ): Promise<void> {
    try {
      this.processingCount++;

      if (type === "Transfer") {
        await this.handleTransferEvent(data.from, data.to, data.tokenId, event);
      } else if (type === "Approval") {
        await this.handleApprovalEvent(
          data.owner,
          data.approved,
          data.tokenId,
          event
        );
      }
    } catch (error) {
      logger.error("处理事件时出错", { type, error });
    } finally {
      this.processingCount--;
    }
  }

  /**
   * 启动确认监控
   */
  private startConfirmationMonitor(): void {
    logger.info("🔍 启动区块确认监控...");

    // 立即执行一次检查
    this.checkPendingEvents();

    // 定期检查待确认事件
    this.confirmationInterval = setInterval(async () => {
      await this.checkPendingEvents();
    }, this.checkInterval);

    logger.info("✅ 区块确认监控已启动", {
      confirmationBlocks: this.confirmationBlocks,
      checkIntervalMs: this.checkInterval,
    });
  }

  /**
   * 检查待确认的事件（🆕 分页处理）
   */
  private async checkPendingEvents(): Promise<void> {
    if (!this.isListening || !this.provider) {
      return;
    }

    try {
      const currentBlock = await this.provider.getBlockNumber();
      const PAGE_SIZE = 50; // 每页50个
      let page = 0;
      let hasMore = true;
      let totalChecked = 0;

      // 🆕 先快速检查是否有待确认事件
      const firstPage = await this.supabaseService.getPendingEvents(1, 0);
      if (firstPage.length === 0) {
        logger.debug(`📋 没有待确认事件，跳过检查`, { currentBlock });
        return;
      }

      logger.info(`📋 开始分页检查待确认事件`, { currentBlock });

      while (hasMore) {
        // 🆕 分页查询
        const pendingEvents = await this.supabaseService.getPendingEvents(
          PAGE_SIZE,
          page * PAGE_SIZE
        );

        if (pendingEvents.length === 0) {
          hasMore = false;
          break;
        }

        logger.info(`� 处理第 ${page + 1} 页`, {
          count: pendingEvents.length,
          currentBlock,
        });

        // 🆕 批量收集需要更新的确认区块数
        const updates: Array<{
          tx_hash: string;
          log_index: number;
          confirmed_blocks_num: number;
        }> = [];

        const confirmPromises: Promise<void>[] = [];

        // 检查每个事件
        for (const event of pendingEvents) {
          const confirmations = currentBlock - event.block_number;

          logger.debug("检查事件确认数", {
            txHash: event.tx_hash.substring(0, 10) + "...",
            blockNumber: event.block_number,
            currentBlock,
            confirmations,
            required: this.confirmationBlocks,
          });

          // 🆕 收集需要更新的确认区块数
          if (confirmations !== event.confirmed_blocks_num) {
            updates.push({
              tx_hash: event.tx_hash,
              log_index: event.log_index,
              confirmed_blocks_num: confirmations,
            });
          }

          // 如果确认数达到要求
          if (confirmations >= this.confirmationBlocks) {
            // 🆕 使用 Promise 并发验证和确认
            confirmPromises.push(
              this.verifyAndConfirmEvent(event, currentBlock, confirmations)
            );
          }
        }

        // 🆕 批量更新确认区块数
        if (updates.length > 0) {
          await this.supabaseService.batchUpdateConfirmedBlocksNum(updates);
          logger.info(`✅ 批量更新确认区块数`, { count: updates.length });
        }

        // 🆕 等待所有确认操作完成
        if (confirmPromises.length > 0) {
          await Promise.allSettled(confirmPromises);
        }

        totalChecked += pendingEvents.length;
        page++;
        hasMore = pendingEvents.length === PAGE_SIZE;
      }

      if (totalChecked > 0) {
        logger.info(`✅ 分页检查完成`, {
          totalPages: page,
          totalChecked,
          currentBlock,
        });
      }
    } catch (error) {
      logger.error("❌ 检查待确认事件失败", { error });
    }
  }

  /**
   * 🆕 验证并确认事件
   */
  private async verifyAndConfirmEvent(
    event: ChainEvent,
    currentBlock: number,
    confirmations: number
  ): Promise<void> {
    try {
      // 验证交易是否仍然存在（检测链重组）
      const isValid = await this.verifyTransaction(
        event.tx_hash,
        event.block_number
      );

      if (isValid) {
        // 确认事件，并记录确认区块数
        await this.supabaseService.confirmEvent(
          event.tx_hash,
          event.log_index,
          currentBlock,
          confirmations
        );
        this.stats.eventsConfirmed++;
        logger.info("✅ 事件已确认", {
          txHash: event.tx_hash.substring(0, 10) + "...",
          confirmations,
          confirmedAtBlock: currentBlock,
        });
      } else {
        // 交易已被回滚（链重组）
        await this.supabaseService.revertEvent(
          event.tx_hash,
          event.log_index,
          currentBlock
        );
        logger.warn("⚠️ 事件已回滚（链重组）", {
          txHash: event.tx_hash.substring(0, 10) + "...",
        });
      }
    } catch (error) {
      logger.error("验证确认事件失败", {
        txHash: event.tx_hash,
        error,
      });
    }
  }

  /**
   * 验证交易是否仍然有效（检测链重组）
   */
  private async verifyTransaction(
    txHash: string,
    originalBlockNumber: number
  ): Promise<boolean> {
    try {
      if (!this.provider) {
        return false;
      }

      // 获取交易收据
      const receipt = await this.provider.getTransactionReceipt(txHash);

      if (!receipt) {
        // 交易不存在
        logger.warn("交易收据不存在", { txHash });
        return false;
      }

      // 检查区块号是否一致
      if (receipt.blockNumber !== originalBlockNumber) {
        logger.warn("交易区块号不一致，可能发生链重组", {
          txHash,
          originalBlock: originalBlockNumber,
          currentBlock: receipt.blockNumber,
        });
        return false;
      }

      // 检查交易状态
      if (receipt.status !== 1) {
        logger.warn("交易执行失败", { txHash, status: receipt.status });
        return false;
      }

      return true;
    } catch (error) {
      logger.error("验证交易失败", { txHash, error });
      return false;
    }
  }

  /**
   * 处理重连逻辑
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error("❌ 达到最大重连次数,停止服务");
      this.stop();
      process.exit(1);
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    logger.info(
      `🔄 尝试重新连接 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`,
      {
        delayMs: delay,
      }
    );

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.stop();
        await this.start();
      } catch (error) {
        logger.error("❌ 重连失败", { error });
        this.handleReconnect();
      }
    }, delay);
  }

  /**
   * 获取监听状态
   */
  isActive(): boolean {
    return this.isListening && this.provider !== null && this.contract !== null;
  }

  /**
   * 获取当前区块号
   */
  async getCurrentBlockNumber(): Promise<number> {
    if (!this.provider) {
      throw new Error("Provider not initialized");
    }
    return await this.provider.getBlockNumber();
  }
}
