// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26; // 指定具体版本提高安全性

/// @title MetaNodeToken - ERC20代币合约V2 测试升级
/// @notice 一个功能完整的可升级ERC20代币，具有访问控制、暂停和燃烧功能
/// @dev 使用OpenZeppelin的可升级合约与UUPS代理模式

import "./events/Events.sol";
import "./errors/CustomErrors.sol";
import "./constants/Constants.sol";

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MetaNodeTokenV2 is
    Initializable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    ERC20PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    // 版本跟踪用于升级
    uint16 public constant CONTRACT_VERSION = 2;

    // 供应量常量
    //总量10亿个
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10 ** 18;
    //项目方初始化1000w个(可升级为3年线性释放)
    uint256 public constant INITIAL_SUPPLY = 100_000_000 * 10 ** 18;

    // 状态变量
    //已经烧毁的数量
    uint256 public burnedSupply = 0;
    //最小恢复数量
    uint256 public constant MIN_RECOVERY_AMOUNT = 1 ether;

    // 黑名单和限频
    mapping(address => bool) public blacklist;
    mapping(address => uint256) public lastTransactionTime;
    uint256 public transferCooldown = 0; // 可由管理员设置用于限流

    /// @dev 完全禁用自身代币恢复的紧急功能
    bool public ownTokenRecoveryDisabled = false;

    // 修饰符用于更好的访问控制
    modifier onlyValidAddress(address _address) {
        if (_address == address(0)) revert ZeroAddress();
        _;
    }

    modifier onlyPositiveAmount(uint256 _amount) {
        if (_amount == 0) revert ZeroAmount();
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        // 禁用初始化器以防止实现合约被直接使用
        // 这是OpenZeppelin v5.x中UUPS可升级合约的正确模式
        _disableInitializers();
    }

    function initialize() public initializer {
        __ERC20_init("MetaNodeToken", "MNT");
        __ERC20Burnable_init();
        __ERC20Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        _mint(msg.sender, INITIAL_SUPPLY);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }
    // 核心功能
    function mint(
        address to,
        uint256 amount
    )
        public
        onlyRole(MINTER_ROLE)
        onlyValidAddress(to)
        onlyPositiveAmount(amount)
        nonReentrant
    {
        // 检查铸币者黑名单状态（接收者由_update()检查）
        if (blacklist[msg.sender]) revert BlacklistedAddress(msg.sender);

        // 供应量限制检查
        uint256 newTotalSupply = totalSupply() + amount;
        if (newTotalSupply > MAX_SUPPLY) {
            revert ExceedsMaxSupply(amount, MAX_SUPPLY - totalSupply());
        }
        _mint(to, amount);
        emit TokenMinted(to, amount, msg.sender);
    }

    function burn(
        uint256 amount
    ) public override onlyPositiveAmount(amount) nonReentrant {
        // 黑名单检查由_update()处理 - 此处无需重复检查
        super.burn(amount);
        burnedSupply += amount;
        emit TokenBurned(msg.sender, amount, msg.sender);
    }

    function burnFrom(
        address account,
        uint256 amount
    )
        public
        override
        onlyValidAddress(account)
        onlyPositiveAmount(amount)
        nonReentrant
    {
        // 检查调用者黑名单状态（账户由_update()检查）
        if (blacklist[msg.sender]) revert BlacklistedAddress(msg.sender);

        super.burnFrom(account, amount);
        burnedSupply += amount;
        emit TokenBurned(account, amount, msg.sender);
    }

    /// @notice 返回还可以铸造的剩余代币数量
    /// @return MAX_SUPPLY与当前totalSupply的差值
    function remainingSupply() public view returns (uint256) {
        return MAX_SUPPLY - totalSupply();
    }

    /// @notice 返回已经燃烧的代币总数
    /// @return 累计燃烧的代币数量
    function getBurnedSupply() public view returns (uint256) {
        return burnedSupply;
    }

    /// @notice 返回当前流通供应量（与ERC20中的totalSupply相同）
    /// @dev 在ERC20标准中，totalSupply()已经排除了燃烧的代币
    /// @return 当前流通中的代币总供应量
    function getCirculatingSupply() public view returns (uint256) {
        return totalSupply();
    }

    /// @notice 返回曾经铸造的总供应量（包括已燃烧的代币）
    /// @return 当前totalSupply与燃烧代币的总和
    function getTotalMintedSupply() public view returns (uint256) {
        return totalSupply() + burnedSupply;
    }

    function getContractInfo()
        public
        view
        returns (
            string memory tokenName,
            string memory tokenSymbol,
            uint8 tokenDecimals,
            uint256 currentTotalSupply,
            uint256 maxSupply,
            uint256 remainingMintable,
            uint256 totalBurned,
            bool isPaused,
            uint256 version
        )
    {
        return (
            super.name(),
            super.symbol(),
            super.decimals(),
            super.totalSupply(),
            MAX_SUPPLY,
            remainingSupply(),
            burnedSupply,
            paused(),
            CONTRACT_VERSION
        );
    }

    function hasRole(
        bytes32 role,
        address account
    ) public view override(AccessControlUpgradeable) returns (bool) {
        return super.hasRole(role, account);
    }

    // 批量操作以提高效率
    function batchMint(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyRole(MINTER_ROLE) nonReentrant {
        // 批量铸币者黑名单检查
        if (blacklist[msg.sender]) revert BlacklistedAddress(msg.sender);

        // 检查空数组
        if (recipients.length == 0) revert EmptyArray();

        // 检查数组长度匹配
        if (recipients.length != amounts.length) {
            revert ArrayLengthMismatch(recipients.length, amounts.length);
        }

        // 计算总金额并验证输入
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            if (recipients[i] == address(0)) revert ZeroAddress();
            if (amounts[i] == 0) revert ZeroAmount();

            // 每个接收者的黑名单检查
            if (blacklist[recipients[i]])
                revert BlacklistedAddress(recipients[i]);

            // 使用Solidity 0.8+内置溢出保护，简化代码
            totalAmount += amounts[i];
        }

        // 检查总供应量限制
        if (totalSupply() + totalAmount > MAX_SUPPLY) {
            revert ExceedsMaxSupply(totalAmount, MAX_SUPPLY - totalSupply());
        }

        // 执行铸币
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
            emit TokenMinted(recipients[i], amounts[i], msg.sender);
        }
    }

    // UUPS升级授权
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

    // 访问角色控制
    function grantPauserRole(
        address account
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(PAUSER_ROLE, account);
    }
    function grantUpgraderRole(
        address account
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(UPGRADER_ROLE, account);
    }
    function grantMinterRole(
        address account
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(MINTER_ROLE, account);
    }

    // 撤销角色函数
    function revokePauserRole(
        address account
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(PAUSER_ROLE, account);
    }

    function revokeUpgraderRole(
        address account
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(UPGRADER_ROLE, account);
    }

    function revokeMinterRole(
        address account
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(MINTER_ROLE, account);
    }
    // 带事件的增强暂停函数
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

    // 合规和黑名单函数
    function addToBlacklist(
        address account
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        blacklist[account] = true;
        emit BlacklistUpdated(account, true);
    }

    function removeFromBlacklist(
        address account
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        blacklist[account] = false;
        emit BlacklistUpdated(account, false);
    }
    // 设置转账冷却时间
    function setTransferCooldown(
        uint256 cooldownSeconds
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit TransferCooldownUpdated(transferCooldown, cooldownSeconds);
        transferCooldown = cooldownSeconds;
    }

    // 重写_update以解决继承冲突并添加合规检查
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20Upgradeable, ERC20PausableUpgradeable) {
        // 黑名单检查
        if (blacklist[from]) revert BlacklistedAddress(from);
        if (blacklist[to]) revert BlacklistedAddress(to);

        // 限频逻辑
        if (transferCooldown > 0 && from != address(0) && to != address(0)) {
            uint256 nextAllowedTime = lastTransactionTime[from] +
                transferCooldown;
            if (block.timestamp < nextAllowedTime) {
                revert CooldownNotMet(nextAllowedTime - block.timestamp);
            }
            lastTransactionTime[from] = block.timestamp;
        }

        // 调用父合约链中的_update函数，最终会进入ERC20PausableUpgradeable然后到ERC20Upgradeable

        super._update(from, to, value);
    }

    // 企业级恢复函数
    function recoverERC20(
        address tokenAddress,
        uint256 tokenAmount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (tokenAddress == address(0)) revert ZeroAddress();
        if (tokenAmount == 0) revert ZeroAmount();

        // 尝试恢复前检查合约余额
        uint256 contractBalance = IERC20(tokenAddress).balanceOf(address(this));
        if (contractBalance < tokenAmount) {
            revert InsufficientBalance(tokenAmount, contractBalance);
        }

        // 对自身代币进行严格限制的特殊处理
        if (tokenAddress == address(this)) {
            _recoverOwnTokensSafely(tokenAmount);
        } else {
            // 对外部代币使用安全转账
            SafeERC20.safeTransfer(
                IERC20(tokenAddress),
                msg.sender,
                tokenAmount
            );
        }
        emit TokenRecovered(tokenAddress, tokenAmount);
    }

    /// @dev 通过多重安全检查安全地恢复自身代币
    /// @param tokenAmount 要恢复的代币数量
    function _recoverOwnTokensSafely(uint256 tokenAmount) internal {
        if (ownTokenRecoveryDisabled) revert OwnTokenRecoveryNotAllowed();
        // 🛡️ CRITICAL FIX: First check if contract actually has these tokens
        uint256 contractBalance = balanceOf(address(this));
        if (contractBalance < tokenAmount) {
            revert InsufficientBalance(tokenAmount, contractBalance);
        }

        // 安全检查1：防止恢复超过合理阈值的数量
        uint256 maxRecoveryAmount = totalSupply() / 1000; // 最大为总供应量的0.1%
        // 如果计算结果太小，设置最小值以避免精度丢失
        if (maxRecoveryAmount < MIN_RECOVERY_AMOUNT) {
            maxRecoveryAmount = MIN_RECOVERY_AMOUNT;
        }
        // 如果一次性取太多，防止黑客一次性取出，限制一次只能取最大供应量的0.1%
        if (tokenAmount > maxRecoveryAmount) {
            revert RecoveryAmountTooLarge(tokenAmount, maxRecoveryAmount);
        }

        // 安全检查2：确保恢复的代币数量在合理范围内
        if (tokenAmount < MIN_RECOVERY_AMOUNT) {
            revert RecoveryAmountTooSmall(tokenAmount, MIN_RECOVERY_AMOUNT);
        }

        // 安全检查3：将此记录为审计的特殊操作
        emit OwnTokenRecoveryAttempted(
            msg.sender,
            tokenAmount,
            block.timestamp
        );

        // 🔒 安全：使用内部ERC20转账（非外部SafeERC20）
        // 这保持了总供应量的完整性并使用正确的ERC20机制
        _transfer(address(this), msg.sender, tokenAmount);
        emit OwnTokenRecovered(msg.sender, tokenAmount);
    }

    function disableOwnTokenRecovery() external onlyRole(DEFAULT_ADMIN_ROLE) {
        ownTokenRecoveryDisabled = true;
        emit OwnTokenRecoveryDisabled(msg.sender, block.timestamp);
    }

    /// @dev 对自身代币更严格的恢复 - 需要多重确认
    function recoverOwnTokensWithConfirmation(
        uint256 tokenAmount,
        bytes32 confirmationHash
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (ownTokenRecoveryDisabled) revert OwnTokenRecoveryNotAllowed();

        // 需要确认哈希以防止意外调用
        bytes32 expectedHash = keccak256(
            abi.encodePacked(
                "RECOVER_OWN_TOKENS",
                address(this),
                tokenAmount,
                block.timestamp / 86400 // 需要每日确认
            )
        );

        if (confirmationHash != expectedHash) revert InvalidConfirmationHash();

        _recoverOwnTokensSafely(tokenAmount);
    }

    function getTokenVersion() public pure returns (uint256) {
        return CONTRACT_VERSION;
    }
}
