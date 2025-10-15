// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

// 角色定义
bytes32 constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
bytes32 constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
bytes32 constant MINTER_ROLE = keccak256("MINTER_ROLE");

contract Constants {
    function getPauserRole() public pure returns (bytes32) {
        return PAUSER_ROLE;
    }

    function getUpgraderRole() public pure returns (bytes32) {
        return UPGRADER_ROLE;
    }

    function getMinterRole() public pure returns (bytes32) {
        return MINTER_ROLE;
    }
}
