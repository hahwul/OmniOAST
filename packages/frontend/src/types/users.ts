import type { UserDTO } from "shared";

export type UserState =
  | { type: "Idle" }
  | { type: "Loading" }
  | { type: "Error"; error: string }
  | { type: "Success"; users: UserDTO[]; selectedUserId: string | undefined };
