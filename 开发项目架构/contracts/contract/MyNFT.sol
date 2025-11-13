// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MyNFT is ERC721 {
    // 合约代码

    constructor() ERC721("MyNFT", "MNFT") {
        // 可在此进行初始铸造或权限设置
    }
}