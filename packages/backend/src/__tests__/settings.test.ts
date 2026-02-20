import { beforeEach, describe, expect, it, vi } from "vitest";

import { SettingsService } from "../services/settings";

const MOCK_UUID = "test-uuid-1234";
vi.mock("uuid", () => ({
  v4: () => MOCK_UUID,
}));

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
};

describe("SettingsService", () => {
  let service: SettingsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SettingsService(mockSdk as any);

    // Default mock behaviors
    mockStatement.run.mockResolvedValue({ changes: 1 });
    mockStatement.get.mockResolvedValue(null);
    mockStatement.all.mockResolvedValue([]);
  });

  describe("createSettings", () => {
    it("should create new settings with provided values", async () => {
      const input = {
        pollingInterval: 60,
        payloadPrefix: "test-",
      };

      const result = await service.createSettings(input);

      expect(result).toEqual({
        id: MOCK_UUID,
        pollingInterval: 60,
        payloadPrefix: "test-",
      });
      expect(mockDb.exec).toHaveBeenCalled(); // initDb called
      expect(mockStatement.run).toHaveBeenCalledWith(MOCK_UUID, 60, "test-");
    });

    it("should use default values for missing fields", async () => {
      const input = {};

      const result = await service.createSettings(input);

      expect(result).toEqual({
        id: MOCK_UUID,
        pollingInterval: 30, // Default
        payloadPrefix: "", // Default
      });
    });

    it("should handle database errors", async () => {
      mockStatement.run.mockRejectedValue(new Error("DB Error"));

      const result = await service.createSettings({});

      expect(result).toBeNull();
    });
  });

  describe("getSettings", () => {
    it("should return settings for valid ID", async () => {
      const mockSettings = {
        id: "existing-id",
        pollingInterval: 45,
        payloadPrefix: "prefix-",
      };
      mockStatement.get.mockResolvedValue(mockSettings);

      const result = await service.getSettings("existing-id");

      expect(result).toEqual(mockSettings);
    });

    it("should return null if ID is missing", async () => {
      const result = await service.getSettings(undefined);
      expect(result).toBeNull();
    });

    it("should return null if not found", async () => {
      mockStatement.get.mockResolvedValue(null);
      const result = await service.getSettings("non-existent");
      expect(result).toBeNull();
    });

    it("should parse primitive types correctly", async () => {
      // Simulating SQLite returning non-strict types if that happens,
      // or just ensuring the logic handles what it claims to handle.
      const mockSettings = {
        id: "existing-id",
        pollingInterval: "45", // As string
        payloadPrefix: null, // As null/undefined equivalent
      };
      mockStatement.get.mockResolvedValue(mockSettings);

      const result = await service.getSettings("existing-id");

      expect(result).toEqual({
        id: "existing-id",
        pollingInterval: 45,
        payloadPrefix: "",
      });
    });
  });

  describe("getCurrentSettings", () => {
    it("should return the latest settings", async () => {
      const mockSettings = {
        id: "latest-id",
        pollingInterval: 10,
        payloadPrefix: "latest-",
      };
      mockStatement.get.mockResolvedValue(mockSettings);

      const result = await service.getCurrentSettings();

      expect(result).toEqual(mockSettings);
    });

    it("should create default settings if none exist", async () => {
      mockStatement.get.mockResolvedValue(null);
      // We need to mock the subsequent create call or just let it flow.
      // Since it calls createSettings internally, and we mocked db, it should work.

      const result = await service.getCurrentSettings();

      expect(result).toEqual({
        id: MOCK_UUID,
        pollingInterval: 30,
        payloadPrefix: "",
      });
      // Verify it tried to get, then insert
      expect(mockStatement.get).toHaveBeenCalled();
      expect(mockStatement.run).toHaveBeenCalled();
    });
  });

  describe("updateSettings", () => {
    it("should update settings successfully", async () => {
      const existing = {
        id: "update-id",
        pollingInterval: 30,
        payloadPrefix: "old",
      };
      // First call to getSettings checks existence
      mockStatement.get.mockResolvedValue(existing);

      const updates = {
        pollingInterval: 60,
      };

      const result = await service.updateSettings("update-id", updates);

      expect(result).toEqual({
        id: "update-id",
        pollingInterval: 60,
        payloadPrefix: "old",
      });
    });

    it("should return null if ID invalid", async () => {
      const result = await service.updateSettings(undefined, {});
      expect(result).toBeNull();
    });

    it("should return null if settings not found", async () => {
      mockStatement.get.mockResolvedValue(null);
      const result = await service.updateSettings("missing", {});
      expect(result).toBeNull();
    });
  });

  describe("deleteSettings", () => {
    it("should return true on success", async () => {
      mockStatement.run.mockResolvedValue({ changes: 1 });
      const result = await service.deleteSettings("del-id");
      expect(result).toBe(true);
    });

    it("should return false if invalid ID", async () => {
      const result = await service.deleteSettings(undefined);
      expect(result).toBe(false);
    });

    it("should return false if nothing deleted", async () => {
      mockStatement.run.mockResolvedValue({ changes: 0 });
      const result = await service.deleteSettings("del-id");
      expect(result).toBe(false);
    });
  });

  describe("listSettings", () => {
    it("should return list of settings", async () => {
      const list = [
        { id: "1", pollingInterval: 10, payloadPrefix: "a" },
        { id: "2", pollingInterval: 20, payloadPrefix: "b" },
      ];
      mockStatement.all.mockResolvedValue(list);

      const result = await service.listSettings();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(list[0]);
      expect(result[1]).toEqual(list[1]);
    });

    it("should return empty array on error", async () => {
      mockStatement.all.mockRejectedValue(new Error("Fail"));
      const result = await service.listSettings();
      expect(result).toEqual([]);
    });
  });
});
