import { beforeEach, describe, expect, it, vi } from "vitest";

import { WebhooksiteService } from "../services/webhooksite";

// Mock Caido SDK
const mockResponse = {
  getCode: vi.fn(),
  getBody: vi.fn(),
};
const mockRequestResponse = {
  response: mockResponse,
};

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

describe("WebhooksiteService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResponse.getCode.mockReturnValue(200);
  });

  describe("constructor", () => {
    it("should extract token ID from existing URL", () => {
      const existingUrl =
        "https://webhook.site/12345678-1234-1234-1234-123456789abc";
      const service = new WebhooksiteService(
        undefined,
        mockSdk as any,
        existingUrl,
      );

      expect(service.getId()).toBe("12345678-1234-1234-1234-123456789abc");
      expect(service.getDomain()).toBe(
        "https://webhook.site/12345678-1234-1234-1234-123456789abc",
      );
    });

    it("should handle invalid URL format", () => {
      const existingUrl = "https://invalid.com/something";
      const service = new WebhooksiteService(
        undefined,
        mockSdk as any,
        existingUrl,
      );

      expect(service.getId()).toBeNull();
      expect(service.getDomain()).toBeNull();
    });

    it("should handle no existing URL", () => {
      const service = new WebhooksiteService(undefined, mockSdk as any);

      expect(service.getId()).toBeNull();
      expect(service.getDomain()).toBeNull();
    });
  });

  describe("getEvents", () => {
    it("should fetch and parse webhook.site events successfully", async () => {
      const mockData = {
        data: [
          {
            uuid: "event-1",
            created_at: "2024-01-01T00:00:00Z",
            method: "POST",
            ip: "1.2.3.4",
            content: "test content",
          },
          {
            uuid: "event-2",
            updated_at: "2024-01-02T00:00:00Z",
            method: "GET",
            ip: "5.6.7.8",
            content: "test content 2",
          },
        ],
      };

      mockResponse.getBody.mockReturnValue({
        toJson: () => mockData,
      });
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const existingUrl =
        "https://webhook.site/12345678-1234-1234-1234-123456789abc";
      const service = new WebhooksiteService(
        undefined,
        mockSdk as any,
        existingUrl,
      );
      const events = await service.getEvents();

      expect(events).toHaveLength(2);
      expect(events[0]).toMatchObject({
        id: "event-1",
        type: "webhooksite",
        protocol: "HTTP",
        method: "POST",
        source: "1.2.3.4",
        correlationId: "event-1",
        rawRequest: "test content",
      });
    });

    it("should return empty array if no token ID", async () => {
      const service = new WebhooksiteService(undefined, mockSdk as any);
      const events = await service.getEvents();

      expect(events).toHaveLength(0);
      expect(mockSdk.requests.send).not.toHaveBeenCalled();
    });

    it("should handle empty response data", async () => {
      const mockData = {
        data: [],
      };

      mockResponse.getBody.mockReturnValue({
        toJson: () => mockData,
      });
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const existingUrl =
        "https://webhook.site/12345678-1234-1234-1234-123456789abc";
      const service = new WebhooksiteService(
        undefined,
        mockSdk as any,
        existingUrl,
      );
      const events = await service.getEvents();

      expect(events).toHaveLength(0);
    });

    it("should handle HTTP errors", async () => {
      mockResponse.getCode.mockReturnValue(404);
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const existingUrl =
        "https://webhook.site/12345678-1234-1234-1234-123456789abc";
      const service = new WebhooksiteService(
        undefined,
        mockSdk as any,
        existingUrl,
      );

      try {
        await service.getEvents();
      } catch (e) {
        // Error expected
      }

      expect(mockSdk.console.error).toHaveBeenCalled();
    });

    it("should handle empty body", async () => {
      mockResponse.getBody.mockReturnValue(null);
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const existingUrl =
        "https://webhook.site/12345678-1234-1234-1234-123456789abc";
      const service = new WebhooksiteService(
        undefined,
        mockSdk as any,
        existingUrl,
      );
      const events = await service.getEvents();

      expect(events).toHaveLength(0);
    });

    it("should handle invalid data format", async () => {
      const mockData = {
        // Missing data field
        invalid: "format",
      };

      mockResponse.getBody.mockReturnValue({
        toJson: () => mockData,
      });
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const existingUrl =
        "https://webhook.site/12345678-1234-1234-1234-123456789abc";
      const service = new WebhooksiteService(
        undefined,
        mockSdk as any,
        existingUrl,
      );
      const events = await service.getEvents();

      expect(events).toHaveLength(0);
    });

    it("should use API key if provided", async () => {
      const mockData = { data: [] };
      mockResponse.getBody.mockReturnValue({
        toJson: () => mockData,
      });
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const existingUrl =
        "https://webhook.site/12345678-1234-1234-1234-123456789abc";
      const service = new WebhooksiteService(
        "my-api-key",
        mockSdk as any,
        existingUrl,
      );
      await service.getEvents();

      // Verify that send was called
      expect(mockSdk.requests.send).toHaveBeenCalled();
    });
  });

  describe("registerAndGetPayload", () => {
    it("should return existing payload if already set", async () => {
      const existingUrl =
        "https://webhook.site/12345678-1234-1234-1234-123456789abc";
      const service = new WebhooksiteService(
        undefined,
        mockSdk as any,
        existingUrl,
      );
      const result = await service.registerAndGetPayload();

      expect(result).toEqual({
        id: "12345678-1234-1234-1234-123456789abc",
        payloadUrl: "https://webhook.site/12345678-1234-1234-1234-123456789abc",
      });
      expect(mockSdk.requests.send).not.toHaveBeenCalled();
    });

    it("should register new webhook successfully", async () => {
      const mockData = {
        uuid: "new-uuid-1234",
      };

      mockResponse.getBody.mockReturnValue({
        toJson: () => mockData,
      });
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const service = new WebhooksiteService(undefined, mockSdk as any);
      const result = await service.registerAndGetPayload();

      expect(result).toEqual({
        id: "new-uuid-1234",
        payloadUrl: "https://webhook.site/new-uuid-1234",
      });
      expect(service.getId()).toBe("new-uuid-1234");
    });

    it("should use API key during registration", async () => {
      const mockData = {
        uuid: "new-uuid-with-key",
      };

      mockResponse.getBody.mockReturnValue({
        toJson: () => mockData,
      });
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const service = new WebhooksiteService("my-api-key", mockSdk as any);
      await service.registerAndGetPayload();

      expect(mockSdk.requests.send).toHaveBeenCalled();
    });

    it("should handle registration HTTP errors", async () => {
      mockResponse.getCode.mockReturnValue(500);
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const service = new WebhooksiteService(undefined, mockSdk as any);
      const result = await service.registerAndGetPayload();

      expect(result).toBeNull();
      expect(mockSdk.console.error).toHaveBeenCalled();
    });

    it("should handle empty body during registration", async () => {
      mockResponse.getBody.mockReturnValue(null);
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const service = new WebhooksiteService(undefined, mockSdk as any);
      const result = await service.registerAndGetPayload();

      expect(result).toBeNull();
      expect(mockSdk.console.error).toHaveBeenCalled();
    });

    it("should handle missing uuid in response", async () => {
      const mockData = {
        // Missing uuid
        otherField: "value",
      };

      mockResponse.getBody.mockReturnValue({
        toJson: () => mockData,
      });
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const service = new WebhooksiteService(undefined, mockSdk as any);
      const result = await service.registerAndGetPayload();

      expect(result).toBeNull();
      expect(mockSdk.console.error).toHaveBeenCalled();
    });

    it("should handle network errors during registration", async () => {
      mockSdk.requests.send.mockRejectedValue(new Error("Network error"));

      const service = new WebhooksiteService(undefined, mockSdk as any);
      const result = await service.registerAndGetPayload();

      expect(result).toBeNull();
      expect(mockSdk.console.error).toHaveBeenCalled();
    });
  });
});
