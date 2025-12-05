// SPDX -License-Identifier: MIT
pragma solidity ^0.8.26;
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

contract TEST is ERC4626 {
    constructor(
        IERC20Metadata asset_,
        string memory name_,
        string memory symbol_
    ) ERC4626(asset_) ERC20(name_, symbol_) {}
    receive () external payable {
    
    }
}
