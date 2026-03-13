import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useClientService } from "../services/interactsh";

// Mock axios
vi.mock("axios");
const mockedAxios = vi.mocked(axios, true);

// Mock try-catch utility
vi.mock("@/utils/try-catch", () => ({
  tryCatch: async <T>(promise: Promise<T>) => {
    try {
      const data = await promise;
      return { data, error: undefined };
    } catch (error) {
      return { data: undefined, error };
    }
  },
}));

// Mock crypto service
const mockDecryptMessage = vi.fn();
const mockEncodePublicKey = vi.fn().mockResolvedValue("mock-encoded-public-key");
const mockSetKeyPairFromPEM = vi.fn().mockResolvedValue(undefined);
const mockExportPrivateKeyPEM = vi
  .fn()
  .mockResolvedValue("mock-private-key-pem");
const mockExportPublicKeyPEM = vi
  .fn()
  .mockResolvedValue("mock-public-key-pem");

vi.mock("@/services/crypto", () => ({
  useCryptoService: vi.fn(() => ({
    generateRSAKeyPair: vi.fn().mockResolvedValue({
      publicKey: "mock-public-key",
      privateKey: "mock-private-key",
    }),
    encryptMessage: vi.fn().mockResolvedValue("encrypted-message"),
    decryptMessage: mockDecryptMessage,
    encodePublicKey: mockEncodePublicKey,
    setKeyPairFromPEM: mockSetKeyPairFromPEM,
    exportPrivateKeyPEM: mockExportPrivateKeyPEM,
    exportPublicKeyPEM: mockExportPublicKeyPEM,
  })),
}));

// Mock utils
vi.mock("@/utils/utils", () => ({
  generateRandomString: vi.fn().mockReturnValue("random-correlation-id"),
}));

function createMockAxiosInstance() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    head: vi.fn(),
    options: vi.fn(),
    request: vi.fn(),
    getUri: vi.fn(),
    defaults: {},
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn(), clear: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn(), clear: vi.fn() },
    },
  };
}

