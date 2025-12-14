// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract WETH9 is ERC20 {
    uint256 constant _initialSupply = 1_000_000_000 ether;
    uint256 constant _decimals = 18;

    constructor() ERC20("Wrapped Ether 9", "WETH9") {
        _mint(msg.sender, _initialSupply / (10 ** (18 - _decimals)));
    }

    function decimals() public pure override returns (uint8) {
        return uint8(_decimals);
    }

    /// @notice Deposit ether to get wrapped ether
    function deposit() external payable {
        _mint(msg.sender, msg.value);
    }

    /// @notice Withdraw wrapped ether to get ether
    function withdraw(uint256 amount) external {
        require(amount > 0, "WETH: amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "WETH: insufficient balance");
        _burn(msg.sender, amount);
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "WETH: transfer failed");
    }
}
