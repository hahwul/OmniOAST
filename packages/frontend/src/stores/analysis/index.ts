import { defineStore } from "pinia";
import { useJobState } from "./useJobState";
import { useResultState } from "./useResultState";
import { useSelectionState } from "./useSelectionState";

export const useAnalysisStore = defineStore("stores.analysis", () => {
  return {
    ...useJobState(),
    ...useResultState(),
    ...useSelectionState(),
  };
});
