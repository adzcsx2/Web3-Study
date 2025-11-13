# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Web3 project implementing an ERC20 token (MetaNodeToken - MNT) with staking capabilities, built using Hardhat and Solidity. The project uses UUPS upgradeable contracts with enterprise-level security features.

## Key Commands

### Development & Testing
- `npx hardhat test` - Run all tests
- `npx hardhat test test/MetaNodeTokenTest.ts` - Run specific test file
- `npx hardhat node` - Start local Hardhat network
- `npx hardhat compile` - Compile contracts
- `REPORT_GAS=true npx hardhat test` - Run tests with gas reporting

### Deployment
- `npx hardhat ignition deploy ./ignition/modules/Lock.ts` - Deploy using Ignition
- `npx hardhat run script/deploy-meta-node-token.ts` - Run deployment script

### Contract Interaction
- `npx hardhat console` - Open Hardhat console for contract interaction

## Architecture Overview

### Core Contracts Structure

**MetaNodeToken.sol** - Main ERC20 token contract with advanced features:
- UUPS upgradeable pattern
- Role-based access control (DEFAULT_ADMIN_ROLE, MINTER_ROLE, PAUSER_ROLE, UPGRADER_ROLE)
- Tokenomics: 10M max supply, 1M initial supply to deployer
- Security features: pausable, blacklist, transfer cooldown, reentrancy protection
- Gas-efficient custom errors instead of string messages

**StackPledgeContract.sol** - Staking contract (currently scaffolded):
- Designed to integrate with MetaNodeToken
- UUPS upgradeable with similar security patterns

**Supporting Files**:
- `contracts/events/Events.sol` - Centralized event definitions
- `contracts/error/CustomError.sol` - Custom error definitions
- `contracts/constants/Constants.sol` - Role and constant definitions
- `contracts/TestProxy.sol` - Wrapper for ERC1967Proxy used in testing

### Testing Architecture

Tests use proxy pattern deployment:
1. Deploy implementation contract
2. Deploy TestProxy pointing to implementation
3. Attach token interface to proxy address
4. Initialize through proxy
5. Test functionality through proxy

**Note**: Direct calls to implementation contracts will fail due to `_disableInitializers()` in constructor.

### Development Environment

**Solidity Configuration**:
- Version: 0.8.26 with optimizer enabled (200 runs)
- IR compilation enabled for better optimization
- 18 decimals for token precision

**Network Configuration**:
- Localhost: http://localhost:8545
- Sepolia testnet via Infura
- Mainnet via Infura
- Environment variables loaded from .env (INFURA_PROJECT_ID, PRIVATE_KEY)

## Key Development Patterns

### UUPS Upgradeable Pattern
- All contracts use UUPS proxy pattern
- Implementation contracts have `_disableInitializers()` in constructor
- Always interact through proxy, never directly with implementation
- Use `onlyRole(UPGRADER_ROLE)` for upgrade authorization

### Access Control System
- Multi-role permission system using OpenZeppelin's AccessControl
- Roles: DEFAULT_ADMIN_ROLE, MINTER_ROLE, PAUSER_ROLE, UPGRADER_ROLE
- Admin can grant/revoke roles to other addresses

### Security Features
- **Reentrancy Protection**: All external functions use `nonReentrant`
- **Pausable**: Emergency pause functionality for critical operations
- **Blacklist**: Address blocking for compliance
- **Transfer Cooldown**: Rate limiting for transfers
- **Token Recovery**: Emergency recovery with safety limits

### Testing Requirements
- Always deploy through proxy pattern for upgradeable contracts
- Use `ethers.parseEther()` for token amounts (18 decimals)
- Test role-based access controls
- Verify upgradeability mechanisms

## Common Issues & Solutions

### "AccessControlUnauthorizedAccount" Error
This occurs when:
- Calling functions directly on implementation contract instead of proxy
- Caller doesn't have required role
- Contract hasn't been initialized through proxy

**Solution**: Ensure proper proxy deployment and initialization, verify caller has required role.

### "Artifact for contract not found" Error
Use full contract path with namespace:
```typescript
const Proxy = await ethers.getContractFactory("@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol:ERC1967Proxy");
```

Or use the local TestProxy wrapper:
```typescript
const Proxy = await ethers.getContractFactory("TestProxy");
```

## Contract Constants

**Token Specifications**:
- Name: "MetaNodeToken"
- Symbol: "MNT"
- Decimals: 18
- Max Supply: 10,000,000 tokens
- Initial Supply: 1,000,000 tokens

**Security Constants**:
- MIN_RECOVERY_AMOUNT: 1 ether
- Max recovery per transaction: 0.1% of total supply

## File Organization

```
contracts/
├── MetaNodeToken.sol          # Main token contract
├── MetaNodeTokenV2.sol        # V2 implementation
├── StackPledgeContract.sol    # Staking contract
├── TestProxy.sol              # Proxy wrapper for testing
├── events/Events.sol          # Event definitions
├── error/CustomError.sol      # Custom errors
└── constants/Constants.sol    # Constants and roles

test/
└── MetaNodeTokenTest.ts       # Token contract tests

script/
└── deploy-meta-node-token.ts  # Deployment script (scaffold)

ignition/modules/
└── Lock.ts                    # Ignition deployment module
```