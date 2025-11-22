// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title TickMath
 * @notice Tick 数学计算辅助库
 * @dev 用于 Uniswap V3 的 tick 和价格转换
 */
library TickMath {
    /// @dev 最小 tick 值
    int24 internal constant MIN_TICK = -887272;
    /// @dev 最大 tick 值
    int24 internal constant MAX_TICK = -MIN_TICK;

    /// @dev 最小 sqrt ratio
    uint160 internal constant MIN_SQRT_RATIO = 4295128739;
    /// @dev 最大 sqrt ratio
    uint160 internal constant MAX_SQRT_RATIO =
        1461446703485210103287273052203988822378723970342;

    /**
     * @notice 获取最接近的可用 tick
     * @param tick 目标 tick
     * @param tickSpacing tick 间距
     * @return 最接近的可用 tick
     */
    function nearestUsableTick(
        int24 tick,
        int24 tickSpacing
    ) internal pure returns (int24) {
        require(tickSpacing > 0, "TickSpacing must be positive");
        require(tick >= MIN_TICK && tick <= MAX_TICK, "Tick out of range");

        int24 rounded = tick / tickSpacing;
        if (tick < 0 && tick % tickSpacing != 0) rounded--;

        return rounded * tickSpacing;
    }

    /**
     * @notice 获取全范围 tick
     * @param tickSpacing tick 间距
     * @return tickLower 下限 tick
     * @return tickUpper 上限 tick
     */
    function getFullRangeTicks(
        int24 tickSpacing
    ) internal pure returns (int24 tickLower, int24 tickUpper) {
        tickLower = nearestUsableTick(MIN_TICK, tickSpacing);
        tickUpper = nearestUsableTick(MAX_TICK, tickSpacing);
    }

    /**
     * @notice 获取当前 tick 附近的范围
     * @param currentTick 当前 tick
     * @param tickSpacing tick 间距
     * @param tickRange 范围大小（tick 数量）
     * @return tickLower 下限 tick
     * @return tickUpper 上限 tick
     */
    function getRangeTicks(
        int24 currentTick,
        int24 tickSpacing,
        int24 tickRange
    ) internal pure returns (int24 tickLower, int24 tickUpper) {
        int24 offset = tickRange * tickSpacing;
        tickLower = nearestUsableTick(currentTick - offset, tickSpacing);
        tickUpper = nearestUsableTick(currentTick + offset, tickSpacing);

        // 确保在有效范围内
        if (tickLower < MIN_TICK) tickLower = MIN_TICK;
        if (tickUpper > MAX_TICK) tickUpper = MAX_TICK;
    }
}
