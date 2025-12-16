// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "../types/NextswapStructs.sol";
import "./LpPools.sol";

contract LpPoolManager {
    LpPool[] public lpPools;

    function addLpPool(LpPoolConfig memory _poolConfig) public {
        LpPool newPool = new LpPool(_poolConfig);
        lpPools.push(newPool);
    }

    function getLpPools() public view returns (LpPool[] memory) {
        return lpPools;
    }
}
