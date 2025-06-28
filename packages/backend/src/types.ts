import type { DefineEvents } from "caido:plugin";
import type { AnalysisRequestDTO, TemplateDTO } from "shared";

export type BackendEvents = DefineEvents<{
  "templates:created": (template: TemplateDTO) => void;
  "templates:updated": (template: TemplateDTO) => void;
  "templates:cleared": () => void;
  "results:created": (result: AnalysisRequestDTO) => void;
  "results:clear": () => void;
}>;
