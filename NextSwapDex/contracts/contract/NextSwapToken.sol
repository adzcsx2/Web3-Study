// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
/**
 * @title NextSwapToken
 * @dev NextSwapToken
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

import "../events/NextSwapEvents.sol";
contract NextSwapToken is
    ERC20,
    ERC20Permit,
    ERC20Votes,
    AccessControl,
    Pausable,
    NextSwapEvents
{
    using SafeERC20 for IERC20;
    //权限常量
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant TIMELOCK_ROLE = keccak256("TIMELOCK_ROLE");

    // 总量
    uint256 public MAX_SUPPLY = 1_000_000_000 * 10 ** decimals();
    //流通量
    uint256 public circulatingSupply;

    //时间锁合约地址
    address public timelock;

    modifier noZeroAddress(address addr) {
        require(addr != address(0), "NextSwap: caller is the zero address");
        _;
    }

    modifier notAdminRole(bytes32 role) {
        require(
            role != DEFAULT_ADMIN_ROLE,
            "NextSwap: cannot operate admin role"
        );
        _;
    }
    modifier noTimeLockRole(bytes32 role) {
        require(
            role != TIMELOCK_ROLE,
            "NextSwap: cannot operate timelock role"
        );
        _;
    }
    modifier amountGreaterThanZero(uint256 amount) {
        require(amount > 0, "NextSwap: amount must be greater than zero");
        _;
    }

    constructor(
        address _timelock
    )
        ERC20("NextSwap Token", "NST")
        ERC20Permit("NextSwap Token")
        noZeroAddress(_timelock)
    {
        timelock = _timelock;
        // 初始铸造 10 亿 NST 给部署者
        _mint(msg.sender, MAX_SUPPLY);
        //设置角色
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(TIMELOCK_ROLE, _timelock);
        // 将时间锁合约设置为管理员
        _grantRole(PAUSER_ROLE, msg.sender);
    }
    // -------------------------------------------权限控制-------------------------------------
    /**
     * @dev 转移角色
     * @param role 角色
     * @param to 接收地址
     */
    function transferRole(
        bytes32 role,
        address to
    ) public noZeroAddress(to) onlyRole(role) noTimeLockRole(role) {
        require(!hasRole(role, to), "you can't transfer role to holder");
        // 3. 验证接收地址有效
        require(to != msg.sender, "NextSwap: cannot transfer to self");

        _revokeRole(role, msg.sender);
        _grantRole(role, to);
        emit RoleTransferred(role, msg.sender, to);
    }

    // -------------------------------------------重写仅时间锁合约可调用的函数-------------------------------------

    function updateTimelock(
        address newTimelock
    ) external onlyRole(TIMELOCK_ROLE) noZeroAddress(newTimelock) {
        address oldTimelock = timelock;

        // 撤销旧时间锁权限
        _revokeRole(TIMELOCK_ROLE, oldTimelock);
        _revokeRole(DEFAULT_ADMIN_ROLE, oldTimelock);

        // 授予新时间锁权限
        timelock = newTimelock;
        _grantRole(TIMELOCK_ROLE, newTimelock);
        _grantRole(DEFAULT_ADMIN_ROLE, newTimelock);

        emit TimelockUpdated(oldTimelock, newTimelock);
    }

    function grantRole(
        bytes32 role,
        address account
    )
        public
        override
        onlyRole(TIMELOCK_ROLE)
        notAdminRole(role)
        noTimeLockRole(role)
    {
        _grantRole(role, account);
    }

    function revokeRole(
        bytes32 role,
        address account
    )
        public
        override
        onlyRole(TIMELOCK_ROLE)
        notAdminRole(role)
        noTimeLockRole(role)
    {
        _revokeRole(role, account);
    }
    // -------------------------------------------铸造和销毁-------------------------------------
    // 仅时间锁合约可铸造,正常不可铸造,除非通过治理提案
    function mint(
        address to,
        uint256 amount
    ) public onlyRole(TIMELOCK_ROLE) noZeroAddress(to) whenNotPaused {
        MAX_SUPPLY += amount;
        circulatingSupply += amount;
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }
    // ✅ 建议：允许用户自己销毁代币
    function burn(uint256 amount) public whenNotPaused {
        MAX_SUPPLY -= amount;
        circulatingSupply -= amount;
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount);
    }
    /**
     * @dev 时间锁销毁他人代币（需要授权）
     * @notice 仅时间锁可调用，需要被销毁地址提前授权
     *
     * @param account 被销毁代币的地址
     * @param amount 销毁数量
     *
     * @dev 使用流程：
     *      1. 目标地址调用 approve(timelock, amount) 授权
     *      2. 治理提案通过销毁决议
     *      3. 时间锁调用此函数执行销毁
     */
    function burnFrom(
        address account,
        uint256 amount
    ) public onlyRole(TIMELOCK_ROLE) whenNotPaused {
        _spendAllowance(account, msg.sender, amount);
        MAX_SUPPLY -= amount;
        circulatingSupply -= amount;
        _burn(account, amount);

        emit TokensBurned(account, amount);
    }
    // -------------------------------------------紧急操作-------------------------------------
    /**
     * @dev 暂停合约
     * @notice 紧急情况下需要快速响应，无需时间锁
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev 恢复合约
     * @notice 紧急情况下需要快速响应，无需时间锁
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    /**
     * @dev 紧急撤销角色 (仅管理员，绕过时间锁)
     * @param role 角色哈希
     * @param account 地址
     * @notice 仅用于紧急情况，例如私钥泄露
     */
    function emergencyRevokeRole(
        bytes32 role,
        address account
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            role != DEFAULT_ADMIN_ROLE,
            "NextSwap: cannot revoke admin role"
        );
        require(role != TIMELOCK_ROLE, "NextSwap: cannot revoke timelock role");

        _revokeRole(role, account);
        emit EmergencyRoleRevoked(role, account, msg.sender);
    }

    /**
     * @dev 紧急授予角色 (仅管理员，绕过时间锁)
     */

    function emergencyGrantRole(
        bytes32 role,
        address account
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            role != DEFAULT_ADMIN_ROLE,
            "NextSwap: cannot grant admin role"
        );
        _grantRole(role, account);
        emit EmergencyRoleGranted(role, account, msg.sender);
    }
    /**
     * @dev 紧急情况下恢复误转入的代币
     * @notice 仅用于用户误将代币转入合约地址的情况
     */
    function emergencyRecoverTokens(
        address token,
        address to,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(token != address(this), "NextSwap: cannot recover NST");
        IERC20(token).safeTransfer(to, amount);
        emit EmergencyTokenRecovered(token, to, amount, msg.sender);
    }
    // -------------------------------------------解决继承冲突-------------------------------------
    /**
     * @dev 解决ERC20Permit和ERC20Votes的nonces冲突
     * @notice 使用ERC20Permit的nonces实现
     */
    function nonces(
        address owner
    ) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
    /**
     * @dev 重写_update函数以支持ERC20Votes和Pausable
     */
    function _update(
        address from,
        address to,
        uint256 value
    )
        internal
        override(ERC20, ERC20Votes)
        amountGreaterThanZero(value)
        whenNotPaused
    {
        super._update(from, to, value);
    }
    // ------------------------------------view函数-------------------------------------
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
