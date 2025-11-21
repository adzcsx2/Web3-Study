// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

//******************************************************************************\
//* 作者: Nick Mudge <nick@perfectabstractions.com> (https://twitter.com/mudgen)
//* EIP-2535 Diamonds: https://eips.ethereum.org/EIPS/eip-2535
//******************************************************************************/

import { IDiamondCut } from "../interfaces/IDiamondCut.sol";
import { LibDiamond } from "../libraries/LibDiamond.sol";

// 记住要将DiamondLoupeFacet中的放大镜(loupe)函数添加到钻石合约中
// 放大镜函数是EIP2535钻石标准所要求的

// 钻石切割切面合约，用于管理钻石合约中的函数
contract DiamondCutFacet is IDiamondCut {
    /// @notice 添加/替换/移除任意数量的函数，并可选择性地使用delegatecall执行函数
    /// @param _diamondCut 包含切面地址和函数选择器
    /// @param _init 要执行_calldata的合约或切面地址
    /// @param _calldata 函数调用，包括函数选择器和参数
    ///                  _calldata通过delegatecall在_init上执行
    function diamondCut(
        FacetCut[] calldata _diamondCut,
        address _init,
        bytes calldata _calldata
    ) external override {
        LibDiamond.enforceIsContractOwner();
        LibDiamond.diamondCut(_diamondCut, _init, _calldata);
    }
}
