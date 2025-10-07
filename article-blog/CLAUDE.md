# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm run dev` - Start development server with Turbopack (default port 3000)
- `npm run build` - Build production version with Turbopack
- `npm run start` - Start production server
- `npm run lint` - Run ESLint code checks

### Multi-Environment Commands
- `npm run build:test` - Build for test environment using `.env.test`
- `npm run start:test` - Start test server (port 3001)
- `npm run build:production` - Build for production using `.env.production`
- `npm run start:production` - Start production server (port 3000)

### Deployment
- `./deploy.sh local-test` - Local build for test
- `./deploy.sh local-production` - Local build for production
- PM2 process management: `pm2 list`, `pm2 logs app-test/app-production`, `pm2 restart app-test/app-production`

## Architecture Overview

### Framework & Tech Stack
- **Next.js 15.5.3** with App Router architecture
- **React 19.1.0** with TypeScript
- **Ant Design 5.27.4** for UI components
- **Tailwind CSS 4** for styling
- **Zustand 5.0.8** for state management
- **i18next 25.5.2** for internationalization

### Core Architectural Patterns

#### 1. Automated i18n System
This project's standout feature is the **automated internationalization system** using a custom VS Code plugin ([i18n-auto-sync](https://github.com/adzcsx2/i18n-auto-sync)):

- **Smart String Conversion**: Automatically converts Chinese strings in JSX to `t("key")` function calls
- **Auto Translation**: Uses Tencent Cloud API for automatic English translation
- **VS Code Integration**: Plugin handles conversion on save or via shortcuts (`Ctrl+Shift+I`, `Ctrl+Shift+R`, `Ctrl+Alt+S`)
- **Project Structure Requirement**: Must maintain `src/i18n/lang/zh/` and `src/i18n/lang/en/` directory structure

**Usage Pattern**: Write components directly in Chinese, save file, and plugin automatically:
```tsx
// Before (write Chinese directly)
<Form.Item label="用户名" rules={[{ required: true, message: "请输入用户名" }]}>

// After (automatic conversion)
import { useTranslation } from "@/i18n/hooks";
const { t } = useTranslation("common");
<Form.Item label={t("用户名")} rules={[{ required: true, message: t("请输入用户名") }]}>
```

#### 2. State Management with Zustand
- **Auth Store** (`src/stores/auth.ts`): User authentication with localStorage persistence
- **Loading Store** (`src/stores/loading.ts`): Global loading state management
- **User Store** (`src/stores/userStore.tsx`): User data management
- **Home Title Store** (`src/stores/home-title.tsx`): Page title management

#### 3. HTTP Client Architecture
Comprehensive HTTP client (`src/http/http.ts`) with advanced features:
- **Request Caching**: Built-in caching with TTL support for GET/POST requests
- **Duplicate Request Prevention**: Automatic cancellation of identical concurrent requests
- **Retry Logic**: Configurable retry mechanism
- **Loading States**: Multiple loading strategies (Antd messages, store, events)
- **Cookie-based Auth**: Uses HttpOnly cookies for authentication
- **Request Coalescing**: Reuses in-flight request promises

#### 4. Environment Configuration
Robust multi-environment support:
- **Development**: `.env.local` (not committed)
- **Test**: `.env.test` with port 3001
- **Production**: `.env.production` with port 3000
- **PM2 Configuration**: `ecosystem.config.json` for process management
- **Dynamic API Proxy**: Next.js rewrites for API proxying configured in `next.config.ts`

### Directory Structure
```
src/
├── app/              # Next.js App Router pages
├── components/       # Reusable React components
├── stores/          # Zustand state management
├── i18n/           # Internationalization system
│   ├── hooks.ts    # Enhanced i18n hooks
│   └── lang/       # Translation files (zh/en)
├── http/           # HTTP client utilities
├── config/         # Environment configuration
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
└── router/         # Path definitions
```

### Key Configuration Files
- **next.config.ts**: Image optimization, API proxy rewrites
- **eslint.config.mjs**: Next.js ESLint configuration with import rules disabled
- **ecosystem.config.json**: PM2 process management for test/production environments
- **postcss.config.mjs**: PostCSS configuration for Tailwind CSS

### Authentication Flow
- Uses HttpOnly cookies for secure token management
- Auth store (`useAuthStore`) handles user state and token management
- Automatic redirect to login on 401 responses
- Token stored both in localStorage (legacy) and HttpOnly cookies

### Important Notes
- **i18n Plugin Dependency**: The automated translation system requires the VS Code plugin to be installed
- **Environment Variables**: Must configure `.env.local` with `NEXT_PUBLIC_BASE_API` and `NEXT_PUBLIC_APP_TITLE`
- **Image Domains**: External images configured for bilibili.com, baidu.com, and hdslb.com
- **MCP Integration**: Chrome DevTools MCP server available for browser automation and testing