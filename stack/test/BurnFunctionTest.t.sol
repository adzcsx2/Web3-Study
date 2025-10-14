// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../contracts/MetaNodeToken.sol";

contract BurnTest is Test {
    MetaNodeToken public token;
    
    function setUp() public {
        token = new MetaNodeToken();
        token.initialize();
    }
    
    function testBurnFunctionality() public {
        // 获取初始供应量
        uint256 initialSupply = token.totalSupply();
        uint256 initialBalance = token.balanceOf(address(this));
        
        console.log("Initial total supply:", initialSupply);
        console.log("Initial balance:", initialBalance);
        
        // 测试烧毁功能
        uint256 burnAmount = 1000 * 10**18;
        
        // 确保有足够余额
        require(initialBalance >= burnAmount, "Insufficient balance for burn test");
        
        // 执行烧毁
        token.burn(burnAmount);
        
        // 验证结果
        uint256 finalSupply = token.totalSupply();
        uint256 finalBalance = token.balanceOf(address(this));
        uint256 burnedSupply = token.getBurnedSupply();
        
        console.log("Final total supply:", finalSupply);
        console.log("Final balance:", finalBalance);
        console.log("Burned supply:", burnedSupply);
        
        // 断言检查
        assertEq(finalSupply, initialSupply - burnAmount, "Total supply should decrease");
        assertEq(finalBalance, initialBalance - burnAmount, "Balance should decrease");
        assertEq(burnedSupply, burnAmount, "Burned supply should be recorded");
        
        console.log("Burn functionality test PASSED!");
    }
    
    function testBurnFromFunctionality() public {
        address user = address(0x123);
        uint256 mintAmount = 5000 * 10**18;
        uint256 burnAmount = 2000 * 10**18;
        
        // 给用户铸造一些代币
        token.mint(user, mintAmount);
        
        // 用户授权给测试合约
        vm.prank(user);
        token.approve(address(this), burnAmount);
        
        // 记录初始状态
        uint256 initialUserBalance = token.balanceOf(user);
        uint256 initialTotalSupply = token.totalSupply();
        
        // 执行 burnFrom
        token.burnFrom(user, burnAmount);
        
        // 验证结果
        uint256 finalUserBalance = token.balanceOf(user);
        uint256 finalTotalSupply = token.totalSupply();
        uint256 burnedSupply = token.getBurnedSupply();
        
        assertEq(finalUserBalance, initialUserBalance - burnAmount, "User balance should decrease");
        assertEq(finalTotalSupply, initialTotalSupply - burnAmount, "Total supply should decrease");
        assertEq(burnedSupply, burnAmount, "Burned supply should be recorded");
        
        console.log("BurnFrom functionality test PASSED!");
    }
}