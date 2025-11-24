import { beforeEach, describe, expect, it, vi } from "vitest";

import { BoastService } from "../services/boast";

// Mock Caido SDK types
const mockResponse = {
  getCode: vi.fn(),
  getBody: vi.fn(),
};
const mockRequestResponse = {
  response: mockResponse,
};

// Mock Caido SDK
const mockSdk = {
  console: {
    log: vi.fn(),
    error: vi.fn(),
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

describe("BoastService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResponse.getCode.mockReturnValue(200);
  });

  describe("getEvents", () => {
    it("should fetch and parse BOAST events successfully", async () => {
      const mockEvents = {
        id: "test-id",
        events: [
          {
            id: "event-1",
            time: "2024-01-01T00:00:00Z",
            receiver: "DNS",
            QueryType: "A",
            remoteAddress: "1.2.3.4",
            dump: "test dump data",
          },
        ],
      };

      mockResponse.getBody.mockReturnValue({
        toJson: () => mockEvents,
      });
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const service = new BoastService(
        "https://boast.example.com",
        "test-secret",
        mockSdk as any,
      );
      const events = await service.getEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        id: "event-1",
        type: "BOAST",
        protocol: "DNS",
        method: "A",
        source: "1.2.3.4",
        correlationId: "event-1",
        rawRequest: "test dump data",
      });
      expect(mockSdk.requests.send).toHaveBeenCalledTimes(1);
    });

    it("should handle empty events", async () => {
      const mockData = {
        id: "test-id",
        events: [],
      };

      mockResponse.getBody.mockReturnValue({
        toJson: () => mockData,
      });
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const service = new BoastService(
        "https://boast.example.com",
        "test-secret",
        mockSdk as any,
      );
      const events = await service.getEvents();

      expect(events).toHaveLength(0);
    });

    it("should handle HTTP errors", async () => {
      mockResponse.getCode.mockReturnValue(500);
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const service = new BoastService(
        "https://boast.example.com",
        "test-secret",
        mockSdk as any,
      );
      const events = await service.getEvents();

      expect(events).toHaveLength(0);
      expect(mockSdk.console.error).toHaveBeenCalled();
    });

    it("should handle network errors", async () => {
      mockSdk.requests.send.mockRejectedValue(new Error("Network error"));

      const service = new BoastService(
        "https://boast.example.com",
        "test-secret",
        mockSdk as any,
      );
      const events = await service.getEvents();

      expect(events).toHaveLength(0);
      expect(mockSdk.console.error).toHaveBeenCalled();
    });

    it("should set id and domain after first successful request", async () => {
      const mockData = {
        id: "test-id-123",
        events: [],
      };

      mockResponse.getBody.mockReturnValue({
        toJson: () => mockData,
      });
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const service = new BoastService(
        "https://boast.example.com",
        "test-secret",
        mockSdk as any,
      );
      await service.getEvents();

      expect(service.getId()).toBe("test-id-123");
      expect(service.getDomain()).toBe("test-id-123.boast.example.com");
    });
  });

  describe("registerAndGetPayload", () => {
    it("should register and get payload successfully", async () => {
      const mockData = {
        id: "registered-id",
        canary: "canary-value",
      };

      mockResponse.getBody.mockReturnValue({
        toJson: () => mockData,
      });
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const service = new BoastService(
        "https://boast.example.com",
        "test-secret",
        mockSdk as any,
      );
      const result = await service.registerAndGetPayload();

      expect(result).toEqual({
        id: "registered-id",
        payloadUrl: "registered-id.boast.example.com",
      });
    });

    it("should return cached payload if already registered", async () => {
      const mockData = {
        id: "cached-id",
        canary: "canary-value",
      };

      mockResponse.getBody.mockReturnValue({
        toJson: () => mockData,
      });
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const service = new BoastService(
        "https://boast.example.com",
        "test-secret",
        mockSdk as any,
      );

      // First call - registers
      const result1 = await service.registerAndGetPayload();

      // Second call - should return cached
      const result2 = await service.registerAndGetPayload();

      expect(result1).toEqual(result2);
      expect(mockSdk.requests.send).toHaveBeenCalledTimes(1);
    });

    it("should throw error if token is empty", async () => {
      const service = new BoastService(
        "https://boast.example.com",
        "",
        mockSdk as any,
      );

      await expect(service.registerAndGetPayload()).rejects.toThrow(
        "BOAST provider requires a non-empty token (Secret).",
      );
    });

    it("should handle registration errors", async () => {
      mockResponse.getCode.mockReturnValue(500);
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const service = new BoastService(
        "https://boast.example.com",
        "test-secret",
        mockSdk as any,
      );
      const result = await service.registerAndGetPayload();

      expect(result).toBeNull();
      expect(mockSdk.console.error).toHaveBeenCalled();
    });

    it("should handle missing id or canary in response", async () => {
      const mockData = {
        // Missing id and canary
      };

      mockResponse.getBody.mockReturnValue({
        toJson: () => mockData,
      });
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const service = new BoastService(
        "https://boast.example.com",
        "test-secret",
        mockSdk as any,
      );
      const result = await service.registerAndGetPayload();

      expect(result).toBeNull();
      expect(mockSdk.console.error).toHaveBeenCalled();
    });
  });

  describe("getId and getDomain", () => {
    it("should return null before registration", () => {
      const service = new BoastService(
        "https://boast.example.com",
        "test-secret",
        mockSdk as any,
      );

      expect(service.getId()).toBeNull();
      expect(service.getDomain()).toBeNull();
    });
  });
});
