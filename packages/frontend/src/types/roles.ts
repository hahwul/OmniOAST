import type { RoleDTO } from "shared";

export type RoleState =
  | { type: "Idle" }
  | { type: "Loading" }
  | { type: "Error"; error: string }
  | { type: "Success"; roles: RoleDTO[] };
