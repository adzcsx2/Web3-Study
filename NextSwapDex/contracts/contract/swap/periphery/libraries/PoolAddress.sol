// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.5.0;

/// @title 提供从工厂合约、代币和手续费派生池地址的函数
library PoolAddress {
    bytes32 internal constant POOL_INIT_CODE_HASH =
        0xa598dd2fba360510c5a8f02f44423a4468e902df5857dbce3ca162a43a3a31ff;

    /// @notice 池的标识键
    struct PoolKey {
        address token0;
        address token1;
        uint24 fee;
    }

    /// @notice 返回PoolKey：带有匹配手续费级别的排序代币
    /// @param tokenA 池的第一个代币，未排序
    /// @param tokenB 池的第二个代币，未排序
    /// @param fee 池的手续费级别
    /// @return Poolkey 池的详细信息，包含排序后的token0和token1分配
    function getPoolKey(
        address tokenA,
        address tokenB,
        uint24 fee
    ) internal pure returns (PoolKey memory) {
        if (tokenA > tokenB) (tokenA, tokenB) = (tokenB, tokenA);
        return PoolKey({token0: tokenA, token1: tokenB, fee: fee});
    }

    /// @notice 确定性地计算给定工厂合约和PoolKey的池地址
    /// @param factory Nextswap V3工厂合约地址
    /// @param key PoolKey
    /// @return pool V3池的合约地址
    function computeAddress(
        address factory,
        PoolKey memory key
    ) internal pure returns (address pool) {
        require(key.token0 < key.token1);
        pool = address(
            uint160(
                uint256(
                    keccak256(
                        abi.encodePacked(
                            hex"ff",
                            factory,
                            keccak256(
                                abi.encode(key.token0, key.token1, key.fee)
                            ),
                            POOL_INIT_CODE_HASH
                        )
                    )
                )
            )
        );
    }
}
