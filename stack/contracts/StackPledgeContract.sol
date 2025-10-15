// SPDX-License-Identifier: MIT
pragma solidity ^0.8;
import "./MetaNodeToken.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

// STAKE 质押合约
contract StackPledgeContract is
    Initializable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    MetaNodeToken public metaNodeToken;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        // 禁用初始化器以防止实现合约被直接使用
        // 这是OpenZeppelin v5.x中UUPS可升级合约的正确模式
        _disableInitializers();
    }

    function initialize(MetaNodeToken _metaNodeToken) public initializer {
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        metaNodeToken = _metaNodeToken;
        grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
