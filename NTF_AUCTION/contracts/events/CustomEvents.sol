//  SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// ETH 捐赠事件
event DonationETH(address indexed donator, uint256 amount, uint256 timestamp);
// ERC20 捐赠事件
event DonationERC20(
    address indexed donator,
    address indexed tokenAddress,
    uint256 amount,
    uint256 timestamp
);
// ERC721 捐赠事件
event DonationERC721(
    address indexed donator,
    address indexed tokenAddress,
    uint256 tokenId,
    uint256 timestamp
);
// ERC1155 捐赠事件
event DonationERC1155(
    address indexed donator,
    address indexed tokenAddress,
    uint256 tokenId,
    uint256 amount,
    uint256 timestamp
);

//提现事件
event WithdrawETH(address indexed to, uint256 amount, uint256 timestamp);
event WithdrawERC20(
    address indexed to,
    address indexed tokenAddress,
    uint256 amount,
    uint256 timestamp
);
event WithdrawERC721(
    address indexed to,
    address indexed tokenAddress,
    uint256 tokenId,
    uint256 timestamp
);
event WithdrawERC1155(
    address indexed to,
    address indexed tokenAddress,
    uint256 tokenId,
    uint256 amount,
    uint256 timestamp
);
event BatchWithdrawERC1155(
    address indexed to,
    address indexed tokenAddress,
    uint256[] tokenIds,
    uint256[] amounts,
    uint256 timestamp
);

// 插入排行榜
event RankDonator(address indexed donator, uint256 amount, uint256 timestamp);


  