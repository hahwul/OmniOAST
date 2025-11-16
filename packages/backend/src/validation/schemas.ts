import { z } from "zod";

export const ProviderSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  type: z.enum(["interactsh", "BOAST", "webhooksite", "postbin"], {
    required_error: "Type is required",
  }),
  url: z.string().url("Invalid URL format").min(1, "URL is required"),
  token: z.string().optional(),
  enabled: z.boolean().default(true),
});

export type Provider = z.infer<typeof ProviderSchema>;

export const SettingsSchema = z
  .object({
    id: z.string().optional(),
    pollingInterval: z.number().int().positive().default(30),
    payloadPrefix: z.string().default(""),
    enablePersistentPolling: z.boolean().default(false),
  })
  .partial({ id: true });

export type Settings = z.infer<typeof SettingsSchema>;

export const PollingTaskSchema = z.object({
  id: z.string(),
  tabId: z.string(),
  tabName: z.string(),
  providerId: z.string(),
  providerName: z.string(),
  providerType: z.string(),
  payload: z.string(),
  interval: z.number().int().positive(),
  lastPolled: z.number().int(),
  isActive: z.boolean().default(true),
  lastHealthCheck: z.number().int().optional(),
  healthStatus: z.enum(["healthy", "unhealthy", "unknown"]).default("unknown"),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});

export type PollingTask = z.infer<typeof PollingTaskSchema>;
