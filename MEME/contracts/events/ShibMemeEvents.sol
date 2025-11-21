//  SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
// ShibMeme 代币相关事件
abstract contract ShibMemeEvents {
    // 代币税率更新事件
    event TokenTaxUpdated(
        uint256 indexed index,
        uint256 newThreshold,
        uint256 newTaxRate,
        uint256 timestamp
    );

    // 税费接收地址更新事件
    event TaxRecipientUpdated(
        address indexed oldRecipient,
        address indexed newRecipient,
        uint256 timestamp
    );

    // 交易限制更新事件
    event TransactionLimitsUpdated(
        uint256 oldMaxTransactionAmount,
        uint256 newMaxTransactionAmount,
        uint256 oldDailyTransactionLimit,
        uint256 newDailyTransactionLimit,
        uint256 timestamp
    );
    // 代币转移事件，包含税费信息
    event TokenTransfer(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 taxAmount,
        uint256 timestamp
    );

    // 流动性提供事件
    event LiquidityProvided(
        address indexed provider,
        uint256 tokenAmount,
        uint256 ethAmount,
        uint256 timestamp
    );

    // 税费豁免变更事件
    event TaxExemptionChanged(
        address indexed account,
        bool exempt,
        uint256 timestamp
    );

    // 最大交易额度更新事件
    event MaxTransactionAmountUpdated(
        uint256 oldAmount,
        uint256 newAmount,
        uint256 timestamp
    );
}
