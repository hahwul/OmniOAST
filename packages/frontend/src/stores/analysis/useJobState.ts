import type { AnalysisJobState } from "@/types";
import { reactive } from "vue";

type Context = {
  state: AnalysisJobState;
};

type Message = { type: "Start" } | { type: "Done" };

export const useJobState = () => {
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
      case "Analyzing":
        context.state = processAnalyzing(currState, message);
        break;
    }
  };

  return {
    jobState: {
      getState,
      send,
    },
  };
};

const processIdle = (
  state: AnalysisJobState & { type: "Idle" },
  message: Message,
): AnalysisJobState => {
  switch (message.type) {
    case "Start":
      return { type: "Analyzing" };
    case "Done":
      return state;
  }
};

const processAnalyzing = (
  state: AnalysisJobState & { type: "Analyzing" },
  message: Message,
): AnalysisJobState => {
  switch (message.type) {
    case "Done":
      return { type: "Idle" };
    case "Start":
      return state;
  }
};
