import path from "node:path";
import { DatabaseSync } from "node:sqlite";

let _db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (_db) return _db;
  const dbPath = path.join(process.cwd(), "data", "flux.sqlite");
  _db = new DatabaseSync(dbPath, { readOnly: true });
  return _db;
}

export function close(): void {
  _db?.close();
  _db = null;
}
