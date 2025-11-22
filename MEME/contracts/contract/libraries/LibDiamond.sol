// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

//******************************************************************************\
//* 作者: Nick Mudge <nick@perfectabstractions.com> (https://twitter.com/mudgen)
//* EIP-2535 Diamonds: https://eips.ethereum.org/EIPS/eip-2535
//******************************************************************************/
import {IDiamond} from "../interfaces/IDiamond.sol";
import {IDiamondCut} from "../interfaces/IDiamondCut.sol";

// 记住要将DiamondLoupeFacet中的放大镜(loupe)函数添加到钻石合约中
// 放大镜函数是EIP2535钻石标准所要求的

// 没有提供要添加的选择器时抛出的错误
error NoSelectorsGivenToAdd();
// 不是合约所有者时抛出的错误
error NotContractOwner(address _user, address _contractOwner);
// 为切面切割操作没有提供选择器时抛出的错误
error NoSelectorsProvidedForFacetForCut(address _facetAddress);
// 不能将选择器添加到零地址时抛出的错误
error CannotAddSelectorsToZeroAddress(bytes4[] _selectors);
// 地址没有字节码时抛出的错误
error NoBytecodeAtAddress(address _contractAddress, string _message);
// 不正确的切面切割操作时抛出的错误
error IncorrectFacetCutAction(uint8 _action);
// 不能向钻石添加已存在的函数时抛出的错误
error CannotAddFunctionToDiamondThatAlreadyExists(bytes4 _selector);
// 不能用零地址替换函数时抛出的错误
error CannotReplaceFunctionsFromFacetWithZeroAddress(bytes4[] _selectors);
// 不能替换不可变函数时抛出的错误
error CannotReplaceImmutableFunction(bytes4 _selector);
// 不能用相同切面的相同函数替换函数时抛出的错误
error CannotReplaceFunctionWithTheSameFunctionFromTheSameFacet(
    bytes4 _selector
);
// 不能替换不存在的函数时抛出的错误
error CannotReplaceFunctionThatDoesNotExists(bytes4 _selector);
// 移除切面地址必须是零地址时抛出的错误
error RemoveFacetAddressMustBeZeroAddress(address _facetAddress);
// 不能移除不存在的函数时抛出的错误
error CannotRemoveFunctionThatDoesNotExist(bytes4 _selector);
// 不能移除不可变函数时抛出的错误
error CannotRemoveImmutableFunction(bytes4 _selector);
// 初始化函数回滚时抛出的错误
error InitializationFunctionReverted(
    address _initializationContractAddress,
    bytes _calldata
);

