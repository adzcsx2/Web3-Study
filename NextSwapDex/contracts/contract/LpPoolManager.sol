// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "../types/NextswapStructs.sol";
import "./LpPools.sol";

import "../contract/swap/periphery/NonfungiblePositionManager.sol";

contract LpPoolManager {
    LpPool[] public lpPools;

    constructor() {}

    function addLpPool(LpPoolConfig memory _poolConfig) public {
        lpPools.push(new LpPool(_poolConfig));
    }

    function getLpPools() public view returns (LpPool[] memory) {
        return lpPools;
    }
}
