// SPDX-License-Identifier: MIT

pragma solidity ^0.8.26;

// 1.使用 Hardhat 框架开发一个 NFT 拍卖市场。
// 2.使用 Chainlink 的 feedData 预言机功能，计算 ERC20 和以太坊到美元的价格。
// 3.使用 UUPS/透明代理模式实现合约升级。

/**
 * 1.实现 NFT 拍卖市场
 * 2.NFT 合约：
 * 3.使用 ERC721 标准实现一个 NFT 合约。
 * 4.支持 NFT 的铸造和转移。
 * 5.拍卖合约：
 *     实现一个拍卖合约，支持以下功能：
 *     创建拍卖：允许用户将 NFT 上架拍卖。
 *     出价：允许用户以 ERC20 或以太坊出价。
 *     结束拍卖：拍卖结束后，NFT 转移给出价最高者，资金转移给卖家。
 * 6.集成 Chainlink 预言机
 *     价格计算：
 *     使用 Chainlink 的 feedData 预言机，获取 ERC20 和以太坊到美元的价格。
 *     在拍卖合约中，将出价金额转换为美元，方便用户比较。
 * 7.合约升级
 *     UUPS/透明代理：
 *     使用 UUPS 或透明代理模式实现合约升级。
 * 8.动态手续费：根据拍卖金额动态调整手续费。
 */

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import {
    AggregatorV3Interface
} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

import "../modify/CustomModifier.sol";
import "../structs/Auction.sol";
import "../events/AuctionEvents.sol";

