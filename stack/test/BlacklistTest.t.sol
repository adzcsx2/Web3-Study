// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../contracts/MetaNodeToken.sol";

contract BlacklistTest is Test {
    MetaNodeToken public token;
    
    address public admin;
    address public minter;
    address public user1;
    address public user2;
    
    function setUp() public {
        admin = address(this);
        minter = address(0x123);
        user1 = address(0x456);
        user2 = address(0x789);
        
        token = new MetaNodeToken();
        token.initialize();
        
        // Grant minter role
        token.grantMinterRole(minter);
        
        // Give some tokens to user1 for burning tests
        vm.prank(minter);
        token.mint(user1, 1000 * 10**18);
    }
    
    function testBlacklistedMinterCannotMint() public {
        // Add minter to blacklist
        token.addToBlacklist(minter);
        
        // Minter should not be able to mint
        vm.prank(minter);
        vm.expectRevert(abi.encodeWithSelector(MetaNodeToken.BlacklistedAddress.selector, minter));
        token.mint(user2, 100 * 10**18);
        
        console.log("Blacklisted minter correctly blocked from minting");
    }
    
    function testCannotMintToBlacklistedUser() public {
        // Add user2 to blacklist
        token.addToBlacklist(user2);
        
        // Cannot mint to blacklisted user
        vm.prank(minter);
        vm.expectRevert(abi.encodeWithSelector(MetaNodeToken.BlacklistedAddress.selector, user2));
        token.mint(user2, 100 * 10**18);
        
        console.log("Minting to blacklisted user correctly blocked");
    }
    
    function testBlacklistedUserCannotBurn() public {
        // Add user1 to blacklist
        token.addToBlacklist(user1);
        
        // user1 should not be able to burn their own tokens
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(MetaNodeToken.BlacklistedAddress.selector, user1));
        token.burn(100 * 10**18);
        
        console.log("Blacklisted user correctly blocked from burning");
    }
    
    function testBlacklistedUserCannotBurnFrom() public {
        // user1 approves user2 to burn tokens
        vm.prank(user1);
        token.approve(user2, 500 * 10**18);
        
        // Add user2 to blacklist
        token.addToBlacklist(user2);
        
        // user2 should not be able to burn from user1
        vm.prank(user2);
        vm.expectRevert(abi.encodeWithSelector(MetaNodeToken.BlacklistedAddress.selector, user2));
        token.burnFrom(user1, 100 * 10**18);
        
        console.log("Blacklisted user correctly blocked from burnFrom");
    }
    
    function testCannotBurnFromBlacklistedAccount() public {
        // user1 approves user2 to burn tokens
        vm.prank(user1);
        token.approve(user2, 500 * 10**18);
        
        // Add user1 to blacklist
        token.addToBlacklist(user1);
        
        // user2 should not be able to burn from blacklisted user1
        vm.prank(user2);
        vm.expectRevert(abi.encodeWithSelector(MetaNodeToken.BlacklistedAddress.selector, user1));
        token.burnFrom(user1, 100 * 10**18);
        
        console.log("BurnFrom blacklisted account correctly blocked");
    }
    
    function testBlacklistedMinterCannotBatchMint() public {
        // Add minter to blacklist
        token.addToBlacklist(minter);
        
        address[] memory recipients = new address[](2);
        uint256[] memory amounts = new uint256[](2);
        
        recipients[0] = user1;
        recipients[1] = user2;
        amounts[0] = 100 * 10**18;
        amounts[1] = 200 * 10**18;
        
        // Blacklisted minter should not be able to batch mint
        vm.prank(minter);
        vm.expectRevert(abi.encodeWithSelector(MetaNodeToken.BlacklistedAddress.selector, minter));
        token.batchMint(recipients, amounts);
        
        console.log("Blacklisted minter correctly blocked from batch minting");
    }
    
    function testCannotBatchMintToBlacklistedUser() public {
        // Add user2 to blacklist
        token.addToBlacklist(user2);
        
        address[] memory recipients = new address[](2);
        uint256[] memory amounts = new uint256[](2);
        
        recipients[0] = user1;        // Normal user
        recipients[1] = user2;        // Blacklisted user
        amounts[0] = 100 * 10**18;
        amounts[1] = 200 * 10**18;
        
        // Should fail because user2 is blacklisted
        vm.prank(minter);
        vm.expectRevert(abi.encodeWithSelector(MetaNodeToken.BlacklistedAddress.selector, user2));
        token.batchMint(recipients, amounts);
        
        console.log("Batch minting to blacklisted user correctly blocked");
    }
    
    function testNormalOperationsWorkAfterBlacklistRemoval() public {
        // Add user1 to blacklist
        token.addToBlacklist(user1);
        
        // Verify user1 is blocked
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(MetaNodeToken.BlacklistedAddress.selector, user1));
        token.burn(100 * 10**18);
        
        // Remove user1 from blacklist
        token.removeFromBlacklist(user1);
        
        // Now user1 should be able to burn
        vm.prank(user1);
        token.burn(100 * 10**18);
        
        console.log("Operations work normally after blacklist removal");
    }
    
    function testTransferBlockedByBlacklist() public {
        // Add user1 to blacklist
        token.addToBlacklist(user1);
        
        // user1 should not be able to transfer
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(MetaNodeToken.BlacklistedAddress.selector, user1));
        token.transfer(user2, 100 * 10**18);
        
        console.log("Transfer from blacklisted user correctly blocked");
    }
}