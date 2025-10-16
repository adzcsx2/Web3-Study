// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
//解质押请求结构体
struct UnstakeRequest {
    uint256 amount;
    uint256 unlockBlock;
}
