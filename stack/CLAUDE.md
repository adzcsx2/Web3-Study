# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Web3 smart contract project built with Hardhat 3 Beta, featuring an enterprise-grade ERC20 token (MetaNodeToken) with staking functionality. The project uses Solidity 0.8.19/0.8.28 with OpenZeppelin upgradeable contracts and follows modern smart contract development practices.

## Development Commands

### Testing
```shell
# Run all tests (Solidity and TypeScript)
npx hardhat test

# Run only Solidity tests
npx hardhat test solidity

# Run only TypeScript tests
npx hardhat test nodejs

# Run a specific test file
npx hardhat test test/ErrorTest.t.sol
```

### Deployment
```shell
# Deploy to local chain
npx hardhat ignition deploy ignition/modules/Counter.ts

# Deploy to Sepolia testnet (requires SEPOLIA_PRIVATE_KEY)
npx hardhat ignition deploy --network sepolia ignition/modules/Counter.ts

# Deploy MetaNodeToken using enterprise script
npx hardhat run scripts/deploy-enterprise.ts

# Deploy to Sepolia using enterprise script
npx hardhat run scripts/deploy-enterprise.ts --network sepolia
```

### Local Development
```shell
# Start local Hardhat node
npx hardhat node

# Clean compilation artifacts
npx hardhat clean

# Compile contracts
npx hardhat compile
```

## Architecture Overview

### Smart Contracts

**MetaNodeToken.sol** - The main ERC20 token contract featuring:
- UUPS upgradeable pattern with OpenZeppelin v5.x
- Role-based access control (Admin, Minter, Pauser, Upgrader)
- Pausable transfers with emergency controls
- Built-in burning mechanism with supply tracking
- Blacklist functionality for compliance
- Transfer cooldown for rate limiting
- Enterprise token recovery with safety limits
- Maximum supply cap (10M tokens, 1M initial supply)

**StackPledgeContract.sol** - Staking contract (in development):
- Integrates with MetaNodeToken
- Built on upgradeable pattern with pausable and access control

### Configuration

**hardhat.config.ts**:
- Dual Solidity compiler support (0.8.19 and 0.8.28)
- Optimized settings for deployment size vs gas efficiency
- ViaIR compilation enabled for better optimization

### Testing Strategy

The project uses a dual testing approach:
1. **Solidity Tests** (Foundry-style using forge-std):
   - Located in `test/` directory with `.t.sol` extension
   - ErrorTest.t.sol validates custom error selectors
   - Counter.t.sol demonstrates fuzz testing patterns

2. **TypeScript Tests** (using Hardhat's node:test runner):
   - Integration tests with viem library
   - Network simulation capabilities including OP mainnet

### Key Dependencies

- **@openzeppelin/contracts-upgradeable**: Core upgradeable contract implementations
- **@nomicfoundation/hardhat-toolbox-viem**: Hardhat 3 beta with viem integration
- **forge-std**: Foundry-compatible testing utilities
- **viem**: Modern TypeScript Ethereum library

## Security Considerations

- All contracts use OpenZeppelin's security patterns (ReentrancyGuard, Pausable)
- Custom errors for gas-efficient failure handling
- Comprehensive access control with role-based permissions
- Emergency functions for crisis response
- Token recovery mechanisms with strict limits (max 0.1% of total supply per recovery)

## Development Notes

- The project is configured for ES modules (`"type": "module"` in package.json)
- Gas optimization prioritizes deployment size (optimizer runs: 1 for 0.8.19)
- Uses UUPS proxy pattern for contract upgrades
- Implements comprehensive event logging for audit trails