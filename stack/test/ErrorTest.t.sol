// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../contracts/MetaNodeToken.sol";

/**
 * @title ErrorTest
 * @dev 测试自定义错误定义是否编译正确
 */
contract ErrorTest is Test {
    
    function testErrorSelectorsExist() public pure {
        // 测试所有自定义错误的 selector 是否存在
        bytes4 emptyArraySelector = MetaNodeToken.EmptyArray.selector;
        bytes4 recoveryNotAllowedSelector = MetaNodeToken.OwnTokenRecoveryNotAllowed.selector;
        bytes4 recoveryTooSmallSelector = MetaNodeToken.RecoveryAmountTooSmall.selector;
        bytes4 invalidHashSelector = MetaNodeToken.InvalidConfirmationHash.selector;
        
        // 验证错误 selector 不为零
        assertTrue(emptyArraySelector != bytes4(0), "EmptyArray selector should not be zero");
        assertTrue(recoveryNotAllowedSelector != bytes4(0), "OwnTokenRecoveryNotAllowed selector should not be zero");
        assertTrue(recoveryTooSmallSelector != bytes4(0), "RecoveryAmountTooSmall selector should not be zero");
        assertTrue(invalidHashSelector != bytes4(0), "InvalidConfirmationHash selector should not be zero");
    }
}