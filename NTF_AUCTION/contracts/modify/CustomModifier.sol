// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title CustomModifier
 * @notice 提供可重用的修饰符
 */
abstract contract CustomModifier {
    /**
     * @notice 时间限制修饰符
     * @param startTime 开始时间戳
     * @param endTime 结束时间戳
     */
    modifier TimeRestricted(uint256 startTime, uint256 endTime) {
        require(
            block.timestamp >= startTime && block.timestamp <= endTime,
            "Donation period is not active"
        );
        _;
    }
    //零地址检查
    modifier NonZeroAddress(address addr) {
        require(addr != address(0), "Address cannot be zero");
        _;
    }
    // 判断是否存在这个NFT,以及是否是拥有者
    modifier TokenExists(
        address nftAddress,
        uint256 tokenId,
        address ownerAddress
    ) {
        IERC721 nftContract = IERC721(nftAddress);
        require(
            nftContract.ownerOf(tokenId) != address(0),
            "Token does not exist"
        );
        require(
            nftContract.ownerOf(tokenId) == ownerAddress,
            "Caller is not the token owner"
        );
        _;
    }
    // 拍卖未结束
    modifier AuctionNotEnded(bool ended) {
        require(!ended, "Auction has already ended");
        _;
    }
    // 拍卖未开始
    modifier AuctionNotStarted(bool started) {
        require(!started, "Auction has already started");
        _;
    }
    // 拍卖未取消
    modifier AuctionNotCanceled(bool canceled) {
        require(!canceled, "Auction has been canceled");
        _;
    }
    // 拍卖NFT属于调用者
    modifier AuctionTokenOwner(address seller, address caller) {
        require(seller == caller, "Caller is not the auction token owner");
        _;
    }
    // 拍卖没有出价者
    modifier AuctionHasBids(address highestBidder) {
        require(highestBidder == address(0), "Auction has active bids");
        _;
    }

    /**
     * @notice 拍卖活跃状态检查
     * @param startTime 拍卖开始时间
     * @param endTime 拍卖结束时间
     * @param canceled 是否已取消
     */
    modifier AuctionIsActive(
        uint256 startTime,
        uint256 endTime,
        bool canceled
    ) {
        require(
            block.timestamp >= startTime && block.timestamp <= endTime,
            "Auction is not active"
        );
        require(!canceled, "The auction is canceled");
        _;
    }

    /**
     * @notice 出价金额验证
     * @param bidAmount 出价金额
     * @param currentHighestBid 当前最高出价
     */
    modifier ValidBidAmount(uint256 bidAmount, uint256 currentHighestBid) {
        require(
            bidAmount > currentHighestBid,
            "Bid must be higher than current highest bid"
        );
        _;
    }
}
