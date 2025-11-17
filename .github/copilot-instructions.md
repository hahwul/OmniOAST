# OmniOAST - Caido Plugin for OAST Testing

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Overview
OmniOAST is a Caido security testing plugin for Out-of-Band Application Security Testing (OAST). It centralizes OAST provider management and interaction logs, supporting Interactsh, BOAST, Webhook.site, and PostBin providers. The plugin features tab-based interaction management, real-time polling, and unified callback viewing within Caido.

## Working Effectively

### Initial Setup
- Install Node.js 20.x (required for Caido compatibility)
- Install pnpm version 9: `npm install -g pnpm@9`
- Clone repository: `git clone https://github.com/hahwul/OmniOAST`
- Install dependencies: `pnpm install` -- takes 5-7 seconds (up to 2 minutes on slower systems). NEVER CANCEL. Set timeout to 5+ minutes.

### Development Commands
- Type check: `pnpm typecheck` -- takes ~6 seconds. Validates TypeScript in both frontend and backend packages using `vue-tsc` and `tsc`.
- Build plugin: `pnpm build` -- takes ~4-6 seconds. NEVER CANCEL. Set timeout to 2+ minutes. Uses `caido-dev build` to package the plugin.
- Watch mode for development: `pnpm watch` -- starts development server on http://localhost:3000 for live development with hot reload.
- Lint code: `pnpm lint` -- runs ESLint on `./packages/**/src` with auto-fix enabled.

### Build Artifacts
- Built plugin package: `./dist/plugin_package.zip` (ready for Caido installation)
- Backend build: `./packages/backend/dist/index.js` (~148 KB)
- Frontend build: `./packages/frontend/dist/index.js` (~1.4 MB) and `./packages/frontend/dist/index.css` (~123 KB)

## Validation
- ALWAYS run `pnpm typecheck` before committing changes
- ALWAYS run `pnpm build` to ensure the plugin packages correctly
- The build process creates a complete plugin package that can be installed in Caido
- For development testing, use `pnpm watch` and connect to http://localhost:3000 in Caido's Devtools tab
- GitHub Actions validates typecheck on push to main branch (see `.github/workflows/validate.yml`)

## Repository Structure

### Key Directories
- `packages/frontend/` - Vue.js frontend plugin code with TypeScript (19 files total)
- `packages/backend/` - Node.js backend plugin services (7 TypeScript files)
- `packages/frontend/src/` - Main frontend source code
  - `services/` - OAST provider implementations (4 files: interactsh.ts ~470 lines, pollingManager.ts ~385 lines, crypto.ts ~182 lines, boast.ts ~15 lines)
  - `stores/` - Pinia state management stores (oastStore.ts for managing interactions and tabs)
  - `views/` - Vue components (7 Vue files: App.vue, Oast.vue, OastTabs.vue, Polling.vue, Providers.vue, Settings.vue, About.vue)
  - `plugins/` - SDK plugin configuration (sdk.ts)
  - `utils/` - Utility functions (time.ts, try-catch.ts, utils.ts)
  - `styles/` - CSS styling (index.css)
- `packages/backend/src/` - Main backend source code
  - `services/` - Backend service implementations (5 files: provider.ts, settings.ts, boast.ts, postbin.ts, webhooksite.ts)
  - `validation/` - Zod schemas for data validation (schemas.ts)
- `.github/workflows/` - CI/CD validation workflows (validate.yml, release.yml, contributors.yml)
- `dist/` - Build output directory (created after `pnpm build`)
- `images/` - Project images and assets

### Important Files
- `caido.config.ts` - Main Caido plugin configuration defining backend and frontend plugins
- `package.json` - Root workspace configuration with scripts (typecheck, lint, build, watch)
- `pnpm-workspace.yaml` - pnpm workspace configuration (`packages: - 'packages/*'`)
- `packages/frontend/package.json` - Frontend dependencies (Vue 3.4.37, Pinia 3.0.2, PrimeVue 4.1.0, axios 1.10.0, @caido/sdk-frontend 0.46.0, crypto-js 4.2.0, uuid 11.1.0)
- `packages/backend/package.json` - Backend dependencies (@caido/sdk-backend 0.46.0, uuid 11.1.0, zod 3.25.67)
- `eslint.config.mjs` - ESLint configuration using Caido's default config
- `tsconfig.json` - TypeScript configuration (target: esnext, strict mode enabled)

