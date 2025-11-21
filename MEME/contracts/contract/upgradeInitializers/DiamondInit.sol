// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

//******************************************************************************\
//* 作者: Nick Mudge <nick@perfectabstractions.com> (https://twitter.com/mudgen)
//* EIP-2535 Diamonds: https://eips.ethereum.org/EIPS/eip-2535
//*
//* 钻石合约的实现
/******************************************************************************/

import {LibDiamond} from "../libraries/LibDiamond.sol";
import {IDiamondLoupe} from "../interfaces/IDiamondLoupe.sol";
import {IDiamondCut} from "../interfaces/IDiamondCut.sol";
import {IERC173} from "../interfaces/IERC173.sol";
import {IERC165} from "../interfaces/IERC165.sol";
import {IERC20} from "../interfaces/IERC20.sol";

// 如果你想从部署脚本部署带有数据的钻石合约，预期这个合约会被自定义
// 使用init函数来初始化钻石的状态变量。如果需要，可以为init函数添加参数

// 向`init`函数或在这里添加的其他函数添加参数可以使单个部署的DiamondInit合约
// 在升级中可重用，并可用于多个钻石合约

// 钻石初始化合约，用于初始化钻石合约的状态
contract DiamondInit {
    // 你可以向这个函数添加参数以便传入数据来设置你自己的状态变量
    function init() external {
        // 添加ERC165数据
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        ds.supportedInterfaces[type(IERC165).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondCut).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondLoupe).interfaceId] = true;
        ds.supportedInterfaces[type(IERC173).interfaceId] = true;
        ds.supportedInterfaces[type(IERC20).interfaceId] = true;

        // 添加你自己的状态变量
        // EIP-2535指定`diamondCut`函数接受两个可选参数：address _init和bytes calldata _calldata
        // 这些参数用于通过delegatecall执行任意函数，以便在部署或升级期间在钻石中设置状态变量
        // 更多信息在这里：https://eips.ethereum.org/EIPS/eip-2535#diamond-interface
    }
}
