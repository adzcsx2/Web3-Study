import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import fs from "fs";
import path from "path";
import "../deployments/sepolia-latest.json";
import { encodeSqrtRatioX96 } from "@uniswap/v3-sdk";

/**
 * ShibMeme Diamond 合约 - Sepolia 完整集成测试
 *
 * 测试范围：
 * 1. 合约部署验证
 * 2. ERC20 基础功能测试
 * 3. 税费机制测试
 * 4. Uniswap V3 流动性管理测试
 *    - 初始化 LiquidityManager
 *    - 创建 V3 流动性池
 *    - 初始化池子价格（重要！）
 *    - 添加流动性
 *    - 查询池子状态
 * 5. 权限和配置测试
 * 6. Gas 消耗分析
 * 7. 边界情况测试
 *
 * ⚠️ 重要提示：
 * - 池子创建后状态为0是正常的，需要先初始化价格
 * - 必须按顺序执行：创建池子 → 初始化价格 → 添加流动性
 * - 如果池子状态为0，运行"应该能初始化流动性池价格"测试
 *
 * 运行命令: npx hardhat test test/Diamond.sepolia.test.ts --network sepolia
 */
describe("ShibMeme Diamond - Sepolia 完整测试", function () {
  this.timeout(180000); // 3分钟超时

  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let diamondAddress: string;
  let weth: string;
  let erc20Facet: any;
  let shibMemeFacet: any;
  let liquidityManager: any;
  let deploymentInfo: any;

  // Sepolia Uniswap V3 地址配置
  const UNISWAP_V3_ADDRESSES = {
    swapRouter: "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E",
    nonfungiblePositionManager: "0x1238536071E1c677A632429e3655c799b22cDA52",
    factory: "0x0227628f3F023bb0B980b67D528571c95c6DaC1c",
    poolFee: 3000, // 0.3%
  };

  /**
   * 延迟函数
   */
  function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 带重试的交易执行
   */
  async function executeWithRetry(
    operation: () => Promise<any>,
    name: string,
    maxRetries = 3
  ): Promise<any> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const tx = await operation();
        const receipt = await tx.wait();
        return receipt;
      } catch (error: any) {
        if (i === maxRetries - 1) throw error;
        console.log(`  ⚠️  ${name} retry ${i + 1}/${maxRetries}`);
        await delay(3000);
      }
    }
  }

  /**
   * 加载部署信息并初始化合约接口
   */
  before(async function () {
    this.timeout(60000);

    try {
      // 1. 检查网络
      const network = await ethers.provider.getNetwork();
      console.log("\n📡 网络信息:");
      console.log("  名称:", network.name);
      console.log("  Chain ID:", network.chainId.toString());

      if (network.chainId !== 11155111n) {
        console.log("⚠️  请在 Sepolia 测试网运行此测试");
        this.skip();
      }

      // 2. 获取签名者
      [owner, user1, user2] = await ethers.getSigners();
      console.log("\n👤 账户信息:");
      console.log("  Owner:", owner.address);
      console.log("  User1:", user1.address);
      console.log("  User2:", user2.address);

      // 3. 加载部署信息
      const deploymentFile = path.join(
        __dirname,
        "..",
        "deployments",
        "sepolia-latest.json"
      );

      if (!fs.existsSync(deploymentFile)) {
        console.log("❌ 未找到部署文件，请先部署合约:");
        console.log("   npx hardhat run script/deploy.ts --network sepolia");
        this.skip();
      }

      deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf-8"));
      diamondAddress = deploymentInfo.contracts.diamond;

      console.log("\n💎 Diamond 地址:", diamondAddress);

      // 4. 初始化合约接口
      erc20Facet = await ethers.getContractAt("ERC20Facet", diamondAddress);
      shibMemeFacet = await ethers.getContractAt(
        "ShibMemeFacet",
        diamondAddress
      );
      liquidityManager = await ethers.getContractAt(
        "LiquidityManager",
        diamondAddress
      );

      console.log("✅ 合约接口初始化完成\n");
    } catch (error: any) {
      console.error("❌ 初始化失败:", error.message);
      throw error;
    }

    // 获取 WETH 地址
    weth = await liquidityManager.getWETH();
  });

  describe("📦 1. 部署验证", function () {
    it("应该读取正确的代币信息", async function () {
      const name = await erc20Facet.name();
      const symbol = await erc20Facet.symbol();
      const decimals = await erc20Facet.decimals();

      console.log(`  代币: ${name} (${symbol})`);
      console.log(`  精度: ${decimals}`);

      expect(name).to.equal(deploymentInfo.token.name);
      expect(symbol).to.equal(deploymentInfo.token.symbol);
      expect(decimals).to.equal(18);
    });

    it("应该有正确的总供应量", async function () {
      const totalSupply = await erc20Facet.totalSupply();
      const supply = ethers.formatEther(totalSupply);

      console.log(`  总供应量: ${supply} tokens`);
      expect(supply).to.equal(deploymentInfo.token.totalSupply);
    });

    it("合约应该持有初始代币", async function () {
      const balance = await erc20Facet.balanceOf(diamondAddress);
      console.log(`  合约余额: ${ethers.formatEther(balance)} tokens`);
      expect(balance).to.be.gt(0);
    });
  });

  describe("💰 2. ERC20 基础功能", function () {
    it("应该支持代币转账", async function () {
      const amount = ethers.parseEther("100");
      const initialBalance = await erc20Facet.balanceOf(user1.address);

      await executeWithRetry(
        () => erc20Facet.transfer(user1.address, amount),
        "Transfer"
      );

      const finalBalance = await erc20Facet.balanceOf(user1.address);
      expect(finalBalance - initialBalance).to.equal(amount);
      console.log(`  ✓ 转账成功: ${ethers.formatEther(amount)} tokens`);
    });

    it("应该支持授权和 transferFrom", async function () {
      const amount = ethers.parseEther("50");

      // 授权
      await executeWithRetry(
        () => erc20Facet.approve(user1.address, amount),
        "Approve"
      );

      const allowance = await erc20Facet.allowance(
        owner.address,
        user1.address
      );
      expect(allowance).to.equal(amount);

      // 使用授权转账
      const initialBalance = await erc20Facet.balanceOf(user2.address);
      await executeWithRetry(
        () =>
          erc20Facet
            .connect(user1)
            .transferFrom(owner.address, user2.address, amount),
        "TransferFrom"
      );

      const finalBalance = await erc20Facet.balanceOf(user2.address);
      expect(finalBalance - initialBalance).to.equal(amount);
      console.log(`  ✓ 授权转账成功: ${ethers.formatEther(amount)} tokens`);
    });
  });

  describe("💸 3. 税费机制", function () {
    before(async function () {
      // 确保 user1 有足够余额
      const balance = await erc20Facet.balanceOf(user1.address);
      if (balance < ethers.parseEther("20000")) {
        await executeWithRetry(
          () => erc20Facet.transfer(user1.address, ethers.parseEther("20000")),
          "Fund user1"
        );
      }
    });

    it("应该正确收取税费", async function () {
      const amount = ethers.parseEther("10000");
      const taxRecipient = await shibMemeFacet.getTaxRecipient();

      const initialTaxBalance = await erc20Facet.balanceOf(taxRecipient);
      const initialUser2Balance = await erc20Facet.balanceOf(user2.address);

      await executeWithRetry(
        () => shibMemeFacet.connect(user1).sbtransfer(user2.address, amount),
        "Tax transfer"
      );

      const finalTaxBalance = await erc20Facet.balanceOf(taxRecipient);
      const finalUser2Balance = await erc20Facet.balanceOf(user2.address);

      const taxCollected = finalTaxBalance - initialTaxBalance;
      const amountReceived = finalUser2Balance - initialUser2Balance;

      expect(taxCollected).to.be.gt(0);
      expect(amountReceived).to.be.lt(amount);

      console.log(`  税费收取: ${ethers.formatEther(taxCollected)} tokens`);
      console.log(`  用户收到: ${ethers.formatEther(amountReceived)} tokens`);
      console.log(
        `  税率: ${((Number(taxCollected) / Number(amount)) * 100).toFixed(2)}%`
      );
    });

    it("税费白名单应该免除税费", async function () {
      // 设置 user1 为税费白名单
      await executeWithRetry(
        () => shibMemeFacet.setTaxExempt(user1.address, true),
        "Set tax exempt"
      );

      const isExempt = await shibMemeFacet.isTaxExempt(user1.address);
      expect(isExempt).to.be.true;

      const amount = ethers.parseEther("5000");
      const taxRecipient = await shibMemeFacet.getTaxRecipient();
      const initialTaxBalance = await erc20Facet.balanceOf(taxRecipient);

      await executeWithRetry(
        () => shibMemeFacet.connect(user1).sbtransfer(user2.address, amount),
        "Exempt transfer"
      );

      const finalTaxBalance = await erc20Facet.balanceOf(taxRecipient);
      const taxCollected = finalTaxBalance - initialTaxBalance;

      expect(taxCollected).to.equal(0);
      console.log("  ✓ 白名单用户无需缴纳税费");

      // 恢复状态
      await shibMemeFacet.setTaxExempt(user1.address, false);
    });
  });

  //   describe.only("应该能给合约转0.015ETH以供流动性添加使用", function () {
  //     it("给合约转账0.015ETH", async function () {
  //       const amount = ethers.parseEther("0.015");
  //       const initialBalance = await ethers.provider.getBalance(diamondAddress);
  //       await executeWithRetry(
  //         () =>
  //           owner.sendTransaction({
  //             to: diamondAddress,
  //             value: amount,
  //           }),
  //         "Fund Diamond with ETH"
  //       );
  //       const finalBalance = await ethers.provider.getBalance(diamondAddress);
  //       expect(finalBalance - initialBalance).to.equal(amount);
  //       console.log(`  ✓ 转账成功: ${ethers.formatEther(amount)} ETH`);
  //     });
  //   });

  describe.only("🌊 4. Uniswap V3 流动性管理", function () {
    let isInitialized = false;

    before(async function () {
      // 检查是否已初始化
      try {
        const factory = await liquidityManager.getFactory();
        isInitialized = factory !== ethers.ZeroAddress;
      } catch (error) {
        isInitialized = false;
      }
    });

    it("应该能初始化 LiquidityManager", async function () {
      if (isInitialized) {
        console.log("  ⚠️  已经初始化，跳过此测试");
        this.skip();
      }

      console.log("  初始化配置:");
      console.log("    SwapRouter:", UNISWAP_V3_ADDRESSES.swapRouter);
      console.log(
        "    PositionManager:",
        UNISWAP_V3_ADDRESSES.nonfungiblePositionManager
      );
      console.log("    Factory:", UNISWAP_V3_ADDRESSES.factory);
      console.log("    Pool Fee:", UNISWAP_V3_ADDRESSES.poolFee);

      await executeWithRetry(
        () =>
          liquidityManager.initializeLiquidity(
            UNISWAP_V3_ADDRESSES.swapRouter,
            UNISWAP_V3_ADDRESSES.nonfungiblePositionManager,
            UNISWAP_V3_ADDRESSES.factory,
            UNISWAP_V3_ADDRESSES.poolFee
          ),
        "Initialize LiquidityManager",
        5
      );

      await delay(5000);

      const factory = await liquidityManager.getFactory();
      expect(factory).to.equal(UNISWAP_V3_ADDRESSES.factory);
      console.log("  ✓ LiquidityManager 初始化成功");
    });

    it("应该能读取 Uniswap V3 配置", async function () {
      const factory = await liquidityManager.getFactory();
      const weth = await liquidityManager.getWETH();
      const poolFee = await liquidityManager.getPoolFee();

      expect(factory).to.equal(UNISWAP_V3_ADDRESSES.factory);
      expect(weth).to.be.properAddress;
      expect(poolFee).to.equal(UNISWAP_V3_ADDRESSES.poolFee);

      console.log("  配置信息:");
      console.log("    Factory:", factory);
      console.log("    WETH:", weth);
      console.log("    Pool Fee:", poolFee, "(0.3%)");
    });

    it("应该能创建 V3 流动性池", async function () {
      let existingPool;
      try {
        existingPool = await liquidityManager.getUniswapV3Pool();
      } catch (error: any) {
        // 如果池子不存在会报错，这是正常的
        if (
          !error.message.includes("Pool not created") &&
          !error.message.includes("is not a function")
        ) {
          console.log("  ⚠️  检查池子时出错:", error.message);
        }
        existingPool = ethers.ZeroAddress;
      }

      if (existingPool !== ethers.ZeroAddress) {
        console.log("  ⚠️  流动性池已存在:", existingPool);
        this.skip();
      }

      console.log("  创建 Uniswap V3 流动性池...");
      try {
        const receipt = await executeWithRetry(
          () => liquidityManager.createPool(),
          "Create V3 Pool",
          5
        );

        await delay(5000);

        const pool = await liquidityManager.getUniswapV3Pool();
        expect(pool).to.be.properAddress;
        expect(pool).to.not.equal(ethers.ZeroAddress);

        console.log("  ✓ V3 Pool 创建成功:", pool);
        console.log("  Gas 消耗:", receipt.gasUsed.toString());
      } catch (error: any) {
        if (
          error.message.includes("already exists") ||
          error.message.includes("Already initialized")
        ) {
          console.log("  ⚠️  池子已存在，跳过创建");
          this.skip();
        } else {
          console.log("  ❌ 创建池子失败:", error.message);
          throw error;
        }
      }
    });

    it("应该能初始化流动性池价格", async function () {
      let poolAddress;
      try {
        poolAddress = await liquidityManager.getUniswapV3Pool();
      } catch (error: any) {
        console.log("  ⚠️  池子未创建，跳过初始化");
        this.skip();
      }

      if (poolAddress === ethers.ZeroAddress) {
        console.log("  ⚠️  池子未创建，跳过初始化");
        this.skip();
      }

      try {
        // 获取池子合约
        const poolABI = [
          "function initialize(uint160 sqrtPriceX96) external",
          "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
        ];
        const pool = await ethers.getContractAt(poolABI, poolAddress);

        const slot0 = await pool.slot0();
        if (slot0.sqrtPriceX96 !== 0n) {
          console.log(
            "  ✓ 池子已初始化，当前价格:",
            slot0.sqrtPriceX96.toString()
          );
          console.log("  当前 Tick:", slot0.tick.toString());
          return;
        }

        // ============ 🎯 池子价格初始化逻辑 ============
        // 目标价格：1,000,000 Diamond Token = 1 ETH
        //
        // 📌 步骤 1: 确定 token0 和 token1 顺序
        // Uniswap V3 强制要求 token0.address < token1.address
        // 使用地址比较确保全网唯一的池子地址 (CREATE2)
        const isToken0 = diamondAddress.toLowerCase() < weth.toLowerCase();
        console.log(
          `  Diamond 是 token${isToken0 ? "0" : "1"}, WETH 是 token${
            isToken0 ? "1" : "0"
          }`
        );

        // 📌 步骤 2: 计算初始价格 (sqrtPriceX96)
        // Uniswap V3 价格公式: price = token1 数量 / token0 数量
        // encodeSqrtRatioX96(amount1, amount0) 自动计算 sqrt(amount1/amount0) * 2^96
        let initialPrice: bigint;

        if (isToken0) {
          // 场景 A: Diamond 是 token0，WETH 是 token1
          // price = WETH / Diamond = 1 / 1000000 = 0.000001
          // 使用 encodeSqrtRatioX96(1 ETH, 1000000 Diamond)
          initialPrice = BigInt(encodeSqrtRatioX96(1, 1000000).toString());
          console.log(
            "  ✓ 初始化价格: 1,000,000 Diamond = 1 WETH (Diamond 是 token0)"
          );
        } else {
          // 场景 B: Diamond 是 token1，WETH 是 token0
          // price = Diamond / WETH = 1000000 / 1 = 1000000
          // 使用 encodeSqrtRatioX96(1000000 Diamond, 1 ETH)
          initialPrice = BigInt(encodeSqrtRatioX96(1000000, 1).toString());
          console.log(
            "  ✓ 初始化价格: 1,000,000 Diamond = 1 WETH (Diamond 是 token1)"
          );
        }

        console.log("  📊 计算的 sqrtPriceX96:", initialPrice.toString());
        const tx = await pool.initialize(initialPrice);
        const receipt = await tx.wait();

        await delay(3000);

        const newSlot0 = await pool.slot0();
        expect(newSlot0.sqrtPriceX96).to.equal(initialPrice);

        console.log("  ✓ 池子价格初始化成功");
        console.log("  SqrtPriceX96:", newSlot0.sqrtPriceX96.toString());
        console.log("  当前 Tick:", newSlot0.tick.toString());
        console.log("  Gas 消耗:", receipt.gasUsed.toString());
      } catch (error: any) {
        if (
          error.message.includes("Already initialized") ||
          error.message.includes("AI")
        ) {
          console.log("  ⚠️  池子已初始化，跳过");
          // 不算失败
          return;
        } else {
          console.log("  ❌ 初始化价格失败:", error.message);
          throw error;
        }
      }
    });

    it.only("应该能添加 V3 流动性", async function () {
      let poolAddress;
      try {
        poolAddress = await liquidityManager.getUniswapV3Pool();
        if (poolAddress === ethers.ZeroAddress) {
          console.log("  ⚠️  池子未创建，跳过");
          this.skip();
        }
      } catch (error: any) {
        console.log("  ⚠️  池子未创建，跳过");
        this.skip();
      }

      // 检查池子是否已初始化
      try {
        const slot0 = await liquidityManager.getPoolSlot0();
        if (slot0.sqrtPriceX96 === 0n) {
          console.log("  ⚠️  池子未初始化，请先运行初始化测试");
          this.skip();
        }
      } catch (error: any) {
        console.log("  ⚠️  无法读取池子状态，跳过");
        this.skip();
      }

      // 准备添加流动性
      const weth = await liquidityManager.getWETH();

      console.log("  地址信息:");
      console.log("    Diamond (Token):", diamondAddress);
      console.log("    WETH:", weth);

      // 确定 token0 和 token1 的顺序（地址小的是 token0）
      const isToken0 = diamondAddress.toLowerCase() < weth.toLowerCase();
      const token0 = isToken0 ? diamondAddress : weth;
      const token1 = isToken0 ? weth : diamondAddress;

      console.log("    Token0:", token0, isToken0 ? "(Diamond)" : "(WETH)");
      console.log("    Token1:", token1, isToken0 ? "(WETH)" : "(Diamond)");

      // ============ 🎯 流动性参数配置 ============
      // 目标价格：1,000,000 Diamond Token = 1 ETH
      //
      // 📌 测试场景: 故意提供不匹配的比例,观察 Uniswap V3 的自动调整
      // 投入: 1000 Diamond + 0.01 ETH
      // 池子价格比例: 1,000,000 : 1
      // 实际需要: 1000 Diamond → 0.001 ETH
      // 预期结果: 使用全部 1000 Diamond + 0.001 ETH,退回 0.009 ETH
      const tokenAmount = ethers.parseEther("1000"); // 1000 代币
      const ethAmount = ethers.parseEther("0.01"); // 0.01 ETH

      // 根据 token0/token1 的顺序设置数量
      const amount0Desired = isToken0 ? tokenAmount : ethAmount;
      const amount1Desired = isToken0 ? ethAmount : tokenAmount;

      // 设置tick范围 (全价格范围)
      const tickLower = -887220;
      const tickUpper = 887220;

      const deadline = Math.floor(Date.now() / 1000) + 3600;

      console.log("  流动性参数:");
      console.log("    Token0 数量:", ethers.formatEther(amount0Desired));
      console.log("    Token1 数量:", ethers.formatEther(amount1Desired));
      console.log("    Tick 范围:", tickLower, "到", tickUpper);
      console.log("    需要的 ETH:", ethers.formatEther(ethAmount), "ETH");

      try {
        // 1. 检查 owner 的代币余额
        const ownerTokenBalanceBefore = await erc20Facet.balanceOf(
          owner.address
        );
        console.log(
          "  Owner 代币余额:",
          ethers.formatEther(ownerTokenBalanceBefore)
        );

        if (ownerTokenBalanceBefore < tokenAmount) {
          console.log("  ⚠️  Owner 代币余额不足，跳过");
          this.skip();
        }

        // 2. 检查 owner 的 ETH 余额
        const ownerEthBalanceBefore = await ethers.provider.getBalance(
          owner.address
        );
        console.log(
          "  Owner ETH 余额:",
          ethers.formatEther(ownerEthBalanceBefore)
        );

        if (ownerEthBalanceBefore < ethAmount) {
          console.log("  ⚠️  Owner ETH 余额不足，跳过");
          this.skip();
        }

        // 3. 授权合约使用代币
        console.log("\n  授权 LiquidityManager 使用代币...");
        const approveTx = await erc20Facet.approve(
          diamondAddress, // 授权给 Diamond 合约
          tokenAmount
        );
        await approveTx.wait();
        await delay(2000);
        console.log("  ✓ 授权成功");

        // 4. 调用 mintNewPosition（带 ETH）
        console.log("\n  开始添加流动性...");
        const tx = await liquidityManager.mintNewPosition(
          token0,
          token1,
          3000, // 0.3% fee
          tickLower,
          tickUpper,
          amount0Desired,
          amount1Desired,
          0, // amount0Min - 允许滑点
          0, // amount1Min - 允许滑点
          owner.address, // recipient - 流动性 NFT 归 owner 所有
          deadline,
          { value: ethAmount } // 发送 ETH
        );

        console.log("  交易已发送，等待确认...");
        const receipt = await tx.wait();

        // 获取返回值（从事件中解析）
        const liquidityAddedEvent = receipt.logs.find((log: any) => {
          try {
            const parsed = liquidityManager.interface.parseLog(log);
            return parsed?.name === "LiquidityAdded";
          } catch {
            return false;
          }
        });

        let actualAmount0 = 0n;
        let actualAmount1 = 0n;
        let liquidityTokenId = 0n;

        if (liquidityAddedEvent) {
          const parsed =
            liquidityManager.interface.parseLog(liquidityAddedEvent);
          if (parsed) {
            liquidityTokenId = parsed.args[0];
            actualAmount0 = parsed.args[2];
            actualAmount1 = parsed.args[3];
          }
        }

        // 5. 检查余额变化（查看返还情况）
        await delay(2000);
        const ownerTokenBalanceAfter = await erc20Facet.balanceOf(
          owner.address
        );
        const ownerEthBalanceAfter = await ethers.provider.getBalance(
          owner.address
        );

        const tokenUsed = ownerTokenBalanceBefore - ownerTokenBalanceAfter;
        const tokenRefunded = isToken0
          ? tokenAmount - actualAmount0
          : tokenAmount - actualAmount1;

        const ethUsed = isToken0 ? actualAmount1 : actualAmount0;
        const ethRefunded = ethAmount - ethUsed;

        console.log("\n  ✅ 流动性添加成功！");
        console.log("  Gas 消耗:", receipt.gasUsed.toString());
        console.log("  交易哈希:", receipt.hash);

        console.log("\n  📊 代币使用情况:");
        console.log("    期望使用:", ethers.formatEther(tokenAmount), "tokens");
        console.log(
          "    实际使用:",
          ethers.formatEther(isToken0 ? actualAmount0 : actualAmount1),
          "tokens"
        );
        console.log(
          "    返还数量:",
          ethers.formatEther(tokenRefunded),
          "tokens"
        );
        console.log(
          "    返还比例:",
          ((Number(tokenRefunded) / Number(tokenAmount)) * 100).toFixed(2),
          "%"
        );

        console.log("\n  💰 ETH 使用情况:");
        console.log("    期望使用:", ethers.formatEther(ethAmount), "ETH");
        console.log("    实际使用:", ethers.formatEther(ethUsed), "ETH");
        console.log("    返还数量:", ethers.formatEther(ethRefunded), "ETH");
        console.log(
          "    返还比例:",
          ((Number(ethRefunded) / Number(ethAmount)) * 100).toFixed(2),
          "%"
        );

        console.log("\n  🎫 流动性 NFT Token ID:", liquidityTokenId.toString());

        // 6. 检查流动性位置
        await delay(2000);
        const tokenIds = await liquidityManager.getLiquidityTokenIds();
        console.log("\n  持有的流动性位置数量:", tokenIds.length);

        if (tokenIds.length > 0) {
          console.log(
            "  最新位置 Token ID:",
            tokenIds[tokenIds.length - 1].toString()
          );
        }

        // 7. 验证池子流动性
        const poolABI = [
          "function liquidity() external view returns (uint128)",
        ];
        const pool = await ethers.getContractAt(poolABI, poolAddress);
        const poolLiquidity = await pool.liquidity();
        console.log("  池子总流动性:", poolLiquidity.toString());

        expect(poolLiquidity).to.be.gt(0);
      } catch (error: any) {
        console.log("\n  ❌ 添加流动性失败:", error.message);

        if (error.message.includes("insufficient funds")) {
          console.log("  原因：ETH 不足");
        } else if (
          error.message.includes("ERC20: transfer amount exceeds balance")
        ) {
          console.log("  原因：代币余额不足");
        } else if (error.message.includes("ERC20: insufficient allowance")) {
          console.log("  原因：授权额度不足");
        } else if (error.message.includes("Price slippage check")) {
          console.log("  原因：价格滑点过大");
        }

        throw error;
      }
    });

    it("应该能查询流动性位置信息", async function () {
      let tokenIds;
      try {
        tokenIds = await liquidityManager.getLiquidityTokenIds();
      } catch (error: any) {
        console.log("  ⚠️  查询流动性位置失败:", error.message);
        this.skip();
      }

      if (!tokenIds || tokenIds.length === 0) {
        console.log("  ⚠️  没有流动性位置");
        this.skip();
      }

      console.log(`  查询到 ${tokenIds.length} 个流动性位置:`);

      for (let i = 0; i < tokenIds.length; i++) {
        const tokenId = tokenIds[i];
        const position = await liquidityManager.getPositionInfo(tokenId);

        console.log(`\n  位置 #${i + 1} (Token ID: ${tokenId}):`);
        console.log("    Token0:", position.token0);
        console.log("    Token1:", position.token1);
        console.log("    Fee:", position.fee);
        console.log("    流动性:", position.liquidity.toString());
        console.log("    价格下限 Tick:", position.tickLower.toString());
        console.log("    价格上限 Tick:", position.tickUpper.toString());
      }
    });

    it("应该能查询池子状态", async function () {
      try {
        const poolAddress = await liquidityManager.getUniswapV3Pool();

        if (poolAddress === ethers.ZeroAddress) {
          console.log("  ⚠️  池子未创建");
          this.skip();
        }

        const slot0 = await liquidityManager.getPoolSlot0();

        // 获取池子合约并查询流动性
        const pool = await ethers.getContractAt("IUniswapV3Pool", poolAddress);
        const liquidity = await pool.liquidity();

        console.log("  池子状态:");
        console.log("    池子地址:", poolAddress);
        console.log(
          "    当前价格 (sqrtPriceX96):",
          slot0.sqrtPriceX96.toString()
        );

        if (slot0.sqrtPriceX96 === 0n) {
          console.log("    ⚠️  池子未初始化（价格为0）");
          console.log("    提示：请先运行 '应该能初始化流动性池价格' 测试");
        } else {
          // 计算实际价格（简化显示）
          const price = Number(slot0.sqrtPriceX96) ** 2 / 2 ** 192;
          console.log("    实际价格比率:", price.toExponential(4));
        }

        console.log("    当前 Tick:", slot0.tick.toString());
        console.log("    观察索引:", slot0.observationIndex.toString());
        console.log("    观察基数:", slot0.observationCardinality.toString());
        console.log("    总流动性:", liquidity.toString());

        if (liquidity === 0n) {
          console.log("    ⚠️  池子没有流动性");
          console.log("    提示：需要添加流动性才能进行交易");
        }
      } catch (error: any) {
        if (
          error.message.includes("Pool not created") ||
          error.message.includes("not initialized")
        ) {
          console.log("  ⚠️  流动性池未创建或未初始化");
          this.skip();
        } else {
          console.log("  ❌ 查询池子状态失败:", error.message);
          throw error;
        }
      }
    });
  });

  describe("🔐 5. 权限和配置", function () {
    it("非 owner 不能设置税费白名单", async function () {
      try {
        await expect(
          shibMemeFacet.connect(user1).setTaxExempt(user2.address, true)
        ).to.be.revertedWith("LibDiamond: Must be contract owner");
        console.log("  ✓ 权限验证通过");
      } catch (error: any) {
        // 如果错误消息不匹配，尝试其他匹配模式
        if (
          error.message.includes("Must be contract owner") ||
          error.message.includes("Ownable")
        ) {
          console.log("  ✓ 权限验证通过");
        } else {
          throw error;
        }
      }
    });

    it("owner 可以设置税费白名单", async function () {
      try {
        await delay(3000); // 等待避免 nonce 冲突

        await executeWithRetry(
          () => shibMemeFacet.setTaxExempt(user1.address, true),
          "Set tax exempt"
        );

        const isExempt = await shibMemeFacet.isTaxExempt(user1.address);
        expect(isExempt).to.be.true;
        console.log("  ✓ 税费白名单设置成功");

        // 恢复状态
        await delay(2000);
        await shibMemeFacet.setTaxExempt(user1.address, false);
      } catch (error: any) {
        console.log("  ❌ 设置税费白名单失败:", error.message);
        throw error;
      }
    });

    it("应该能读取所有配置参数", async function () {
      const maxTxAmount = await shibMemeFacet.getMaxTransactionAmount();
      const dailyLimit = await shibMemeFacet.getDailyTransactionLimit();
      const taxRecipient = await shibMemeFacet.getTaxRecipient();

      console.log("  配置参数:");
      console.log(
        "    最大交易额度:",
        ethers.formatEther(maxTxAmount),
        "tokens"
      );
      console.log("    每日交易限制:", dailyLimit.toString(), "笔");
      console.log("    税费接收地址:", taxRecipient);

      expect(maxTxAmount).to.be.gt(0);
      expect(dailyLimit).to.be.gt(0);
      expect(taxRecipient).to.be.properAddress;
    });

    it("owner 可以更新配置参数", async function () {
      const newMaxTx = ethers.parseEther("20000");

      try {
        await executeWithRetry(
          () => shibMemeFacet.updateMaxTransactionAmount(newMaxTx),
          "Update max tx"
        );

        const maxTxAmount = await shibMemeFacet.getMaxTransactionAmount();
        expect(maxTxAmount).to.equal(newMaxTx);

        console.log(
          "  ✓ 最大交易额度更新成功:",
          ethers.formatEther(newMaxTx),
          "tokens"
        );

        // 恢复原始配置
        await executeWithRetry(
          () =>
            shibMemeFacet.updateMaxTransactionAmount(
              ethers.parseEther("10000")
            ),
          "Restore max tx"
        );

        console.log("  ✓ 配置参数更新成功");
        console.log("  ⚠️  注意：每日交易限制没有更新函数，跳过测试");
      } catch (error: any) {
        console.log("  ❌ 更新配置失败:", error.message);
        throw error;
      }
    });
  });

  describe("⛽ 6. Gas 消耗分析", function () {
    it("普通转账的 gas 消耗", async function () {
      const amount = ethers.parseEther("100");
      const receipt = await executeWithRetry(
        () => erc20Facet.transfer(user1.address, amount),
        "Normal transfer"
      );

      console.log("  普通转账 Gas:", receipt.gasUsed.toString());
      expect(receipt.gasUsed).to.be.lt(100000n);
    });

    it("税费转账的 gas 消耗", async function () {
      const amount = ethers.parseEther("5000");

      const receipt = await executeWithRetry(
        () => shibMemeFacet.connect(user1).sbtransfer(user2.address, amount),
        "Tax transfer"
      );

      console.log("  税费转账 Gas:", receipt.gasUsed.toString());
      expect(receipt.gasUsed).to.be.lt(200000n);
    });

    it("授权操作的 gas 消耗", async function () {
      const amount = ethers.parseEther("1000");
      try {
        const receipt = await executeWithRetry(
          () => erc20Facet.approve(user1.address, amount),
          "Approve"
        );

        console.log("  授权操作 Gas:", receipt.gasUsed.toString());
        expect(receipt.gasUsed).to.be.lt(100000n);
      } catch (error: any) {
        console.log("  ❌ 授权操作失败:", error.message);
        throw error;
      }
    });
  });

  describe("🔒 7. 边界和安全测试", function () {
    it("应该处理最大交易额度边界", async function () {
      try {
        const maxTxAmount = await shibMemeFacet.getMaxTransactionAmount();

        // 确保有足够余额
        const balance = await erc20Facet.balanceOf(user1.address);
        if (balance < maxTxAmount) {
          await executeWithRetry(
            () => erc20Facet.transfer(user1.address, maxTxAmount),
            "Fund user1"
          );
        }

        await delay(2000); // 等待确保余额更新

        // 恰好等于最大额度应该成功
        const tx = await shibMemeFacet
          .connect(user1)
          .sbtransfer(user2.address, maxTxAmount);
        const receipt = await tx.wait();

        expect(receipt).to.not.be.null;
        expect(receipt).to.not.be.undefined;
        expect(receipt.status).to.equal(1);

        console.log(
          `  ✓ 最大交易额度测试通过: ${ethers.formatEther(maxTxAmount)} tokens`
        );
      } catch (error: any) {
        console.log("  ❌ 最大交易额度测试失败:", error.message);
        throw error;
      }
    });

    it("零地址转账应该失败", async function () {
      const amount = ethers.parseEther("100");

      try {
        await expect(
          erc20Facet.transfer(ethers.ZeroAddress, amount)
        ).to.be.revertedWith("Transfer to zero address");
        console.log("  ✓ 零地址保护正常");
      } catch (error: any) {
        // 如果错误消息不匹配，检查是否包含零地址相关错误
        if (
          error.message.includes("zero address") ||
          error.message.includes("ZeroAddress")
        ) {
          console.log("  ✓ 零地址保护正常");
        } else {
          throw error;
        }
      }
    });

    it("余额不足应该失败", async function () {
      const balance = await erc20Facet.balanceOf(user2.address);
      const excessAmount = balance + ethers.parseEther("1");

      await expect(
        erc20Facet.connect(user2).transfer(user1.address, excessAmount)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");

      console.log("  ✓ 余额检查正常");
    });

    it("超过最大交易额度应该失败", async function () {
      try {
        const maxTxAmount = await shibMemeFacet.getMaxTransactionAmount();
        const excessAmount = maxTxAmount + ethers.parseEther("1");

        // 确保有足够余额
        await executeWithRetry(
          () => erc20Facet.transfer(user1.address, excessAmount),
          "Fund user1"
        );

        await expect(
          shibMemeFacet.connect(user1).sbtransfer(user2.address, excessAmount)
        ).to.be.revertedWith("Transfer amount exceeds maximum");

        console.log("  ✓ 交易额度限制正常");
      } catch (error: any) {
        if (
          error.message.includes("exceeds maximum") ||
          error.message.includes("exceeds")
        ) {
          console.log("  ✓ 交易额度限制正常");
        } else {
          console.log("  ❌ 测试失败:", error.message);
          throw error;
        }
      }
    });

    it("授权额度不足应该失败", async function () {
      const approvedAmount = ethers.parseEther("100");
      const transferAmount = ethers.parseEther("200");

      await executeWithRetry(
        () => erc20Facet.approve(user1.address, approvedAmount),
        "Approve"
      );

      await expect(
        erc20Facet
          .connect(user1)
          .transferFrom(owner.address, user2.address, transferAmount)
      ).to.be.reverted;

      console.log("  ✓ 授权额度检查正常");
    });
  });

  describe("📋 8. 事件验证", function () {
    it("转账应该触发正确的事件", async function () {
      const amount = ethers.parseEther("100");

      try {
        await delay(2000); // 等待避免 nonce 问题

        const tx = await erc20Facet.transfer(user1.address, amount);
        const receipt = await tx.wait();

        expect(receipt).to.not.be.null;
        expect(receipt).to.not.be.undefined;
        expect(receipt.status).to.equal(1);

        // 验证事件
        const transferEvent = receipt.logs.find((log: any) => {
          try {
            const parsed = erc20Facet.interface.parseLog(log);
            return parsed?.name === "Transfer";
          } catch {
            return false;
          }
        });

        expect(transferEvent).to.not.be.undefined;
        console.log("  ✓ Transfer 事件验证通过");
      } catch (error: any) {
        console.log("  ❌ Transfer 事件验证失败:", error.message);
        throw error;
      }
    });

    it("授权应该触发 Approval 事件", async function () {
      const amount = ethers.parseEther("500");

      try {
        await delay(5000); // 等待更长时间避免 nonce 问题

        const tx = await erc20Facet.approve(user1.address, amount);
        const receipt = await tx.wait();

        expect(receipt).to.not.be.null;
        expect(receipt).to.not.be.undefined;
        expect(receipt.status).to.equal(1);

        // 验证事件
        const approvalEvent = receipt.logs.find((log: any) => {
          try {
            const parsed = erc20Facet.interface.parseLog(log);
            return parsed?.name === "Approval";
          } catch {
            return false;
          }
        });

        expect(approvalEvent).to.not.be.undefined;
        console.log("  ✓ Approval 事件验证通过");
      } catch (error: any) {
        console.log("  ❌ Approval 事件验证失败:", error.message);
        throw error;
      }
    });

    it("税费转账应该触发多个事件", async function () {
      const amount = ethers.parseEther("5000");

      const tx = await shibMemeFacet
        .connect(user1)
        .sbtransfer(user2.address, amount);
      const receipt = await tx.wait();

      expect(receipt.logs.length).to.be.gte(2);
      console.log("  ✓ 税费转账触发了", receipt.logs.length, "个事件");
    });
  });

  // 测试总结
  after(async function () {
    const network = await ethers.provider.getNetwork();

    console.log("\n" + "=".repeat(60));
    console.log("📊 测试总结");
    console.log("=".repeat(60));
    console.log("💎 Diamond 地址:", diamondAddress);
    console.log("🌐 网络:", network.name, `(Chain ID: ${network.chainId})`);
    console.log(
      "🪙 代币:",
      deploymentInfo.token.name,
      `(${deploymentInfo.token.symbol})`
    );
    console.log("📦 总供应量:", deploymentInfo.token.totalSupply, "tokens");
    console.log("✅ 所有测试完成！");
    console.log("=".repeat(60) + "\n");
  });
});
