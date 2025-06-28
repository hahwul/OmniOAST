import { type OASTProvider } from "../../../shared/src/types";
import type { SDK } from "caido:plugin";

let dbPromise: Promise<any> | null = null;

async function getDb(sdk: SDK): Promise<any> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await sdk.meta.db();
      await db.exec(`
        CREATE TABLE IF NOT EXISTS oast_providers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          url TEXT NOT NULL,
          token TEXT
        );
      `);
      return db;
    })();
  }
  return dbPromise;
}

export const getOASTProviders = async (sdk: SDK): Promise<OASTProvider[]> => {
  const db = await getDb(sdk);
  const stmt = await db.prepare("SELECT * FROM oast_providers");
  const rows = await stmt.all();
  // Ensure type field is present if needed
  return rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    url: row.url,
    token: row.token,
    type: row.type ?? "interactsh",
  }));
};

export const saveOASTProviders = async (
  sdk: SDK,
  newProviders: OASTProvider[],
) => {
  const db = await getDb(sdk);
  await db.exec("DELETE FROM oast_providers");
  const insertStmt = await db.prepare(
    "INSERT INTO oast_providers (id, name, url, token, enabled) VALUES (?, ?, ?, ?, ?)",
  );
  for (const provider of newProviders) {
    await insertStmt.run(
      provider.id,
      provider.name,
      provider.url ?? "",
      provider.token ?? "",
    );
  }
};
