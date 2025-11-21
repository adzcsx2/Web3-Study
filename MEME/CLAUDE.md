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

```bash
# Deploy NFT contracts
npm run deploy:nft                                   # Local network
npm run deploy:nft:local                           # Explicitly on localhost
npm run deploy:nft:sepolia                         # On Sepolia testnet

# Deploy all contracts
npm run deploy:all                                  # Local network
npm run deploy:all:local                          # Explicitly on localhost
npm run deploy:all:sepolia                        # On Sepolia testnet

# Deploy with unsafe demo options (for testing)
npm run deploy:nft:unsafe-demo                    # Local network with unsafe options

# Verify contracts on Etherscan
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

### Project Structure
- `/contracts/contract/`: Main smart contract implementations
- `/contracts/interfaces/`: Contract interfaces (currently .gitkeep)
- `/script/`: Deployment scripts with enhanced DeployHelper utility
- `/test/`: Comprehensive test suite with multiple test categories
- `/offchain-monitor-service/`: Node.js service for blockchain event monitoring
- `/front/`: Frontend application (separate project)
- `/deployments/`: Deployment history and artifacts

### Deployment System
The project uses an enhanced deployment system with `DeployHelper` class that:
- Automatically tracks deployment history in JSON files
- Saves ABIs to frontend directory for seamless integration
- Supports both initial deployments and upgrades
- Maintains version history for upgradeable contracts
- Handles multiple networks (localhost, Sepolia, mainnet)

### Testing Strategy
Comprehensive testing approach with specialized files:
- **MyNFT.test.ts**: Core unit tests covering all contract functionality
- **MyNFT.gas.test.ts**: Gas optimization analysis and performance metrics
- **MyNFT.integration.test.ts**: End-to-end workflow testing
- **MyNFT.deployment.test.ts**: Deployment verification and upgrade testing
- **MyNFT.typesafe.test.ts**: TypeScript type safety verification

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

# Supabase Configuration (for offchain service)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Network-specific RPC URLs
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
```

## Important Notes

- This is a Web3 project focused on NFT development with upgradeable smart contracts
- Uses TypeScript throughout for type safety
- Implements industry-standard security practices with Slither integration
- Includes comprehensive monitoring service for production environments
- Frontend application should import ABIs from `front/src/app/abi/` after deployments
- All contracts are upgradeable using OpenZeppelin's UUPS pattern
- Project follows modular architecture with clear separation of concerns