### Main Plugin Files
- `packages/frontend/src/index.ts` - Frontend plugin entry point, sets up Vue app with PrimeVue, Pinia, registers navigation, commands, and keyboard shortcuts
- `packages/backend/src/index.ts` - Backend plugin entry point, registers API endpoints for provider and settings management, OAST operations
- `packages/frontend/src/views/App.vue` - Main Vue application component with tab-based interface
- `packages/frontend/src/services/interactsh.ts` - Interactsh client implementation with encryption support (470 lines)
- `packages/frontend/src/services/pollingManager.ts` - Manages polling tasks for OAST interactions (385 lines)
- `packages/frontend/src/services/crypto.ts` - Cryptographic utilities for secure communication (182 lines)
- `packages/frontend/src/stores/oastStore.ts` - Pinia store managing OAST interactions, tabs, and polling state
- `packages/backend/src/validation/schemas.ts` - Zod schemas for Provider (name, type, url, token, enabled) and Settings (pollingInterval, payloadPrefix)

## Architecture & Data Flow

### Frontend Architecture
- **Entry Point**: `index.ts` initializes Vue app with PrimeVue (Classic theme, unstyled components), Pinia store, SDK plugin
- **Navigation**: Registers `/omnioast` page with sidebar item (icon: "fas fa-satellite-dish")
- **Commands**: Two registered commands - "omnioast.goToOmniOAST" (Cmd+Shift+O) and "omnioast.pollAllTabs"
- **State Management**: Pinia store (`oastStore`) manages:
  - `tabs`: Array of OastTab objects with interactions
  - `pollingList`: Array of active polling tasks
  - `currentTabId`: Active tab identifier
- **Services**:
  - `interactsh.ts`: Handles Interactsh protocol with AES encryption, correlation IDs, polling
  - `pollingManager.ts`: Manages interval-based polling for all provider types
  - `crypto.ts`: RSA key generation, AES encryption/decryption for secure OAST communications
  - `boast.ts`: Simple BOAST URL generation

### Backend Architecture
- **Entry Point**: `index.ts` initializes services and registers API methods
- **Services**:
  - `provider.ts`: ProviderService manages CRUD operations for providers in SQLite database, creates OAST service instances
  - `settings.ts`: SettingsService manages plugin settings (polling interval, payload prefix)
  - `webhooksite.ts`: WebhooksiteService implements OAST for Webhook.site API
  - `postbin.ts`: PostbinService implements OAST for PostBin temporary bins
  - `boast.ts`: BoastService implements OAST for BOAST provider
- **Database**: SQLite tables managed via Caido SDK
  - `providers` table: id, name, type, url, token, enabled
  - `settings` table: id, pollingInterval, payloadPrefix
- **API Methods**: Backend exposes methods via Caido SDK API registry (createProvider, getProvider, updateProvider, deleteProvider, listProviders, toggleProviderEnabled, registerAndGetPayload, getOASTEvents, settings CRUD)

### Provider Types & Implementations
1. **Interactsh**: Full client implementation with encryption, correlation IDs, session restore, keep-alive polling
2. **BOAST**: Simple URL generation service
3. **Webhook.site**: REST API integration, supports API keys, extracts token from existing URLs
4. **PostBin**: Auto-creates temporary bins (30-minute expiry), REST API polling

### Data Models (Zod Schemas)
- **Provider**: `{ id?: string, name: string (1-100 chars), type: "interactsh" | "BOAST" | "webhooksite" | "postbin", url: string (valid URL), token?: string, enabled: boolean (default true) }`
- **Settings**: `{ id?: string, pollingInterval: number (positive int, default 30), payloadPrefix: string (default "") }`
- **OastInteraction**: `{ id, type, timestamp, provider, correlationId, protocol?, method?, source?, destination?, rawRequest?, rawResponse?, data }`
- **Polling**: `{ id, payload, provider, providerId?, lastChecked, interval, stop, tabId, tabName, session? }`

## Common Development Tasks

### Adding New Features
- Work in feature branches: `git checkout -b feature/your-feature-name`
- Frontend changes go in `packages/frontend/src/`
  - UI components: `packages/frontend/src/views/`
  - State logic: `packages/frontend/src/stores/`
  - Services: `packages/frontend/src/services/`
- Backend API changes go in `packages/backend/src/`
  - Services: `packages/backend/src/services/`
  - Schemas: `packages/backend/src/validation/`
- Always run `pnpm typecheck` and `pnpm build` after changes

### Adding a New OAST Provider
1. **Backend**: Create service in `packages/backend/src/services/` implementing `OASTService` interface (getEvents, getId, getDomain, registerAndGetPayload?)
2. **Frontend**: Add client implementation in `packages/frontend/src/services/` if complex logic needed
3. **Schema**: Update `ProviderSchema` enum in `packages/backend/src/validation/schemas.ts` to include new type
4. **Provider Service**: Update `packages/backend/src/services/provider.ts` `getOASTService()` to instantiate new service
5. **UI**: Update provider selection UI in `packages/frontend/src/views/Providers.vue`

