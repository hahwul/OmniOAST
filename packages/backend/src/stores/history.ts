import { OASTHistory } from "@/shared/types";

let history: OASTHistory[] = [];

export const getOASTHistory = (): OASTHistory[] => {
    return history;
}

export const saveOASTHistory = (newHistory: OASTHistory[]) => {
    history = newHistory;
}