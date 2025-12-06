//  SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

abstract contract NextSwapEvents {
    // role transfer event
    event RoleTransferred(
        bytes32 indexed role,
        address indexed from,
        address indexed to
    );
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);
    event TimelockUpdated(
        address indexed oldTimelock,
        address indexed newTimelock
    );
    event EmergencyRoleGranted(
        bytes32 indexed role,
        address indexed account,
        address indexed adminAddress
    );
    event EmergencyRoleRevoked(
        bytes32 indexed role,
        address indexed account,
        address indexed adminAddress
    );
    event EmergencyTokenRecovered(
        address indexed token,
        address indexed to,
        uint256 amount,
        address indexed adminAddress
    );
    event AirdropTokensWithdrawn(address indexed to, uint256 amount);
    event AirdropMerkleRootUpdated(bytes32 newMerkleRoot);
}
