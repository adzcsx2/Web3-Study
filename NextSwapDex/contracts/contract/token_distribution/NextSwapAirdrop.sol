// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title NextSwapAirdrop
 * @dev NextSwapAirdrop
 * 领取空投合约,基于Merkle Tree实现,多轮领取.
 * 修复版本
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

import "../../events/NextSwapEvents.sol";
import "../NextSwapToken.sol";
import "../../modifiers/NextSwapModifier.sol";
import "../../structs/NextSwapStructs.sol";

contract NextSwapAirdrop is
    AccessControl,
    ReentrancyGuard,
    Pausable,
    NextSwapEvents
{
    using SafeERC20 for IERC20;

    // 创建 PAUSER_ROLE
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    IERC20 public immutable token;
    //已领取映射 hasClaimed[airdropRound][address] = bool
    mapping(uint256 => mapping(address => bool)) public hasClaimed;

    mapping(uint256 => AirdropRound) public airdropRounds;
    uint256 public currentRound;

    constructor(address tokenAddress) {
        token = IERC20(tokenAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
    }

    /**
     * @dev 创建新的空投轮次
     */
    function createAirdropRound(
        uint256 round,
        bytes32 _merkleRoot,
        uint256 startTime,
        uint256 endTime
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(round > currentRound, "Invalid round number");
        require(
            airdropRounds[round].merkleRoot == bytes32(0),
            "Round already exists"
        );
        require(startTime < endTime, "Invalid time range");
        require(_merkleRoot != bytes32(0), "Invalid merkle root");

        airdropRounds[round] = AirdropRound({
            merkleRoot: _merkleRoot,
            startTime: startTime,
            endTime: endTime,
            isActive: true
        });

        currentRound = round;
        emit AirdropMerkleRootUpdated(_merkleRoot);
    }

    /**
     * @dev 设置空投轮次状态
     */
    function setRoundActive(
        uint256 round,
        bool _isActive
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(round <= currentRound, "Round does not exist");
        airdropRounds[round].isActive = _isActive;
    }

    /**
     * @dev 领取空投代币
     */
    function _claim(
        uint256 airdropRound,
        address recipient,
        uint256 amount,
        bytes32[] calldata proof
    ) internal {
        require(
            !hasClaimed[airdropRound][recipient],
            "Airdrop already claimed"
        );
        require(amount > 0, "Amount must be greater than 0");

        AirdropRound storage round = airdropRounds[airdropRound];
        require(round.merkleRoot != bytes32(0), "Round does not exist");
        require(round.isActive, "Round is not active");
        require(block.timestamp >= round.startTime, "Airdrop not started");
        require(block.timestamp <= round.endTime, "Airdrop ended");

        bytes32 node = keccak256(abi.encode(recipient, amount));
        require(
            MerkleProof.verify(proof, round.merkleRoot, node),
            "Invalid Merkle Proof"
        );

        hasClaimed[airdropRound][recipient] = true;

        token.safeTransfer(recipient, amount);
        emit AirdropTokensWithdrawn(recipient, amount);
    }

    function claim(
        uint256 airdropRound,
        address recipient,
        uint256 amount,
        bytes32[] calldata proof
    ) external nonReentrant whenNotPaused {
        require(recipient == msg.sender, "Can only claim for yourself");
        require(
            token.balanceOf(address(this)) >= amount,
            "Insufficient token balance"
        );
        _claim(airdropRound, recipient, amount, proof);
    }

    /**
     * @dev 批量领取 - 优化版本
     */
    function batchClaim(
        uint256 airdropRound,
        address[] calldata recipients,
        uint256[] calldata amounts,
        bytes32[][] calldata proofs
    ) external nonReentrant whenNotPaused {
        require(recipients.length > 0, "Empty arrays");
        require(recipients.length == amounts.length, "Array length mismatch");
        require(
            recipients.length == proofs.length,
            "Proof array length mismatch"
        );

        // 计算总需要的代币数量
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            require(amounts[i] > 0, "Amount must be greater than 0");
            totalAmount += amounts[i];
        }

        require(
            token.balanceOf(address(this)) >= totalAmount,
            "Insufficient total balance"
        );

        for (uint256 i = 0; i < recipients.length; i++) {
            _claim(airdropRound, recipients[i], amounts[i], proofs[i]);
        }
    }

    /**
     * @dev 提取剩余代币到生态基金
     */
    function withdrawTokens(
        address to,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(to != address(0), "Invalid recipient");
        require(
            token.balanceOf(address(this)) >= amount,
            "Insufficient token balance"
        );

        token.safeTransfer(to, amount);
        emit AirdropTokensWithdrawn(to, amount);
    }

    /**
     * @dev 紧急提取代币（包括误转的ERC20代币）
     */
    function emergencyWithdraw(
        address tokenAddress,
        address to,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(to != address(0), "Invalid recipient");
        require(tokenAddress != address(0), "Invalid token address");

        IERC20(tokenAddress).safeTransfer(to, amount);
        emit EmergencyTokenRecovered(tokenAddress, to, amount, msg.sender);
    }

    /**
     * @dev 暂停合约
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev 恢复合约
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev 获取轮次信息
     */
    function getRoundInfo(
        uint256 round
    )
        external
        view
        returns (
            bytes32 _merkleRoot,
            uint256 startTime,
            uint256 endTime,
            bool isActive
        )
    {
        AirdropRound memory roundInfo = airdropRounds[round];
        return (
            roundInfo.merkleRoot,
            roundInfo.startTime,
            roundInfo.endTime,
            roundInfo.isActive
        );
    }
}
