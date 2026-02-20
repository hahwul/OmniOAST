import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CaidoBackendSDK } from "../../types";

// Mock caido:utils module as it is used by dependencies of ProviderService
vi.mock("caido:utils", () => ({
  RequestSpec: vi.fn().mockImplementation((url: string) => ({
    url,
    setHeader: vi.fn(),
    setMethod: vi.fn(),
    setBody: vi.fn(),
  })),
}));

describe("Provider Service Initialization", () => {
  const mockSdk = {} as CaidoBackendSDK;

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should throw error if getProviderService is called before initialization", async () => {
    const { getProviderService } = await import("../services/provider");
    expect(() => getProviderService()).toThrow(
      "Provider service not initialized. Call initProviderService first.",
    );
  });

  it("should initialize the service correctly", async () => {
    const { initProviderService, getProviderService, ProviderService } =
      await import("../services/provider");

    initProviderService(mockSdk);

    const service = getProviderService();
    expect(service).toBeInstanceOf(ProviderService);
  });

  it("should warn if initialized twice", async () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { initProviderService } = await import("../services/provider");

    initProviderService(mockSdk);
    initProviderService(mockSdk);

    expect(consoleSpy).toHaveBeenCalledWith(
      "Provider service already initialized.",
    );
  });
});
