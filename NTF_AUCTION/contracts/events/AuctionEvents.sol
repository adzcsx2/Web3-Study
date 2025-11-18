//SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @dev 拍卖事件定义
 * @notice 关键业务时间点添加 timestamp，其他事件可从区块获取时间
 */

event AuctionCreated(
    uint256 indexed auctionId,
    address indexed seller,
    address indexed tokenAddress,
    uint256 tokenId,
    uint256 startingPrice,
    uint256 endTime
);

event AuctionStarted(
    uint256 indexed auctionId,
    address indexed seller,
    uint256 startTime
);

event AuctionCanceled(
    uint256 indexed auctionId,
    address indexed seller,
    address indexed tokenAddress,
    uint256 tokenId
);

event AuctionEnded(
    uint256 indexed auctionId,
    address indexed winner,
    uint256 finalBid,
    uint256 feePrice,
    uint256 endTime
);
// 修改最高出价者
event BidPlaced(
    uint256 auctionId,
    address highestAddress,
    uint256 highestBid,
    uint256 feePrice
);
// 退还之前最高出价者资金
event BidRefunded(
    uint256 auctionId,
    address beforeHighestBidder,
    uint256 beforeHighestBid,
    uint256 feePrice
);

// 合约暂停事件
event ContractPaused(address indexed by);

// 合约恢复事件
event ContractUnpaused(address indexed by);

// 紧急提取NFT事件
event EmergencyNFTWithdrawn(
    uint256 indexed auctionId,
    address indexed seller,
    address indexed tokenAddress,
    uint256 tokenId
);

// 预言机地址更新事件
event DataFeedUpdated(
    address indexed oldDataFeed,
    address indexed newDataFeed,
    address indexed updatedBy
);

// 手续费接收地址更新事件
event FeeRecipientUpdated(
    address indexed oldRecipient,
    address indexed newRecipient
);
