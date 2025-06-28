import type { TemplateState } from "@/types";
import { defineStore } from "pinia";
import type { TemplateDTO } from "shared";
import { reactive } from "vue";

type Context = {
  state: TemplateState;
};

type Message =
  | { type: "Start" }
  | { type: "Error"; error: string }
  | { type: "Success"; templates: TemplateDTO[] }
  | { type: "AddTemplate"; template: TemplateDTO }
  | { type: "UpdateTemplate"; template: TemplateDTO }
  | { type: "DeleteTemplate"; id: string }
  | { type: "ClearTemplates" };

export const useTemplateStore = defineStore("stores.templates", () => {
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
  state: TemplateState & { type: "Idle" },
  message: Message,
): TemplateState => {
  switch (message.type) {
    case "Start":
      return { type: "Loading" };
    case "Error":
    case "Success":
    case "AddTemplate":
    case "UpdateTemplate":
    case "DeleteTemplate":
    case "ClearTemplates":
      return state;
  }
};

const processError = (
  state: TemplateState & { type: "Error" },
  message: Message,
): TemplateState => {
  switch (message.type) {
    case "Start":
      return { type: "Loading" };
    case "Error":
    case "Success":
    case "AddTemplate":
    case "UpdateTemplate":
    case "DeleteTemplate":
    case "ClearTemplates":
      return state;
  }
};

const processSuccess = (
  state: TemplateState & { type: "Success" },
  message: Message,
): TemplateState => {
  switch (message.type) {
    case "AddTemplate":
      if (
        state.templates.some((template) => template.id === message.template.id)
      ) {
        return state;
      }

      return {
        ...state,
        templates: [...state.templates, message.template],
      };
    case "UpdateTemplate":
      return {
        ...state,
        templates: state.templates.map((template) =>
          template.id === message.template.id ? message.template : template,
        ),
      };
    case "DeleteTemplate":
      return {
        ...state,
        templates: state.templates.filter(
          (template) => template.id !== message.id,
        ),
      };
    case "ClearTemplates":
      return {
        ...state,
        templates: [],
      };

    case "Start":
    case "Error":
    case "Success":
      return state;
  }
};

const processLoading = (
  state: TemplateState & { type: "Loading" },
  message: Message,
): TemplateState => {
  switch (message.type) {
    case "Error":
      return { type: "Error", error: message.error };
    case "Success":
      return { type: "Success", templates: message.templates };
    case "Start":
    case "AddTemplate":
    case "UpdateTemplate":
    case "DeleteTemplate":
    case "ClearTemplates":
      return state;
  }
};
