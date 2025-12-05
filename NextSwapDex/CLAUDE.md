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

# Start local Hardhat network
npx hardhat node
```

### Contract Deployment

```bash
# Deploy NFT contracts (Note: scripts referenced in package.json may not exist yet)
npm run deploy:nft                                   # Local network
npm run deploy:nft:local                           # Explicitly on localhost
npm run deploy:nft:sepolia                         # On Sepolia testnet

# Deploy all contracts (Note: scripts referenced in package.json may not exist yet)
npm run deploy:all                                  # Local network
npm run deploy:all:local                          # Explicitly on localhost
npm run deploy:all:sepolia                        # On Sepolia testnet

# Deploy with unsafe demo options (for testing)
npm run deploy:nft:unsafe-demo                    # Local network with unsafe options

# Manual deployment examples
npx hardhat run script/deploy_NFT.ts              # Deploy MyNFT
npx hardhat run script/deploy_NFT2.ts             # Deploy MyNFT2
npx hardhat run script/deploy_upgrade.ts          # Upgrade existing contract

# Verify contracts on Etherscan (Note: script may not exist yet)
npm run verify:deployment                          # Local verification
npm run verify:deployment:sepolia                  # Sepolia verification

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
npm run build:test                                   # Build test environment
npm run build:production                             # Build production environment
npm run start:test                                   # Start test server (port 3001)
npm run start:production                             # Start production server (port 3000)

# Code quality
npm run lint                                         # Run ESLint
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
- **MyNFT.sol**: Primary ERC721Upgradeable NFT contract with:
  - UUPS upgradeability pattern
  - ERC2981 royalty support
  - Pausable functionality
  - Batch minting capabilities
  - Max supply limits (100 tokens)
  - OpenZeppelin v5 integration with custom errors

- **MyNFT2.sol**: Secondary NFT contract implementation

- **BeggingContract.sol**: Donation contract featuring:
  - ETH and ERC20 token donations
  - Top 3 donor tracking
  - Time-restricted donation periods
  - NFT (ERC721/ERC1155) support for donations
  - Withdrawal mechanics for contract owner
  - Pause/resume functionality
  - Reentrancy protection

### Project Structure
- `/contracts/contract/`: Main smart contract implementations
- `/contracts/interfaces/`: Contract interfaces (currently .gitkeep)
- `/contracts/errors/`: Custom error definitions (CustomErrors.sol)
- `/contracts/events/`: Custom event definitions (CustomEvents.sol)
- `/contracts/modify/`: Custom modifiers (CustomModifier.sol)
- `/script/`: Deployment scripts and utilities
- `/script/utils/`: DeployHelper utility and retry helpers
- `/test/`: Comprehensive test suite with multiple test categories
- `/offchain-monitor-service/`: Node.js service for blockchain event monitoring
- `/front/`: Next.js 15 frontend application with React 19
- `/deployments/`: Deployment history and artifacts
- `/abis/`: Compiled contract ABIs

### Deployment System
The project uses a deployment system with `DeployHelper` class that:
- Tracks deployment history in JSON files
- Saves ABIs to frontend directory for seamless integration
- Supports both initial deployments and upgrades
- Maintains version history for upgradeable contracts
- Handles multiple networks (localhost, Sepolia, mainnet)

**Note**: Several deployment scripts referenced in package.json (e.g., `deploy_NFT_contract_enhanced.ts`, `deploy_all_contracts.ts`) may not exist yet and need to be created.

### Testing Strategy
Comprehensive testing approach with specialized files:
- **MyNFT.test.ts**: Core unit tests covering all contract functionality
- **MyNFT.gas.test.ts**: Gas optimization analysis and performance metrics
- **MyNFT.integration.test.ts**: End-to-end workflow testing
- **MyNFT.deployment.test.ts**: Deployment verification and upgrade testing
- **MyNFT.typesafe.test.ts**: TypeScript type safety verification

