// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockERC1155 is ERC1155, Ownable {
    constructor(string memory tokenUri) ERC1155(tokenUri) Ownable(msg.sender) {}

    function mint(address to, uint256 id, uint256 amount) external {
        _mint(to, id, amount, "");
    }

    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts) external {
        _mintBatch(to, ids, amounts, "");
    }

    function setURI(string memory newuri) external {
        _setURI(newuri);
    }

    function uri(uint256) public view virtual override returns (string memory) {
        return "https://mock-1155-uri.com/";
    }
}