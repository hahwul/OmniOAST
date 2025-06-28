import { type OASTProvider } from "@/shared/types";

let providers: OASTProvider[] = [];

export const getOASTProviders = (): OASTProvider[] => {
  return providers;
};

export const saveOASTProviders = (newProviders: OASTProvider[]) => {
  providers = newProviders;
};
