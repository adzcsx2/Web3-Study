// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
//******************************************************************************\
//* 作者: Nick Mudge <nick@perfectabstractions.com> (https://twitter.com/mudgen)
//* EIP-2535 Diamonds: https://eips.ethereum.org/EIPS/eip-2535
//******************************************************************************/

// DiamondLoupeFacet中的函数必须添加到钻石合约中
// EIP-2535钻石标准要求这些函数

import { LibDiamond } from  "../libraries/LibDiamond.sol";
import { IDiamondLoupe } from "../interfaces/IDiamondLoupe.sol";
import { IERC165 } from "../interfaces/IERC165.sol";

// 钻石放大镜切面合约，用于查看钻石合约的结构
contract DiamondLoupeFacet is IDiamondLoupe, IERC165 {
    // 钻石放大镜函数
    ////////////////////////////////////////////////////////////////////
    /// 预期这些函数会被工具频繁调用
    ///
    // struct Facet {
    //     address facetAddress;
    //     bytes4[] functionSelectors;
    // }
    /// @notice 获取所有切面及其选择器
    /// @return facets_ 切面数组
    function facets() external override view returns (Facet[] memory facets_) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        uint256 selectorCount = ds.selectors.length;
        // 创建一个设置为最大可能大小的数组
        facets_ = new Facet[](selectorCount);
        // 创建一个用于计算每个切面选择器数量的数组
        uint16[] memory numFacetSelectors = new uint16[](selectorCount);
        // 切面总数
        uint256 numFacets;
        // 遍历函数选择器
        for (uint256 selectorIndex; selectorIndex < selectorCount; selectorIndex++) {
            bytes4 selector = ds.selectors[selectorIndex];
            address facetAddress_ = ds.facetAddressAndSelectorPosition[selector].facetAddress;
            bool continueLoop = false;
            // 为选择器找到functionSelectors数组并将选择器添加到其中
            for (uint256 facetIndex; facetIndex < numFacets; facetIndex++) {
                if (facets_[facetIndex].facetAddress == facetAddress_) {
                    facets_[facetIndex].functionSelectors[numFacetSelectors[facetIndex]] = selector;
                    numFacetSelectors[facetIndex]++;
                    continueLoop = true;
                    break;
                }
            }
            // 如果选择器的functionSelectors数组存在则继续循环
            if (continueLoop) {
                continueLoop = false;
                continue;
            }
            // 为选择器创建新的functionSelectors数组
            facets_[numFacets].facetAddress = facetAddress_;
            facets_[numFacets].functionSelectors = new bytes4[](selectorCount);
            facets_[numFacets].functionSelectors[0] = selector;
            numFacetSelectors[numFacets] = 1;
            numFacets++;
        }
        for (uint256 facetIndex; facetIndex < numFacets; facetIndex++) {
            uint256 numSelectors = numFacetSelectors[facetIndex];
            bytes4[] memory selectors = facets_[facetIndex].functionSelectors;
            // 设置选择器数量
            assembly {
                mstore(selectors, numSelectors)
            }
        }
        // 设置切面数量
        assembly {
            mstore(facets_, numFacets)
        }
    }

    /// @notice 获取特定切面支持的所有函数选择器
    /// @param _facet 切面地址
    /// @return _facetFunctionSelectors 与切面地址关联的选择器
    function facetFunctionSelectors(address _facet) external override view returns (bytes4[] memory _facetFunctionSelectors) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        uint256 selectorCount = ds.selectors.length;
        uint256 numSelectors;
        _facetFunctionSelectors = new bytes4[](selectorCount);
        // 遍历函数选择器
        for (uint256 selectorIndex; selectorIndex < selectorCount; selectorIndex++) {
            bytes4 selector = ds.selectors[selectorIndex];
            address facetAddress_ = ds.facetAddressAndSelectorPosition[selector].facetAddress;
            if (_facet == facetAddress_) {
                _facetFunctionSelectors[numSelectors] = selector;
                numSelectors++;
            }
        }
        // 设置数组中的选择器数量
        assembly {
            mstore(_facetFunctionSelectors, numSelectors)
        }
    }

    /// @notice 获取钻石使用的所有切面地址
    /// @return facetAddresses_ 切面地址数组
    function facetAddresses() external override view returns (address[] memory facetAddresses_) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        uint256 selectorCount = ds.selectors.length;
        // 创建一个设置为最大可能大小的数组
        facetAddresses_ = new address[](selectorCount);
        uint256 numFacets;
        // 遍历函数选择器
        for (uint256 selectorIndex; selectorIndex < selectorCount; selectorIndex++) {
            bytes4 selector = ds.selectors[selectorIndex];
            address facetAddress_ = ds.facetAddressAndSelectorPosition[selector].facetAddress;
            bool continueLoop = false;
            // 检查是否已经收集了该地址，如果已收集则跳出循环
            for (uint256 facetIndex; facetIndex < numFacets; facetIndex++) {
                if (facetAddress_ == facetAddresses_[facetIndex]) {
                    continueLoop = true;
                    break;
                }
            }
            // 如果已经有该地址则继续循环
            if (continueLoop) {
                continueLoop = false;
                continue;
            }
            // 包含地址
            facetAddresses_[numFacets] = facetAddress_;
            numFacets++;
        }
        // 设置数组中的切面地址数量
        assembly {
            mstore(facetAddresses_, numFacets)
        }
    }

    /// @notice 获取支持给定选择器的切面地址
    /// @dev 如果未找到切面则返回address(0)
    /// @param _functionSelector 函数选择器
    /// @return facetAddress_ 切面地址
    function facetAddress(bytes4 _functionSelector) external override view returns (address facetAddress_) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        facetAddress_ = ds.facetAddressAndSelectorPosition[_functionSelector].facetAddress;
    }

    // 实现ERC-165标准
    function supportsInterface(bytes4 _interfaceId) external override view returns (bool) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        return ds.supportedInterfaces[_interfaceId];
    }
}
