import { beforeEach, describe, expect, it, vi } from "vitest";

import { CustomHttpService } from "../services/customhttp";

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

vi.mock("caido:utils", () => ({
  RequestSpec: vi.fn().mockImplementation((url: string) => ({
    url,
    setHeader: vi.fn(),
    setMethod: vi.fn(),
    setBody: vi.fn(),
  })),
}));

describe("CustomHttpService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResponse.getCode.mockReturnValue(200);
    mockResponse.getBody.mockReturnValue(null);
  });

  describe("constructor / identifiers", () => {
    it("should expose the poll URL via getId and getDomain", () => {
      const url = "https://example.com/oast";
      const service = new CustomHttpService(undefined, mockSdk as any, url);

      expect(service.getId()).toBe(url);
      expect(service.getDomain()).toBe(url);
    });

    it("should expose empty poll URL transparently", () => {
      const service = new CustomHttpService(undefined, mockSdk as any, "");

      expect(service.getId()).toBe("");
      expect(service.getDomain()).toBe("");
    });
  });

  describe("getEvents", () => {
    it("should return empty array when poll URL is empty", async () => {
      const service = new CustomHttpService(undefined, mockSdk as any, "");
      const events = await service.getEvents();

      expect(events).toHaveLength(0);
      expect(mockSdk.requests.send).not.toHaveBeenCalled();
    });

    it("should parse a plain array body", async () => {
      const items = [
        {
          id: "id-1",
          method: "POST",
          ip: "1.2.3.4",
          timestamp: 1704067200000,
          rawRequest: "RAW",
          rawResponse: "RES",
        },
      ];

      mockResponse.getBody.mockReturnValue({
        toJson: () => items,
      });
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const service = new CustomHttpService(
        undefined,
        mockSdk as any,
        "https://example.com/oast",
      );
      const events = await service.getEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        id: "id-1",
        type: "customhttp",
        protocol: "HTTP",
        method: "POST",
        source: "1.2.3.4",
        correlationId: "id-1",
        timestamp: 1704067200000,
        rawRequest: "RAW",
        rawResponse: "RES",
        destination: "https://example.com/oast",
      });
    });

    it("should parse body with `data` wrapper", async () => {
      mockResponse.getBody.mockReturnValue({
        toJson: () => ({
          data: [{ id: "wrap-1", method: "GET" }],
        }),
      });
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const service = new CustomHttpService(
        undefined,
        mockSdk as any,
        "https://example.com/oast",
      );
      const events = await service.getEvents();

      expect(events).toHaveLength(1);
      expect(events[0]?.id).toBe("wrap-1");
    });

    it("should parse body with `requests` wrapper", async () => {
      mockResponse.getBody.mockReturnValue({
        toJson: () => ({
          requests: [{ uuid: "u-1", method: "PUT" }],
        }),
      });
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const service = new CustomHttpService(
        undefined,
        mockSdk as any,
        "https://example.com/oast",
      );
      const events = await service.getEvents();

      expect(events).toHaveLength(1);
      expect(events[0]?.id).toBe("u-1");
      expect((events[0] as any)?.method).toBe("PUT");
    });

    it("should parse body with `events` wrapper", async () => {
      mockResponse.getBody.mockReturnValue({
        toJson: () => ({
          events: [{ reqId: "r-1" }],
        }),
      });
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const service = new CustomHttpService(
        undefined,
        mockSdk as any,
        "https://example.com/oast",
      );
      const events = await service.getEvents();

      expect(events).toHaveLength(1);
      expect(events[0]?.id).toBe("r-1");
    });

    it("should fall back to empty array for unknown body shapes", async () => {
      mockResponse.getBody.mockReturnValue({
        toJson: () => ({ unexpected: "shape" }),
      });
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const service = new CustomHttpService(
        undefined,
        mockSdk as any,
        "https://example.com/oast",
      );
      const events = await service.getEvents();

      expect(events).toHaveLength(0);
    });

    it("should return empty array when body is null", async () => {
      mockResponse.getBody.mockReturnValue(null);
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const service = new CustomHttpService(
        undefined,
        mockSdk as any,
        "https://example.com/oast",
      );
      const events = await service.getEvents();

      expect(events).toHaveLength(0);
    });

    it("should treat HTTP >= 300 as error and log", async () => {
      mockResponse.getCode.mockReturnValue(500);
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const service = new CustomHttpService(
        undefined,
        mockSdk as any,
        "https://example.com/oast",
      );
      const events = await service.getEvents();

      expect(events).toHaveLength(0);
      expect(mockSdk.console.error).toHaveBeenCalled();
    });

    it("should handle network errors", async () => {
      mockSdk.requests.send.mockRejectedValue(new Error("Network error"));

      const service = new CustomHttpService(
        undefined,
        mockSdk as any,
        "https://example.com/oast",
      );
      const events = await service.getEvents();

      expect(events).toHaveLength(0);
      expect(mockSdk.console.error).toHaveBeenCalled();
    });

    it("should set Authorization header when API key is provided", async () => {
      const setHeader = vi.fn();
      const utils = await import("caido:utils");
      (utils.RequestSpec as any).mockImplementationOnce((url: string) => ({
        url,
        setHeader,
        setMethod: vi.fn(),
        setBody: vi.fn(),
      }));

      mockResponse.getBody.mockReturnValue({ toJson: () => [] });
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const service = new CustomHttpService(
        "secret-key",
        mockSdk as any,
        "https://example.com/oast",
      );
      await service.getEvents();

      expect(setHeader).toHaveBeenCalledWith(
        "Authorization",
        "Bearer secret-key",
      );
    });

    it("should not set Authorization header when API key is missing", async () => {
      const setHeader = vi.fn();
      const utils = await import("caido:utils");
      (utils.RequestSpec as any).mockImplementationOnce((url: string) => ({
        url,
        setHeader,
        setMethod: vi.fn(),
        setBody: vi.fn(),
      }));

      mockResponse.getBody.mockReturnValue({ toJson: () => [] });
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const service = new CustomHttpService(
        undefined,
        mockSdk as any,
        "https://example.com/oast",
      );
      await service.getEvents();

      expect(setHeader).not.toHaveBeenCalled();
    });

    it("should deduplicate events by id across calls", async () => {
      const items = [{ id: "dup", method: "POST" }];
      mockResponse.getBody.mockReturnValue({ toJson: () => items });
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const service = new CustomHttpService(
        undefined,
        mockSdk as any,
        "https://example.com/oast",
      );

      const first = await service.getEvents();
      const second = await service.getEvents();

      expect(first).toHaveLength(1);
      expect(second).toHaveLength(0);
    });

    it("should resolve id from uuid/reqId/_id alternatives", async () => {
      mockResponse.getBody.mockReturnValue({
        toJson: () => [
          { uuid: "from-uuid" },
          { reqId: "from-reqid" },
          { _id: "from-_id" },
        ],
      });
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const service = new CustomHttpService(
        undefined,
        mockSdk as any,
        "https://example.com/oast",
      );
      const events = await service.getEvents();

      expect(events.map((e) => e.id)).toEqual([
        "from-uuid",
        "from-reqid",
        "from-_id",
      ]);
    });

    it("should generate a uuid when no id field is present", async () => {
      mockResponse.getBody.mockReturnValue({
        toJson: () => [{ method: "GET" }],
      });
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const service = new CustomHttpService(
        undefined,
        mockSdk as any,
        "https://example.com/oast",
      );
      const events = await service.getEvents();

      expect(events).toHaveLength(1);
      expect(typeof events[0]?.id).toBe("string");
      expect(events[0]?.id.length).toBeGreaterThan(0);
    });

    it("should derive timestamp from `created_at` when `timestamp` is missing", async () => {
      const created = "2024-06-01T00:00:00Z";
      mockResponse.getBody.mockReturnValue({
        toJson: () => [{ id: "t-1", created_at: created }],
      });
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const service = new CustomHttpService(
        undefined,
        mockSdk as any,
        "https://example.com/oast",
      );
      const events = await service.getEvents();

      expect(events[0]?.timestamp).toBe(new Date(created).getTime());
    });

    it("should default timestamp to Date.now() when neither field is present", async () => {
      const before = Date.now();
      mockResponse.getBody.mockReturnValue({
        toJson: () => [{ id: "t-2" }],
      });
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const service = new CustomHttpService(
        undefined,
        mockSdk as any,
        "https://example.com/oast",
      );
      const events = await service.getEvents();
      const after = Date.now();

      expect(events[0]?.timestamp).toBeGreaterThanOrEqual(before);
      expect(events[0]?.timestamp).toBeLessThanOrEqual(after);
    });

    it("should resolve source from ip/source/remote_address alternatives", async () => {
      mockResponse.getBody.mockReturnValue({
        toJson: () => [
          { id: "s-1", ip: "1.1.1.1" },
          { id: "s-2", source: "src.example" },
          { id: "s-3", remote_address: "9.9.9.9" },
          { id: "s-4" },
        ],
      });
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const service = new CustomHttpService(
        undefined,
        mockSdk as any,
        "https://example.com/oast",
      );
      const events = await service.getEvents();

      expect(events.map((e) => (e as any).source)).toEqual([
        "1.1.1.1",
        "src.example",
        "9.9.9.9",
        "",
      ]);
    });

    it("should fall back rawRequest to JSON-stringified item when none provided", async () => {
      const item = { id: "raw-1", method: "POST" };
      mockResponse.getBody.mockReturnValue({
        toJson: () => [item],
      });
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const service = new CustomHttpService(
        undefined,
        mockSdk as any,
        "https://example.com/oast",
      );
      const events = await service.getEvents();

      expect((events[0] as any).rawRequest).toBe(JSON.stringify(item, null, 2));
    });

    it("should prefer `body` for rawRequest when rawRequest/raw_request are missing", async () => {
      mockResponse.getBody.mockReturnValue({
        toJson: () => [{ id: "raw-2", body: "BODY-CONTENT" }],
      });
      mockSdk.requests.send.mockResolvedValue(mockRequestResponse);

      const service = new CustomHttpService(
        undefined,
        mockSdk as any,
        "https://example.com/oast",
      );
      const events = await service.getEvents();

      expect((events[0] as any).rawRequest).toBe("BODY-CONTENT");
    });
  });
});
