# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Web3 NFT project implementing an upgradeable ERC721 NFT contract (MyNFT) with royalty support, built using Hardhat and Solidity. The project includes both smart contracts and a Next.js frontend application for interacting with the NFT.

## Key Commands

### Smart Contract Development
- `npx hardhat compile` - Compile contracts
- `npx hardhat test` - Run all tests
- `npx hardhat node` - Start local Hardhat network
- `REPORT_GAS=true npx hardhat test` - Run tests with gas reporting
- `npx hardhat console` - Open Hardhat console for contract interaction

### Security Analysis
- `npm run slither` - Run Slither static analysis
- `npm run slither:high` - Run high-severity security checks
- `npm run security` - Run security analysis (same as slither:high)

### Frontend Development (in /front directory)
- `cd front && npm run dev` - Start development server with Turbopack (http://localhost:3000)
- `cd front && npm run build` - Build production version
- `cd front && npm run start` - Start production server
- `cd front && npm run lint` - Run ESLint checks

## Architecture Overview

### Smart Contract Structure

**MyNFT.sol** - Main ERC721 NFT contract with advanced features:
- UUPS upgradeable pattern
- ERC721 with ERC721Burnable and ERC721Pausable extensions
- ERC2981 royalty standard support
- Role-based access control via OwnableUpgradeable
- Reentrancy protection
- Maximum supply of 100 NFTs
- IPFS metadata URI: `ipfs://Qmc2PWmocfN4W2Qx4YpMLXVj3STGP7DCBwk9PKh1fTSsXJ/`

**Key Features**:
- `mint(address to)` - Owner-only minting function
- `setDefaultRoyalty()` - Configure NFT royalties
- `pause()/unpause()` - Emergency pause functionality
- `totalMinted()` - Track minted supply
- Version tracking for upgrades

### Frontend Architecture

The frontend is a modern Next.js 15 application with:
- **Tech Stack**: Next.js 15, React 19, TypeScript, Ant Design, Tailwind CSS
- **Web3 Integration**: RainbowKit, Wagmi, Viem for wallet connections
- **State Management**: Zustand for lightweight state management
- **Internationalization**: Automated i18n system with Chinese/English support
- **Styling**: Ant Design components with Tailwind CSS customization

### Development Environment

**Solidity Configuration**:
- Version: 0.8.26 with optimizer enabled (200 runs)
- IR compilation enabled for better optimization
- OpenZeppelin upgradeable contracts

**Network Configuration**:
- Localhost: http://localhost:8545
- Sepolia testnet via Infura
- Mainnet via Infura
- Environment variables loaded from .env (INFURA_PROJECT_ID, PRIVATE_KEY)

## Key Development Patterns

### UUPS Upgradeable Pattern
- Contract uses UUPS proxy pattern for upgradability
- Implementation contract disables initializers in constructor
- Always interact through proxy, never directly with implementation
- Upgrade authorization restricted to contract owner

### Security Features
- **Reentrancy Protection**: External functions use `nonReentrant`
- **Pausable**: Emergency pause functionality for minting/transfers
- **Access Control**: Owner-only functions for critical operations
- **Upgrade Control**: Only owner can authorize contract upgrades

### Frontend Patterns
- **Component Structure**: Ant Design components with Tailwind styling
- **Internationalization**: VS Code plugin auto-translates Chinese to English
- **State Management**: Zustand stores for auth, loading, and user data
- **Web3 Integration**: RainbowKit for wallet connections, Wagmi for contract interactions

## Project Structure

```
├── contracts/
│   └── contract/
│       └── MyNFT.sol              # Main NFT contract
├── front/                         # Next.js frontend
│   ├── src/
│   │   ├── app/                   # App Router pages
│   │   ├── components/            # React components
│   │   ├── stores/                # Zustand state management
│   │   ├── i18n/                  # Internationalization system
│   │   ├── services/              # API services
│   │   └── types/                 # TypeScript definitions
│   ├── package.json               # Frontend dependencies
│   └── ecosystem.config.json      # PM2 deployment config
├── test/                          # Smart contract tests
├── artifacts/                     # Compiled contract artifacts
├── typechain-types/               # TypeScript contract types
└── hardhat.config.ts             # Hardhat configuration
```

## Common Issues & Solutions

### Contract Deployment
When deploying upgradeable contracts:
1. Deploy implementation contract
2. Deploy ERC1967Proxy with implementation address
3. Initialize through proxy, not directly
4. All contract interactions should go through proxy address

### Frontend Development
- Use `@/` path aliases for imports
- Components should use Ant Design for UI consistency
- Write Chinese text directly - VS Code plugin handles translation
- Use Wagmi hooks for Web3 interactions

## Environment Setup

### Smart Contract Development
Required in `.env`:
```env
PRIVATE_KEY=your_private_key_here
INFURA_PROJECT_ID=your_infura_project_id
```

### Frontend Development
Required in `front/.env.local`:
```env
NEXT_PUBLIC_BASE_API=https://your-api-endpoint.com
NEXT_PUBLIC_APP_TITLE=NFT项目
NEXT_PUBLIC_DEFAULT_LANGUAGE=zh
NEXT_PUBLIC_SUPPORTED_LANGUAGES=zh,en
```

## Contract Constants

**NFT Specifications**:
- Maximum Supply: 100 tokens
- Base URI: IPFS hash pointing to metadata
- Royalty: Configurable via ERC2981 standard
- Version tracking: uint16 version field

**Security Limits**:
- Owner-only minting
- Pausable transfers
- Reentrancy protection on all external functions