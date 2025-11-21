// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { LibDiamond } from "../libraries/LibDiamond.sol";
import { IERC173 } from "../interfaces/IERC173.sol";

// 所有权切面合约，用于管理钻石合约的所有权
contract OwnershipFacet is IERC173 {
    /// @notice 将合约所有权转移给新所有者
    /// @param _newOwner 新所有者的地址
    function transferOwnership(address _newOwner) external override {
        LibDiamond.enforceIsContractOwner();
        LibDiamond.setContractOwner(_newOwner);
    }

    /// @notice 获取合约的所有者地址
    /// @return owner_ 合约所有者地址
    function owner() external override view returns (address owner_) {
        owner_ = LibDiamond.contractOwner();
    }
}