### Frontend Architecture (Next.js 15 + React 19)
- **App Router**: Next.js 15 with Turbopack for performance
- **UI Framework**: Ant Design 5.27.4 with React 19 compatibility patches
- **Styling**: Tailwind CSS 4 for modern styling
- **State Management**: Zustand 5.0.8 for lightweight state management
- **Internationalization**: Automated i18n system with Chinese-to-English translation
- **Web3 Integration**: RainbowKit, Ethers.js v6, Wagmi
- **TypeScript**: Strict configuration with path aliases

### Offchain Monitoring Service
Node.js service (`offchain-monitor-service/`) that:
- Listens to blockchain events via WebSocket connections
- Processes NFT transfer and minting events
- Stores event data in Supabase database
- Supports multiple networks with Infura integration
- Uses Winston for structured logging
- Deployed on Railway with health check endpoint

## Development Guidelines

### Contract Development
- All contracts use OpenZeppelin v5 with upgradeable patterns
- Follow UUPS upgradeability pattern for efficiency
- Use custom errors instead of string messages (OpenZeppelin v5 standard)
- Implement comprehensive access controls with `onlyOwner` modifiers
- Include detailed NatSpec comments for all public functions
- For BeggingContract, ensure proper handling of ERC721/ERC1155 token donations

### Frontend Development
- **Ant Design First**: Always prioritize Ant Design components over custom implementations
- Use Tailwind CSS for enhancements, not replacements
- Follow the automated i18n workflow: write in Chinese, let VS Code plugin handle translations
- Implement proper loading and error states for all components
- Use TypeScript interfaces for all props and data structures
- Follow React 19 patterns with function components and hooks

### Testing Requirements
- All new contracts must have comprehensive test coverage
- Include gas optimization tests for performance analysis
- Test both success and failure scenarios with proper assertions
- Use TypeScript type checking for all test files
- Follow the existing test file organization pattern

### Deployment Best Practices
- Use `DeployHelper` class for all deployments to maintain consistent history
- Always verify contracts after deployment to testnets
- Copy ABIs to frontend directory after deployment
- Test deployments on localhost before deploying to testnets
- Keep environment variables (`.env`) properly configured for different networks

### Security Considerations
- Run security analysis with Slither before each deployment
- Pay attention to reentrancy protection and integer overflow checks
- Use Pauser pattern for emergency response capabilities
- Implement proper input validation on all external functions
- Keep OpenZeppelin contracts updated to latest stable versions

## Environment Configuration

### Required Environment Variables
```bash
# Network Configuration
INFURA_PROJECT_ID=your_infura_project_id
PRIVATE_KEY=your_private_key
PRIVATE_KEY_USER1=your_private_key_user1  # Optional additional accounts
PRIVATE_KEY_USER2=your_private_key_user2
PRIVATE_KEY_USER3=your_private_key_user3

# Supabase Configuration (for offchain service)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Network-specific RPC URLs
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
```

### Frontend Environment Variables
```bash
# In front/.env.local
NEXT_PUBLIC_BASE_API=https://your-api-endpoint.com
NEXT_PUBLIC_APP_TITLE=Stake质押平台
NEXT_PUBLIC_DEFAULT_LANGUAGE=zh
NEXT_PUBLIC_SUPPORTED_LANGUAGES=zh,en
```

## Important Notes

- This is a Web3 project focused on NFT development with upgradeable smart contracts
- Uses TypeScript throughout for type safety
- Implements industry-standard security practices with Slither integration
- Includes comprehensive monitoring service for production environments
- Frontend application should import ABIs from `front/src/app/abi/` after deployments
- All contracts are upgradeable using OpenZeppelin's UUPS pattern
- Project follows modular architecture with clear separation of concerns
- Frontend uses modern Next.js 15 with App Router and React 19
- Automated i18n system handles Chinese to English translations
- PM2 configuration available for production deployment with multiple environments