### Working with OAST Providers
- Main service logic in `packages/frontend/src/services/` (frontend) and `packages/backend/src/services/` (backend)
- Provider management UI in `packages/frontend/src/views/Providers.vue`
- OAST interaction display in `packages/frontend/src/views/Oast.vue`
- Polling management in `packages/frontend/src/views/Polling.vue`
- Backend API endpoints registered in `packages/backend/src/index.ts`
- Provider CRUD handled by `ProviderService` with SQLite persistence

### Modifying State Management
- Edit `packages/frontend/src/stores/oastStore.ts`
- Store exports composable: `export const useOastStore = defineStore('oast', () => { ... })`
- Key state: tabs, pollingList, currentTabId, interactions (computed from current tab)
- Key actions: addInteraction, addPolling, removePolling, createTab, removeTab, setCurrentTab

### Styling Changes
- Uses Tailwind CSS with PrimeVue Classic theme (unstyled components)
- Global styles in `packages/frontend/src/styles/index.css`
- PostCSS with `postcss-prefixwrap` plugin wraps styles with `#plugin--omnioast` to prevent conflicts
- Dark mode: `[data-mode="dark"]` attribute on `<html>` element
- Tailwind plugins: `tailwindcss-primeui` and `@caido/tailwindcss`
- Configure in `caido.config.ts` under `vite.css.postcss.plugins`

### Plugin Configuration
- Plugin metadata in `caido.config.ts` (id: "omnioast", name: "OmniOAST", version: "0.4.0")
- Frontend/backend package coordination via workspace references
- Frontend package references backend as dependency: `"backend": "workspace:*"`
- Vite configuration includes external dependencies (@caido/frontend-sdk, codemirror packages)
- Path alias: `@` resolves to `packages/frontend/src`

## Caido Plugin Specifics
- This is a Caido security testing tool plugin for Out-of-Band Application Security Testing
- Supports providers: Interactsh, BOAST, Webhook.site, PostBin
- Frontend uses Vue 3 + PrimeVue + Pinia for state management
- Backend provides API services for provider management and interaction logging
- Plugin installs as `plugin_package.zip` in Caido's plugin system
- Registers sidebar item with satellite-dish icon
- Command palette integration with keyboard shortcuts
- Tab-based workflow for organizing OAST activities by testing objective

## Testing Your Changes
- Use `pnpm watch` to start development server
- Connect to http://localhost:3000 in Caido's Devtools tab
- Test provider addition:
  - Quick-add buttons for Interactsh/BOAST public servers
  - Manual provider setup with name, type, URL, optional token
  - Webhook.site: existing URL or auto-generate
  - PostBin: auto-creates temporary bins
- Test payload generation and interaction monitoring:
  - Select provider from dropdown
  - Generate payload URL
  - Send requests with payload
  - Verify interactions appear in real-time
- Verify tab-based management:
  - Create/remove tabs
  - Switch between tabs
  - Verify interactions isolated per tab
- Test settings:
  - Adjust polling interval
  - Set payload prefix
  - Verify settings persist
- Test polling functionality:
  - View active polling tasks in Polling tab
  - Remove polling tasks
  - Verify polling interval changes apply

## Build System Details
- Uses `@caido-community/dev` CLI (v0.1.6) for building
- Frontend built with Vite + Vue plugin (`@vitejs/plugin-vue`)
- Backend built with tsup
- Build process:
  1. Backend: tsup builds `packages/backend/src/index.ts` to ESM in `dist/`
  2. Frontend: Vite builds with Vue plugin, outputs to `packages/frontend/dist/`
  3. Bundler: Creates `dist/plugin_package.zip` with manifest validation
- Automatic plugin package creation with manifest validation
- Build output: production-ready plugin package for Caido installation
- External dependencies not bundled in frontend (Caido SDK, CodeMirror)

## Debugging & Troubleshooting
- Frontend console logs: Available in Caido DevTools console
- Backend console logs: Use `sdk.console.log()` in backend services, logs appear in Caido backend logs
- Common issues:
  - Build failures: Check Node.js version (must be 20.x), pnpm version (must be 9.x)
  - TypeScript errors: Run `pnpm typecheck` to identify issues
  - Polling not working: Check settings polling interval, verify provider enabled status
  - Interactions not appearing: Verify backend API methods registered, check provider service implementation
- Database inspection: Backend uses Caido SDK's SQLite database accessible via `sdk.meta.db()`

## CI/CD & Workflows
- `.github/workflows/validate.yml`: Runs typecheck and lint (currently lint commented out) on push to main
- `.github/workflows/release.yml`: Automated release workflow
- `.github/workflows/contributors.yml`: Updates contributor list
- Environment variables: `CAIDO_NODE_VERSION=20`, `CAIDO_PNPM_VERSION=9`