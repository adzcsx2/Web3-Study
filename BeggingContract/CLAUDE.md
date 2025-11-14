# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Smart Contract Development

```bash
# Compile contracts
npx hardhat compile

# Run tests (different test categories)
npx hardhat test                                    # All tests
npx hardhat test test/MyNFT.test.ts               # Unit tests
npx hardhat test test/MyNFT.gas.test.ts           # Gas analysis
npx hardhat test test/MyNFT.integration.test.ts   # Integration tests
npx hardhat test test/MyNFT.deployment.test.ts    # Deployment tests

# Run tests with gas reporting
REPORT_GAS=true npx hardhat test

# Run test coverage
npx hardhat coverage

# Type checking
npx tsc --noEmit
```

### Contract Deployment

⚠️ **Important**: Some deployment scripts referenced in package.json are missing:
- `deploy_NFT_contract_enhanced.ts` (missing)
- `deploy_all_contracts.ts` (missing)
- `verify_deployment.ts` (missing)

Available deployment scripts:
```bash
# Legacy deployment scripts (existing)
npx hardhat run script/deploy_NFT.ts               # Basic NFT deployment
npx hardhat run script/deploy_NFT2.ts              # NFT2 deployment
npx hardhat run script/deploy_NFT3.ts              # NFT3 deployment
npx hardhat run script/deploy_upgrade.ts           # Upgrade deployment

# Copy ABIs to frontend after deployment
npm run copy:abis
```

### Security Analysis

```bash
# Run security analysis
npm run security                                    # High-priority security issues
npm run slither                                     # Full Slither analysis
npm run slither:high                               # High-severity issues only
npm run slither:report                             # Generate JSON report
```

### Frontend Development

```bash
cd front

# Development
npm run dev                                          # Start development server with Turbopack
npm run build                                        # Build production version
npm run start                                        # Start production server

# Multi-environment builds
npm run build:test                                  # Build test environment
npm run build:production                            # Build production environment
npm run start:test                                   # Start test server (port 3001)
npm run start:production                             # Start production server (port 3000)

# Code quality
npm run lint                                         # ESLint checks
npm run lint:fix                                     # Fix ESLint issues
npm run format                                       # Format code with Prettier
```

### Offchain Monitor Service

```bash
cd offchain-monitor-service

# Development
npm run dev                                          # Run with ts-node
npm run build                                        # Compile TypeScript
npm run start                                        # Run compiled version

# Testing
npm run test                                         # Basic test
npm run test:database                               # Database query test

# Utility
npm run clean                                        # Clean dist folder
npm run lint                                         # ESLint check
```

## Architecture Overview

### Smart Contracts (`/contracts/`)

#### Primary Contract - BeggingContract.sol
**Multi-token donation platform with comprehensive features:**
- **Multi-token support**: ETH, ERC20, ERC721, ERC1155 donations
- **Time-restricted donations**: Configurable start/end times
- **Top 3 donator leaderboard**: Automatic ranking system
- **Owner withdrawal functions**: Secure fund extraction
- **Pause/unpause functionality**: Emergency controls
- **Custom errors and modifiers**: Modular architecture with separate error/event/modifier files
- **Security features**: ReentrancyGuard, access controls

#### Legacy NFT Contracts (Being Phased Out)
- **MyNFT.sol & MyNFT2.sol**: ERC721Upgradeable contracts with royalty features
- **UUPS upgradeability**: OpenZeppelin upgradeable patterns
- **Comprehensive testing**: 76 test files covering all scenarios

### Project Structure
```
├── contracts/
│   ├── contract/           # Main smart contracts (BeggingContract.sol, MyNFT.sol)
│   ├── errors/            # Custom error definitions
│   ├── events/            # Custom event definitions
│   ├── modify/            # Custom modifiers (CustomModifier.sol)
│   ├── constants/         # Contract constants
│   ├── structs/           # Struct definitions
│   ├── utils/             # Utility contracts
│   └── interfaces/        # Contract interfaces
├── script/                # Deployment scripts (limited set available)
├── test/                  # Comprehensive test suite (76 test files)
├── offchain-monitor-service/  # Node.js event monitoring service
├── front/                 # Next.js 15 + React 19 frontend application
├── deployments/           # Deployment history and artifacts
└── abis/                  # Contract ABIs for frontend integration
```

