# OmniOAST - Caido Plugin for OAST Testing

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Initial Setup
- Install Node.js 20.x (required for Caido compatibility)
- Install pnpm version 9: `npm install -g pnpm@9`
- Clone repository: `git clone https://github.com/hahwul/OmniOAST`
- Install dependencies: `pnpm install` -- takes 1.5 minutes. NEVER CANCEL. Set timeout to 5+ minutes.

### Development Commands
- Type check: `pnpm typecheck` -- takes 6 seconds. Validates TypeScript in both frontend and backend packages.
- Build plugin: `pnpm build` -- takes 6 seconds. NEVER CANCEL. Set timeout to 2+ minutes.
- Watch mode for development: `pnpm watch` -- starts development server on http://localhost:3000
- Lint code: `pnpm lint` -- fixes ESLint issues automatically

### Build Artifacts
- Built plugin package: `./dist/plugin_package.zip` (ready for Caido installation)
- Backend build: `./packages/backend/dist/index.js`
- Frontend build: `./packages/frontend/dist/index.js` and `./packages/frontend/dist/index.css`

## Validation
- ALWAYS run `pnpm typecheck` before committing changes
- ALWAYS run `pnpm build` to ensure the plugin packages correctly
- The build process creates a complete plugin package that can be installed in Caido
- For development testing, use `pnpm watch` and connect to http://localhost:3000 in Caido's Devtools tab

## Repository Structure

### Key Directories
- `packages/frontend/` - Vue.js frontend plugin code with TypeScript
- `packages/backend/` - Node.js backend plugin services
- `packages/frontend/src/` - Main frontend source code
- `packages/backend/src/` - Main backend source code
- `.github/workflows/` - CI/CD validation workflows
- `dist/` - Build output directory (created after `pnpm build`)

### Important Files
- `caido.config.ts` - Main Caido plugin configuration
- `package.json` - Root workspace configuration with scripts
- `pnpm-workspace.yaml` - pnpm workspace configuration
- `packages/frontend/package.json` - Frontend dependencies and scripts
- `packages/backend/package.json` - Backend dependencies and scripts
- `eslint.config.mjs` - ESLint configuration using Caido's config

### Main Plugin Files
- `packages/frontend/src/index.ts` - Frontend plugin entry point
- `packages/backend/src/index.ts` - Backend plugin entry point
- `packages/frontend/src/views/App.vue` - Main Vue application component
- `packages/frontend/src/services/interactsh.ts` - OAST provider service implementations

## Common Development Tasks

### Adding New Features
- Work in feature branches: `git checkout -b feature/your-feature-name`
- Frontend changes go in `packages/frontend/src/`
- Backend API changes go in `packages/backend/src/`
- Always run `pnpm typecheck` and `pnpm build` after changes

### Working with OAST Providers
- Main service logic in `packages/frontend/src/services/`
- Provider management in frontend components under `packages/frontend/src/views/`
- Backend API endpoints registered in `packages/backend/src/index.ts`

### Plugin Configuration
- Plugin metadata in `caido.config.ts` (id: "omnioast", name: "OmniOAST")
- Frontend/backend package coordination via workspace references
- Styling uses Tailwind CSS with PrimeVue components and Caido theme

## Caido Plugin Specifics
- This is a Caido security testing tool plugin for Out-of-Band Application Security Testing
- Supports providers: Interactsh, BOAST, Webhook.site, PostBin
- Frontend uses Vue 3 + PrimeVue + Pinia for state management
- Backend provides API services for provider management and interaction logging
- Plugin installs as `plugin_package.zip` in Caido's plugin system

## Testing Your Changes
- Use `pnpm watch` to start development server
- Connect to http://localhost:3000 in Caido's Devtools tab
- Test provider addition, payload generation, and interaction monitoring
- Verify tab-based management works correctly
- Test settings and polling functionality

## Build System Details
- Uses `@caido-community/dev` CLI for building
- Frontend built with Vite + Vue
- Backend built with tsup
- Automatic plugin package creation with manifest validation
- Build output: production-ready plugin package for Caido installation