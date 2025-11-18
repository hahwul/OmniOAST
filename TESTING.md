# Testing Documentation

This document describes the testing infrastructure for OmniOAST.

## Overview

The test suite ensures that all OAST provider services work correctly without making real external HTTP requests. All external dependencies are mocked to prevent network access during testing.

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode (for development)
pnpm -r exec vitest

# Run tests for specific package
cd packages/backend && pnpm test
cd packages/frontend && pnpm test
```

## Test Structure

### Backend Tests (`packages/backend/src/__tests__/`)

- **boast.test.ts** (11 tests) - Tests for BOAST service
- **webhooksite.test.ts** (17 tests) - Tests for Webhook.site service  
- **postbin.test.ts** (18 tests) - Tests for PostBin service
- **provider.test.ts** (22 tests) - Tests for ProviderService (CRUD operations)

**Total Backend Tests: 68**

### Frontend Tests (`packages/frontend/src/__tests__/`)

- **interactsh.test.ts** (7 tests) - Tests for Interactsh client with mocked axios
- **boast.test.ts** (5 tests) - Tests for BOAST URL generation
- **crypto.test.ts** (3 tests) - Tests for cryptographic operations (ensuring no external requests)

**Total Frontend Tests: 15**

**Grand Total: 83 tests**

## Mocking Strategy

### Backend Services

All backend services use the Caido SDK's `RequestSpec` and `RequestResponse` APIs, which are mocked using Vitest:

```typescript
vi.mock("caido:utils", () => ({
  RequestSpec: vi.fn().mockImplementation((url: string) => ({
    url,
    setHeader: vi.fn(),
    setMethod: vi.fn(),
    setBody: vi.fn(),
  })),
}));

// Mock SDK requests.send method
mockSdk.requests.send.mockResolvedValue({
  response: {
    getCode: () => 200,
    getBody: () => ({ toJson: () => mockData }),
  },
});
```

### Frontend Services

Frontend services use axios for HTTP requests, which is mocked:

```typescript
vi.mock("axios");
const mockedAxios = vi.mocked(axios, true);

mockedAxios.create = vi.fn().mockReturnValue({
  get: vi.fn().mockResolvedValue({ data: mockData }),
  post: vi.fn().mockResolvedValue({ data: mockData }),
});
```

## Test Coverage

### What is Tested

1. **OAST Provider Registration**
   - Successful registration
   - Error handling (network errors, HTTP errors, missing fields)
   - Caching of registration data

2. **Event Fetching**
   - Successful event retrieval
   - Empty response handling
   - HTTP error handling
   - Data parsing and transformation

3. **Provider Management** 
   - Create, read, update, delete operations
   - Database error handling
   - Provider type validation
   - OAST service instantiation

4. **Frontend Services**
   - Axios request mocking
   - Crypto operations (no external requests)
   - URL generation

### What is NOT Tested

- Actual external API integrations (these are mocked)
- Caido plugin runtime behavior
- Vue component rendering
- UI interactions

## Verification of No External Requests

All tests verify that no external HTTP requests are made by:

1. Mocking all HTTP client libraries (axios, Caido SDK requests)
2. Verifying mock call counts
3. In frontend tests, explicitly checking that `fetch` is not called

Example:
```typescript
it("should not make external HTTP requests", () => {
  const fetchSpy = vi.spyOn(global, "fetch");
  
  // ... perform operations ...
  
  expect(fetchSpy).not.toHaveBeenCalled();
  fetchSpy.mockRestore();
});
```

## Configuration

### Vitest Configuration

- **Backend**: `packages/backend/vitest.config.ts`
  - Environment: Node.js
  - Global test APIs enabled
  
- **Frontend**: `packages/frontend/vitest.config.ts`
  - Environment: happy-dom (browser simulation)
  - Vue plugin enabled
  - Path alias `@` for `./src`

## CI/CD Integration

Tests can be integrated into GitHub Actions:

```yaml
- name: Run tests
  run: pnpm test

- name: Type check
  run: pnpm typecheck

- name: Build
  run: pnpm build
```

## Adding New Tests

When adding new OAST provider services:

1. Create a new test file in `packages/backend/src/__tests__/`
2. Mock the Caido SDK `RequestSpec` and `RequestResponse`
3. Test all service methods (getEvents, registerAndGetPayload, etc.)
4. Verify error handling scenarios
5. Ensure no external HTTP requests are made

Example template:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";
import { YourService } from "../services/yourservice";

const mockSdk = {
  console: { log: vi.fn(), error: vi.fn() },
  requests: { send: vi.fn() },
};

vi.mock("caido:utils", () => ({
  RequestSpec: vi.fn().mockImplementation((url) => ({
    url,
    setHeader: vi.fn(),
  })),
}));

describe("YourService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should test functionality", async () => {
    // Setup mocks
    mockSdk.requests.send.mockResolvedValue({
      response: {
        getCode: () => 200,
        getBody: () => ({ toJson: () => ({}) }),
      },
    });

    const service = new YourService(mockSdk as any);
    // Test assertions...
  });
});
```

## Troubleshooting

### Tests Fail with "Cannot find module"

Ensure vitest.config.ts has the correct path alias:

```typescript
resolve: {
  alias: {
    "@": fileURLToPath(new URL("./src", import.meta.url)),
  },
}
```

### Mock Not Working

Make sure `vi.clearAllMocks()` is called in `beforeEach()` to reset mock state between tests.

### TypeScript Errors in Tests

Add proper type assertions when accessing array elements:

```typescript
expect(events[0]?.id).toBe("expected-id");  // Safe access
```
