# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a modern Web3 staking platform frontend built with Next.js 15 and React 19, featuring a comprehensive internationalization system and enterprise-grade architecture. The application provides a secure, transparent Ethereum staking service interface.

## Key Commands

### Development & Building
- `npm run dev` - Start development server with Turbopack (http://localhost:3000)
- `npm run build` - Build production version with Turbopack
- `npm run start` - Start production server
- `npm run lint` - Run ESLint checks

### Multi-Environment Commands
- `npm run build:test` - Build test environment version (.env.test)
- `npm run build:production` - Build production environment version (.env.production)
- `npm run start:test` - Start test server on port 3001
- `npm run start:production` - Start production server on port 3000

### Deployment (PM2)
The project uses PM2 for process management with configurations in `ecosystem.config.json`:
- Test environment: `app-test` process on port 3001
- Production environment: `app-production` process on port 3000

## Architecture Overview

### Core Technology Stack
- **Next.js 15.5.3** with App Router and Turbopack for performance
- **React 19** with full compatibility patches for Ant Design
- **TypeScript** with strict configuration and path aliases (`@/*` → `./src/*`)
- **Ant Design 5.27.4** with React 19 compatibility patches
- **Tailwind CSS 4** for modern styling
- **Zustand 5.0.8** for lightweight state management

### Internationalization System
The project features an automated i18n system using:
- **i18next 25.5.2** for core internationalization
- **VS Code auto-sync plugin** for automatic Chinese to English translation
- **Namespace-based organization** in `src/i18n/lang/`
- **Automatic translation generation** - Chinese strings are auto-extracted and translated

**Workflow**: Write components with Chinese text directly, save files, and the VS Code plugin automatically:
1. Wraps strings with `t()` function calls
2. Generates translation files in both `zh/` and `en/` directories
3. Maintains namespace organization

### Project Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Home page
│   ├── layout.tsx         # Root layout with staking platform header
│   └── home/              # Home sub-pages
├── components/            # Reusable React components
│   ├── AntdConfigProvider.tsx    # Ant Design config with i18n support
│   ├── FOUCPrevention.tsx        # Flash of unstyled content prevention
│   ├── CriticalStylesInjector.tsx
│   └── Loading.tsx               # Global loading component
├── stores/               # Zustand state management
│   ├── auth.ts          # Authentication state
│   ├── loading.ts       # Global loading state
│   └── userStore.tsx    # User data management
├── i18n/               # Internationalization system
│   ├── index.ts        # i18n configuration
│   ├── hooks.ts        # React hooks for translation
│   ├── hooks/          # Custom hooks (language switch, client init)
│   ├── utils.ts        # Utility functions
│   └── lang/           # Translation files
│       ├── zh/         # Chinese translations (manual)
│       └── en/         # English translations (auto-generated)
├── http/               # HTTP client with advanced features
│   └── http.ts         # Request caching, retry, deduplication
├── services/           # API services
│   ├── authService.ts  # Authentication service
│   ├── postService.ts  # Post/article service
│   └── commentService.ts # Comment service
├── config/             # Configuration files
│   └── env.ts          # Environment variable management
├── types/              # TypeScript type definitions
├── utils/              # Utility functions (time, cache, constants)
├── middleware/         # Custom middleware
└── router/             # Route path definitions
```

### HTTP Client Architecture
The built-in HTTP client (`src/http/http.ts`) provides:
- **Request caching** with TTL support
- **Request deduplication** for concurrent identical requests
- **Retry logic** with configurable attempts
- **Loading states** with multiple strategies
- **Cookie-based authentication** using HttpOnly cookies
- **Request merging** to reuse in-flight requests

### State Management (Zustand)
- **Auth Store**: User authentication, loading states, error handling
- **Loading Store**: Global loading state management
- **User Store**: User profile and data management
- Stores follow Zustand patterns with TypeScript typing

### Environment Configuration
- **Development**: `.env.local` (not committed)
- **Test**: `.env.test` with PM2 process `app-test` on port 3001
- **Production**: `.env.production` with PM2 process `app-production` on port 3000

### Next.js Configuration
- **Proxy setup**: API requests (`/api/*`) are proxied to backend via `NEXT_PUBLIC_BASE_API`
- **Image optimization**: Configured for external domains (bilibili, baidu, etc.)
- **Path aliases**: `@/*` mapped to `./src/*`

## Development Patterns

### Component Development
1. Write components using Chinese text directly
2. Use `@/i18n/hooks` for `useTranslation()` hook
3. Let VS Code plugin auto-convert strings to `t()` calls
4. Ant Design components imported from `antd`
5. Tailwind CSS for custom styling

### Authentication Flow
- Uses HttpOnly cookies for secure token storage
- Automatic token refresh handled by HTTP client
- Auth state managed through Zustand store
- Login/logout functionality in `authService.ts`

### Internationalization Workflow
- Manual editing: Only edit Chinese files in `src/i18n/lang/zh/`
- Auto-generation: English files are generated by VS Code plugin
- Namespaces: Organized by feature (common, network, etc.)
- Language switching: Supported via `useLanguageSwitch` hook

### API Integration
- HTTP client provides caching and retry logic
- All API calls go through configured proxy
- Services in `src/services/` handle specific API endpoints
- Type definitions in `src/types/` ensure type safety

## Environment Variables
Required in `.env.local` for development:
```env
NEXT_PUBLIC_BASE_API=https://your-api-endpoint.com
NEXT_PUBLIC_APP_TITLE=Stake质押平台
NEXT_PUBLIC_DEFAULT_LANGUAGE=zh
NEXT_PUBLIC_SUPPORTED_LANGUAGES=zh,en
```

## PM2 Production Deployment
The `ecosystem.config.json` defines two processes:
- `app-test`: Test environment with 1 instance, port 3001
- `app-production`: Production with max instances, port 3000

Both use cluster mode, 1G memory limit, and comprehensive logging.

## Key Features
- **Automated i18n**: VS Code plugin handles Chinese to English translation
- **Performance**: Turbopack bundler, HTTP caching, request deduplication
- **Security**: HttpOnly cookie authentication, CSRF protection
- **Scalability**: PM2 cluster mode, environment-specific builds
- **Developer Experience**: TypeScript, ESLint, hot reload, auto-i18n