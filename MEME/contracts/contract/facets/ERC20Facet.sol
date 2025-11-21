// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {LibDiamond} from "../libraries/LibDiamond.sol";

/**
 * @title ERC20Facet
 * @notice 基于 Diamond Storage 的 ERC20 标准实现
 * @dev 所有状态存储在 DiamondStorage 中，作为 Diamond 的一个 Facet
 */
contract ERC20Facet {
    // ERC20 标准事件
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );

    /**
     * @notice 返回代币名称
     */
    function name() external view returns (string memory) {
        return LibDiamond.diamondStorage().name;
    }

    /**
     * @notice 返回代币符号
     */
    function symbol() external view returns (string memory) {
        return LibDiamond.diamondStorage().symbol;
    }

    /**
     * @notice 返回代币小数位数
     */
    function decimals() external view returns (uint8) {
        return LibDiamond.diamondStorage().decimals;
    }

    /**
     * @notice 返回代币总供应量
     */
    function totalSupply() external view returns (uint256) {
        return LibDiamond.diamondStorage().totalSupply;
    }

    /**
     * @notice 返回账户余额
     */
    function balanceOf(address account) external view returns (uint256) {
        return LibDiamond.diamondStorage().balances[account];
    }

    /**
     * @notice 返回授权额度
     */
    function allowance(
        address owner,
        address spender
    ) external view returns (uint256) {
        return LibDiamond.diamondStorage().allowances[owner][spender];
    }

    /**
     * @notice 转账代币
     */
    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    /**
     * @notice 授权额度
     */
    function approve(address spender, uint256 amount) external returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    /**
     * @notice 从授权额度转账
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        uint256 currentAllowance = ds.allowances[from][msg.sender];
        require(currentAllowance >= amount, "ERC20: insufficient allowance");

        unchecked {
            _approve(from, msg.sender, currentAllowance - amount);
        }

        _transfer(from, to, amount);
        return true;
    }

    /**
     * @notice 增加授权额度
     */
    function increaseAllowance(
        address spender,
        uint256 addedValue
    ) external returns (bool) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        _approve(
            msg.sender,
            spender,
            ds.allowances[msg.sender][spender] + addedValue
        );
        return true;
    }

    /**
     * @notice 减少授权额度
     */
    function decreaseAllowance(
        address spender,
        uint256 subtractedValue
    ) external returns (bool) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        uint256 currentAllowance = ds.allowances[msg.sender][spender];
        require(
            currentAllowance >= subtractedValue,
            "ERC20: decreased allowance below zero"
        );

        unchecked {
            _approve(msg.sender, spender, currentAllowance - subtractedValue);
        }
        return true;
    }

    /**
     * @notice 内部转账函数
     * @dev 由 ShibMeme Facet 重写以添加税费逻辑
     */
    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");

        uint256 fromBalance = ds.balances[from];
        require(
            fromBalance >= amount,
            "ERC20: transfer amount exceeds balance"
        );

        unchecked {
            ds.balances[from] = fromBalance - amount;
            ds.balances[to] += amount;
        }

        emit Transfer(from, to, amount);
    }

    /**
     * @notice 内部铸币函数
     */
    function _mint(address account, uint256 amount) internal {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        require(account != address(0), "ERC20: mint to the zero address");

        ds.totalSupply += amount;
        unchecked {
            ds.balances[account] += amount;
        }

        emit Transfer(address(0), account, amount);
    }

    /**
     * @notice 内部销毁函数
     */
    function _burn(address account, uint256 amount) internal {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        require(account != address(0), "ERC20: burn from the zero address");

        uint256 accountBalance = ds.balances[account];
        require(accountBalance >= amount, "ERC20: burn amount exceeds balance");

        unchecked {
            ds.balances[account] = accountBalance - amount;
            ds.totalSupply -= amount;
        }

        emit Transfer(account, address(0), amount);
    }

    /**
     * @notice 内部授权函数
     */
    function _approve(address owner, address spender, uint256 amount) internal {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        ds.allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
}
