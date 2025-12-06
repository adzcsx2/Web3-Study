// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title NextSwapAirdrop
 * @dev NextSwapAirdrop
 * 领取空投合约,基于Merkle Tree实现,多轮领取.
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../../events/NextSwapEvents.sol";
import "../NextSwapToken.sol";

contract NextSwapAirdrop is AccessControl, ReentrancyGuard, NextSwapEvents {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    bytes32 public merkleRoot;
    //已领取映射 hasClaimed[airdropRound][address] = bool
    mapping(uint256 => mapping(address => bool)) public hasClaimed;

    constructor(address tokenAddress) {
        token = IERC20(tokenAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    /**
     * @dev 领取空投代币
     * @param airdropRound 空投轮次
     * @param recipient 接收地址
     * @param amount 领取数量
     * @param proof Merkle 证明
     */
    function _claim(
        uint256 airdropRound,
        address recipient,
        uint256 amount,
        bytes32[] calldata proof
    ) internal nonReentrant {
        require(
            hasClaimed[airdropRound][recipient] == false,
            "Airdrop already claimed"
        );
        bytes32 node = keccak256(abi.encodePacked(recipient, amount));
        require(
            MerkleProof.verify(proof, merkleRoot, node),
            "Invalid Merkle Proof"
        );
        hasClaimed[airdropRound][recipient] = true;
        require(
            token.balanceOf(address(this)) >= amount,
            "Insufficient token balance"
        );
        token.safeTransfer(recipient, amount);
        emit AirdropTokensWithdrawn(recipient, amount);
    }

    function claim(
        uint256 airdropRound,
        address recipient,
        uint256 amount,
        bytes32[] calldata proof
    ) external nonReentrant {
        _claim(airdropRound, recipient, amount, proof);
    }

    //批量领取
    function batchClaim(
        uint256 airdropRound,
        address[] calldata recipients,
        uint256[] calldata amounts,
        bytes32[][] calldata proofs
    ) external nonReentrant {
        require(recipients.length > 0, "error arrays");
        require(recipients.length == amounts.length, "Mismatched arrays");
        require(recipients.length == proofs.length, "Mismatched arrays");

        uint256 length = recipients.length;

        for (uint256 i = 0; i < length; i++) {
            _claim(airdropRound, recipients[i], amounts[i], proofs[i]);
        }
    }

    // 更新 Merkle 根
    function updateMerkleRoot(
        bytes32 newRoot
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        merkleRoot = newRoot;
        emit AirdropMerkleRootUpdated(newRoot);
    }
    // 空投结束后,提取剩余代币到生态基金
    function widthdrawTokens(
        address to,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            token.balanceOf(address(this)) >= amount,
            "Insufficient token balance"
        );
        token.transfer(to, amount);
        emit AirdropTokensWithdrawn(to, amount);
    }
}
