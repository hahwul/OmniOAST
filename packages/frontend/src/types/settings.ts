import type { SettingsDTO } from "shared";

export type SettingsState =
  | { type: "Idle" }
  | { type: "Loading" }
  | { type: "Error"; error: string }
  | { type: "Success"; settings: SettingsDTO };
