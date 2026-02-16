import { describe, expect, it } from "vitest";

import { ProviderSchema, SettingsSchema } from "../validation/schemas";

describe("ProviderSchema", () => {
  it("should validate a valid provider", () => {
    const validProvider = {
      name: "Test Provider",
      type: "interactsh",
      url: "https://example.com",
    };

    const result = ProviderSchema.safeParse(validProvider);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Test Provider");
      expect(result.data.type).toBe("interactsh");
      expect(result.data.url).toBe("https://example.com");
      expect(result.data.enabled).toBe(true); // Default value
    }
  });

  it("should validate all provider types", () => {
    const types = ["interactsh", "BOAST", "webhooksite", "postbin"];
    types.forEach((type) => {
      const provider = {
        name: "Test Provider",
        type,
        url: "https://example.com",
      };
      const result = ProviderSchema.safeParse(provider);
      expect(result.success).toBe(true);
    });
  });

  it("should validate optional fields", () => {
    const provider = {
      id: "test-id",
      name: "Test Provider",
      type: "interactsh",
      url: "https://example.com",
      token: "test-token",
      enabled: false,
    };

    const result = ProviderSchema.safeParse(provider);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("test-id");
      expect(result.data.token).toBe("test-token");
      expect(result.data.enabled).toBe(false);
    }
  });

  it("should fail validation for empty name", () => {
    const invalidProvider = {
      name: "",
      type: "interactsh",
      url: "https://example.com",
    };

    const result = ProviderSchema.safeParse(invalidProvider);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Name is required");
    }
  });

  it("should fail validation for name exceeding max length", () => {
    const invalidProvider = {
      name: "a".repeat(101),
      type: "interactsh",
      url: "https://example.com",
    };

    const result = ProviderSchema.safeParse(invalidProvider);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Name must be less than 100 characters",
      );
    }
  });

  it("should fail validation for invalid type", () => {
    const invalidProvider = {
      name: "Test Provider",
      type: "invalid-type",
      url: "https://example.com",
    };

    const result = ProviderSchema.safeParse(invalidProvider);
    expect(result.success).toBe(false);
    if (!result.success) {
      // Zod default error message for invalid enum
      expect(result.error.issues[0]?.message).toContain("Invalid enum value");
    }
  });

  it("should fail validation for missing type", () => {
    const invalidProvider = {
      name: "Test Provider",
      url: "https://example.com",
    };

    const result = ProviderSchema.safeParse(invalidProvider);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Type is required");
    }
  });

  it("should fail validation for invalid URL", () => {
    const invalidProvider = {
      name: "Test Provider",
      type: "interactsh",
      url: "not-a-url",
    };

    const result = ProviderSchema.safeParse(invalidProvider);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Invalid URL format");
    }
  });

  it("should fail validation for empty URL", () => {
    const invalidProvider = {
      name: "Test Provider",
      type: "interactsh",
      url: "",
    };

    const result = ProviderSchema.safeParse(invalidProvider);
    expect(result.success).toBe(false);
    // It might trigger "Invalid URL format" or "URL is required" depending on Zod version/implementation details
    // But since it's empty string, it fails min(1) or url()
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(
        messages.includes("URL is required") ||
          messages.includes("Invalid URL format"),
      ).toBe(true);
    }
  });
});

describe("SettingsSchema", () => {
  it("should validate valid settings", () => {
    const validSettings = {
      pollingInterval: 60,
      payloadPrefix: "test-prefix",
    };

    const result = SettingsSchema.safeParse(validSettings);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pollingInterval).toBe(60);
      expect(result.data.payloadPrefix).toBe("test-prefix");
    }
  });

  it("should use default values", () => {
    const settings = {};
    const result = SettingsSchema.safeParse(settings);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pollingInterval).toBe(30);
      expect(result.data.payloadPrefix).toBe("");
    }
  });

  it("should validate optional id", () => {
    const settings = {
      id: "settings-id",
    };
    const result = SettingsSchema.safeParse(settings);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("settings-id");
    }
  });

  it("should fail for non-integer pollingInterval", () => {
    const invalidSettings = {
      pollingInterval: 30.5,
    };
    const result = SettingsSchema.safeParse(invalidSettings);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain(
        "Expected integer, received float",
      );
    }
  });

  it("should fail for negative pollingInterval", () => {
    const invalidSettings = {
      pollingInterval: -10,
    };
    const result = SettingsSchema.safeParse(invalidSettings);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain(
        "Number must be greater than 0",
      );
    }
  });

  it("should fail for zero pollingInterval", () => {
    const invalidSettings = {
      pollingInterval: 0,
    };
    const result = SettingsSchema.safeParse(invalidSettings);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain(
        "Number must be greater than 0",
      );
    }
  });
});
