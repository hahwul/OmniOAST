import type { AnalysisSelectionState } from "@/types";
import { reactive } from "vue";

type Context = {
  state: AnalysisSelectionState;
};

type Message =
  | { type: "Reset" }
  | { type: "Start"; templateId: string; userId: string | undefined }
  | {
      type: "Error";
      templateId: string;
      userId: string | undefined;
      error: string;
    }
  | {
      type: "Success";
      templateId: string;
      userId: string | undefined;
      request: { id: string; raw: string };
      response: { id: string; raw: string } | undefined;
    };

export const useSelectionState = () => {
  const context: Context = reactive({
    state: { type: "None" },
  });

  const getState = () => context.state;

  const send = (message: Message) => {
    const currState = context.state;

    switch (currState.type) {
      case "None":
        context.state = processIdle(currState, message);
        break;
      case "Loading":
        context.state = processLoading(currState, message);
        break;
      case "Error":
        context.state = processError(currState, message);
        break;
      case "Success":
        context.state = processSuccess(currState, message);
        break;
    }
  };

  return {
    selectionState: {
      getState,
      send,
    },
  };
};

const processIdle = (
  state: AnalysisSelectionState & { type: "None" },
  message: Message,
): AnalysisSelectionState => {
  switch (message.type) {
    case "Start":
      return {
        type: "Loading",
        templateId: message.templateId,
        userId: message.userId,
      };
    case "Reset":
    case "Error":
    case "Success":
      return state;
  }
};

const processLoading = (
  state: AnalysisSelectionState & { type: "Loading" },
  message: Message,
): AnalysisSelectionState => {
  switch (message.type) {
    case "Error":
      return {
        type: "Error",
        templateId: message.templateId,
        userId: message.userId,
      };
    case "Success":
      return {
        type: "Success",
        templateId: message.templateId,
        userId: message.userId,
        request: message.request,
        response: message.response,
      };
    case "Reset":
      return { type: "None" };
    case "Start":
      return state;
  }
};

const processError = (
  state: AnalysisSelectionState & { type: "Error" },
  message: Message,
): AnalysisSelectionState => {
  switch (message.type) {
    case "Start":
      return {
        type: "Loading",
        templateId: message.templateId,
        userId: message.userId,
      };
    case "Reset":
      return { type: "None" };
    case "Error":
    case "Success":
      return state;
  }
};

const processSuccess = (
  state: AnalysisSelectionState & { type: "Success" },
  message: Message,
): AnalysisSelectionState => {
  switch (message.type) {
    case "Start":
      return {
        type: "Loading",
        templateId: message.templateId,
        userId: message.userId,
      };
    case "Reset":
      return { type: "None" };
    case "Error":
    case "Success":
      return state;
  }
};
