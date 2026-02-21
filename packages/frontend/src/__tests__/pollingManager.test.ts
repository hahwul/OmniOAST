import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePollingManager } from "../services/pollingManager";

// Mock dependencies
const mockGetOASTEvents = vi.fn();
const mockListProviders = vi.fn();
const mockShowToast = vi.fn();

vi.mock("@/plugins/sdk", () => ({
  useSDK: () => ({
    backend: {
      getOASTEvents: mockGetOASTEvents,
      listProviders: mockListProviders,
    },
    window: {
      showToast: mockShowToast,
    },
  }),
}));

const mockAddInteraction = vi.fn();
const mockUpdatePollingLastPolled = vi.fn();
const mockSetPollingRunning = vi.fn();
const mockRegisterPollingStop = vi.fn();
const mockUpdatePolling = vi.fn();

const mockOastStore = {
  pollingList: [] as any[],
  interactions: [] as any[],
  pollingStatus: {} as Record<string, string>,
  addInteraction: mockAddInteraction,
  updatePollingLastPolled: mockUpdatePollingLastPolled,
  setPollingRunning: mockSetPollingRunning,
  registerPollingStop: mockRegisterPollingStop,
  updatePolling: mockUpdatePolling,
};

vi.mock("@/stores/oastStore", () => ({
  useOastStore: () => mockOastStore,
}));

const mockStart = vi.fn();
const mockStop = vi.fn();
const mockGetSessionInfo = vi.fn();
const mockGenerateUrl = vi.fn();

vi.mock("@/services/interactsh", () => ({
  useClientService: () => ({
    start: mockStart,
    stop: mockStop,
    getSessionInfo: mockGetSessionInfo,
    generateUrl: mockGenerateUrl,
  }),
}));

vi.mock("@/utils/time", () => ({
  formatTimestamp: (ts: number | string) => `formatted-${ts}`,
  toNumericTimestamp: (ts: number | string) =>
    typeof ts === "number" ? ts : 1234567890,
}));

vi.mock("uuid", () => ({
  v4: () => "mock-uuid",
}));

