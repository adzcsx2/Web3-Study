// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.20;
pragma abicoder v2;

import "../core/interfaces/INextswapV3Pool.sol";
import "../core/libraries/FixedPoint128.sol";
import "../core/libraries/FullMath.sol";

import "./interfaces/INonfungiblePositionManager.sol";
import "./interfaces/INonfungibleTokenPositionDescriptor.sol";
import "./libraries/PositionKey.sol";
import "./libraries/PoolAddress.sol";
import "./base/LiquidityManagement.sol";
import "./base/PeripheryImmutableState.sol";
import "./base/Multicall.sol";
import "./base/ERC721Permit.sol";
import "./base/PeripheryValidation.sol";
import "./base/SelfPermit.sol";
import "./base/PoolInitializer.sol";

/// @title NFT 流动性头寸
/// @notice 将Nextswap V3头寸封装为ERC721非同质化代币接口
contract NonfungiblePositionManager is
    INonfungiblePositionManager,
    Multicall,
    ERC721Permit,
    PeripheryImmutableState,
    PoolInitializer,
    LiquidityManagement,
    PeripheryValidation,
    SelfPermit
{
    // Nextswap头寸的详细信息
    struct Position {
        // 许可的随机数
        uint96 nonce;
        // 被授权花费此代币的地址
        address operator;
        // 此代币连接的池ID
        uint80 poolId;
        // 头寸的价格范围
        int24 tickLower;
        int24 tickUpper;
        // 头寸的流动性数量
        uint128 liquidity;
        // 在个人头寸上最后一次操作时，聚合头寸的费用增长
        uint256 feeGrowthInside0LastX128;
        uint256 feeGrowthInside1LastX128;
        // 截至上次计算，头寸被欠的未收集代币数量
        uint128 tokensOwed0;
        uint128 tokensOwed1;
    }

    /// @dev 此合约分配的池ID
    mapping(address => uint80) private _poolIds;

    /// @dev 通过池ID存储池键，以节省头寸数据的SSTORE
    mapping(uint80 => PoolAddress.PoolKey) private _poolIdToPoolKey;

    /// @dev 代币ID对应的头寸数据
    mapping(uint256 => Position) private _positions;

    /// @dev 下一个将要铸造的代币ID。跳过0
    uint176 private _nextId = 1;
    /// @dev 下一个首次使用的池ID。跳过0
    uint80 private _nextPoolId = 1;

    /// @dev 代币描述合约的地址，负责为头寸代币生成代币URI
    address private immutable _tokenDescriptor;

    constructor(
        address _factory,
        address _WETH9,
        address _tokenDescriptor_
    )
        ERC721Permit("Nextswap V3 Positions NFT-V1", "Next-V3-POS", "1")
        PeripheryImmutableState(_factory, _WETH9)
    {
        _tokenDescriptor = _tokenDescriptor_;
    }

    /// @inheritdoc INonfungiblePositionManager
    function positions(
        uint256 tokenId
    )
        external
        view
        override
        returns (
            uint96 nonce,
            address operator,
            address token0,
            address token1,
            uint24 fee,
            int24 tickLower,
            int24 tickUpper,
            uint128 liquidity,
            uint256 feeGrowthInside0LastX128,
            uint256 feeGrowthInside1LastX128,
            uint128 tokensOwed0,
            uint128 tokensOwed1
        )
    {
        Position memory position = _positions[tokenId];
        require(position.poolId != 0, "Invalid token ID");
        PoolAddress.PoolKey memory poolKey = _poolIdToPoolKey[position.poolId];
        return (
            position.nonce,
            position.operator,
            poolKey.token0,
            poolKey.token1,
            poolKey.fee,
            position.tickLower,
            position.tickUpper,
            position.liquidity,
            position.feeGrowthInside0LastX128,
            position.feeGrowthInside1LastX128,
            position.tokensOwed0,
            position.tokensOwed1
        );
    }

    /// @dev 缓存池键
    function cachePoolKey(
        address pool,
        PoolAddress.PoolKey memory poolKey
    ) private returns (uint80 poolId) {
        poolId = _poolIds[pool];
        if (poolId == 0) {
            _poolIds[pool] = (poolId = _nextPoolId++);
            _poolIdToPoolKey[poolId] = poolKey;
        }
    }

    /// @inheritdoc INonfungiblePositionManager
    function mint(
        MintParams calldata params
    )
        external
        payable
        override
        checkDeadline(params.deadline)
        returns (
            uint256 tokenId,
            uint128 liquidity,
            uint256 amount0,
            uint256 amount1
        )
    {
        INextswapV3Pool pool;
        (liquidity, amount0, amount1, pool) = addLiquidity(
            AddLiquidityParams({
                token0: params.token0,
                token1: params.token1,
                fee: params.fee,
                recipient: address(this),
                tickLower: params.tickLower,
                tickUpper: params.tickUpper,
                amount0Desired: params.amount0Desired,
                amount1Desired: params.amount1Desired,
                amount0Min: params.amount0Min,
                amount1Min: params.amount1Min
            })
        );

        _mint(params.recipient, (tokenId = _nextId++));

        bytes32 positionKey = PositionKey.compute(
            address(this),
            params.tickLower,
            params.tickUpper
        );
        (
            ,
            uint256 feeGrowthInside0LastX128,
            uint256 feeGrowthInside1LastX128,
            ,

        ) = pool.positions(positionKey);

        // idempotent set
        uint80 poolId = cachePoolKey(
            address(pool),
            PoolAddress.PoolKey({
                token0: params.token0,
                token1: params.token1,
                fee: params.fee
            })
        );

        _positions[tokenId] = Position({
            nonce: 0,
            operator: address(0),
            poolId: poolId,
            tickLower: params.tickLower,
            tickUpper: params.tickUpper,
            liquidity: liquidity,
            feeGrowthInside0LastX128: feeGrowthInside0LastX128,
            feeGrowthInside1LastX128: feeGrowthInside1LastX128,
            tokensOwed0: 0,
            tokensOwed1: 0
        });

        emit IncreaseLiquidity(tokenId, liquidity, amount0, amount1);
    }

    /// @dev 检查调用者是否有权操作指定代币
    modifier isAuthorizedForToken(uint256 tokenId) {
        require(
            _isAuthorized(ownerOf(tokenId), msg.sender, tokenId),
            "Not approved"
        );
        _;
    }

    /// @notice 返回指定代币ID的URI
    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, IERC721Metadata) returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "ERC721: invalid token ID");
        return
            INonfungibleTokenPositionDescriptor(_tokenDescriptor).tokenURI(
                this,
                tokenId
            );
    }

    // 通过移除未使用方法的实现来节省字节码
    function baseURI() public pure returns (string memory) {}

    /// @inheritdoc INonfungiblePositionManager
    function increaseLiquidity(
        IncreaseLiquidityParams calldata params
    )
        external
        payable
        override
        checkDeadline(params.deadline)
        returns (uint128 liquidity, uint256 amount0, uint256 amount1)
    {
        Position storage position = _positions[params.tokenId];

        PoolAddress.PoolKey memory poolKey = _poolIdToPoolKey[position.poolId];

        INextswapV3Pool pool;
        (liquidity, amount0, amount1, pool) = addLiquidity(
            AddLiquidityParams({
                token0: poolKey.token0,
                token1: poolKey.token1,
                fee: poolKey.fee,
                tickLower: position.tickLower,
                tickUpper: position.tickUpper,
                amount0Desired: params.amount0Desired,
                amount1Desired: params.amount1Desired,
                amount0Min: params.amount0Min,
                amount1Min: params.amount1Min,
                recipient: address(this)
            })
        );

        bytes32 positionKey = PositionKey.compute(
            address(this),
            position.tickLower,
            position.tickUpper
        );

        // 现在更新为当前交易
        (
            ,
            uint256 feeGrowthInside0LastX128,
            uint256 feeGrowthInside1LastX128,
            ,

        ) = pool.positions(positionKey);

        position.tokensOwed0 += uint128(
            FullMath.mulDiv(
                feeGrowthInside0LastX128 - position.feeGrowthInside0LastX128,
                position.liquidity,
                FixedPoint128.Q128
            )
        );
        position.tokensOwed1 += uint128(
            FullMath.mulDiv(
                feeGrowthInside1LastX128 - position.feeGrowthInside1LastX128,
                position.liquidity,
                FixedPoint128.Q128
            )
        );

        position.feeGrowthInside0LastX128 = feeGrowthInside0LastX128;
        position.feeGrowthInside1LastX128 = feeGrowthInside1LastX128;
        position.liquidity += liquidity;

        emit IncreaseLiquidity(params.tokenId, liquidity, amount0, amount1);
    }

    /// @inheritdoc INonfungiblePositionManager
    function decreaseLiquidity(
        DecreaseLiquidityParams calldata params
    )
        external
        payable
        override
        isAuthorizedForToken(params.tokenId)
        checkDeadline(params.deadline)
        returns (uint256 amount0, uint256 amount1)
    {
        require(params.liquidity > 0);
        Position storage position = _positions[params.tokenId];

        uint128 positionLiquidity = position.liquidity;
        require(positionLiquidity >= params.liquidity);

        PoolAddress.PoolKey memory poolKey = _poolIdToPoolKey[position.poolId];
        INextswapV3Pool pool = INextswapV3Pool(
            PoolAddress.computeAddress(factory, poolKey)
        );
        (amount0, amount1) = pool.burn(
            position.tickLower,
            position.tickUpper,
            params.liquidity
        );

        require(
            amount0 >= params.amount0Min && amount1 >= params.amount1Min,
            "Price slippage check"
        );

        bytes32 positionKey = PositionKey.compute(
            address(this),
            position.tickLower,
            position.tickUpper
        );
        // 现在更新为当前交易
        (
            ,
            uint256 feeGrowthInside0LastX128,
            uint256 feeGrowthInside1LastX128,
            ,

        ) = pool.positions(positionKey);

        position.tokensOwed0 +=
            uint128(amount0) +
            uint128(
                FullMath.mulDiv(
                    feeGrowthInside0LastX128 -
                        position.feeGrowthInside0LastX128,
                    positionLiquidity,
                    FixedPoint128.Q128
                )
            );
        position.tokensOwed1 +=
            uint128(amount1) +
            uint128(
                FullMath.mulDiv(
                    feeGrowthInside1LastX128 -
                        position.feeGrowthInside1LastX128,
                    positionLiquidity,
                    FixedPoint128.Q128
                )
            );

        position.feeGrowthInside0LastX128 = feeGrowthInside0LastX128;
        position.feeGrowthInside1LastX128 = feeGrowthInside1LastX128;
        // 减法是安全的，因为我们检查了positionLiquidity >= params.liquidity
        position.liquidity = positionLiquidity - params.liquidity;

        emit DecreaseLiquidity(
            params.tokenId,
            params.liquidity,
            amount0,
            amount1
        );
    }

    /// @inheritdoc INonfungiblePositionManager
    function collect(
        CollectParams calldata params
    )
        external
        payable
        override
        isAuthorizedForToken(params.tokenId)
        returns (uint256 amount0, uint256 amount1)
    {
        require(params.amount0Max > 0 || params.amount1Max > 0);
        // 允许收集到NFT头寸管理器地址（地址0会被替换为this地址）
        address recipient = params.recipient == address(0)
            ? address(this)
            : params.recipient;

        Position storage position = _positions[params.tokenId];

        PoolAddress.PoolKey memory poolKey = _poolIdToPoolKey[position.poolId];

        INextswapV3Pool pool = INextswapV3Pool(
            PoolAddress.computeAddress(factory, poolKey)
        );

        (uint128 tokensOwed0, uint128 tokensOwed1) = (
            position.tokensOwed0,
            position.tokensOwed1
        );

        // 如果头寸有任何流动性，触发头寸费用和费用增长快照的更新
        if (position.liquidity > 0) {
            pool.burn(position.tickLower, position.tickUpper, 0);
            (
                ,
                uint256 feeGrowthInside0LastX128,
                uint256 feeGrowthInside1LastX128,
                ,

            ) = pool.positions(
                    PositionKey.compute(
                        address(this),
                        position.tickLower,
                        position.tickUpper
                    )
                );

            tokensOwed0 += uint128(
                FullMath.mulDiv(
                    feeGrowthInside0LastX128 -
                        position.feeGrowthInside0LastX128,
                    position.liquidity,
                    FixedPoint128.Q128
                )
            );
            tokensOwed1 += uint128(
                FullMath.mulDiv(
                    feeGrowthInside1LastX128 -
                        position.feeGrowthInside1LastX128,
                    position.liquidity,
                    FixedPoint128.Q128
                )
            );

            position.feeGrowthInside0LastX128 = feeGrowthInside0LastX128;
            position.feeGrowthInside1LastX128 = feeGrowthInside1LastX128;
        }

        // 计算要传递给池#collect方法的参数
        (uint128 amount0Collect, uint128 amount1Collect) = (
            params.amount0Max > tokensOwed0 ? tokensOwed0 : params.amount0Max,
            params.amount1Max > tokensOwed1 ? tokensOwed1 : params.amount1Max
        );

        // 返回实际收集的数量
        (amount0, amount1) = pool.collect(
            recipient,
            position.tickLower,
            position.tickUpper,
            amount0Collect,
            amount1Collect
        );

        // 由于核心合约中的向下取整，有时会比预期少几个wei，但我们只减去预期的全部数量
        // 而不是实际数量，以便我们可以销毁代币
        (position.tokensOwed0, position.tokensOwed1) = (
            tokensOwed0 - amount0Collect,
            tokensOwed1 - amount1Collect
        );

        emit Collect(params.tokenId, recipient, amount0Collect, amount1Collect);
    }

    /// @inheritdoc INonfungiblePositionManager
    function burn(
        uint256 tokenId
    ) external payable override isAuthorizedForToken(tokenId) {
        Position storage position = _positions[tokenId];
        require(
            position.liquidity == 0 &&
                position.tokensOwed0 == 0 &&
                position.tokensOwed1 == 0,
            "Not cleared"
        );
        delete _positions[tokenId];
        _burn(tokenId);
    }

    function _getAndIncrementNonce(
        uint256 tokenId
    ) internal override returns (uint256) {
        return uint256(_positions[tokenId].nonce++);
    }

    /// @inheritdoc IERC721
    function getApproved(
        uint256 tokenId
    ) public view override(ERC721, IERC721) returns (address) {
        require(
            _ownerOf(tokenId) != address(0),
            "ERC721: approved query for nonexistent token"
        );

        return _positions[tokenId].operator;
    }

    /// @dev 实现 _approveWithoutCheck 用于 permit 功能，不进行调用者权限检查
    function _approveWithoutCheck(
        address to,
        uint256 tokenId
    ) internal override {
        _positions[tokenId].operator = to;
        emit Approval(ownerOf(tokenId), to, tokenId);
    }
}
