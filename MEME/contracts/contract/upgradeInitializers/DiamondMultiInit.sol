// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

//******************************************************************************\
//* 作者: Nick Mudge <nick@perfectabstractions.com> (https://twitter.com/mudgen)
//* EIP-2535 Diamonds: https://eips.ethereum.org/EIPS/eip-2535
//*
//* 钻石合约的实现
//******************************************************************************/

import { LibDiamond } from "../libraries/LibDiamond.sol";

// 地址和调用数据长度不匹配的错误
error AddressAndCalldataLengthDoNotMatch(uint256 _addressesLength, uint256 _calldataLength);

// 钻石多重初始化合约，用于在单次升级中执行多个初始化函数
contract DiamondMultiInit {

    // 此函数在`diamondCut`函数的第三个参数中提供
    // `diamondCut`函数执行此函数以执行单个升级的多个初始化函数

    /// @notice 执行多个初始化函数
    /// @param _addresses 要调用的合约地址数组
    /// @param _calldata 对应的调用数据数组
    function multiInit(address[] calldata _addresses, bytes[] calldata _calldata) external {
        if(_addresses.length != _calldata.length) {
            revert AddressAndCalldataLengthDoNotMatch(_addresses.length, _calldata.length);
        }
        // 遍历所有地址和调用数据
        for(uint i; i < _addresses.length; i++) {
            LibDiamond.initializeDiamondCut(_addresses[i], _calldata[i]);
        }
    }
}