describe("usePollingManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockOastStore.pollingList = [];
    mockOastStore.interactions = [];
    mockOastStore.pollingStatus = {};
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("resume (Non-Interactsh Provider)", () => {
    it("should poll events for non-interactsh provider", async () => {
      const pollingId = "polling-1";
      const providerId = "provider-1";
      const tabId = "tab-1";
      const provider = {
        id: providerId,
        name: "BOAST",
        type: "BOAST",
        url: "http://boast.url",
        token: "token",
      };

      mockOastStore.pollingList = [
        {
          id: pollingId,
          providerId: providerId,
          provider: "BOAST",
          interval: 5000,
          tabId: tabId,
          payload: "http://payload.url",
        },
      ];

      mockListProviders.mockResolvedValue([provider]);
      mockGetOASTEvents.mockResolvedValue([
        {
          id: "event-1",
          correlationId: "corr-1",
          protocol: "http",
          method: "GET",
          source: "1.2.3.4",
          destination: "dest",
          timestamp: 1234567890,
          rawRequest: "req",
          rawResponse: "res",
        },
      ]);

      const { resume } = usePollingManager();
      const result = await resume(pollingId);

      expect(result).toBe(true);
      expect(mockListProviders).toHaveBeenCalled();
      expect(mockGetOASTEvents).toHaveBeenCalledWith(provider);
      expect(mockAddInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "event-1",
          provider: "BOAST",
        }),
        tabId,
      );
      expect(mockUpdatePollingLastPolled).toHaveBeenCalledWith(
        pollingId,
        expect.any(Number),
      );
      expect(mockSetPollingRunning).toHaveBeenCalledWith(pollingId, true);
      expect(mockRegisterPollingStop).toHaveBeenCalledWith(
        pollingId,
        expect.any(Function),
      );

      // Fast-forward time to trigger next poll
      await vi.advanceTimersByTimeAsync(5000);
      expect(mockGetOASTEvents).toHaveBeenCalledTimes(2);
    });

    it("should handle provider not found", async () => {
      const pollingId = "polling-1";
      mockOastStore.pollingList = [
        {
          id: pollingId,
          providerId: "provider-1",
          provider: "BOAST",
          interval: 5000,
          tabId: "tab-1",
          payload: "http://payload.url",
        },
      ];

      mockListProviders.mockResolvedValue([]); // No providers

      const { resume } = usePollingManager();
      const result = await resume(pollingId);

      expect(result).toBe(false);
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining("Provider not found"),
        expect.anything(),
      );
      expect(mockSetPollingRunning).toHaveBeenCalledWith(pollingId, false);
    });

    it("should not add duplicate interactions", async () => {
      const pollingId = "polling-1";
      const providerId = "provider-1";
      const tabId = "tab-1";
      const provider = {
        id: providerId,
        name: "BOAST",
        type: "BOAST",
        url: "http://boast.url",
        token: "token",
      };

      mockOastStore.pollingList = [
        {
          id: pollingId,
          providerId: providerId,
          provider: "BOAST",
          interval: 5000,
          tabId: tabId,
          payload: "http://payload.url",
        },
      ];

      // Interaction already exists
      mockOastStore.interactions = [{ id: "event-1" }];

      mockListProviders.mockResolvedValue([provider]);
      mockGetOASTEvents.mockResolvedValue([
        {
          id: "event-1",
          correlationId: "corr-1",
          // ... other fields
        },
      ]);

      const { resume } = usePollingManager();
      await resume(pollingId);

      expect(mockGetOASTEvents).toHaveBeenCalled();
      expect(mockAddInteraction).not.toHaveBeenCalled();
    });
  });

  describe("resume (Interactsh Provider)", () => {
    it("should start interactsh client (fresh start)", async () => {
      const pollingId = "polling-interactsh";
      const providerId = "provider-interactsh";
      const tabId = "tab-interactsh";
      const provider = {
        id: providerId,
        name: "Interactsh",
        type: "interactsh",
        url: "https://interact.sh",
        token: "",
      };

      mockOastStore.pollingList = [
        {
          id: pollingId,
          providerId: providerId,
          provider: "Interactsh",
          interval: 5000,
          tabId: tabId,
          payload: "http://payload.url",
        },
      ];

      mockListProviders.mockResolvedValue([provider]);
      mockGenerateUrl.mockReturnValue({ url: "http://new-payload.url" });
      mockGetSessionInfo.mockResolvedValue({
        serverURL: "https://interact.sh",
        token: "token",
        correlationID: "corr",
        secretKey: "secret",
        privateKey: "private",
        publicKey: "public",
      });

      const { resume } = usePollingManager();
      const result = await resume(pollingId);

      expect(result).toBe(true);
      expect(mockStart).toHaveBeenCalledWith(
        expect.objectContaining({
          serverURL: provider.url,
        }),
        expect.any(Function),
      );

      // Simulate callback
      const callback = mockStart.mock.calls[0][1];
      callback({
        "full-id": "full-id",
        protocol: "http",
        "remote-address": "1.2.3.4",
        timestamp: "2023-01-01T00:00:00Z",
        "raw-request": "GET / HTTP/1.1",
        "raw-response": "HTTP/1.1 200 OK",
      });

      expect(mockAddInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "interactsh",
          correlationId: "full-id",
        }),
        tabId,
      );

      expect(mockUpdatePolling).toHaveBeenCalledWith(
        pollingId,
        expect.objectContaining({
          session: expect.anything(),
        }),
      );

      expect(mockSetPollingRunning).toHaveBeenCalledWith(pollingId, true);
    });

    it("should start interactsh client with existing session", async () => {
      const pollingId = "polling-interactsh-session";
      const tabId = "tab-interactsh";
      const session = {
        type: "interactsh",
        serverURL: "https://interact.sh",
        token: "token",
        correlationID: "corr",
        secretKey: "secret",
        privateKey: "private",
        publicKey: "public",
      };

      mockOastStore.pollingList = [
        {
          id: pollingId,
          providerId: "provider-interactsh",
          provider: "Interactsh",
          interval: 5000,
          tabId: tabId,
          payload: "http://payload.url",
          session: session,
        },
      ];

      const { resume } = usePollingManager();
      const result = await resume(pollingId);

      expect(result).toBe(true);
      // Should NOT call listProviders if resuming from session
      expect(mockListProviders).not.toHaveBeenCalled();

      expect(mockStart).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionInfo: expect.objectContaining({
            serverURL: session.serverURL,
            correlationID: session.correlationID,
          }),
        }),
        expect.any(Function),
      );
    });
  });

  describe("stop", () => {
    it("should stop polling and clean up", async () => {
      const pollingId = "polling-1";
      const providerId = "provider-1";
      const tabId = "tab-1";
      const provider = {
        id: providerId,
        name: "BOAST",
        type: "BOAST",
        url: "http://boast.url",
        token: "token",
      };

      mockOastStore.pollingList = [
        {
          id: pollingId,
          providerId: providerId,
          provider: "BOAST",
          interval: 5000,
          tabId: tabId,
          payload: "http://payload.url",
        },
      ];

      mockListProviders.mockResolvedValue([provider]);
      mockGetOASTEvents.mockResolvedValue([]);

      const { resume, stop } = usePollingManager();
      await resume(pollingId);

      stop(pollingId);

      expect(mockSetPollingRunning).toHaveBeenLastCalledWith(pollingId, false);

      // Verify interval is cleared (indirectly via setPollingRunning or by advancing time and checking calls)
      mockGetOASTEvents.mockClear();
      await vi.advanceTimersByTimeAsync(5000);
      expect(mockGetOASTEvents).not.toHaveBeenCalled();
    });

    it("should stop interactsh polling", async () => {
      const pollingId = "polling-interactsh-stop";
      const providerId = "provider-interactsh";
      const tabId = "tab-interactsh";
      const provider = {
        id: providerId,
        name: "Interactsh",
        type: "interactsh",
        url: "https://interact.sh",
        token: "",
      };

      mockOastStore.pollingList = [
        {
          id: pollingId,
          providerId: providerId,
          provider: "Interactsh",
          interval: 5000,
          tabId: tabId,
          payload: "http://payload.url",
        },
      ];

      mockListProviders.mockResolvedValue([provider]);

      const { resume } = usePollingManager();
      await resume(pollingId);

      // Get the stop function registered
      const stopFn = mockRegisterPollingStop.mock.calls[0][1];

      await stopFn();

      expect(mockStop).toHaveBeenCalled();
      expect(mockSetPollingRunning).toHaveBeenLastCalledWith(pollingId, false);
    });
  });

  describe("resumeAll", () => {
    it("should resume all stopped tasks", async () => {
      const pollingId1 = "polling-1";
      const pollingId2 = "polling-2";

      mockOastStore.pollingList = [
        {
          id: pollingId1,
          providerId: "p1",
          provider: "BOAST",
          interval: 5000,
          tabId: "t1",
          payload: "pl1",
        },
        {
          id: pollingId2,
          providerId: "p2",
          provider: "BOAST",
          interval: 5000,
          tabId: "t2",
          payload: "pl2",
        },
      ];

      mockOastStore.pollingStatus = {
        [pollingId1]: "stopped",
        [pollingId2]: "running",
      };

      mockListProviders.mockResolvedValue([
        { id: "p1", name: "BOAST", type: "BOAST", url: "url", token: "token" },
        { id: "p2", name: "BOAST", type: "BOAST", url: "url", token: "token" },
      ]);
      mockGetOASTEvents.mockResolvedValue([]);

      const { resumeAll } = usePollingManager();
      await resumeAll();

      // Should resume pollingId1
      expect(mockSetPollingRunning).toHaveBeenCalledWith(pollingId1, true);
      // Should NOT resume pollingId2 (already running)
      expect(mockSetPollingRunning).not.toHaveBeenCalledWith(pollingId2, true);
    });
  });
});