// 钻石库合约，包含钻石合约的核心功能
library LibDiamond {
    // 钻石存储位置常量
    bytes32 constant DIAMOND_STORAGE_POSITION =
        keccak256("diamond.standard.diamond.storage");

    // 切面地址和选择器位置结构体
    struct FacetAddressAndSelectorPosition {
        address facetAddress; // 切面地址
        uint16 selectorPosition; // 选择器位置
    }

    // 代币税费结构体
    struct TokenTax {
        uint256 threshold; // 税费阈值,单位wei
        uint256 taxRate; // 税率，单位为百分比
    }

    // 钻石存储结构体
    struct DiamondStorage {
        // 函数选择器 => 切面地址和选择器数组中的选择器位置
        mapping(bytes4 => FacetAddressAndSelectorPosition) facetAddressAndSelectorPosition;
        bytes4[] selectors; // 选择器数组
        mapping(bytes4 => bool) supportedInterfaces; // 支持的接口映射
        // 合约所有者
        address contractOwner; // 合约所有者地址
        // ERC20 核心存储变量
        string name; // 代币名称
        string symbol; // 代币符号
        uint8 decimals; // 小数位数
        uint256 totalSupply; // 总供应量
        mapping(address => uint256) balances; // 余额映射
        mapping(address => mapping(address => uint256)) allowances; // 授权映射
        // ShibMeme 相关存储变量
        TokenTax[] tokenTaxes;
        address taxRecipient; // 税费接收地址
        uint256 maxTransactionAmount; // 单笔交易最大额度
        uint256 dailyTransactionLimit; // 每日交易次数限制
        mapping(address => uint256) dailyTransactionCount; // 记录每日交易次数
        mapping(address => uint256) lastTransactionDay; // 记录上次交易的日期
        mapping(address => bool) isExcludedFromFee; // 税费白名单
        mapping(address => bool) isExcludedFromMaxTx; // 交易限制白名单
        // LiquidityManager 相关存储变量 (Uniswap V3)
        address swapRouter; // V3 SwapRouter 地址
        address nonfungiblePositionManager; // V3 NFT Position Manager 地址
        address uniswapV3Factory; // V3 Factory 地址
        address uniswapV3Pool; // V3 Pool 地址
        uint24 poolFee; // 池子手续费等级 (默认 3000 = 0.3%)
        uint256[] liquidityTokenIds; // 存储所有流动性NFT的token IDs
        // 重入锁
        uint256 reentrancyStatus; // 1 = 未锁定, 2 = 已锁定
    }

    // 获取钻石存储
    function diamondStorage()
        internal
        pure
        returns (DiamondStorage storage ds)
    {
        bytes32 position = DIAMOND_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }

    // 所有权转移事件
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    // 设置合约所有者
    function setContractOwner(address _newOwner) internal {
        DiamondStorage storage ds = diamondStorage();
        address previousOwner = ds.contractOwner;
        ds.contractOwner = _newOwner;
        emit OwnershipTransferred(previousOwner, _newOwner);
    }

    // 获取合约所有者
    function contractOwner() internal view returns (address contractOwner_) {
        contractOwner_ = diamondStorage().contractOwner;
    }

    // 强制检查是否为合约所有者
    function enforceIsContractOwner() internal view {
        if (msg.sender != diamondStorage().contractOwner) {
            revert NotContractOwner(msg.sender, diamondStorage().contractOwner);
        }
    }

    // 重入保护：检查并锁定
    function lockReentrancy() internal {
        DiamondStorage storage ds = diamondStorage();
        require(ds.reentrancyStatus != 2, "ReentrancyGuard: reentrant call");
        ds.reentrancyStatus = 2;
    }

    // 重入保护：解锁
    function unlockReentrancy() internal {
        diamondStorage().reentrancyStatus = 1;
    }

    // 钻石切割事件
    event DiamondCut(
        IDiamondCut.FacetCut[] _diamondCut,
        address _init,
        bytes _calldata
    );

    // 钻石切割的内部函数版本
    function diamondCut(
        IDiamondCut.FacetCut[] memory _diamondCut,
        address _init,
        bytes memory _calldata
    ) internal {
        // 遍历每个切面切割操作
        for (
            uint256 facetIndex;
            facetIndex < _diamondCut.length;
            facetIndex++
        ) {
            bytes4[] memory functionSelectors = _diamondCut[facetIndex]
                .functionSelectors;
            address facetAddress = _diamondCut[facetIndex].facetAddress;
            if (functionSelectors.length == 0) {
                revert NoSelectorsProvidedForFacetForCut(facetAddress);
            }
            IDiamondCut.FacetCutAction action = _diamondCut[facetIndex].action;
            // 根据操作类型执行相应操作
            if (action == IDiamond.FacetCutAction.Add) {
                addFunctions(facetAddress, functionSelectors);
            } else if (action == IDiamond.FacetCutAction.Replace) {
                replaceFunctions(facetAddress, functionSelectors);
            } else if (action == IDiamond.FacetCutAction.Remove) {
                removeFunctions(facetAddress, functionSelectors);
            } else {
                revert IncorrectFacetCutAction(uint8(action));
            }
        }
        emit DiamondCut(_diamondCut, _init, _calldata);
        initializeDiamondCut(_init, _calldata);
    }

    // 添加函数到钻石合约
    function addFunctions(
        address _facetAddress,
        bytes4[] memory _functionSelectors
    ) internal {
        if (_facetAddress == address(0)) {
            revert CannotAddSelectorsToZeroAddress(_functionSelectors);
        }
        DiamondStorage storage ds = diamondStorage();
        uint16 selectorCount = uint16(ds.selectors.length);
        enforceHasContractCode(
            _facetAddress,
            "LibDiamondCut: Add facet has no code"
        );
        // 遍历每个函数选择器
        for (
            uint256 selectorIndex;
            selectorIndex < _functionSelectors.length;
            selectorIndex++
        ) {
            bytes4 selector = _functionSelectors[selectorIndex];
            address oldFacetAddress = ds
                .facetAddressAndSelectorPosition[selector]
                .facetAddress;
            if (oldFacetAddress != address(0)) {
                revert CannotAddFunctionToDiamondThatAlreadyExists(selector);
            }
            // 添加函数选择器到存储
            ds.facetAddressAndSelectorPosition[
                selector
            ] = FacetAddressAndSelectorPosition(_facetAddress, selectorCount);
            ds.selectors.push(selector);
            selectorCount++;
        }
    }

    // 替换钻石合约中的函数
    function replaceFunctions(
        address _facetAddress,
        bytes4[] memory _functionSelectors
    ) internal {
        DiamondStorage storage ds = diamondStorage();
        if (_facetAddress == address(0)) {
            revert CannotReplaceFunctionsFromFacetWithZeroAddress(
                _functionSelectors
            );
        }
        enforceHasContractCode(
            _facetAddress,
            "LibDiamondCut: Replace facet has no code"
        );
        // 遍历每个函数选择器
        for (
            uint256 selectorIndex;
            selectorIndex < _functionSelectors.length;
            selectorIndex++
        ) {
            bytes4 selector = _functionSelectors[selectorIndex];
            address oldFacetAddress = ds
                .facetAddressAndSelectorPosition[selector]
                .facetAddress;
            // 不能替换不可变函数 -- 在这种情况下是直接在钻石中定义的函数
            if (oldFacetAddress == address(this)) {
                revert CannotReplaceImmutableFunction(selector);
            }
            if (oldFacetAddress == _facetAddress) {
                revert CannotReplaceFunctionWithTheSameFunctionFromTheSameFacet(
                    selector
                );
            }
            if (oldFacetAddress == address(0)) {
                revert CannotReplaceFunctionThatDoesNotExists(selector);
            }
            // 替换旧切面地址
            ds
                .facetAddressAndSelectorPosition[selector]
                .facetAddress = _facetAddress;
        }
    }

    // 从钻石合约中移除函数
    function removeFunctions(
        address _facetAddress,
        bytes4[] memory _functionSelectors
    ) internal {
        DiamondStorage storage ds = diamondStorage();
        uint256 selectorCount = ds.selectors.length;
        if (_facetAddress != address(0)) {
            revert RemoveFacetAddressMustBeZeroAddress(_facetAddress);
        }
        // 遍历每个函数选择器
        for (
            uint256 selectorIndex;
            selectorIndex < _functionSelectors.length;
            selectorIndex++
        ) {
            bytes4 selector = _functionSelectors[selectorIndex];
            FacetAddressAndSelectorPosition
                memory oldFacetAddressAndSelectorPosition = ds
                    .facetAddressAndSelectorPosition[selector];
            if (oldFacetAddressAndSelectorPosition.facetAddress == address(0)) {
                revert CannotRemoveFunctionThatDoesNotExist(selector);
            }

            // 不能移除不可变函数 -- 直接在钻石中定义的函数
            if (
                oldFacetAddressAndSelectorPosition.facetAddress == address(this)
            ) {
                revert CannotRemoveImmutableFunction(selector);
            }
            // 用最后一个选择器替换当前选择器
            selectorCount--;
            if (
                oldFacetAddressAndSelectorPosition.selectorPosition !=
                selectorCount
            ) {
                bytes4 lastSelector = ds.selectors[selectorCount];
                ds.selectors[
                    oldFacetAddressAndSelectorPosition.selectorPosition
                ] = lastSelector;
                ds
                    .facetAddressAndSelectorPosition[lastSelector]
                    .selectorPosition = oldFacetAddressAndSelectorPosition
                    .selectorPosition;
            }
            // 删除最后一个选择器
            ds.selectors.pop();
            delete ds.facetAddressAndSelectorPosition[selector];
        }
    }

    // 初始化钻石切割
    function initializeDiamondCut(
        address _init,
        bytes memory _calldata
    ) internal {
        if (_init == address(0)) {
            return;
        }
        enforceHasContractCode(
            _init,
            "LibDiamondCut: _init address has no code"
        );
        (bool success, bytes memory error) = _init.delegatecall(_calldata);
        if (!success) {
            if (error.length > 0) {
                // 向上传递错误
                /// @solidity memory-safe-assembly
                assembly {
                    let returndata_size := mload(error)
                    revert(add(32, error), returndata_size)
                }
            } else {
                revert InitializationFunctionReverted(_init, _calldata);
            }
        }
    }

    // 强制检查地址是否有合约代码
    function enforceHasContractCode(
        address _contract,
        string memory _errorMessage
    ) internal view {
        uint256 contractSize;
        assembly {
            contractSize := extcodesize(_contract)
        }
        if (contractSize == 0) {
            revert NoBytecodeAtAddress(_contract, _errorMessage);
        }
    }
}
