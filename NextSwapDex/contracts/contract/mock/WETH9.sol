// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract WETH9 is ERC20 {
    uint256 constant _initialSupply = 1_000_000_000 ether;
    uint256 constant _decimals = 18;

    constructor() ERC20("Wrapped Ether 9", "WETH9") {
        _mint(msg.sender, _initialSupply);
    }

    function decimals() public pure override returns (uint8) {
        return uint8(_decimals);
    }

    /// @notice Deposit ether to get wrapped ether
    function deposit() external payable {
        _mint(msg.sender, msg.value);
    }

    /// @notice Withdraw wrapped ether to get ether
    function withdraw(uint256) external {
        uint256 balance = balanceOf(msg.sender);
        require(balance >= 0, "WETH: insufficient balance");
        _burn(msg.sender, balance);
        (bool success, ) = payable(msg.sender).call{value: balance}("");
        require(success, "WETH: transfer failed");
    }
}
