// SPDX-License-Identifier: MIT
pragma solidity ^0.8;
import "./MetaNodeToken.sol";

// STAKE 质押合约
contract StackPledgeContract  {

    MetaNodeToken public metaNodeToken;
    constructor(MetaNodeToken _metaNodeToken)  {
        metaNodeToken = _metaNodeToken;
    }
}
