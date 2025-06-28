import type { AnalysisResultState } from "@/types";
import type { AnalysisRequestDTO } from "shared";
import { reactive } from "vue";

type Context = {
  state: AnalysisResultState;
};

type Message =
  | { type: "Start" }
  | { type: "Error"; error: string }
  | { type: "Success"; results: AnalysisRequestDTO[] }
  | { type: "AddResult"; result: AnalysisRequestDTO }
  | { type: "Clear" };

export const useResultState = () => {
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
    resultState: {
      getState,
      send,
    },
  };
};

const processIdle = (
  state: AnalysisResultState & { type: "Idle" },
  message: Message,
): AnalysisResultState => {
  switch (message.type) {
    case "Start":
      return { type: "Loading" };
    case "Error":
    case "Success":
    case "Clear":
    case "AddResult":
      return state;
  }
};

const processLoading = (
  state: AnalysisResultState & { type: "Loading" },
  message: Message,
): AnalysisResultState => {
  switch (message.type) {
    case "Error":
      return { type: "Error", error: message.error };
    case "Success":
      return { type: "Success", results: message.results };
    case "Start":
    case "Clear":
    case "AddResult":
      return state;
  }
};

const processError = (
  state: AnalysisResultState & { type: "Error" },
  message: Message,
): AnalysisResultState => {
  switch (message.type) {
    case "Start":
      return { type: "Loading" };
    case "Error":
    case "Success":
    case "Clear":
    case "AddResult":
      return state;
  }
};

const processSuccess = (
  state: AnalysisResultState & { type: "Success" },
  message: Message,
): AnalysisResultState => {
  switch (message.type) {
    case "AddResult":
      return {
        type: "Success",
        results: [...state.results, message.result],
      };
    case "Clear":
      return {
        type: "Success",
        results: [],
      };
    case "Start":
    case "Error":
    case "Success":
      return state;
  }
};
