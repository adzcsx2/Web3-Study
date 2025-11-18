// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title MockV3Aggregator
 * @notice Mock contract for Chainlink price feeds, used for testing
 */
contract MockV3Aggregator is AggregatorV3Interface {
    int256 private _price;
    uint8 private _decimals;
    uint80 private _latestRound;
    uint256 private _updatedAt;
    uint80 private _answeredInRound;

    constructor(uint8 decimals_, int256 initialPrice) {
        _decimals = decimals_;
        _price = initialPrice;
        _latestRound = 1;
        _updatedAt = block.timestamp;
        _answeredInRound = 1;
    }

    function decimals() external view override returns (uint8) {
        return _decimals;
    }

    function description() external pure override returns (string memory) {
        return "Mock Price Feed";
    }

    function version() external pure override returns (uint256) {
        return 1;
    }

    function latestRoundData()
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (uint80(_latestRound), _price, _updatedAt, _updatedAt, _answeredInRound);
    }

    function getRoundData(uint80 _roundId)
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        require(_roundId <= _latestRound, "No data available for this round");
        return (_roundId, _price, _updatedAt, _updatedAt, _answeredInRound);
    }

    // Mock functions for testing
    function updatePrice(int256 newPrice) external {
        _price = newPrice;
        _latestRound++;
        _updatedAt = block.timestamp;
        _answeredInRound = _latestRound;
    }

    function updateRoundData(
        uint80 roundId,
        int256 answer,
        uint256 timestamp,
        uint80 answeredInRound
    ) external {
        _latestRound = roundId;
        _price = answer;
        _updatedAt = timestamp;
        _answeredInRound = answeredInRound;
    }

    function setLatestRoundId(uint80 roundId) external {
        _latestRound = roundId;
    }

    function setUpdatedAt(uint256 timestamp) external {
        _updatedAt = timestamp;
    }

    function setAnsweredInRound(uint80 answeredInRound) external {
        _answeredInRound = answeredInRound;
    }
}