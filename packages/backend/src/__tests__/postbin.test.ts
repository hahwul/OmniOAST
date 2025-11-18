import { beforeEach, describe, expect, it, vi } from "vitest";
import { PostbinService } from "../services/postbin";

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

describe("PostbinService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResponse.getCode.mockReturnValue(200);
    mockResponse.getBody.mockReturnValue(null);
  });

  describe("constructor", () => {
    it("should extract bin ID from existing URL", () => {
      const existingUrl = "https://www.postb.in/test-bin-123";
      const service = new PostbinService(undefined, mockSdk as any, existingUrl);

      expect(service.getId()).toBe("test-bin-123");
      expect(service.getDomain()).toBe("https://www.postb.in/test-bin-123");
    });

    it("should handle invalid URL format", () => {
      const existingUrl = "https://invalid.com/something";
      const service = new PostbinService(undefined, mockSdk as any, existingUrl);

      expect(service.getId()).toBeNull();
      expect(service.getDomain()).toBeNull();
    });

    it("should handle no existing URL", () => {
      const service = new PostbinService(undefined, mockSdk as any);

      expect(service.getId()).toBeNull();
      expect(service.getDomain()).toBeNull();
    });
  });

  describe("getEvents", () => {
    it("should fetch PostBin events successfully", async () => {
      const mockRequest = {
        reqId: "req-1",
        method: "POST",
        ip: "1.2.3.4",
        inserted: 1704067200000,
        path: "/test",
        headers: { "Content-Type": "application/json" },
        query: {},
        body: "test body",
      };

      // Reset mocks for this test
      vi.clearAllMocks();
      
      // Create separate mock instances for each call
      let callNumber = 0;
      mockSdk.requests.send.mockImplementation(async () => {
        callNumber++;
        if (callNumber === 1) {
          // First call returns 200 with data
          return {
            response: {
              getCode: () => 200,
              getBody: () => ({
                toJson: () => mockRequest,
              }),
            },
          };
        } else {
          // Second call returns 404
          return {
            response: {
              getCode: () => 404,
              getBody: () => null,
            },
          };
        }
      });

      const existingUrl = "https://www.postb.in/test-bin";
      const service = new PostbinService(undefined, mockSdk as any, existingUrl);
      const events = await service.getEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        id: "req-1",
        type: "postbin",
        protocol: "HTTP",
        method: "POST",
        source: "1.2.3.4",
        correlationId: "req-1",
      });
    });

    it("should return empty array if no bin ID", async () => {
      const service = new PostbinService(undefined, mockSdk as any);
      const events = await service.getEvents();

      expect(events).toHaveLength(0);
      expect(mockSdk.requests.send).not.toHaveBeenCalled();
    });

    it("should handle 404 (no requests) immediately", async () => {
      mockResponse.getCode.mockReturnValue(404);
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const existingUrl = "https://www.postb.in/test-bin";
      const service = new PostbinService(undefined, mockSdk as any, existingUrl);
      const events = await service.getEvents();

      expect(events).toHaveLength(0);
      expect(mockSdk.requests.send).toHaveBeenCalledTimes(1);
    });

    it("should handle HTTP errors (non-404)", async () => {
      mockResponse.getCode.mockReturnValue(500);
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const existingUrl = "https://www.postb.in/test-bin";
      const service = new PostbinService(undefined, mockSdk as any, existingUrl);
      const events = await service.getEvents();

      expect(events).toHaveLength(0);
      expect(mockSdk.console.error).toHaveBeenCalled();
    });

    it("should handle empty body", async () => {
      vi.clearAllMocks();
      
      // First call returns 200 but with null body (should break loop)
      mockSdk.requests.send.mockResolvedValue({
        response: {
          getCode: () => 200,
          getBody: () => null,
        },
      });

      const existingUrl = "https://www.postb.in/test-bin";
      const service = new PostbinService(undefined, mockSdk as any, existingUrl);
      const events = await service.getEvents();

      expect(events).toHaveLength(0);
    });

    it("should skip duplicate request IDs", async () => {
      const mockRequest = {
        reqId: "req-duplicate",
        method: "POST",
        ip: "1.2.3.4",
        inserted: 1704067200000,
      };

      vi.clearAllMocks();
      
      // Return same request twice, then 404
      let callNumber = 0;
      mockSdk.requests.send.mockImplementation(async () => {
        callNumber++;
        if (callNumber <= 2) {
          return {
            response: {
              getCode: () => 200,
              getBody: () => ({
                toJson: () => mockRequest,
              }),
            },
          };
        } else {
          return {
            response: {
              getCode: () => 404,
              getBody: () => null,
            },
          };
        }
      });

      const existingUrl = "https://www.postb.in/test-bin";
      const service = new PostbinService(undefined, mockSdk as any, existingUrl);
      const events = await service.getEvents();

      // Should only have 1 event even though we got it twice
      expect(events).toHaveLength(1);
      expect(events[0]?.id).toBe("req-duplicate");
    });

    it("should handle multiple requests in sequence", async () => {
      const mockRequest1 = {
        reqId: "req-1",
        method: "POST",
        ip: "1.2.3.4",
        inserted: 1704067200000,
      };
      const mockRequest2 = {
        reqId: "req-2",
        method: "GET",
        ip: "5.6.7.8",
        inserted: 1704067300000,
      };

      vi.clearAllMocks();
      
      // Two successful requests, then 404
      let callNumber = 0;
      mockSdk.requests.send.mockImplementation(async () => {
        callNumber++;
        if (callNumber === 1) {
          return {
            response: {
              getCode: () => 200,
              getBody: () => ({
                toJson: () => mockRequest1,
              }),
            },
          };
        } else if (callNumber === 2) {
          return {
            response: {
              getCode: () => 200,
              getBody: () => ({
                toJson: () => mockRequest2,
              }),
            },
          };
        } else {
          return {
            response: {
              getCode: () => 404,
              getBody: () => null,
            },
          };
        }
      });

      const existingUrl = "https://www.postb.in/test-bin";
      const service = new PostbinService(undefined, mockSdk as any, existingUrl);
      const events = await service.getEvents();

      expect(events).toHaveLength(2);
      expect(events[0]?.id).toBe("req-1");
      expect(events[1]?.id).toBe("req-2");
    });

    it("should handle network errors", async () => {
      mockSdk.requests.send.mockRejectedValue(new Error("Network error"));

      const existingUrl = "https://www.postb.in/test-bin";
      const service = new PostbinService(undefined, mockSdk as any, existingUrl);
      const events = await service.getEvents();

      expect(events).toHaveLength(0);
      expect(mockSdk.console.error).toHaveBeenCalled();
    });

    it("should stop at safety limit of 100 requests", async () => {
      vi.clearAllMocks();
      
      let callCount = 0;
      
      // Always return 200 with new IDs (infinite requests)
      mockSdk.requests.send.mockImplementation(async () => {
        return {
          response: {
            getCode: () => 200,
            getBody: () => ({
              toJson: () => ({
                reqId: `req-${callCount++}`, // Always new ID
                method: "GET",
              }),
            }),
          },
        };
      });

      const existingUrl = "https://www.postb.in/test-bin";
      const service = new PostbinService(undefined, mockSdk as any, existingUrl);
      const events = await service.getEvents();

      // Should stop at 100 even though more are available
      expect(events).toHaveLength(100);
    });
  });

  describe("registerAndGetPayload", () => {
    it("should return existing payload if already set", async () => {
      const existingUrl = "https://www.postb.in/existing-bin";
      const service = new PostbinService(undefined, mockSdk as any, existingUrl);
      const result = await service.registerAndGetPayload();

      expect(result).toEqual({
        id: "existing-bin",
        payloadUrl: "https://www.postb.in/existing-bin",
      });
      expect(mockSdk.requests.send).not.toHaveBeenCalled();
    });

    it("should register new bin successfully", async () => {
      const mockData = {
        binId: "new-bin-1234",
        expires: new Date(Date.now() + 1800000).toISOString(), // 30 minutes
      };

      mockResponse.getBody.mockReturnValue({
        toJson: () => mockData,
      });
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const service = new PostbinService(undefined, mockSdk as any);
      const result = await service.registerAndGetPayload();

      expect(result).toEqual({
        id: "new-bin-1234",
        payloadUrl: "https://www.postb.in/new-bin-1234",
      });
      expect(service.getId()).toBe("new-bin-1234");
    });

    it("should handle registration HTTP errors", async () => {
      mockResponse.getCode.mockReturnValue(500);
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const service = new PostbinService(undefined, mockSdk as any);
      const result = await service.registerAndGetPayload();

      expect(result).toBeNull();
      expect(mockSdk.console.error).toHaveBeenCalled();
    });

    it("should handle empty body during registration", async () => {
      mockResponse.getBody.mockReturnValue(null);
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const service = new PostbinService(undefined, mockSdk as any);
      const result = await service.registerAndGetPayload();

      expect(result).toBeNull();
      expect(mockSdk.console.error).toHaveBeenCalled();
    });

    it("should handle missing binId in response", async () => {
      const mockData = {
        // Missing binId
        expires: new Date().toISOString(),
      };

      mockResponse.getBody.mockReturnValue({
        toJson: () => mockData,
      });
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const service = new PostbinService(undefined, mockSdk as any);
      const result = await service.registerAndGetPayload();

      expect(result).toBeNull();
      expect(mockSdk.console.error).toHaveBeenCalled();
    });

    it("should handle network errors during registration", async () => {
      mockSdk.requests.send.mockRejectedValue(new Error("Network error"));

      const service = new PostbinService(undefined, mockSdk as any);
      const result = await service.registerAndGetPayload();

      expect(result).toBeNull();
      expect(mockSdk.console.error).toHaveBeenCalled();
    });
  });
});
