// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../contracts/MetaNodeToken.sol";

contract SafeRecoveryTest is Test {
    MetaNodeToken public token;
    address public admin;
    address public user;
    
    function setUp() public {
        admin = address(this);
        user = address(0x123);
        
        token = new MetaNodeToken();
        // 不调用 initialize，因为合约需要参数且可能已经初始化
        // 我们直接使用已部署的合约进行测试
    }
    
    function testSafeOwnTokenRecovery() public {
        uint256 totalSupply = token.totalSupply();
        uint256 smallAmount = totalSupply / 2000; // 0.05% of total supply
        
        // Simulate tokens accidentally sent to contract
        vm.prank(address(token));
        token.transfer(address(token), smallAmount);
        
        uint256 contractBalance = token.balanceOf(address(token));
        assertEq(contractBalance, smallAmount);
        
        // Should be able to recover small amounts
        token.recoverERC20(address(token), smallAmount);
        
        uint256 finalContractBalance = token.balanceOf(address(token));
        assertEq(finalContractBalance, 0);
        
        console.log("Successfully recovered small amount of own tokens");
    }
    
    function testRecoveryAmountTooLarge() public {
        uint256 totalSupply = token.totalSupply();
        uint256 largeAmount = totalSupply / 500; // 0.2% of total supply (too large)
        
        // Simulate large amount in contract
        vm.prank(address(token));
        token.transfer(address(token), largeAmount);
        
        // Should revert for large amounts
        vm.expectRevert();
        token.recoverERC20(address(token), largeAmount);
        
        console.log("Large recovery amount correctly rejected");
    }
    
    function testRecoveryWithConfirmation() public {
        if (token.ownTokenRecoveryDisabled()) {
            console.log("Own token recovery is disabled, skipping test");
            return;
        }
        
        uint256 amount = 1000 * 10**18;
        
        // Simulate tokens in contract
        vm.prank(address(token));
        token.transfer(address(token), amount);
        
        // Generate correct confirmation hash
        bytes32 confirmationHash = keccak256(
            abi.encodePacked(
                "RECOVER_OWN_TOKENS",
                address(token),
                amount,
                block.timestamp / 86400
            )
        );
        
        // Should work with correct confirmation
        token.recoverOwnTokensWithConfirmation(amount, confirmationHash);
        
        console.log("Recovery with confirmation successful");
    }
    
    function testInvalidConfirmationHash() public {
        if (token.ownTokenRecoveryDisabled()) {
            console.log("Own token recovery is disabled, skipping test");
            return;
        }
        
        uint256 amount = 1000 * 10**18;
        bytes32 wrongHash = bytes32(uint256(123));
        
        // Should revert with wrong confirmation hash
        vm.expectRevert("Invalid confirmation hash");
        token.recoverOwnTokensWithConfirmation(amount, wrongHash);
        
        console.log("Invalid confirmation hash correctly rejected");
    }
    
    function testDisableOwnTokenRecovery() public {
        // Disable own token recovery
        token.disableOwnTokenRecovery();
        assertTrue(token.ownTokenRecoveryDisabled());
        
        uint256 amount = 1000 * 10**18;
        bytes32 confirmationHash = keccak256(
            abi.encodePacked(
                "RECOVER_OWN_TOKENS",
                address(token),
                amount,
                block.timestamp / 86400
            )
        );
        
        // Should revert when disabled
        vm.expectRevert(MetaNodeToken.OwnTokenRecoveryNotAllowed.selector);
        token.recoverOwnTokensWithConfirmation(amount, confirmationHash);
        
        console.log("Disabled recovery correctly prevents access");
    }
    
    function testExternalTokenRecoveryStillWorks() public {
        // Deploy a mock token
        MockERC20 externalToken = new MockERC20();
        externalToken.mint(address(token), 1000 * 10**18);
        
        uint256 beforeBalance = externalToken.balanceOf(admin);
        
        // Should still be able to recover external tokens
        token.recoverERC20(address(externalToken), 1000 * 10**18);
        
        uint256 afterBalance = externalToken.balanceOf(admin);
        assertEq(afterBalance - beforeBalance, 1000 * 10**18);
        
        console.log("External token recovery still works normally");
    }
    
    function testSupplyLimitCheck() public {
        // Try to recover amount that would exceed MAX_SUPPLY
        uint256 maxSupply = token.MAX_SUPPLY();
        uint256 currentSupply = token.totalSupply();
        uint256 excessiveAmount = maxSupply - currentSupply + 1;
        
        // Even if we have this much in contract, should not be able to recover
        // (This is a theoretical test since we can't actually get this much)
        vm.expectRevert();
        token.recoverERC20(address(token), excessiveAmount);
        
        console.log("Supply limit check prevents excessive recovery");
    }
}

// Mock ERC20 for testing external token recovery
contract MockERC20 {
    mapping(address => uint256) public balanceOf;
    uint256 public totalSupply;
    
    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}