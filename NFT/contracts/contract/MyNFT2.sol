// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/common/ERC2981Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/**
 * @title MyNFTV2
 * @dev MyNFT的V2版本，新增功能
 * 新增功能：
 * 1. 版本号更新为2
 * 2. 新增批量铸造功能
 * 3. 新增获取合约信息功能
 */
contract MyNFT2 is
    Initializable,
    ERC721Upgradeable,
    ERC721BurnableUpgradeable,
    ERC721PausableUpgradeable,
    ERC2981Upgradeable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable
{
    uint16 private _version;
    uint private constant MAX_SUPPLY = 100;
    uint private _nextTokenId;
    string private _baseTokenURI;

    // =================================== 初始化和升级相关 ==================================
    function initialize(
        string memory name,
        string memory symbol,
        address royaltyReceiver,
        uint96 royaltyFeeNumerator,
        address initialOwner
    ) public initializer {
        __ERC721_init(name, symbol);
        __ERC2981_init();
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        __ERC721Pausable_init();

        _version = 1;
        _nextTokenId = 1;
        _baseTokenURI = "ipfs://Qmc2PWmocfN4W2Qx4YpMLXVj3STGP7DCBwk9PKh1fTSsXJ/";
        _setDefaultRoyalty(royaltyReceiver, royaltyFeeNumerator);
    }

    /**
     *升级时调用,升级合约需修改内容
     *initialize不需要修改,升级不会调用initialize函数
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {
        // 升级时更新版本号到V2
        _version++;
    }

    //设置全局URI
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    //动态更新URI
    function setBaseURI(string memory newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
    }

    // 暂停 恢复
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // =============== 关键修复：Override _update ===============

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(ERC721Upgradeable, ERC2981Upgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    )
        internal
        override(ERC721Upgradeable, ERC721PausableUpgradeable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(
        address account,
        uint128 amount
    ) internal override {
        super._increaseBalance(account, amount);
    }
    // =================================== 合约内主要实现方法 ==================================

    //铸造NFT
    function mint(address to) external onlyOwner {
        uint256 tokenId = _nextTokenId;
        require(tokenId <= MAX_SUPPLY, "Max supply reached");
        _nextTokenId += 1;
        _safeMint(to, tokenId);
    }

    // 🆕 V2新增：批量铸造功能
    function batchMint(address to, uint256 count) external onlyOwner {
        require(count > 0, "Count must be greater than 0");
        require(
            _nextTokenId + count - 1 <= MAX_SUPPLY,
            "Would exceed max supply"
        );

        for (uint256 i = 0; i < count; i++) {
            uint256 tokenId = _nextTokenId;
            _nextTokenId += 1;
            _safeMint(to, tokenId);
        }
    }

    // 获取拥有tokenId的所有者地址
    function getOwnerOfToken(uint256 tokenId) external view returns (address) {
        return ownerOf(tokenId);
    }

    // 设置默认版税信息
    function setDefaultRoyalty(
        address receiver,
        uint96 feeNumerator
    ) public onlyOwner {
        require(feeNumerator <= 10000, "Fee exceeds sale price");
        _setDefaultRoyalty(receiver, feeNumerator);
    }
    // 删除默认版税信息
    function deleteDefaultRoyalty() public onlyOwner {
        _deleteDefaultRoyalty();
    }
    //返回已铸造总数
    function totalMinted() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    //获取版本号
    function getVersion() external view returns (uint16) {
        return _version;
    }

    // 🆕 V2新增：获取合约信息
    function getContractInfo()
        external
        view
        returns (
            string memory contractName,
            string memory contractSymbol,
            uint16 contractVersion,
            uint256 maxSupply,
            uint256 currentSupply,
            address contractOwner,
            string memory baseURI
        )
    {
        return (
            ERC721Upgradeable.name(),
            ERC721Upgradeable.symbol(),
            _version,
            MAX_SUPPLY,
            _nextTokenId - 1,
            OwnableUpgradeable.owner(),
            _baseTokenURI
        );
    }
    function test() external pure returns (string memory) {
        return "MyNFT2";
    }
}
