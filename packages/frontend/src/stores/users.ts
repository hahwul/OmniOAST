import type { UserState } from "@/types";
import { defineStore } from "pinia";
import type { UserDTO } from "shared";
import { reactive } from "vue";

type Context = {
  state: UserState;
};

type Message =
  | { type: "Start" }
  | { type: "Error"; error: string }
  | { type: "Success"; users: UserDTO[] }
  | { type: "AddUser"; user: UserDTO }
  | { type: "UpdateUser"; user: UserDTO }
  | { type: "DeleteUser"; id: string }
  | { type: "SelectUser"; id: string | undefined };

export const useUserStore = defineStore("stores.users", () => {
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
  state: UserState & { type: "Idle" },
  message: Message,
): UserState => {
  switch (message.type) {
    case "Start":
      return { type: "Loading" };
    case "Error":
    case "Success":
    case "AddUser":
    case "UpdateUser":
    case "DeleteUser":
    case "SelectUser":
      return state;
  }
};

const processError = (
  state: UserState & { type: "Error" },
  message: Message,
): UserState => {
  switch (message.type) {
    case "Start":
      return { type: "Loading" };
    case "Error":
    case "Success":
    case "AddUser":
    case "UpdateUser":
    case "DeleteUser":
    case "SelectUser":
      return state;
  }
};

const processSuccess = (
  state: UserState & { type: "Success" },
  message: Message,
): UserState => {
  switch (message.type) {
    case "AddUser": {
      const selectedUserId = state.selectedUserId ?? message.user.id;
      return {
        ...state,
        selectedUserId,
        users: [...state.users, message.user],
      };
    }
    case "UpdateUser":
      return {
        ...state,
        users: state.users.map((user) =>
          user.id === message.user.id ? message.user : user,
        ),
      };
    case "DeleteUser": {
      const selectedUserId =
        message.id === state.selectedUserId ? undefined : state.selectedUserId;
      return {
        ...state,
        selectedUserId,
        users: state.users.filter((user) => user.id !== message.id),
      };
    }

    case "SelectUser":
      return {
        ...state,
        selectedUserId: message.id,
      };

    case "Start":
    case "Error":
    case "Success":
      return state;
  }
};

const processLoading = (
  state: UserState & { type: "Loading" },
  message: Message,
): UserState => {
  switch (message.type) {
    case "Error":
      return { type: "Error", error: message.error };
    case "Success":
      return {
        type: "Success",
        users: message.users,
        selectedUserId: message.users[0]?.id,
      };
    case "Start":
    case "AddUser":
    case "UpdateUser":
    case "DeleteUser":
    case "SelectUser":
      return state;
  }
};