contract NFTAuction is
    Initializable,
    IERC721Receiver,
    UUPSUpgradeable,
    OwnableUpgradeable,
    CustomModifier,
    ReentrancyGuardUpgradeable
{
    // ================================ 状态变量 ================================
    uint256 public auctionCount; // 拍卖计数器（从1开始，0表示不存在）
    mapping(uint256 => Auction) public auctions; // 拍卖映射表

    // 优化：通过用户地址->token地址->tokenId来获取拍卖ID,防止重复创建拍卖
    mapping(address => mapping(address => mapping(uint256 => uint256)))
        public tokenToAuctionId;

    // Chainlink 数据预言机接口
    AggregatorV3Interface internal dataFeed;

    // 平台手续费接收地址
    address public feeRecipient;

    // Chainlink 价格精度（通常是 8 位小数）
    uint256 private constant PRICE_DECIMALS = 1e8;

    // 紧急暂停状态
    bool public paused;

    // ================================ 时间常量 ================================
    uint256 private constant MAX_AUCTION_DURATION = 90 days;
    uint256 private constant MAX_START_TIME_DELAY = 30 days;
    uint256 private constant EMERGENCY_WITHDRAW_DELAY = 3 days;
    uint256 private constant CHAINLINK_STALENESS_THRESHOLD = 2 hours;

    // ================================ 价格常量 ================================
    uint256 private constant MIN_ETH_PRICE_USD = 100 * 1e8; // $100 (8位小数)
    uint256 private constant MAX_ETH_PRICE_USD = 100000 * 1e8; // $100,000 (8位小数)
    uint256 private constant MAX_BID_USD = 1_000_000_000 * 1e18; // 10亿美元上限 (18位小数)

    // ================================ 限制常量 ================================
    uint256 private constant MAX_BATCH_QUERY_SIZE = 100; // 批量查询最大数量

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // 初始化函数，替代构造函数
    function initialize(address _feeRecipient) public initializer {
        require(
            _feeRecipient != address(0),
            "Fee recipient cannot be zero address"
        );

        __Ownable_init(msg.sender); // 初始化 OwnableUpgradeable
        __UUPSUpgradeable_init(); // 初始化 UUPSUpgradeable
        __ReentrancyGuard_init(); // 初始化 ReentrancyGuardUpgradeable

        // 初始化状态变量
        auctionCount = 0;
        paused = false;

        dataFeed = AggregatorV3Interface(
            0x694AA1769357215DE4FAC081bf1f309aDC325306
        ); // ETH/USD 预言机地址（根据实际网络选择）
        feeRecipient = _feeRecipient; // 设置手续费接收地址
    }

    //升级合约时调用
    function _authorizeUpgrade(
        address /* newImplementation */
    ) internal override onlyOwner {
        // Authorization logic for upgrade
    }
    // 实现 IERC721Receiver 接口的函数
    function onERC721Received(
        address /* operator */,
        address /* from */,
        uint256 /* tokenId */,
        bytes calldata /* data */
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }
    // -------------------------------------核心逻辑-------------------------------------

    // 查询拍卖信息（纯查询，无副作用）
    function getAuction(
        uint256 auctionId
    ) external view returns (Auction memory) {
        _validateAuctionIdRange(auctionId);
        return auctions[auctionId];
    }

    /**
     * @dev 手动触发拍卖结算（建议在链下监控时间到期后调用）
     * @param auctionId 拍卖ID
     */
    function settleAuction(
        uint256 auctionId
    ) external nonReentrant whenNotPaused {
        // 首先验证拍卖是否存在
        _validateAuctionExists(auctionId);

        Auction storage auction = auctions[auctionId];
        require(
            block.timestamp >= auction.endTime,
            "Auction has not ended yet"
        );
        // 🔒 防止重复调用已结算的拍卖
        require(!auction.ended, "Auction already settled");
        _auctionRender(auctionId);
    }

    /**
     * @dev 修饰符：要求合约未暂停
     */
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    /**
     * @dev 暂停合约（仅所有者）
     */
    function pause() external onlyOwner {
        paused = true;
        emit ContractPaused(msg.sender);
    }

    /**
     * @dev 恢复合约（仅所有者）
     */
    function unpause() external onlyOwner {
        paused = false;
        emit ContractUnpaused(msg.sender);
    }

    /**
     * @dev 创建拍卖
     * @param tokenAddress NFT 合约地址
     * @param tokenId NFT 代币 ID
     * 默认起始价为 0，结束时间为当前时间加 1 天，每次出价后延长 10 分钟，最小加价1美元
     */
    function createAuction(
        address tokenAddress,
        uint256 tokenId
    ) external whenNotPaused {
        createAuction(
            tokenAddress,
            tokenId,
            0,
            block.timestamp + 1 days,
            10 minutes,
            5,
            1e18 // 最小加价1美元（18位小数）
        );
    }

    /**
     * @dev 创建拍卖（指定起始价）
     * @param _tokenAddress NFT 合约地址
     * @param _tokenId NFT 代币 ID
     * @param _startingPrice 起始价（USD，18位小数）
     * @param _endTime 拍卖结束时间戳
     * @param _bidIncreaseTime 每次出价后延长的时间
     * @param _feePercent 手续费百分比
     * @param _minBidIncrement 最小加价幅度（USD，18位小数）
     */
    function createAuction(
        address _tokenAddress,
        uint256 _tokenId,
        uint256 _startingPrice,
        uint256 _endTime,
        uint256 _bidIncreaseTime,
        uint256 _feePercent,
        uint256 _minBidIncrement
    ) public TokenExists(_tokenAddress, _tokenId, msg.sender) {
        IERC721 iToken = IERC721(_tokenAddress);

        // 验证：手续费不能超过20%（合理范围）
        require(_feePercent <= 20, "Fee percent cannot exceed 20");
        // 验证：结束时间必须在未来
        require(_endTime > block.timestamp, "End time must be in future");
        // 验证：拍卖时长不能超过最大限制
        require(
            _endTime <= block.timestamp + MAX_AUCTION_DURATION,
            "Auction duration too long"
        );

        // 🔒 检查是否已存在未结束的拍卖
        uint256 existingAuctionId = tokenToAuctionId[msg.sender][_tokenAddress][
            _tokenId
        ];
        if (existingAuctionId != 0) {
            Auction storage existingAuction = auctions[existingAuctionId];
            // 验证：同一NFT不能同时存在多个活跃拍卖
            _validateNoActiveAuction(existingAuction);
        }

        // 🔒 检查合约是否已获得授权
        _validateNFTApproval(iToken, _tokenId, msg.sender);

        // 构建实体
        Auction memory newAuction = Auction({
            tokenAddress: _tokenAddress,
            tokenId: _tokenId,
            seller: msg.sender,
            startingPrice: _startingPrice,
            highestBid: _startingPrice,
            highestBidder: address(0),
            highestBidEth: 0,
            startTime: 0,
            endTime: _endTime,
            bidIncreaseTime: _bidIncreaseTime,
            feePercent: _feePercent,
            feePrice: 0,
            minBidIncrement: _minBidIncrement,
            ended: false,
            canceled: false,
            createdTime: block.timestamp
        });

        auctionCount++;
        // 保存拍卖
        uint256 auctionId = auctionCount;
        auctions[auctionId] = newAuction;

        // 转移NFT到拍卖合约
        iToken.safeTransferFrom(msg.sender, address(this), _tokenId);
        // 建立 NFT 到拍卖 ID 的映射（用于快速查询）
        tokenToAuctionId[msg.sender][_tokenAddress][_tokenId] = auctionId;

        emit AuctionCreated(
            auctionId,
            msg.sender,
            _tokenAddress,
            _tokenId,
            _startingPrice,
            _endTime
        );
    }

    /**
     * @dev 开始拍卖
     * @param tokenAddress NFT 合约地址
     * @param tokenId NFT 代币 ID
     * @param timestamp 拍卖开始时间戳
     */

    function startAuction(
        address tokenAddress,
        uint256 tokenId,
        uint256 timestamp
    ) external whenNotPaused {
        // ✅ 优化：O(1) 查询，而不是 O(n) 循环
        uint256 auctionId = tokenToAuctionId[msg.sender][tokenAddress][tokenId];
        // 验证：拍卖必须存在
        _validateAuctionExists(auctionId);

        Auction storage auction = auctions[auctionId];

        // 验证：拍卖开始前的所有必要条件
        _validateStartAuction(auction, msg.sender);

        // 验证：开始时间必须是当前或未来时间
        require(
            timestamp >= block.timestamp,
            "Start time must be current or future"
        );
        // 验证：开始时间不能超过结束时间
        require(
            timestamp < auction.endTime,
            "Start time must be before end time"
        );
        // 验证：开始时间不能太遥远
        require(
            timestamp <= block.timestamp + MAX_START_TIME_DELAY,
            "Start time too far in future"
        );

        // 标记为已开始
        auction.startTime = timestamp;

        emit AuctionStarted(auctionId, msg.sender, timestamp);
    }

    /**
     * @dev 取消拍卖逻辑
     * @param tokenAddress NFT 合约地址
     * @param tokenId NFT 代币 ID
     * @notice 只能在拍卖未开始、未结束且无出价者的情况下取消拍卖
     */
    function cancelAuction(address tokenAddress, uint256 tokenId) external {
        IERC721 iToken = IERC721(tokenAddress);

        // ✅ 优化：只查询一次
        uint256 auctionId = tokenToAuctionId[msg.sender][tokenAddress][tokenId];
        // 验证：拍卖必须存在
        _validateAuctionExists(auctionId);

        Auction storage auction = auctions[auctionId];

        // 验证：取消拍卖的所有必要条件
        _validateCancelAuction(auction, msg.sender);
        // 验证：拍卖必须未开始（只能在开始前取消）
        require(auction.startTime == 0, "Cannot cancel started auction");

        // 标记为已取消
        auction.canceled = true;

        // 清理映射（可选，节省后续查询的 gas）
        delete tokenToAuctionId[msg.sender][tokenAddress][tokenId];

        // 发送 NFT 回卖家
        iToken.safeTransferFrom(address(this), msg.sender, tokenId);

        emit AuctionCanceled(auctionId, msg.sender, tokenAddress, tokenId);
    }

    /**
     * @dev 出价
     * @param auctionId 拍卖 ID
     * @param bidAmountUsd 出价金额（USD，18位小数）
     * @notice 出价时只需支付出价金额，手续费在拍卖结束时从出价金额中扣除
     */
    function placeBid(
        uint256 auctionId,
        uint256 bidAmountUsd
    ) external payable nonReentrant whenNotPaused {
        Auction storage auction = auctions[auctionId];

        // 先验证拍卖是否已结束（避免在出价时触发结算）
        require(block.timestamp < auction.endTime, "Auction has ended");

        // 验证拍卖状态
        _validateAuctionExists(auctionId);
        _validateAuctionStarted(auction.startTime);
        _validateAuctionNotCanceled(auction.canceled);
        require(!auction.ended, "Auction already settled");

        // 获取 ETH/USD 价格（8位小数）
        int256 ethFeed = getChainlinkDataFeedLatestAnswer();
        require(ethFeed > 0, "Invalid data feed value");
        uint256 ethToUsdPrice = uint256(ethFeed); // 例如: 2000_00000000 ($2000)

        uint256 nowHighestBid = auction.highestBid;
        // 验证：出价必须高于当前最高出价
        _validateBidAmount(bidAmountUsd, nowHighestBid);

        // 🔒 防止溢出攻击：限制最大出价金额
        require(
            bidAmountUsd <= MAX_BID_USD,
            "Bid amount exceeds maximum limit"
        );

        // 验证：出价必须满足最小加价幅度（但如果是第一次出价且起始价为0，则只需大于0）
        if (nowHighestBid > 0) {
            require(
                bidAmountUsd >= nowHighestBid + auction.minBidIncrement,
                "Bid increment too small"
            );
        }

        // 计算需要的 ETH 金额（只需出价金额，不含手续费）
        // msg.value 是 wei (18位小数)
        // ethToUsdPrice 是 8位小数
        // bidAmountUsd 是 18位小数
        // 所以: msg.value * ethToUsdPrice / PRICE_DECIMALS >= bidAmountUsd

        // 使用 Math.mulDiv 安全计算 msg.value 的 USD 价值（防止中间溢出）
        // msgValueInUsd = msg.value * ethToUsdPrice / PRICE_DECIMALS
        uint256 msgValueInUsd = Math.mulDiv(
            msg.value,
            ethToUsdPrice,
            PRICE_DECIMALS
        );
        require(msgValueInUsd >= bidAmountUsd, "Insufficient ETH sent for bid");

        // 使用 Math.mulDiv 向上取整计算所需 ETH（防止溢出和精度丢失）
        // requiredEth = (bidAmountUsd * PRICE_DECIMALS + ethToUsdPrice - 1) / ethToUsdPrice
        uint256 requiredEth = Math.mulDiv(
            bidAmountUsd,
            PRICE_DECIMALS,
            ethToUsdPrice,
            Math.Rounding.Ceil // 向上取整，确保用户支付足够的 ETH
        );
        uint256 excessEth = msg.value > requiredEth
            ? msg.value - requiredEth
            : 0;

        // 1. 退还上一个出价者的资金（使用存储的实际ETH金额）
        // 使用 .call 方法而非 transfer，避免 gas 限制问题
        if (auction.highestBidder != address(0)) {
            (bool success, ) = payable(auction.highestBidder).call{
                value: auction.highestBidEth // ✅ 使用存储的实际金额
            }("");
            require(success, "Failed to refund previous bidder");
            emit BidRefunded(
                auctionId,
                auction.highestBidder,
                auction.highestBid,
                0 // 退款时不包含手续费
            );
        }

        // 3. 延长拍卖时间 (先改状态防重入)
        if (auction.endTime < (block.timestamp + auction.bidIncreaseTime)) {
            auction.endTime = block.timestamp + auction.bidIncreaseTime;
        }

        // 2. 更新最高出价和出价者
        auction.highestBid = bidAmountUsd;
        auction.highestBidEth = requiredEth; // ✅ 存储实际需要的ETH金额
        // 计算手续费（USD，使用 mulDiv 确保精度）
        auction.feePrice = Math.mulDiv(bidAmountUsd, auction.feePercent, 100);
        auction.highestBidder = msg.sender;

        // 退还多余的ETH给出价者
        if (excessEth > 0) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: excessEth}(
                ""
            );
            require(refundSuccess, "Failed to refund excess ETH");
        }

        // 4. 发出事件
        emit BidPlaced(auctionId, msg.sender, bidAmountUsd, auction.feePrice);
    }

    // 判断拍卖是否结束 返回true表示拍卖已结束并处理完毕，false表示拍卖未结束
    function _auctionRender(uint256 auctionId) internal returns (bool) {
        Auction storage auction = auctions[auctionId];
        //拍卖必须存在
        _validateAuctionExists(auctionId);
        // 拍卖必须开始
        _validateAuctionStarted(auction.startTime);
        // 拍卖必须未取消
        _validateAuctionNotCanceled(auction.canceled);

        // 如果已经结束过，直接返回true
        if (auction.ended) {
            return true;
        }

        // 检查是否到达结束时间
        if (block.timestamp >= auction.endTime) {
            auction.ended = true;
            IERC721 iToken = IERC721(auction.tokenAddress);

            // 检查是否有出价者
            if (auction.highestBidder != address(0)) {
                // 将 NFT 转移给最高出价者
                iToken.safeTransferFrom(
                    address(this),
                    auction.highestBidder,
                    auction.tokenId
                );

                // 使用存储的实际ETH金额进行分配
                uint256 totalEth = auction.highestBidEth;

                // 计算手续费对应的ETH金额（使用 mulDiv 确保精度）
                uint256 feeAmountEth = Math.mulDiv(
                    totalEth,
                    auction.feePercent,
                    100
                );
                uint256 sellerAmountEth = totalEth - feeAmountEth;

                // 将扣除手续费后的金额转给卖家
                (bool successSeller, ) = payable(auction.seller).call{
                    value: sellerAmountEth
                }("");
                require(successSeller, "Failed to transfer funds to seller");

                // 将手续费转给平台
                (bool successFee, ) = payable(feeRecipient).call{
                    value: feeAmountEth
                }("");
                require(successFee, "Failed to transfer fee to platform");

                emit AuctionEnded(
                    auctionId,
                    auction.highestBidder,
                    auction.highestBid,
                    auction.feePrice,
                    auction.endTime
                );
            } else {
                // 没有出价者，退还 NFT 给卖家
                iToken.safeTransferFrom(
                    address(this),
                    auction.seller,
                    auction.tokenId
                );

                emit AuctionEnded(auctionId, address(0), 0, 0, auction.endTime);
            }

            // 清理映射，允许同一NFT创建新拍卖
            delete tokenToAuctionId[auction.seller][auction.tokenAddress][
                auction.tokenId
            ];

            return true;
        }
        return false;
    }

    /**
     * @dev 批量查询拍卖信息 仅供测试使用,生产环境需要链下监听
     * @param auctionIds 拍卖ID数组
     * @return 拍卖信息数组
     * @notice 最多一次查询100个拍卖，避免gas耗尽
     */
    function getAuctions(
        uint256[] calldata auctionIds
    ) external view returns (Auction[] memory) {
        require(
            auctionIds.length <= MAX_BATCH_QUERY_SIZE,
            "Query size exceeds maximum limit"
        );
        Auction[] memory result = new Auction[](auctionIds.length);
        for (uint256 i = 0; i < auctionIds.length; i++) {
            if (auctionIds[i] > 0 && auctionIds[i] <= auctionCount) {
                result[i] = auctions[auctionIds[i]];
            }
        }
        return result;
    }

    /**
     * @dev 获取当前拍卖总数
     * @return 拍卖总数
     */
    function getAuctionCount() external view returns (uint256) {
        return auctionCount;
    }

    /**
     * @dev 紧急提取NFT（仅所有者，仅在拍卖未开始且超过3天的情况下）
     * @param auctionId 拍卖ID
     * @notice 此功能用于防止NFT永久锁定，仅在紧急情况下使用
     */
    function emergencyWithdrawNFT(uint256 auctionId) external onlyOwner {
        _validateAuctionExists(auctionId);
        Auction storage auction = auctions[auctionId];

        // 验证：拍卖必须未开始
        require(auction.startTime == 0, "Auction has started");
        // 验证：拍卖不能有活跃出价者（防止滥用）
        require(auction.highestBidder == address(0), "Auction has active bids");
        // 验证：创建拍卖指定时间后仍未开始才能紧急提取
        require(
            block.timestamp >= auction.createdTime + EMERGENCY_WITHDRAW_DELAY,
            "Cannot emergency withdraw yet"
        );
        // 验证：拍卖必须未结束
        require(!auction.ended, "Auction already ended");
        // 验证：拍卖必须未取消
        require(!auction.canceled, "Auction already canceled");

        auction.canceled = true;
        IERC721 iToken = IERC721(auction.tokenAddress);

        // 清理映射
        delete tokenToAuctionId[auction.seller][auction.tokenAddress][
            auction.tokenId
        ];

        // 将NFT返还给原卖家
        iToken.safeTransferFrom(address(this), auction.seller, auction.tokenId);

        emit AuctionCanceled(
            auctionId,
            auction.seller,
            auction.tokenAddress,
            auction.tokenId
        );
    }
    //--------------------------------------Chainlink 预言机-------------------------------------

    /**
     * Returns the latest answer.
     */
    function getChainlinkDataFeedLatestAnswer() public view returns (int256) {
        // prettier-ignore
        (
      /* uint80 roundId */
      ,
      int256 answer,
      /*uint256 startedAt*/
      ,
      uint256 updatedAt,
      /*uint80 answeredInRound*/
    ) = dataFeed.latestRoundData();

        // 验证数据新鲜度
        require(updatedAt > 0, "Invalid updatedAt timestamp");
        require(updatedAt <= block.timestamp, "Future timestamp detected");
        // 安全的时间差计算（已经确认 updatedAt <= block.timestamp）
        unchecked {
            require(
                block.timestamp - updatedAt <= CHAINLINK_STALENESS_THRESHOLD,
                "Chainlink data is stale"
            );
        }
        require(answer > 0, "Invalid price data");

        // 额外的合理性检查：ETH价格应该在合理范围内
        require(
            answer >= int256(MIN_ETH_PRICE_USD) &&
                answer <= int256(MAX_ETH_PRICE_USD),
            "Price out of reasonable range"
        );

        return answer;
    }

    /**
     * @dev 设置Chainlink预言机地址（仅所有者）
     * @param _dataFeed 新的预言机地址
     */
    function setDataFeed(address _dataFeed) external onlyOwner {
        require(_dataFeed != address(0), "Data feed cannot be zero address");
        address oldDataFeed = address(dataFeed);
        dataFeed = AggregatorV3Interface(_dataFeed);
        emit DataFeedUpdated(oldDataFeed, _dataFeed, msg.sender);
    }
    //--------------------------------------内部验证函数-------------------------------------
    /**
     * @dev 内部验证函数：检查拍卖是否活跃
     */
    function _validateAuctionActive(
        uint256 startTime,
        uint256 endTime,
        bool canceled
    ) internal view {
        require(
            startTime != 0 &&
                block.timestamp >= startTime &&
                block.timestamp <= endTime,
            "Auction is not active"
        );
        require(!canceled, "The auction is canceled");
    }

    /**
     * @dev 内部验证函数：检查出价金额
     * @param bidAmount 新的出价金额
     * @param currentHighestBid 当前最高出价
     */
    function _validateBidAmount(
        uint256 bidAmount,
        uint256 currentHighestBid
    ) internal pure {
        require(
            bidAmount > currentHighestBid,
            "Bid must be higher than current highest bid"
        );
    }

    /**
     * @dev 内部验证函数：检查拍卖是否存在
     * @param auctionId 拍卖ID
     */
    function _validateAuctionExists(uint256 auctionId) internal view {
        require(
            auctionId > 0 && auctionId <= auctionCount,
            "Auction does not exist"
        );
    }

    /**
     * @dev 内部验证函数：检查拍卖ID是否在有效范围内
     * @param auctionId 拍卖ID
     */
    function _validateAuctionIdRange(uint256 auctionId) internal view {
        require(
            auctionId > 0 && auctionId <= auctionCount,
            "Auction does not exist"
        );
    }

    /**
     * @dev 内部验证函数：检查同一NFT是否已有活跃拍卖
     * @param existingAuction 现有的拍卖
     */
    function _validateNoActiveAuction(
        Auction storage existingAuction
    ) internal view {
        require(
            existingAuction.ended || existingAuction.canceled,
            "Active auction already exists for this NFT"
        );
    }

    /**
     * @dev 内部验证函数：检查NFT授权状态
     * @param iToken NFT合约实例
     * @param tokenId NFT代币ID
     * @param owner NFT所有者地址
     */
    function _validateNFTApproval(
        IERC721 iToken,
        uint256 tokenId,
        address owner
    ) internal view {
        require(
            iToken.getApproved(tokenId) == address(this) ||
                iToken.isApprovedForAll(owner, address(this)),
            "Contract not approved to transfer NFT"
        );
    }

    /**
     * @dev 内部验证函数：检查开始拍卖的条件
     * @param auction 拍卖
     * @param caller 调用者地址
     */
    function _validateStartAuction(
        Auction storage auction,
        address caller
    ) internal view {
        // 验证：只有卖家可以开始拍卖
        require(auction.seller == caller, "Not the seller");
        // 验证：拍卖不能已被取消
        require(!auction.canceled, "Already canceled");
        // 验证：拍卖不能已经开始
        require(auction.startTime == 0, "Already started");
    }

    /**
     * @dev 内部验证函数：检查取消拍卖的条件
     * @param auction 拍卖
     * @param caller 调用者地址
     */
    function _validateCancelAuction(
        Auction storage auction,
        address caller
    ) internal view {
        // 验证：只有卖家可以取消拍卖
        require(
            auction.seller == caller,
            "Caller is not the auction token owner"
        );
        // 验证：拍卖不能已结束
        require(!auction.ended, "Auction has already ended");
        // 验证：拍卖不能已取消
        require(!auction.canceled, "Auction has been canceled");
        // 验证：拍卖不能有活跃出价者
        require(auction.highestBidder == address(0), "Auction has active bids");
    }

    // 拍卖必须开始
    function _validateAuctionStarted(uint startTime) internal view {
        require(
            startTime != 0 && block.timestamp >= startTime,
            "Auction has not started"
        );
    }
    // 拍卖必须未到期
    function _validateAuctionNotExpired(uint endTime) internal view {
        require(block.timestamp <= endTime, "Auction has expired");
    }
    // 拍卖必须未取消
    function _validateAuctionNotCanceled(bool canceled) internal pure {
        require(!canceled, "Auction has been canceled");
    }
    /**
     * @dev 设置手续费接收地址（仅所有者）
     * @param _feeRecipient 新的手续费接收地址
     */
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(
            _feeRecipient != address(0),
            "Fee recipient cannot be zero address"
        );
        address oldRecipient = feeRecipient;
        feeRecipient = _feeRecipient;
        emit FeeRecipientUpdated(oldRecipient, _feeRecipient);
    }
}
