// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../contracts/MetaNodeToken.sol";

/**
 * @title PausedBlacklistTest
 * @dev 测试暂停状态和黑名单检查的安全修复
 */
contract PausedBlacklistTest is Test {
    MetaNodeToken public token;
    address public admin;
    address public user1;
    address public user2;

    function setUp() public {
        admin = makeAddr("admin");
        user1 = makeAddr("user1");  
        user2 = makeAddr("user2");
        
        token = new MetaNodeToken();
        
        vm.prank(admin);
        token.initialize();
    }

    function testTransferWhenPaused() public {
        // 给 admin 一些代币用于测试
        uint256 testAmount = 1000 * 10**18;
        
        // 暂停合约
        vm.prank(admin);
        token.pause();
        
        // 尝试转账应该失败
        vm.expectRevert();
        vm.prank(admin);
        token.transfer(user1, testAmount);
    }
    
    function testMintWhenPaused() public {
        uint256 testAmount = 1000 * 10**18;
        
        // 暂停合约
        vm.prank(admin);
        token.pause();
        
        // 尝试铸币应该失败
        vm.expectRevert();
        vm.prank(admin);
        token.mint(user1, testAmount);
    }
    
    function testBurnFromWhenPaused() public {
        uint256 testAmount = 1000 * 10**18;
        
        // 先给 user1 一些代币
        vm.prank(admin);
        token.mint(user1, testAmount);
        
        // user1 授权 admin 燃烧代币
        vm.prank(user1);
        token.approve(admin, testAmount);
        
        // 暂停合约
        vm.prank(admin);
        token.pause();
        
        // 尝试 burnFrom 应该失败
        vm.expectRevert();
        vm.prank(admin);
        token.burnFrom(user1, testAmount);
    }
    
    function testMintToBlacklistedAddress() public {
        uint256 testAmount = 1000 * 10**18;
        
        // 将 user1 加入黑名单
        vm.prank(admin);
        token.addToBlacklist(user1);
        
        // 尝试给黑名单地址铸币应该失败
        vm.expectRevert();
        vm.prank(admin);
        token.mint(user1, testAmount);
    }
    
    function testBurnFromBlacklistedAccount() public {
        uint256 testAmount = 1000 * 10**18;
        
        // 先给 user1 铸币
        vm.prank(admin);
        token.mint(user1, testAmount);
        
        // user1 授权 admin
        vm.prank(user1);
        token.approve(admin, testAmount);
        
        // 将 user1 加入黑名单
        vm.prank(admin);
        token.addToBlacklist(user1);
        
        // 尝试从黑名单账户燃烧代币应该失败
        vm.expectRevert();
        vm.prank(admin);
        token.burnFrom(user1, testAmount);
    }
    
    function testBurnFromByBlacklistedCaller() public {
        uint256 testAmount = 1000 * 10**18;
        
        // 先给 user1 铸币
        vm.prank(admin);
        token.mint(user1, testAmount);
        
        // user1 授权 user2
        vm.prank(user1);
        token.approve(user2, testAmount);
        
        // 将 user2 (调用者) 加入黑名单
        vm.prank(admin);
        token.addToBlacklist(user2);
        
        // 黑名单用户尝试 burnFrom 应该失败
        vm.expectRevert();
        vm.prank(user2);
        token.burnFrom(user1, testAmount);
    }
    
    function testValidOperationsAfterUnpause() public {
        uint256 testAmount = 1000 * 10**18;
        
        // 暂停合约
        vm.prank(admin);
        token.pause();
        
        // 取消暂停
        vm.prank(admin);
        token.unpause();
        
        // 现在操作应该成功
        vm.prank(admin);
        token.mint(user1, testAmount);
        
        assertEq(token.balanceOf(user1), testAmount);
    }
    
    function testValidOperationsAfterRemoveFromBlacklist() public {
        uint256 testAmount = 1000 * 10**18;
        
        // 将 user1 加入黑名单
        vm.prank(admin);
        token.addToBlacklist(user1);
        
        // 从黑名单移除 user1
        vm.prank(admin);
        token.removeFromBlacklist(user1);
        
        // 现在铸币应该成功
        vm.prank(admin);
        token.mint(user1, testAmount);
        
        assertEq(token.balanceOf(user1), testAmount);
    }
}