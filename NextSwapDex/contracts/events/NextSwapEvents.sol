//  SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// role transfer event
event RoleTransferred(
    bytes32 indexed role,
    address indexed from,
    address indexed to
);
event TokensMinted(address indexed to, uint256 amount);
event TokensBurned(address indexed from, uint256 amount);
event TimelockUpdated(address indexed oldTimelock, address indexed newTimelock);
event EmergencyRoleGranted(
    bytes32 indexed role,
    address indexed account,
    address indexed adminAddress
);
event EmergencyRoleRevoked(
    bytes32 indexed role,
    address indexed account,
    address indexed adminAddress
);
event EmergencyTokenRecovered(
    address indexed token,
    address indexed to,
    uint256 amount,
    address indexed adminAddress
);
event AirdropTokensWithdrawn(address indexed to, uint256 amount);
event AirdropMerkleRootUpdated(bytes32 newMerkleRoot);
event RewardAdded(address indexed user, uint256 amount);
event RewardClaimed(address indexed user, uint256 amount);

event EcosystemFundAddressChanged(
    address indexed oldAddress,
    address indexed newAddress
);
event FinalizeRewards(address ecosystemFundAddress, uint256 acount);

event FundReceived(address indexed token, uint256 amount, address indexed from);

event TeamInspireTokensClaimed(
    address indexed to,
    uint256 amount,
    address indexed adminAddress
);

event MemberAllocationAdded(
    address indexed memberAddress,
    uint256 allocation,
    uint256 claimStartTime,
    uint256 claimEndTime,
    address indexed adminAddress
);
event WithdrawNextswapToken(
    address indexed to,
    uint256 amount,
    address indexed adminAddress
);
event PrivateSaleRoundSet(
    uint256 roundId,
    uint256 rate,
    uint256 startTime,
    uint256 endTime,
    uint256 cap,
    bool isActive
);
event TokensAllocated(
    address indexed investor,
    uint256 amountPaid,
    uint256 tokensAllocated
);
event LowTokenBalance(
    address indexed contractAddress,
    uint256 currentBalance,
    uint256 requiredBalance,
    uint256 roundId
);
event InsufficientTokenBalance(
    address indexed investor,
    uint256 requested,
    uint256 available,
    uint256 roundId
);
event LpPoolCreated(
    uint256 indexed poolId,
    address indexed poolAddress,
    address tokenA,
    address tokenB,
    uint24 feeRate,
    uint256 allocPoint
);
event LpStaked(
    address indexed user,
    uint256 indexed tokenId,
    uint256 timestamp
);
event RquestUnstakeLP(
    address indexed user,
    uint256 indexed tokenId,
    uint256 timestamp
);

event LpUnstaked(
    address indexed user,
    uint256 indexed tokenId,
    uint256 timestamp
);

event RewardsClaimed(
    address indexed user,
    uint256 indexed poolId,
    uint256 amount,
    uint256 timestamp
);

event PoolAuthorized(address indexed pool, bool authorized);
event RewardsUpdated(
    address indexed owner,
    uint256[] tokenIds,
    uint256 timestamp
);
event PoolActivate(
    address indexed owner,
    uint256 indexed poolId,
    bool isActive,
    uint256 timestamp
);
