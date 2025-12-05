// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

import "@openzeppelin/contracts/access/Ownable.sol";

import "../errors/CustomErrors.sol";
import "../events/CustomEvents.sol";
import {CustomModifier} from "../modify/CustomModifier.sol";

contract BeggingContract is
    ERC165,
    IERC1155Receiver,
    IERC721Receiver,
    Ownable,
    CustomModifier,
    Pausable,
    ReentrancyGuard
{
    //每个捐赠者的捐赠金额
    // 捐赠排行榜：实现一个功能，显示捐赠金额最多的前 3 个地址。

    // 一个 donate 函数，允许用户向合约发送以太币，并记录捐赠信息
    // 一个 withdraw 函数，允许合约所有者提取所有资金。
    // 一个 getDonation 函数，允许查询某个地址的捐赠金额。
    // 使用 payable 修饰符和 address.transfer 实现支付和提款。
    // 捐赠事件：添加 Donation 事件，记录每次捐赠的地址和金额。
    // 时间限制：添加一个时间限制，只有在特定时间段内才能捐赠

    //排行只记录前三名地址
    address[] public topDonators = new address[](3);

    mapping(address => uint256) public donatorAmounts;

    uint256 public startTime;
    uint256 public endTime;

    using SafeERC20 for IERC20;

    constructor(uint256 _startTime, uint256 _endTime) Ownable(msg.sender) {
        if (_endTime <= _startTime) {
            revert InvalidTimeRange();
        }

        startTime = _startTime;
        endTime = _endTime;
    }

    // ETH捐赠
    function donateETH()
        external
        payable
        TimeRestricted(startTime, endTime)
        whenNotPaused
    {
        _processDonation();
    }
    // ERC20捐赠
    function donateERC20(
        address tokenAddress,
        uint256 amount
    )
        external
        TimeRestricted(startTime, endTime)
        whenNotPaused
        NonZeroAddress(tokenAddress)
    {
        if (
            amount == 0 || IERC20(tokenAddress).balanceOf(msg.sender) < amount
        ) {
            revert InsufficientBalance();
        }

        IERC20(tokenAddress).safeTransferFrom(
            msg.sender,
            address(this),
            amount
        );

        emit DonationERC20(msg.sender, tokenAddress, amount, block.timestamp);
    }
    //捐赠ERC721
    function donateNFT(
        address nftAddress,
        uint256 tokenId
    )
        external
        TimeRestricted(startTime, endTime)
        whenNotPaused
        NonZeroAddress(nftAddress)
    {
        IERC721(nftAddress).safeTransferFrom(
            msg.sender,
            address(this),
            tokenId
        );
        emit DonationERC721(msg.sender, nftAddress, tokenId, block.timestamp);
    }
    // 捐赠1155
    function donateERC1155(
        address nftAddress,
        uint256 tokenId,
        uint256 amount,
        bytes calldata data
    )
        external
        TimeRestricted(startTime, endTime)
        whenNotPaused
        NonZeroAddress(nftAddress)
    {
        IERC1155(nftAddress).safeTransferFrom(
            msg.sender,
            address(this),
            tokenId,
            amount,
            data
        );
        emit DonationERC1155(
            msg.sender,
            nftAddress,
            tokenId,
            amount,
            block.timestamp
        );
    }

    // 内部方法,捐赠排行,不需要排序,只需要判断是否进入前三名即可,排序在getTopDonators中处理
    function setRankDonator(
        address donatorAddress
    ) internal NonZeroAddress(donatorAddress) {
        uint256 length = topDonators.length;

        //判断address是否已在榜单中
        for (uint256 i = 0; i < length; i++) {
            if (topDonators[i] == donatorAddress) {
                return; //已在榜单中，直接返回
            }
        }

        uint min = donatorAmounts[topDonators[0]];
        uint minIndex = 0;
        for (uint256 i = 1; i < length; i++) {
            if (donatorAmounts[topDonators[i]] < min) {
                min = donatorAmounts[topDonators[i]];
                minIndex = i;
            }
        }
        if (donatorAmounts[donatorAddress] > min) {
            topDonators[minIndex] = donatorAddress;
            emit RankDonator(
                donatorAddress,
                donatorAmounts[donatorAddress],
                block.timestamp
            );
        }
    }

    // 获取排行
    // 效率低仅供演示,日常开发建议链下处理
    function getTopDonators() external view returns (address[] memory) {
        address[] memory topDonatorsMem = topDonators;
        // 重新排序
        uint256 length = topDonatorsMem.length;
        for (uint256 i = 0; i < length - 1; i++) {
            for (uint256 j = 0; j < length - i - 1; j++) {
                if (
                    donatorAmounts[topDonatorsMem[j]] <
                    donatorAmounts[topDonatorsMem[j + 1]]
                ) {
                    // 交换
                    address temp = topDonatorsMem[j];
                    topDonatorsMem[j] = topDonatorsMem[j + 1];
                    topDonatorsMem[j + 1] = temp;
                }
            }
        }
        return topDonatorsMem;
    }

    // 获取地址捐赠ETH金额
    function getDonation(address donator) external view returns (uint256) {
        return donatorAmounts[donator];
    }

    //-------------------------------提现-----------------------------------------------
    function withdrawETH() external onlyOwner whenNotPaused nonReentrant {
        uint256 balance = address(this).balance;
        if (balance == 0) {
            revert InsufficientBalance();
        }
        (bool sent, ) = payable(msg.sender).call{value: balance}("");
        require(sent, "Failed to send Ether");
        emit WithdrawETH(msg.sender, balance, block.timestamp);
    }

    function withdrawERC20(
        address tokenAddress
    )
        external
        onlyOwner
        whenNotPaused
        nonReentrant
        NonZeroAddress(tokenAddress)
    {
        uint256 balance = IERC20(tokenAddress).balanceOf(address(this));
        // if (balance == 0) {
        //     revert InsufficientBalance();
        // }
        //safeTransfer会自动检查余额
        IERC20(tokenAddress).safeTransfer(msg.sender, balance);
        emit WithdrawERC20(msg.sender, tokenAddress, balance, block.timestamp);
    }

    function withdrawNFT(
        address nftAddress,
        uint tokenId
    ) external onlyOwner whenNotPaused nonReentrant NonZeroAddress(nftAddress) {
        IERC721(nftAddress).safeTransferFrom(
            address(this),
            msg.sender,
            tokenId
        );
        emit WithdrawERC721(msg.sender, nftAddress, tokenId, block.timestamp);
    }

    function withdrawERC1155(
        address nftAddress,
        uint tokenId,
        uint amount
    ) external onlyOwner whenNotPaused nonReentrant NonZeroAddress(nftAddress) {
        IERC1155(nftAddress).safeTransferFrom(
            address(this),
            msg.sender,
            tokenId,
            amount,
            ""
        );
        emit WithdrawERC1155(
            msg.sender,
            nftAddress,
            tokenId,
            amount,
            block.timestamp
        );
    }

    function batchWithdrawERC1155(
        address nftAddress,
        uint256[] calldata ids,
        uint256[] calldata amounts
    ) external onlyOwner whenNotPaused nonReentrant NonZeroAddress(nftAddress) {
        IERC1155(nftAddress).safeBatchTransferFrom(
            address(this),
            msg.sender,
            ids,
            amounts,
            ""
        );
        emit BatchWithdrawERC1155(
            msg.sender,
            nftAddress,
            ids,
            amounts,
            block.timestamp
        );
    }

    //---------------------------------- 接收直接转账的ETH ----------------------------------
    /**
     * @notice 接收直接转账的ETH（不带数据）
     * @dev 当有人直接向合约地址转账时触发
     */
    receive() external payable {
        _processDonation();
    }

    /**
     * @notice 接收带有调用数据的ETH转账
     * @dev 当调用不存在的函数或发送带数据的转账时触发
     */
    fallback() external payable {
        _processDonation();
    }

    /**
     * @notice 处理直接转账的内部函数
     * @dev 记录捐赠金额、更新排行榜并触发事件
     */
    function _processDonation()
        private
        TimeRestricted(startTime, endTime)
        whenNotPaused
    {
        if (msg.value == 0) {
            revert InsufficientBalance();
        }
        donatorAmounts[msg.sender] += msg.value;
        setRankDonator(msg.sender);
        emit DonationETH(msg.sender, msg.value, block.timestamp);
    }

    //----------------------------------override functions achivement for receiving ----------------------------------
    function onERC1155Received(
        address /* operator */,
        address /* from */,
        uint256 /* id */,
        uint256 /* value */,
        bytes calldata /* data */
    ) external pure override returns (bytes4) {
        return IERC1155Receiver.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address /* operator */,
        address /* from */,
        uint256[] calldata /* ids */,
        uint256[] calldata /* values */,
        bytes calldata /* data */
    ) external pure override returns (bytes4) {
        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }

    function onERC721Received(
        address /* operator */,
        address /* from */,
        uint256 /* tokenId */,
        bytes calldata /* data */
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC165, IERC165) returns (bool) {
        return
            interfaceId == type(IERC1155Receiver).interfaceId ||
            interfaceId == type(IERC721Receiver).interfaceId ||
            super.supportsInterface(interfaceId);
    }
    // ---------------------------暂停和恢复合约功能---------------------------
    function pause() external onlyOwner {
        _pause();
    }
    function unpause() external onlyOwner {
        _unpause();
    }
}
