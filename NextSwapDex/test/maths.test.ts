import { expect } from "chai";
import { priceToSqrtRatioX96 } from "../scripts/utils/Maths";
import { encodeSqrtRatioX96, TickMath } from "@uniswap/v3-sdk";
import JSBI from "jsbi";

describe("Maths Utils 测试", function () {
  describe("priceToSqrtRatioX96", function () {
    it("应该正确处理 USDC(6位)-DAI(18位) 1:1 价格", function () {
      // USDC 作为 token0 (6位)，DAI 作为 token1 (18位)
      // 价格 1:1 表示 1 USDC = 1 DAI（美元价值相等）
      const sqrtPriceX96 = priceToSqrtRatioX96(6, 18, 1);

      // 预期值计算:
      // amount0 = 1e6 (1 USDC in wei)
      // amount1 = 1e18 (1 DAI in wei)
      // sqrt(amount1/amount0) = sqrt(1e18/1e6) = sqrt(1e12) = 1e6
      // sqrtPriceX96 = 1e6 * 2^96 = 1000000 * 79228162514264337593543950336 = 79228162514264337593543950336000000
      const expectedSqrtPrice = JSBI.BigInt(
        "79228162514264337593543950336000000"
      );

      console.log("计算结果:", sqrtPriceX96.toString());
      console.log("预期结果:", expectedSqrtPrice.toString());

      expect(sqrtPriceX96.toString()).to.equal(expectedSqrtPrice.toString());
    });

    it("应该正确处理 DAI(18位)-USDC(6位) 1:1 价格", function () {
      // DAI 作为 token0 (18位)，USDC 作为 token1 (6位)
      // 价格 1:1 表示 1 DAI = 1 USDC（美元价值相等）
      const sqrtPriceX96 = priceToSqrtRatioX96(18, 6, 1);

      // 预期值计算:
      // amount0 = 1e18 (1 DAI in wei)
      // amount1 = 1e6 (1 USDC in wei)
      // sqrt(amount1/amount0) = sqrt(1e6/1e18) = sqrt(1e-12) = 1e-6 = 0.000001
      // sqrtPriceX96 = 1e-6 * 2^96 = 0.000001 * 79228162514264337593543950336
      //              = 79228162514264337593543.950336 ≈ 79228162514264337593543
      const expectedSqrtPrice = JSBI.BigInt("79228162514264337593543");

      console.log("计算结果:", sqrtPriceX96.toString());
      console.log("预期结果:", expectedSqrtPrice.toString());

      expect(sqrtPriceX96.toString()).to.equal(expectedSqrtPrice.toString());
    });

    it("应该正确处理 USDC(6位)-DAI(18位) 0.99:1 价格", function () {
      const sqrtPriceX96 = priceToSqrtRatioX96(6, 18, 0.99);

      console.log("0.99 价格 sqrtPriceX96:", sqrtPriceX96.toString());

      // 应该小于 1:1 的价格
      const sqrtPrice1to1 = priceToSqrtRatioX96(6, 18, 1);
      expect(JSBI.lessThan(sqrtPriceX96, sqrtPrice1to1)).to.be.true;

      // 检查 tick 是否合理
      const tick = TickMath.getTickAtSqrtRatio(sqrtPriceX96);
      console.log("对应的 tick:", tick);
      expect(tick).to.be.a("number");
    });

    it("应该正确处理 USDC(6位)-DAI(18位) 1.01:1 价格", function () {
      const sqrtPriceX96 = priceToSqrtRatioX96(6, 18, 1.01);

      console.log("1.01 价格 sqrtPriceX96:", sqrtPriceX96.toString());

      // 应该大于 1:1 的价格
      const sqrtPrice1to1 = priceToSqrtRatioX96(6, 18, 1);
      expect(JSBI.greaterThan(sqrtPriceX96, sqrtPrice1to1)).to.be.true;

      // 检查 tick 是否合理
      const tick = TickMath.getTickAtSqrtRatio(sqrtPriceX96);
      console.log("对应的 tick:", tick);
      expect(tick).to.be.a("number");
    });

    it("应该正确处理相同小数位的代币 1:1 价格", function () {
      // 18 位 - 18 位（如 DAI-USDT）
      const sqrtPriceX96 = priceToSqrtRatioX96(18, 18, 1);

      // sqrt(1) * 2^96 = 2^96
      const expectedSqrtPrice = JSBI.BigInt("79228162514264337593543950336");

      console.log("计算结果:", sqrtPriceX96.toString());
      console.log("预期结果:", expectedSqrtPrice.toString());

      expect(sqrtPriceX96.toString()).to.equal(expectedSqrtPrice.toString());
    });

    it("应该正确处理小数价格（带多位小数）", function () {
      // 测试 1 USDC = 0.9999 DAI
      const sqrtPriceX96 = priceToSqrtRatioX96(6, 18, 0.9999);

      console.log("0.9999 价格 sqrtPriceX96:", sqrtPriceX96.toString());

      // 应该略小于 1:1 的价格
      const sqrtPrice1to1 = priceToSqrtRatioX96(6, 18, 1);
      expect(JSBI.lessThan(sqrtPriceX96, sqrtPrice1to1)).to.be.true;

      // 差异应该很小
      const diff = JSBI.subtract(sqrtPrice1to1, sqrtPriceX96);
      const percentage = JSBI.divide(
        JSBI.multiply(diff, JSBI.BigInt(10000)),
        sqrtPrice1to1
      );
      console.log("与 1:1 的差异百分比:", percentage.toString(), "bp");

      // 差异应该小于 1% (100bp)
      expect(JSBI.lessThan(percentage, JSBI.BigInt(100))).to.be.true;
    });

    it("应该正确处理极端价格比例", function () {
      // 测试 1 WBTC(8位) = 30000 USDC(6位)
      const sqrtPriceX96 = priceToSqrtRatioX96(8, 6, 30000);

      console.log("30000 价格 sqrtPriceX96:", sqrtPriceX96.toString());

      // 检查 tick 是否在合理范围内
      const tick = TickMath.getTickAtSqrtRatio(sqrtPriceX96);
      console.log("对应的 tick:", tick);

      // Uniswap V3 的 tick 范围是 [-887272, 887272]
      expect(tick).to.be.greaterThan(-887272);
      expect(tick).to.be.lessThan(887272);
    });

    it("应该拒绝非正数价格", function () {
      expect(() => priceToSqrtRatioX96(6, 18, 0)).to.throw(
        "priceRatio must be positive"
      );
      expect(() => priceToSqrtRatioX96(6, 18, -1)).to.throw(
        "priceRatio must be positive"
      );
    });

    it("应该与 Uniswap SDK 的结果一致", function () {
      // 使用 Uniswap SDK 直接计算
      const amount0 = JSBI.BigInt("1000000"); // 1 USDC
      const amount1 = JSBI.BigInt("1000000000000000000"); // 1 DAI

      const directResult = encodeSqrtRatioX96(amount1, amount0);
      const ourResult = priceToSqrtRatioX96(6, 18, 1);

      console.log("SDK 直接计算:", directResult.toString());
      console.log("我们的计算:", ourResult.toString());

      expect(ourResult.toString()).to.equal(directResult.toString());
    });
  });
});
