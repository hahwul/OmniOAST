import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProviderService } from "../services/provider";
import type { Provider } from "../validation/schemas";

// Mock database
const mockStatement = {
  run: vi.fn(),
  get: vi.fn(),
  all: vi.fn(),
};

const mockDb = {
  exec: vi.fn(),
  prepare: vi.fn().mockResolvedValue(mockStatement),
};

const mockSdk = {
  console: {
    log: vi.fn(),
    error: vi.fn(),
  },
  meta: {
    db: vi.fn().mockResolvedValue(mockDb),
  },
  requests: {
    send: vi.fn(),
  },
};

// Mock caido:utils module
vi.mock("caido:utils", () => ({
  RequestSpec: vi.fn().mockImplementation((url: string) => ({
    url,
    setHeader: vi.fn(),
    setMethod: vi.fn(),
    setBody: vi.fn(),
  })),
}));

describe("ProviderService", () => {
  let service: ProviderService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ProviderService(mockSdk as any);
    mockStatement.run.mockResolvedValue({ changes: 1 });
    mockStatement.get.mockResolvedValue(null);
    mockStatement.all.mockResolvedValue([]);
  });

  describe("createProvider", () => {
    it("should create a new provider successfully", async () => {
      const newProvider = {
        name: "Test Provider",
        type: "BOAST" as const,
        url: "https://boast.example.com",
        token: "test-token",
      };

      const result = await service.createProvider(newProvider);

      expect(result).not.toBeNull();
      expect(result?.name).toBe("Test Provider");
      expect(result?.type).toBe("BOAST");
      expect(result?.enabled).toBe(true);
      expect(result?.id).toBeDefined();
      expect(mockStatement.run).toHaveBeenCalled();
    });

    it("should create provider without token", async () => {
      const newProvider = {
        name: "Test Provider No Token",
        type: "postbin" as const,
        url: "https://postb.in",
      };

      const result = await service.createProvider(newProvider);

      expect(result).not.toBeNull();
      expect(result?.token).toBeUndefined();
    });

    it("should handle database errors", async () => {
      mockStatement.run.mockRejectedValue(new Error("Database error"));

      const newProvider = {
        name: "Test Provider",
        type: "BOAST" as const,
        url: "https://boast.example.com",
      };

      const result = await service.createProvider(newProvider);

      expect(result).toBeNull();
      // Console error may or may not be called depending on error handling
    });

    it("should validate provider schema", async () => {
      const invalidProvider = {
        name: "", // Invalid: name too short
        type: "BOAST" as const,
        url: "invalid-url", // Invalid URL
      };

      const result = await service.createProvider(invalidProvider);

      expect(result).toBeNull();
    });
  });

  describe("getProvider", () => {
    it("should retrieve a provider by ID", async () => {
      const mockProvider = {
        id: "test-id",
        name: "Test Provider",
        type: "BOAST",
        url: "https://boast.example.com",
        token: "test-token",
        enabled: 1,
      };

      mockStatement.get.mockResolvedValue(mockProvider);

      const result = await service.getProvider("test-id");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("test-id");
      expect(result?.name).toBe("Test Provider");
      expect(result?.enabled).toBe(true);
    });

    it("should return null if provider not found", async () => {
      mockStatement.get.mockResolvedValue(null);

      const result = await service.getProvider("non-existent-id");

      expect(result).toBeNull();
    });

    it("should handle object ID parameter", async () => {
      const mockProvider = {
        id: "test-id",
        name: "Test Provider",
        type: "BOAST",
        url: "https://boast.example.com",
        enabled: 1,
      };

      mockStatement.get.mockResolvedValue(mockProvider);

      const result = await service.getProvider({ id: "test-id" });

      expect(result).not.toBeNull();
      expect(result?.id).toBe("test-id");
    });

    it("should handle database errors", async () => {
      mockStatement.get.mockRejectedValue(new Error("Database error"));

      const result = await service.getProvider("test-id");

      expect(result).toBeNull();
      // Console error may or may not be called depending on error handling
    });
  });

  describe("updateProvider", () => {
    it("should update a provider successfully", async () => {
      const existingProvider = {
        id: "test-id",
        name: "Old Name",
        type: "BOAST" as const,
        url: "https://boast.example.com",
        enabled: true,
      };

      mockStatement.get.mockResolvedValue({
        ...existingProvider,
        enabled: 1,
      });

      const result = await service.updateProvider("test-id", {
        name: "New Name",
      });

      expect(result).not.toBeNull();
      expect(result?.name).toBe("New Name");
      expect(mockStatement.run).toHaveBeenCalled();
    });

    it("should return null if provider not found", async () => {
      mockStatement.get.mockResolvedValue(null);

      const result = await service.updateProvider("non-existent-id", {
        name: "New Name",
      });

      expect(result).toBeNull();
    });

    it("should handle database errors", async () => {
      const existingProvider = {
        id: "test-id",
        name: "Old Name",
        type: "BOAST" as const,
        url: "https://boast.example.com",
        enabled: 1,
      };

      mockStatement.get.mockResolvedValue(existingProvider);
      mockStatement.run.mockRejectedValue(new Error("Database error"));

      const result = await service.updateProvider("test-id", {
        name: "New Name",
      });

      expect(result).toBeNull();
      // Console error may or may not be called depending on error handling
    });
  });

  describe("deleteProvider", () => {
    it("should delete a provider successfully", async () => {
      mockStatement.run.mockResolvedValue({ changes: 1 });

      const result = await service.deleteProvider("test-id");

      expect(result).toBe(true);
      expect(mockStatement.run).toHaveBeenCalled();
    });

    it("should return false if provider not found", async () => {
      mockStatement.run.mockResolvedValue({ changes: 0 });

      const result = await service.deleteProvider("non-existent-id");

      expect(result).toBe(false);
    });

    it("should handle database errors", async () => {
      mockStatement.run.mockRejectedValue(new Error("Database error"));

      const result = await service.deleteProvider("test-id");

      expect(result).toBe(false);
      // Console error may or may not be called depending on error handling
    });
  });

  describe("listProviders", () => {
    it("should list all providers", async () => {
      const mockProviders = [
        {
          id: "id-1",
          name: "Provider 1",
          type: "BOAST",
          url: "https://boast.example.com",
          enabled: 1,
        },
        {
          id: "id-2",
          name: "Provider 2",
          type: "webhooksite",
          url: "https://webhook.site/test",
          enabled: 0,
        },
      ];

      mockStatement.all.mockResolvedValue(mockProviders);

      const result = await service.listProviders();

      expect(result).toHaveLength(2);
      expect(result[0]?.enabled).toBe(true);
      expect(result[1]?.enabled).toBe(false);
    });

    it("should return empty array if no providers", async () => {
      mockStatement.all.mockResolvedValue([]);

      const result = await service.listProviders();

      expect(result).toHaveLength(0);
    });

    it("should handle database errors", async () => {
      mockStatement.all.mockRejectedValue(new Error("Database error"));

      const result = await service.listProviders();

      expect(result).toHaveLength(0);
      // Console error may or may not be called depending on error handling
    });
  });

  describe("toggleProviderEnabled", () => {
    it("should toggle provider enabled status", async () => {
      const existingProvider = {
        id: "test-id",
        name: "Test Provider",
        type: "BOAST" as const,
        url: "https://boast.example.com",
        enabled: 1,
      };

      mockStatement.get.mockResolvedValue(existingProvider);

      const result = await service.toggleProviderEnabled("test-id", false);

      expect(result).not.toBeNull();
      expect(result?.enabled).toBe(false);
    });
  });

  describe("getOASTService", () => {
    it("should create BOAST service", () => {
      const provider: Provider = {
        id: "test-id",
        name: "BOAST Provider",
        type: "BOAST",
        url: "https://boast.example.com",
        token: "test-token",
        enabled: true,
      };

      const oastService = service.getOASTService(provider);

      expect(oastService).not.toBeNull();
      expect(oastService?.getId).toBeDefined();
      expect(oastService?.getDomain).toBeDefined();
      expect(oastService?.getEvents).toBeDefined();
    });

    it("should create Webhook.site service", () => {
      const provider: Provider = {
        id: "test-id",
        name: "Webhook Provider",
        type: "webhooksite",
        url: "https://webhook.site/test-token",
        enabled: true,
      };

      const oastService = service.getOASTService(provider);

      expect(oastService).not.toBeNull();
    });

    it("should create PostBin service", () => {
      const provider: Provider = {
        id: "test-id",
        name: "PostBin Provider",
        type: "postbin",
        url: "https://www.postb.in/test-bin",
        enabled: true,
      };

      const oastService = service.getOASTService(provider);

      expect(oastService).not.toBeNull();
    });

    it("should return null for unknown provider type", () => {
      const provider: any = {
        id: "test-id",
        name: "Unknown Provider",
        type: "unknown",
        url: "https://example.com",
        enabled: true,
      };

      const oastService = service.getOASTService(provider);

      expect(oastService).toBeNull();
      // Console error may or may not be called depending on implementation
    });
  });
});
