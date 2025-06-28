import type { SettingsState } from "@/types";
import { defineStore } from "pinia";
import type { SettingsDTO } from "shared";
import { reactive } from "vue";

type Context = {
  state: SettingsState;
};

type Message =
  | { type: "Start" }
  | { type: "Error"; error: string }
  | { type: "Success"; settings: SettingsDTO }
  | { type: "UpdateSettings"; settings: SettingsDTO };

export const useSettingsStore = defineStore("stores.settings", () => {
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
  state: SettingsState & { type: "Idle" },
  message: Message,
): SettingsState => {
  switch (message.type) {
    case "Start":
      return { type: "Loading" };
    case "Error":
    case "Success":
    case "UpdateSettings":
      return state;
  }
};

const processError = (
  state: SettingsState & { type: "Error" },
  message: Message,
): SettingsState => {
  switch (message.type) {
    case "Start":
      return { type: "Loading" };
    case "Error":
    case "Success":
    case "UpdateSettings":
      return state;
  }
};

const processSuccess = (
  state: SettingsState & { type: "Success" },
  message: Message,
): SettingsState => {
  switch (message.type) {
    case "UpdateSettings":
      return {
        ...state,
        settings: message.settings,
      };

    case "Start":
    case "Error":
    case "Success":
      return state;
  }
};

const processLoading = (
  state: SettingsState & { type: "Loading" },
  message: Message,
): SettingsState => {
  switch (message.type) {
    case "Error":
      return { type: "Error", error: message.error };
    case "Success":
      return { type: "Success", settings: message.settings };
    case "Start":
    case "UpdateSettings":
      return state;
  }
};
