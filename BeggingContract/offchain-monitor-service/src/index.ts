import { validateConfig } from "./config";
import { logger } from "./utils/logger";
import { SupabaseService } from "./services/supabase";
import { EventProcessor } from "./services/eventProcessor";
import { NFTEventListener } from "./services/nftEventListener";
import express, { Express, Request, Response } from "express";

// 创建日志目录（如果不存在）
import fs from "fs";
import path from "path";

const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

class NFTListener {
  private supabaseService: SupabaseService;
  private eventProcessor: EventProcessor;
  private nftEventListener: NFTEventListener;
  private isShuttingDown: boolean = false;
  private app: Express;
  private server: any;
  private port: number;

  constructor() {
    this.supabaseService = new SupabaseService();
    this.eventProcessor = new EventProcessor(this.supabaseService);
    this.nftEventListener = new NFTEventListener(
      this.eventProcessor,
      this.supabaseService
    );

    // 初始化 Express 应用
    this.app = express();
    this.port = parseInt(process.env.PORT || "3000", 10);
    this.setupHttpServer();

    // 设置优雅关闭
    this.setupGracefulShutdown();
  }

  async start(): Promise<void> {
    try {
      logger.info("🚀 启动 NFT 监听服务");

      // 启动 HTTP 服务器
      await this.startHttpServer();

      // 验证配置
      validateConfig();

      // 检查Supabase连接
      const supabaseHealthy = await this.supabaseService.healthCheck();
      if (!supabaseHealthy) {
        throw new Error("Supabase 连接失败");
      }

      logger.info("✅ Supabase 连接验证成功");

      // 启动 NFT 事件监听器（包含事件监听和确认监控）
      await this.nftEventListener.start();

      logger.info("✅ NFT 监听服务启动成功");

      // 定期健康检查
      this.startHealthCheck();
    } catch (error) {
      logger.error("❌ 启动 NFT 监听服务失败", { error });
      process.exit(1);
    }
  }

  async stop(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    logger.info("🛑 停止 NFT 监听服务");

    try {
      // 停止 HTTP 服务器
      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server.close(() => {
            logger.info("✅ HTTP 服务器已停止");
            resolve();
          });
        });
      }

      await this.nftEventListener.stop();
      logger.info("✅ NFT 监听服务优雅停止");
    } catch (error) {
      logger.error("❌ 停止服务时出错", { error });
    } finally {
      process.exit(0);
    }
  }

  private setupHttpServer(): void {
    // 健康检查端点
    this.app.get("/health", async (req: Request, res: Response) => {
      try {
        const supabaseHealthy = await this.supabaseService.healthCheck();
        const listenerActive = this.nftEventListener.isActive();

        if (supabaseHealthy && listenerActive) {
          res.status(200).json({
            status: "healthy",
            timestamp: new Date().toISOString(),
            services: {
              supabase: supabaseHealthy,
              listener: listenerActive,
            },
          });
        } else {
          res.status(503).json({
            status: "unhealthy",
            timestamp: new Date().toISOString(),
            services: {
              supabase: supabaseHealthy,
              listener: listenerActive,
            },
          });
        }
      } catch (error) {
        logger.error("健康检查失败", { error });
        res.status(503).json({
          status: "error",
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    // 根路径
    this.app.get("/", (req: Request, res: Response) => {
      res.json({
        service: "NFT Event Listener",
        version: "1.0.0",
        status: "running",
      });
    });
  }

  private async startHttpServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          logger.info(`🌐 HTTP 服务器启动成功，监听端口: ${this.port}`);
          resolve();
        });

        this.server.on("error", (error: Error) => {
          logger.error("HTTP 服务器启动失败", { error });
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private setupGracefulShutdown(): void {
    const shutdownSignals = ["SIGTERM", "SIGINT", "SIGUSR2"];

    shutdownSignals.forEach((signal) => {
      process.on(signal, async () => {
        logger.info(`收到 ${signal} 信号, 开始优雅关闭`);
        await this.stop();
      });
    });

    // 处理未捕获的异常
    process.on("uncaughtException", (error) => {
      logger.error("未捕获的异常", { error });
      this.stop();
    });

    process.on("unhandledRejection", (reason, promise) => {
      logger.error("未处理的 Promise 拒绝", { reason, promise });
      this.stop();
    });
  }

  private startHealthCheck(): void {
    // 每5分钟进行一次健康检查
    setInterval(async () => {
      try {
        const supabaseHealthy = await this.supabaseService.healthCheck();
        const listenerActive = this.nftEventListener.isActive();

        logger.info("健康检查通过", {
          supabaseHealthy,
          listenerActive,
        });

        if (!listenerActive) {
          logger.error("❌ NFT 事件监听器未激活, 可能需要重启");
        }
      } catch (error) {
        logger.error("❌ 健康检查失败", { error });
      }
    }, 5 * 60 * 1000); // 5分钟
  }
}

// 启动应用
async function main() {
  const listener = new NFTListener();
  await listener.start();
}

// 处理直接运行
if (require.main === module) {
  main().catch((error) => {
    console.error("启动应用失败:", error);
    process.exit(1);
  });
}

export { NFTListener };
