// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

// This contract is just to make ERC1967Proxy available for testing
contract ProxyContract is ERC1967Proxy {
    constructor(
        address implementation,
        bytes memory data
    ) ERC1967Proxy(implementation, data) {}
}
