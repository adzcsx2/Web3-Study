// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../contracts/MetaNodeToken.sol";

/**
 * @title SafeRecoveryTest - 简化版本
 * @dev 测试安全代币恢复机制
 */
contract SafeRecoveryTestSimple is Test {
    MetaNodeToken public token;
    address public admin;
    address public user;

    function setUp() public {
        admin = makeAddr("admin");
        user = makeAddr("user");
        
        // 部署合约
        token = new MetaNodeToken();
        
        // 使用 admin 地址初始化
        vm.prank(admin);
        token.initialize();
    }

    function testBasicFunctionality() public {
        // 基本功能测试
        assertEq(token.name(), "MetaNodeToken");
        assertEq(token.symbol(), "MNT"); 
        assertEq(token.decimals(), 18);
        assertEq(token.totalSupply(), 100_000_000 * 10**18);
    }

    function testOwnTokenRecoveryLimits() public {
        uint256 totalSupply = token.totalSupply();
        uint256 maxRecovery = totalSupply / 1000; // 0.1% 限制
        
        // 测试：尝试恢复超过限制的数量应该失败
        vm.expectRevert();
        vm.prank(admin);
        token.recoverERC20(address(token), maxRecovery + 1);
    }

    function testSmallAmountRecovery() public {
        uint256 totalSupply = token.totalSupply();
        uint256 smallAmount = totalSupply / 2000; // 0.05% - 应该允许
        
        // 模拟代币被意外发送到合约地址
        vm.prank(admin);
        token.transfer(address(token), smallAmount);
        
        uint256 contractBalance = token.balanceOf(address(token));
        assertEq(contractBalance, smallAmount);
        
        // 管理员应该能够恢复这些代币
        vm.prank(admin);
        token.recoverERC20(address(token), smallAmount);
        
        // 验证恢复成功
        assertEq(token.balanceOf(address(token)), 0);
        assertEq(token.balanceOf(admin), totalSupply); // 所有代币回到admin
    }
    
    function testRecoveryWhenDisabled() public {
        // 禁用自身代币恢复功能
        vm.prank(admin);
        token.disableOwnTokenRecovery();
        
        uint256 smallAmount = 1000 * 10**18;
        
        // 发送代币到合约
        vm.prank(admin);
        token.transfer(address(token), smallAmount);
        
        // 尝试恢复应该失败
        vm.expectRevert();
        vm.prank(admin);
        token.recoverERC20(address(token), smallAmount);
    }
}