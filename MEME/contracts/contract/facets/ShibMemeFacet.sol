// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {LibDiamond} from "../libraries/LibDiamond.sol";
import "../../events/ShibMemeEvents.sol";

using SafeERC20 for IERC20;

using Math for uint256;

/**
 * @title ShibMemeFacet
 * @notice 实现代币税费、交易限制和流动性管理功能
 * @dev 作为 Diamond 的 Facet，重写 ERC20 的 transfer 函数添加税费逻辑
 */
contract ShibMemeFacet is ShibMemeEvents {
    // ERC20 事件（用于税费转账）
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @notice 重入保护修饰符
     * @dev 使用 Diamond Storage 中的重入锁状态
     */
    modifier nonReentrant() {
        LibDiamond.lockReentrancy();
        _;
        LibDiamond.unlockReentrancy();
    }

    /**
     * @notice 初始化代币参数
     * @dev 只能由合约所有者调用一次
     */
    function initializeShibMeme(
        string memory _name,
        string memory _symbol,
        address _taxRecipient,
        uint256 _maxTransactionAmount,
        uint256 _dailyTransactionLimit
    ) external {
        LibDiamond.enforceIsContractOwner();
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        require(ds.totalSupply == 0, "Already initialized");
        require(
            _taxRecipient != address(0) && _taxRecipient != address(this),
            "Invalid tax recipient"
        );
        require(
            _maxTransactionAmount > 0,
            "Max transaction amount must be greater than zero"
        );
        require(
            _dailyTransactionLimit > 0,
            "Daily transaction limit must be greater than zero"
        );

        // 设置 ERC20 基本信息
        ds.name = _name;
        ds.symbol = _symbol;
        ds.decimals = 18;

        // 铸造初始供应量
        uint256 initialSupply = 100_000_000 * 10 ** 18;
        uint256 contractAmount = initialSupply.mulDiv(40, 100);
        uint256 ownerAmount = initialSupply.mulDiv(10, 100); //给自己10%方便测试
        uint256 burnAmount = initialSupply - contractAmount - ownerAmount;

        // 铸造代币 - 直接铸造给合约地址用于流动性
        ds.totalSupply = initialSupply;
        ds.balances[address(this)] = contractAmount;
        ds.balances[msg.sender] = ownerAmount;
        ds.balances[0x000000000000000000000000000000000000dEaD] = burnAmount;

        emit Transfer(address(0), address(this), contractAmount);
        emit Transfer(address(0), msg.sender, ownerAmount);
        emit Transfer(
            address(0),
            0x000000000000000000000000000000000000dEaD,
            burnAmount
        );

        // 设置税费和限制参数
        ds.taxRecipient = _taxRecipient;
        ds.maxTransactionAmount = _maxTransactionAmount;
        ds.dailyTransactionLimit = _dailyTransactionLimit;

        // 设置税费阶梯
        // 注意：从后向前遍历，第一个满足 amount >= threshold 的规则生效
        // < 1000: 0%, 1000-10000: 2%, > 10000: 5%
        ds.tokenTaxes.push(LibDiamond.TokenTax({threshold: 0, taxRate: 0}));
        ds.tokenTaxes.push(
            LibDiamond.TokenTax({threshold: 1_000 ether, taxRate: 2})
        );
        ds.tokenTaxes.push(
            LibDiamond.TokenTax({threshold: 10_000 ether, taxRate: 5})
        );
    }

    /**
     * @notice 重写的转账函数，添加税费逻辑
     */
    function sbtransfer(address to, uint256 amount) external returns (bool) {
        _applyTaxAndTransfer(msg.sender, to, amount);
        return true;
    }

    /**
     * @notice 重写的 transferFrom 函数，添加税费逻辑
     */
    function sbtransferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        // 检查授权
        uint256 currentAllowance = ds.allowances[from][msg.sender];
        require(currentAllowance >= amount, "ERC20: insufficient allowance");

        unchecked {
            ds.allowances[from][msg.sender] = currentAllowance - amount;
        }

        _applyTaxAndTransfer(from, to, amount);
        return true;
    }

    /**
     * @notice 应用税费并转账
     */
    function _applyTaxAndTransfer(
        address from,
        address to,
        uint256 amount
    ) internal {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        require(from != address(0), "Transfer from zero address");
        require(to != address(0), "Transfer to zero address");

        // 检查交易限制（白名单地址除外）
        if (!ds.isExcludedFromMaxTx[from] && !ds.isExcludedFromMaxTx[to]) {
            require(
                amount <= ds.maxTransactionAmount,
                "Transfer amount exceeds the maximum transaction limit"
            );

            // 检查每日交易次数限制
            uint256 currentDay = block.timestamp / 1 days;
            if (ds.lastTransactionDay[from] != currentDay) {
                ds.lastTransactionDay[from] = currentDay;
                ds.dailyTransactionCount[from] = 0;
            }
            require(
                ds.dailyTransactionCount[from] < ds.dailyTransactionLimit,
                "Daily transaction limit exceeded"
            );
            ds.dailyTransactionCount[from]++;
        }

        // 计算税费
        uint256 taxAmount = 0;
        if (!ds.isExcludedFromFee[from] && !ds.isExcludedFromFee[to]) {
            uint256 taxRate = _getTaxRate(amount);
            if (taxRate > 0) {
                taxAmount = amount.mulDiv(taxRate, 100);
            }
        }

        uint256 netAmount = amount - taxAmount;

        // 执行转账
        uint256 fromBalance = ds.balances[from];
        require(
            fromBalance >= amount,
            "ERC20: transfer amount exceeds balance"
        );

        unchecked {
            ds.balances[from] = fromBalance - amount;
            ds.balances[to] += netAmount;
            if (taxAmount > 0) {
                ds.balances[ds.taxRecipient] += taxAmount;
                emit Transfer(from, ds.taxRecipient, taxAmount);
            }
        }

        emit Transfer(from, to, netAmount);
        emit TokenTransfer(from, to, netAmount, taxAmount, block.timestamp);
    }

    /**
     * @notice 根据交易金额获取税率
     */
    function _getTaxRate(uint256 amount) internal view returns (uint256) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        for (uint256 i = ds.tokenTaxes.length; i > 0; i--) {
            if (amount >= ds.tokenTaxes[i - 1].threshold) {
                return ds.tokenTaxes[i - 1].taxRate;
            }
        }
        return 0;
    }

    /**
     * @notice 提供初始流动性 (已弃用 - 请使用 LiquidityManager 的 V3 功能)
     * @dev 此函数已移除，请使用 LiquidityManager facet 中的 V3 流动性功能
     */
    // 注意：V2 流动性功能已迁移到 LiquidityManager (V3)
    // 请使用：
    // 1. liquidityManager.initializeLiquidity(...) - 初始化 V3
    // 2. liquidityManager.createPool() - 创建池子
    // 3. liquidityManager.mintNewPosition(...) - 添加流动性

    /**
     * @notice 设置税费白名单
     */
    function setTaxExempt(address account, bool exempt) external {
        LibDiamond.enforceIsContractOwner();
        LibDiamond.diamondStorage().isExcludedFromFee[account] = exempt;
        emit TaxExemptionChanged(account, exempt, block.timestamp);
    }

    /**
     * @notice 设置交易限制白名单
     */
    function setMaxTxExempt(address account, bool exempt) external {
        LibDiamond.enforceIsContractOwner();
        LibDiamond.diamondStorage().isExcludedFromMaxTx[account] = exempt;
    }

    /**
     * @notice 更新税费接收地址
     */
    function updateTaxRecipient(address newRecipient) external {
        LibDiamond.enforceIsContractOwner();
        require(newRecipient != address(0), "Invalid address");
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        address oldRecipient = ds.taxRecipient;
        ds.taxRecipient = newRecipient;
        emit TaxRecipientUpdated(oldRecipient, newRecipient, block.timestamp);
    }

    /**
     * @notice 更新最大交易额度
     */
    function updateMaxTransactionAmount(uint256 newAmount) external {
        LibDiamond.enforceIsContractOwner();
        require(newAmount > 0, "Amount must be greater than zero");
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        uint256 oldAmount = ds.maxTransactionAmount;
        ds.maxTransactionAmount = newAmount;
        emit MaxTransactionAmountUpdated(oldAmount, newAmount, block.timestamp);
    }

    // View 函数
    function getTaxRecipient() external view returns (address) {
        return LibDiamond.diamondStorage().taxRecipient;
    }

    function getMaxTransactionAmount() external view returns (uint256) {
        return LibDiamond.diamondStorage().maxTransactionAmount;
    }

    function getDailyTransactionLimit() external view returns (uint256) {
        return LibDiamond.diamondStorage().dailyTransactionLimit;
    }

    function isTaxExempt(address account) external view returns (bool) {
        return LibDiamond.diamondStorage().isExcludedFromFee[account];
    }

    function isMaxTxExempt(address account) external view returns (bool) {
        return LibDiamond.diamondStorage().isExcludedFromMaxTx[account];
    }

    // ============ 紧急功能 ============

    /**
     * @dev 紧急提取 ETH（仅所有者）
     * @notice 将合约中的所有 ETH 发送给合约所有者
     */
    function emergencyWithdrawETH() external nonReentrant {
        LibDiamond.enforceIsContractOwner();

        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");

        address owner = LibDiamond.contractOwner();
        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "ETH transfer failed");

        emit EmergencyWithdraw(owner, address(0), balance, block.timestamp);
    }

    /**
     * @dev 紧急提取 ERC20 代币（仅所有者）
     * @param token 代币合约地址
     * @notice 将合约中的所有指定代币发送给合约所有者
     */
    function emergencyWithdrawToken(address token) external nonReentrant {
        LibDiamond.enforceIsContractOwner();
        require(token != address(0), "Token cannot be zero address");
        require(token != address(this), "Cannot withdraw own token");

        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");

        address owner = LibDiamond.contractOwner();
        IERC20(token).safeTransfer(owner, balance);

        emit EmergencyWithdraw(owner, token, balance, block.timestamp);
    }
}
