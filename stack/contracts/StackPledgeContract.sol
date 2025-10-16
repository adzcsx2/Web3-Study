// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import "./MetaNodeToken.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "./errors/CustomErrors.sol";
import "./events/Events.sol";

// STAKE 质押合约
contract StackPledgeContract is
    Initializable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    MetaNodeToken public metaNodeToken;

    // 版本跟踪用于升级
    uint16 public constant CONTRACT_VERSION = 1;

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
        //默认权限
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }

    //判断账号有没有权限
    function hasRole(
        bytes32 role,
        address account
    ) public view override(AccessControlUpgradeable) returns (bool) {
        return super.hasRole(role, account);
    }
    //赋予权限和收回权限 (内部已执行emit事件)
    function grantRole(
        bytes32 role,
        address account
    ) public override(AccessControlUpgradeable) onlyRole(DEFAULT_ADMIN_ROLE) {
        super.grantRole(role, account);
    }

    function revokeRole(
        bytes32 role,
        address account
    ) public override(AccessControlUpgradeable) onlyRole(DEFAULT_ADMIN_ROLE) {
        super.revokeRole(role, account);
    }

    //升级合约
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {
        // 仅角色可以升级
        emit ContractUpgraded(
            ERC1967Utils.getImplementation(),
            newImplementation,
            CONTRACT_VERSION
        );
    }
    //暂停合约
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
        emit EmergencyPause(msg.sender, block.timestamp);
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
        emit EmergencyUnpause(msg.sender, block.timestamp);
    }

    // 紧急情况下的应急函数
    function emergencyPause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
        emit EmergencyPause(msg.sender, block.timestamp);
    }

    //质押业务测试

    // 质押业务
    function stakeTest1(uint256 amount) external whenNotPaused nonReentrant {
        require(amount > 0, "amount must be greater than zero");
    }
    // 质押业务
    function stakeTest2(uint256 amount) external whenNotPaused nonReentrant {
        if (amount <= 0) {
            revert ZeroAmount();
        }
    }
    // 质押业务
    function stake(uint256 amount) external whenNotPaused nonReentrant {
        require(amount > 0, "amount must be greater than zero");
        if (amount <= 0) {
            revert ZeroAmount();
        }
    }
}
