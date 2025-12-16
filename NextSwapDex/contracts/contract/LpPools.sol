// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "../types/NextswapStructs.sol";
import "../errors/NextswapErrors.sol";
import "../modifiers/NextswapModifiers.sol";

contract LpPool is ReentrancyGuard {
    // LP NFT 头寸管理器合约地址
    IERC721 public immutable positionManager;

    // 池配置
    LpPoolConfig public poolConfig;

    // 用户质押信息映射: tokenId => 质押信息
    mapping(uint256 => LpNftStakeInfo) public lpNftStakes;
    
    // 用户质押的所有 NFT 列表: user => tokenId[]
    mapping(address => uint256[]) public userStakedTokens;
    
    // tokenId 在用户数组中的索引位置: tokenId => index
    mapping(uint256 => uint256) private tokenIdToIndex;

    constructor(address _positionManager, LpPoolConfig memory _initialConfig) nonZeroAddress(_positionManager) {
        require(_positionManager != address(0), "Invalid position manager");
        positionManager = IERC721(_positionManager);
        initPoolConfig(_initialConfig);
    }

    /**
     * @notice 质押 LP NFT
     * @param tokenId NFT 代币 ID
     */
    function stakeLP(uint256 tokenId) external nonReentrant {
        require(lpNftStakes[tokenId].owner == address(0), "Already staked");
        
        // 从调用者转移 NFT 到本合约
        positionManager.safeTransferFrom(msg.sender, address(this), tokenId);

        // 记录质押信息
        lpNftStakes[tokenId] = LpNftStakeInfo({
            owner: msg.sender,
            tokenId: tokenId,
            stakedAt: block.timestamp,
            lastClaimAt: block.timestamp
        });
        
        // 添加到用户的质押列表
        tokenIdToIndex[tokenId] = userStakedTokens[msg.sender].length;
        userStakedTokens[msg.sender].push(tokenId);

        emit LpStaked(msg.sender, tokenId, block.timestamp);
    }

    /**
     * @notice 取消质押 LP NFT
     * @par从用户的质押列表中移除（使用交换删除法，避免数组重排）
        uint256 index = tokenIdToIndex[tokenId];
        uint256 lastIndex = userStakedTokens[msg.sender].length - 1;
        
        if (index != lastIndex) {
            uint256 lastTokenId = userStakedTokens[msg.sender][lastIndex];
            userStakedTokens[msg.sender][index] = lastTokenId;
            tokenIdToIndex[lastTokenId] = index;
        }
        
        userStakedTokens[msg.sender].pop();
        delete tokenIdToIndex[tokenId];
        
        // 删除质押信息
        delete lpNftStakes[tokenId];

        // 将 NFT 返还给用户
        positionManager.safeTransferFrom(address(this), msg.sender, tokenId);

        emit LpUnstaked(msg.sender, tokenId, block.timestamp);
    }
    
    /**
     * @notice 获取用户质押的所有 NFT
     * @param user 用户地址
     * @return tokenIds NFT ID 数组
     */
    function getUserStakedTokens(address user) external view returns (uint256[] memory) {
        return userStakedTokens[user];
    }
    
    /**
     * @notice 获取用户质押的 NFT 数量
     * @param user 用户地址
     * @return count NFT 数量
     */
    function getUserStakedCount(address user) external view returns (uint256) {
        return userStakedTokens[user].length
        delete lpNftStakes[tokenId];

        // 将 NFT 返还给用户
        positionManager.safeTransferFrom(address(this), msg.sender, tokenId);

        emit LpUnstaked(msg.sender, tokenId, block.timestamp);
    }

    // 事件
    event LpStaked(
        address indexed user,
        uint256 indexed tokenId,
        uint256 timestamp
    );
    event LpUnstaked(
        address indexed user,
        uint256 indexed tokenId,
        uint256 timestamp
    );

    /**
     * @notice 获取池配置
     */
    function getPoolConfig() public view returns (LpPoolConfig memory) {
        return poolConfig;
    }

    // 需处理tokenA和tokenB地址的前后顺序
    function initPoolConfig(LpPoolConfig memory _newConfig) internal {
        // 设置新的池配置逻辑

        if (_newConfig.tokenA > _newConfig.tokenB) {
            // 交换地址顺序
            (address temp, ) = (_newConfig.tokenA, _newConfig.tokenB);
            _newConfig.tokenA = _newConfig.tokenB;
            _newConfig.tokenB = temp;
        }
        poolConfig = _newConfig;
    }
}
