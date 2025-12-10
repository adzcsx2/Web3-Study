// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract USDT is ERC20 {
    uint256 constant _initialSupply = 1_000_000_000 ether;
    uint256 constant _decimals = 18;

    constructor() ERC20("USDT", "USDT") {
        _mint(msg.sender, _initialSupply);
    }

    function decimals() public pure override returns (uint8) {
        return uint8(_decimals);
    }
}
