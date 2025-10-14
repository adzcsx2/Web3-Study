// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../contracts/MetaNodeToken.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract MetaNodeTokenTest is Test {
    MetaNodeToken public token;
    MetaNodeToken public implementation;
    ERC1967Proxy public proxy;
    
    address public owner = address(1);
    address public user1 = address(2);
    address public user2 = address(3);
    address public minter = address(4);
    address public pauser = address(5);
    
    event TokenMinted(address indexed to, uint256 amount, address indexed minter);
    event TokenBurned(address indexed from, uint256 amount, address indexed burner);
    
    function setUp() public {
        // Deploy implementation
        implementation = new MetaNodeToken();
        
        // Deploy proxy
        proxy = new ERC1967Proxy(
            address(implementation),
            abi.encodeWithSignature("initialize()")
        );
        
        // Wrap proxy in interface
        token = MetaNodeToken(address(proxy));
        
        // Setup roles
        vm.startPrank(address(this));
        token.grantMinterRole(minter);
        token.grantPauserRole(pauser);
        vm.stopPrank();
    }
    
    function testInitialization() public {
        assertEq(token.name(), "MetaNodeToken");
        assertEq(token.symbol(), "MNT");
        assertEq(token.decimals(), 18);
        assertEq(token.totalSupply(), 1_000_000 * 10**18);
        assertEq(token.MAX_SUPPLY(), 10_000_000 * 10**18);
    }
    
    function testMinting() public {
        vm.startPrank(minter);
        
        // Test successful minting
        vm.expectEmit(true, true, false, true);
        emit TokenMinted(user1, 1000 * 10**18, minter);
        
        token.mint(user1, 1000 * 10**18);
        assertEq(token.balanceOf(user1), 1000 * 10**18);
        
        vm.stopPrank();
    }
    
    function testMintingExceedsMaxSupply() public {
        vm.startPrank(minter);
        
        // Try to mint more than max supply
        vm.expectRevert();
        token.mint(user1, 10_000_000 * 10**18); // This would exceed max supply
        
        vm.stopPrank();
    }
    
    function testBurning() public {
        // First mint some tokens
        vm.prank(minter);
        token.mint(user1, 1000 * 10**18);
        
        // Test burning
        vm.startPrank(user1);
        uint256 burnAmount = 500 * 10**18;
        
        vm.expectEmit(true, true, false, true);
        emit TokenBurned(user1, burnAmount, user1);
        
        token.burn(burnAmount);
        assertEq(token.balanceOf(user1), 500 * 10**18);
        assertEq(token.getBurnedSupply(), burnAmount);
        
        vm.stopPrank();
    }
    
    function testPauseUnpause() public {
        vm.startPrank(pauser);
        
        token.pause();
        assertTrue(token.paused());
        
        token.unpause();
        assertFalse(token.paused());
        
        vm.stopPrank();
    }
    
    function testBlacklist() public {
        // Add user to blacklist
        token.addToBlacklist(user1);
        assertTrue(token.blacklist(user1));
        
        // Mint tokens to user2
        vm.prank(minter);
        token.mint(user2, 1000 * 10**18);
        
        // Try to transfer from user2 to blacklisted user1
        vm.startPrank(user2);
        vm.expectRevert();
        token.transfer(user1, 500 * 10**18);
        vm.stopPrank();
        
        // Remove from blacklist
        token.removeFromBlacklist(user1);
        assertFalse(token.blacklist(user1));
        
        // Now transfer should work
        vm.prank(user2);
        token.transfer(user1, 500 * 10**18);
        assertEq(token.balanceOf(user1), 500 * 10**18);
    }
    
    function testBatchMinting() public {
        address[] memory recipients = new address[](3);
        uint256[] memory amounts = new uint256[](3);
        
        recipients[0] = user1;
        recipients[1] = user2;
        recipients[2] = address(6);
        
        amounts[0] = 1000 * 10**18;
        amounts[1] = 2000 * 10**18;
        amounts[2] = 3000 * 10**18;
        
        vm.prank(minter);
        token.batchMint(recipients, amounts);
        
        assertEq(token.balanceOf(user1), 1000 * 10**18);
        assertEq(token.balanceOf(user2), 2000 * 10**18);
        assertEq(token.balanceOf(address(6)), 3000 * 10**18);
    }
    
    function testContractInfo() public {
        (
            string memory name,
            string memory symbol,
            uint8 decimals,
            uint256 totalSupply,
            uint256 maxSupply,
            uint256 remainingSupply,
            uint256 burnedSupply,
            bool isPaused,
            uint256 version
        ) = token.getContractInfo();
        
        assertEq(name, "MetaNodeToken");
        assertEq(symbol, "MNT");
        assertEq(decimals, 18);
        assertEq(totalSupply, 1_000_000 * 10**18);
        assertEq(maxSupply, 10_000_000 * 10**18);
        assertEq(version, 1);
    }
    
    function testAccessControl() public {
        // Test that only minter can mint
        vm.startPrank(user1);
        vm.expectRevert();
        token.mint(user2, 1000 * 10**18);
        vm.stopPrank();
        
        // Test that only pauser can pause
        vm.startPrank(user1);
        vm.expectRevert();
        token.pause();
        vm.stopPrank();
    }
}