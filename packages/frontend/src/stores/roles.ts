import type { RoleState } from "@/types";
import { defineStore } from "pinia";
import type { RoleDTO } from "shared";
import { reactive } from "vue";

type Context = {
  state: RoleState;
};

type Message =
  | { type: "Start" }
  | { type: "Error"; error: string }
  | { type: "Success"; roles: RoleDTO[] }
  | { type: "AddRole"; role: RoleDTO }
  | { type: "UpdateRole"; role: RoleDTO }
  | { type: "DeleteRole"; id: string };

export const useRoleStore = defineStore("stores.roles", () => {
  const context: Context = reactive({
    state: { type: "Idle" },
  });

  const getState = () => context.state;

  const send = (message: Message) => {
    const currState = context.state;

    switch (currState.type) {
      case "Idle":
        context.state = processIdle(currState, message);
        break;
      case "Error":
        context.state = processError(currState, message);
        break;
      case "Success":
        context.state = processSuccess(currState, message);
        break;
      case "Loading":
        context.state = processLoading(currState, message);
        break;
    }
  };

  return { getState, send };
});

const processIdle = (
  state: RoleState & { type: "Idle" },
  message: Message,
): RoleState => {
  switch (message.type) {
    case "Start":
      return { type: "Loading" };
    case "Error":
    case "Success":
    case "AddRole":
    case "UpdateRole":
    case "DeleteRole":
      return state;
  }
};

const processError = (
  state: RoleState & { type: "Error" },
  message: Message,
): RoleState => {
  switch (message.type) {
    case "Start":
      return { type: "Loading" };
    case "Error":
    case "Success":
    case "AddRole":
    case "UpdateRole":
    case "DeleteRole":
      return state;
  }
};

const processSuccess = (
  state: RoleState & { type: "Success" },
  message: Message,
): RoleState => {
  switch (message.type) {
    case "AddRole":
      return {
        ...state,
        roles: [...state.roles, message.role],
      };
    case "UpdateRole":
      return {
        ...state,
        roles: state.roles.map((role) =>
          role.id === message.role.id ? message.role : role,
        ),
      };
    case "DeleteRole":
      return {
        ...state,
        roles: state.roles.filter((role) => role.id !== message.id),
      };

    case "Start":
    case "Error":
    case "Success":
      return state;
  }
};

const processLoading = (
  state: RoleState & { type: "Loading" },
  message: Message,
): RoleState => {
  switch (message.type) {
    case "Error":
      return { type: "Error", error: message.error };
    case "Success":
      return { type: "Success", roles: message.roles };
    case "Start":
    case "AddRole":
    case "UpdateRole":
    case "DeleteRole":
      return state;
  }
};
