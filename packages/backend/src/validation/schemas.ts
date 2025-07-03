import { z } from "zod";

export const ProviderSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  type: z.enum(["interactsh", "BOAST"], { required_error: "Type is required" }),
  url: z.string().url("Invalid URL format").min(1, "URL is required"),
  token: z.string().optional(),
  enabled: z.boolean().default(true),
});

export type Provider = z.infer<typeof ProviderSchema>;

export const SettingsSchema = z
  .object({
    id: z.string().optional(),
    pollingInterval: z.number().int().positive().default(30),
    maxPollingPeriod: z.string().default("session"),
    payloadPrefix: z.string().default(""),
  })
  .partial({ id: true });

export type Settings = z.infer<typeof SettingsSchema>;
