import { type OASTHistory } from "../../../shared/src/types";

let history: OASTHistory[] = [];

export const getOASTHistory = async (
  sdk: any,
  providerId: string,
): Promise<OASTHistory[]> => {
  // You can filter by providerId if needed
  return history.filter((h) => h.providerId === providerId);
};

export const saveOASTHistory = (newHistory: OASTHistory[]) => {
  history = newHistory;
};