describe("Interactsh Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAxios.create = vi.fn().mockReturnValue(createMockAxiosInstance());
    mockDecryptMessage.mockResolvedValue(
      JSON.stringify({
        protocol: "dns",
        "full-id": "test-full-id",
        "remote-address": "1.2.3.4",
        "raw-request": "GET / HTTP/1.1",
        "raw-response": "HTTP/1.1 200 OK",
        timestamp: "2023-01-01T00:00:00Z",
      }),
    );
  });

  it("should create client service", () => {
    const client = useClientService();
    expect(client).toBeDefined();
    expect(client.start).toBeDefined();
    expect(client.stop).toBeDefined();
    expect(client.poll).toBeDefined();
    expect(client.generateUrl).toBeDefined();
    expect(client.getSessionInfo).toBeDefined();
  });

  it("generateUrl should return empty values when not started", () => {
    const client = useClientService();
    const { url, uniqueId } = client.generateUrl();
    expect(url).toBe("");
    expect(uniqueId).toBe("");
  });

  describe("start and registration", () => {
    it("should register with server on fresh start", async () => {
      const mockInstance = createMockAxiosInstance();
      mockInstance.post.mockResolvedValue({ status: 200 });
      mockedAxios.create = vi.fn().mockReturnValue(mockInstance);

      const client = useClientService();
      await client.start({
        serverURL: "https://interact.sh",
        token: "test-token",
      });

      expect(mockInstance.post).toHaveBeenCalledWith(
        expect.stringContaining("/register"),
        expect.objectContaining({
          "public-key": "mock-encoded-public-key",
          "secret-key": expect.any(String),
          "correlation-id": expect.any(String),
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "test-token",
          }),
        }),
      );
    });

    it("should skip registration when sessionInfo is provided", async () => {
      const mockInstance = createMockAxiosInstance();
      mockedAxios.create = vi.fn().mockReturnValue(mockInstance);

      const client = useClientService();
      await client.start({
        serverURL: "https://interact.sh",
        token: "test-token",
        sessionInfo: {
          serverURL: "https://interact.sh",
          token: "test-token",
          privateKey: "valid-pem-key",
          correlationID: "existing-corr-id",
          secretKey: "existing-secret",
        },
      });

      // Should NOT call register
      expect(mockInstance.post).not.toHaveBeenCalled();
      // Should import keypair
      expect(mockSetKeyPairFromPEM).toHaveBeenCalledWith(
        "valid-pem-key",
        undefined,
      );
    });

    it("should handle 'correlation-id already exists' as success", async () => {
      const mockInstance = createMockAxiosInstance();
      mockInstance.post.mockRejectedValue({
        response: {
          status: 400,
          data: "correlation-id already exists on server",
        },
      });
      mockedAxios.create = vi.fn().mockReturnValue(mockInstance);

      const client = useClientService();
      // Should NOT throw
      await expect(
        client.start({
          serverURL: "https://interact.sh",
          token: "",
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe("session resume with key handling", () => {
    it("should generate new keys when privateKey is empty string", async () => {
      const mockInstance = createMockAxiosInstance();
      mockedAxios.create = vi.fn().mockReturnValue(mockInstance);

      const client = useClientService();
      await client.start({
        serverURL: "https://interact.sh",
        token: "test-token",
        sessionInfo: {
          serverURL: "https://interact.sh",
          token: "test-token",
          privateKey: "", // empty string - falsy
          correlationID: "existing-corr-id",
          secretKey: "existing-secret",
        },
      });

      // privateKey is falsy, so setKeyPairFromPEM should NOT be called
      expect(mockSetKeyPairFromPEM).not.toHaveBeenCalled();
      // encodePublicKey should be called as fallback to generate fresh keys
      expect(mockEncodePublicKey).toHaveBeenCalled();
    });

    it("should generate new keys when setKeyPairFromPEM fails", async () => {
      const mockInstance = createMockAxiosInstance();
      mockedAxios.create = vi.fn().mockReturnValue(mockInstance);
      mockSetKeyPairFromPEM.mockRejectedValueOnce(
        new Error("Invalid PEM format"),
      );

      const client = useClientService();
      await client.start({
        serverURL: "https://interact.sh",
        token: "test-token",
        sessionInfo: {
          serverURL: "https://interact.sh",
          token: "test-token",
          privateKey: "corrupted-pem-data",
          correlationID: "existing-corr-id",
          secretKey: "existing-secret",
        },
      });

      // Should try to import the corrupted key
      expect(mockSetKeyPairFromPEM).toHaveBeenCalledWith(
        "corrupted-pem-data",
        undefined,
      );
      // Should fallback to generating new keys
      expect(mockEncodePublicKey).toHaveBeenCalled();
    });
  });

  describe("polling loop resilience", () => {
    it("should continue polling after transient network error", async () => {
      const mockInstance = createMockAxiosInstance();
      // First call: registration succeeds
      mockInstance.post.mockResolvedValue({ status: 200 });
      // Poll calls: first fails, second succeeds
      mockInstance.get
        .mockRejectedValueOnce(new Error("Network timeout"))
        .mockResolvedValueOnce({
          status: 200,
          data: { data: [], aes_key: "" },
        });
      mockedAxios.create = vi.fn().mockReturnValue(mockInstance);

      const callback = vi.fn();
      const client = useClientService();

      await client.start(
        {
          serverURL: "https://interact.sh",
          token: "",
          keepAliveInterval: 100, // fast interval for testing
        },
        callback,
      );

      // Wait for first poll (immediate) + error + interval + second poll
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Should have attempted polling at least twice (error + retry)
      expect(mockInstance.get.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it("should continue polling after decryption error", async () => {
      const mockInstance = createMockAxiosInstance();
      mockInstance.post.mockResolvedValue({ status: 200 });
      // First poll: returns data that will fail decryption
      mockInstance.get
        .mockResolvedValueOnce({
          status: 200,
          data: {
            data: ["encrypted-but-will-fail-decrypt"],
            aes_key: "bad-key",
          },
        })
        .mockResolvedValueOnce({
          status: 200,
          data: { data: [], aes_key: "" },
        });
      mockedAxios.create = vi.fn().mockReturnValue(mockInstance);

      // Make decryption fail on first call
      mockDecryptMessage
        .mockRejectedValueOnce(new Error("Decryption failed"))
        .mockResolvedValue(JSON.stringify({ protocol: "dns" }));

      const callback = vi.fn();
      const client = useClientService();

      await client.start(
        {
          serverURL: "https://interact.sh",
          token: "",
          keepAliveInterval: 100,
        },
        callback,
      );

      await new Promise((resolve) => setTimeout(resolve, 300));

      // Decryption error should not kill the loop
      expect(mockInstance.get.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it("should stop polling when stopPolling is called", async () => {
      const mockInstance = createMockAxiosInstance();
      mockInstance.post.mockResolvedValue({ status: 200 });
      mockInstance.get.mockResolvedValue({
        status: 200,
        data: { data: [], aes_key: "" },
      });
      mockedAxios.create = vi.fn().mockReturnValue(mockInstance);

      const client = useClientService();
      await client.start(
        {
          serverURL: "https://interact.sh",
          token: "",
          keepAliveInterval: 100,
        },
        vi.fn(),
      );

      // Let a few polls happen
      await new Promise((resolve) => setTimeout(resolve, 250));
      const callCount = mockInstance.get.mock.calls.length;
      expect(callCount).toBeGreaterThanOrEqual(2);

      // Stop polling
      client.stopPolling();

      // Wait more time
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Should not have made significantly more calls
      expect(mockInstance.get.mock.calls.length).toBeLessThanOrEqual(
        callCount + 1,
      );
    });
  });

  describe("getInteractions callback", () => {
    it("should call callback for each decrypted interaction", async () => {
      const mockInstance = createMockAxiosInstance();
      mockInstance.post.mockResolvedValue({ status: 200 });
      mockInstance.get.mockResolvedValue({
        status: 200,
        data: {
          data: ["encrypted-1", "encrypted-2"],
          aes_key: "test-aes-key",
        },
      });
      mockedAxios.create = vi.fn().mockReturnValue(mockInstance);

      mockDecryptMessage.mockResolvedValue(
        JSON.stringify({
          protocol: "dns",
          "full-id": "test-id",
          "remote-address": "1.2.3.4",
        }),
      );

      const callback = vi.fn();
      const client = useClientService();

      await client.start(
        {
          serverURL: "https://interact.sh",
          token: "",
          keepAliveInterval: 5000, // long interval, we'll use poll() manually
        },
        callback,
      );

      // Wait for the first automatic poll
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should have called callback twice (2 encrypted items)
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          protocol: "dns",
          "full-id": "test-id",
        }),
      );
    });

    it("should handle empty poll response gracefully", async () => {
      const mockInstance = createMockAxiosInstance();
      mockInstance.post.mockResolvedValue({ status: 200 });
      mockInstance.get.mockResolvedValue({
        status: 200,
        data: { data: null, aes_key: "" },
      });
      mockedAxios.create = vi.fn().mockReturnValue(mockInstance);

      const callback = vi.fn();
      const client = useClientService();

      await client.start(
        {
          serverURL: "https://interact.sh",
          token: "",
          keepAliveInterval: 5000,
        },
        callback,
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      // No interactions, callback should not be called
      expect(callback).not.toHaveBeenCalled();
    });

    it("should skip individual items that fail to parse as JSON", async () => {
      const mockInstance = createMockAxiosInstance();
      mockInstance.post.mockResolvedValue({ status: 200 });
      mockInstance.get.mockResolvedValue({
        status: 200,
        data: {
          data: ["valid-encrypted", "invalid-encrypted"],
          aes_key: "test-aes-key",
        },
      });
      mockedAxios.create = vi.fn().mockReturnValue(mockInstance);

      // First decrypt returns valid JSON, second returns invalid
      mockDecryptMessage
        .mockResolvedValueOnce(JSON.stringify({ protocol: "dns" }))
        .mockResolvedValueOnce("not-valid-json{{{");

      const callback = vi.fn();
      const client = useClientService();

      await client.start(
        {
          serverURL: "https://interact.sh",
          token: "",
          keepAliveInterval: 5000,
        },
        callback,
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Only the first valid item should trigger callback
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("generateUrl", () => {
    it("should return valid URL and uniqueId after start", async () => {
      const mockInstance = createMockAxiosInstance();
      mockInstance.post.mockResolvedValue({ status: 200 });
      mockedAxios.create = vi.fn().mockReturnValue(mockInstance);

      const client = useClientService();
      await client.start({
        serverURL: "https://interact.sh",
        token: "test-token",
      });

      const { url, uniqueId } = client.generateUrl();
      expect(url).toContain("interact.sh");
      expect(url).toContain(uniqueId);
      expect(uniqueId).toBeDefined();
      expect(uniqueId.length).toBeGreaterThan(0);
    });
  });

  describe("getSessionInfo", () => {
    it("should return session info after start", async () => {
      const mockInstance = createMockAxiosInstance();
      mockInstance.post.mockResolvedValue({ status: 200 });
      mockedAxios.create = vi.fn().mockReturnValue(mockInstance);

      const client = useClientService();
      await client.start({
        serverURL: "https://interact.sh",
        token: "test-token",
      });

      const sessionInfo = await client.getSessionInfo();
      expect(sessionInfo).toBeDefined();
      expect(sessionInfo?.serverURL).toContain("interact.sh");
      expect(sessionInfo?.correlationID).toBeDefined();
      expect(sessionInfo?.secretKey).toBeDefined();
      expect(sessionInfo?.privateKey).toBe("mock-private-key-pem");
    });
  });

  describe("stop and close", () => {
    it("should deregister from server on close", async () => {
      const mockInstance = createMockAxiosInstance();
      mockInstance.post.mockResolvedValue({ status: 200 });
      mockedAxios.create = vi.fn().mockReturnValue(mockInstance);

      const client = useClientService();
      await client.start({
        serverURL: "https://interact.sh",
        token: "test-token",
      });

      await client.close();

      // Should have called /register and then /deregister
      expect(mockInstance.post).toHaveBeenCalledTimes(2);
      expect(mockInstance.post).toHaveBeenLastCalledWith(
        expect.stringContaining("/deregister"),
        expect.objectContaining({
          correlationID: expect.any(String),
          secretKey: expect.any(String),
        }),
        expect.anything(),
      );
    });

    it("should stop polling and close via stop()", async () => {
      const mockInstance = createMockAxiosInstance();
      mockInstance.post.mockResolvedValue({ status: 200 });
      mockInstance.get.mockResolvedValue({
        status: 200,
        data: { data: [], aes_key: "" },
      });
      mockedAxios.create = vi.fn().mockReturnValue(mockInstance);

      const client = useClientService();
      await client.start(
        {
          serverURL: "https://interact.sh",
          token: "",
          keepAliveInterval: 100,
        },
        vi.fn(),
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      await client.stop();

      // Should have called /deregister
      const deregisterCalls = mockInstance.post.mock.calls.filter(
        (call: any[]) => String(call[0]).includes("/deregister"),
      );
      expect(deregisterCalls.length).toBe(1);
    });
  });

  describe("authentication", () => {
    it("should include Authorization header when token is provided", async () => {
      const mockInstance = createMockAxiosInstance();
      mockInstance.post.mockResolvedValue({ status: 200 });
      mockInstance.get.mockResolvedValue({
        status: 200,
        data: { data: [], aes_key: "" },
      });
      mockedAxios.create = vi.fn().mockReturnValue(mockInstance);

      const client = useClientService();
      await client.start(
        {
          serverURL: "https://interact.sh",
          token: "my-secret-token",
          keepAliveInterval: 5000,
        },
        vi.fn(),
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Check registration call has auth header
      expect(mockInstance.post).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "my-secret-token",
          }),
        }),
      );

      // Check poll call has auth header
      expect(mockInstance.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "my-secret-token",
          }),
        }),
      );

      client.stopPolling();
    });

    it("should NOT include Authorization header when token is empty", async () => {
      const mockInstance = createMockAxiosInstance();
      mockInstance.post.mockResolvedValue({ status: 200 });
      mockInstance.get.mockResolvedValue({
        status: 200,
        data: { data: [], aes_key: "" },
      });
      mockedAxios.create = vi.fn().mockReturnValue(mockInstance);

      const client = useClientService();
      await client.start(
        {
          serverURL: "https://interact.sh",
          token: "",
          keepAliveInterval: 5000,
        },
        vi.fn(),
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Check poll call does NOT have Authorization header
      const pollCall = mockInstance.get.mock.calls[0];
      const pollHeaders = pollCall?.[1]?.headers || {};
      expect(pollHeaders).not.toHaveProperty("Authorization");

      client.stopPolling();
    });
  });
});
