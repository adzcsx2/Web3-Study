// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

struct Auction {
    address tokenAddress; // NFT 合约地址
    uint256 tokenId; // NFT 代币 ID
    address seller; // 卖家地址
    uint256 startingPrice; // 起始价
    uint256 highestBid; // 最高出价（USD，18位小数）
    address highestBidder; // 最高出价者
    uint256 highestBidEth; // 最高出价实际支付的ETH金额（wei）
    uint256 startTime; // 拍卖开始时间
    uint256 endTime; // 拍卖结束时间
    uint256 bidIncreaseTime; // 每次出价后延长的时间
    uint256 feePrice; // 手续费金额（USD，18位小数）
    uint256 feePercent; //手续费百分比
    uint256 minBidIncrement; // 最小加价幅度（USD，18位小数）
    bool ended; // 拍卖是否结束
    bool canceled; // 拍卖是否取消
    uint256 createdTime; // 拍卖创建时间
}
