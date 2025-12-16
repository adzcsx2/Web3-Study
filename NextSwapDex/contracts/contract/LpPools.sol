// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "../types/NextswapStructs.sol";

contract LpPool {
    // 这里是 LpPools 合约的代码

    LpPoolConfig public poolConfig;

    constructor(LpPoolConfig memory _initialConfig) {
        // 构造函数逻辑
        initPoolConfig(_initialConfig);
    }

    // 需处理tokenA和tokenB地址的前后顺序
    function initPoolConfig(LpPoolConfig memory _newConfig) internal {
        // 设置新的池配置逻辑

        if (_newConfig.tokenA > _newConfig.tokenB) {
            // 交换地址顺序
            (address temp, ) = (_newConfig.tokenA, _newConfig.tokenB);
            _newConfig.tokenA = _newConfig.tokenB;
            _newConfig.tokenB = temp;
        }
        poolConfig = _newConfig;
    }
}