### Frontend Application (Next.js 15)

#### Technology Stack
- **Next.js 15.5.3** with App Router and Turbopack for performance
- **React 19** with Ant Design 5.27.4 compatibility patches
- **Web3 Integration**: RainbowKit, Wagmi, Viem, Ethers.js
- **State Management**: Zustand 5.0.8
- **Styling**: Tailwind CSS 4 + Ant Design components
- **TypeScript**: Strict configuration with path aliases

#### Key Features
- **Automated i18n System**: VS Code plugin auto-translates Chinese to English
- **HTTP Client**: Request caching, retry logic, deduplication
- **Multi-environment Support**: Test/production builds with PM2 deployment
- **Web3 Integration**: Wallet connection, contract interaction

### Offchain Monitoring Service
Node.js service that:
- Listens to blockchain events via WebSocket connections
- Processes donation and transfer events
- Stores event data in Supabase database
- Uses Infura for multi-network support
- Winston structured logging
- Railway deployment with health check endpoint

## Development Guidelines

### Contract Development
- **Focus on BeggingContract**: Primary development should target the donation platform
- **OpenZeppelin v5**: Use latest version with custom errors pattern
- **Modular Architecture**: Separate errors, events, and modifiers into dedicated files
- **Security First**: Implement ReentrancyGuard and comprehensive input validation
- **Time-bound Features**: Leverage the startTime/endTime functionality for campaigns

### Testing Strategy
- **Comprehensive Coverage**: 76 test files covering unit, integration, gas, and deployment scenarios
- **Gas Analysis**: Include performance testing for optimization
- **Multi-contract Testing**: Test interactions between different contract types
- **TypeScript Safety**: Use type checking for all test files

### Frontend Development
- **Chinese-First Development**: Write components in Chinese, let VS Code plugin handle English translation
- **Web3 Integration**: Use Wagmi hooks for contract interactions with BeggingContract
- **State Management**: Zustand stores for auth, loading, and user data
- **Performance**: Leverage Turbopack, HTTP caching, and request deduplication

### Deployment Best Practices
- **Script Limitations**: Work around missing deployment scripts by using available ones
- **Local Testing**: Always test on localhost before testnet deployment
- **ABI Management**: Use `npm run copy:abis` after deployments
- **Environment Variables**: Properly configure .env files for different networks

## Environment Configuration

### Required Environment Variables
```bash
# Network Configuration
INFURA_PROJECT_ID=your_infura_project_id
PRIVATE_KEY=your_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key

# Network-specific RPC URLs
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID

# Supabase Configuration (for offchain service)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Frontend Configuration
NEXT_PUBLIC_BASE_API=https://your-api-endpoint.com
NEXT_PUBLIC_APP_TITLE=捐赠平台
NEXT_PUBLIC_DEFAULT_LANGUAGE=zh
NEXT_PUBLIC_SUPPORTED_LANGUAGES=zh,en
```

## Current Project Status

**This project has evolved from an NFT-focused system to a comprehensive donation/fundraising platform:**

### Active Development
- **BeggingContract.sol**: Multi-token donation platform with time restrictions and leaderboard
- **Frontend**: Modern Next.js 15 application with automated i18n and Web3 integration
- **Offchain Service**: Event monitoring for donation tracking

### Legacy Components
- **MyNFT contracts**: Still present but being phased out
- **Missing Scripts**: Some deployment scripts referenced in package.json don't exist
- **Documentation**: Current CLAUDE.md focuses more on legacy NFT functionality

### Development Focus
Prioritize development on:
1. **BeggingContract features**: Donation campaigns, multi-token support, leaderboard functionality
2. **Frontend integration**: Connect donation platform with Next.js frontend
3. **Event monitoring**: Set up offchain service for donation tracking
4. **Script completion**: Create missing deployment scripts for streamlined deployment