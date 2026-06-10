import * as SQLite from "expo-sqlite";

const DB_NAME = "genesis_local.db";

let db: SQLite.SQLiteDatabase | null = null;

async function getDb() {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.execAsync("PRAGMA journal_mode = WAL;");
  }
  return db;
}

export async function initTable(collectionName: string) {
  const sqlite = await getDb();
  await sqlite.execAsync(
    `CREATE TABLE IF NOT EXISTS "${collectionName}" (
       id TEXT PRIMARY KEY NOT NULL,
       data TEXT NOT NULL,
       updated_at TEXT NOT NULL DEFAULT (datetime('now'))
     );`,
  );
}

export async function loadCollection<T>(collectionName: string): Promise<T[]> {
  const sqlite = await getDb();
  await initTable(collectionName);
  const rows = await sqlite.getAllAsync<{ data: string }>(
    `SELECT data FROM "${collectionName}";`,
  );
  return rows.map((r) => JSON.parse(r.data) as T);
}

export async function persistDoc(
  collectionName: string,
  doc: Record<string, any>,
) {
  const sqlite = await getDb();
  await sqlite.runAsync(
    `INSERT OR REPLACE INTO "${collectionName}" (id, data, updated_at) VALUES (?, ?, ?);`,
    [doc._id, JSON.stringify(doc), new Date().toISOString()],
  );
}

export async function removeDoc(collectionName: string, id: string) {
  const sqlite = await getDb();
  await sqlite.runAsync(`DELETE FROM "${collectionName}" WHERE id = ?;`, [id]);
}

export async function clearCollection(collectionName: string) {
  const sqlite = await getDb();
  await initTable(collectionName);
  await sqlite.runAsync(`DELETE FROM "${collectionName}";`);
}

export async function saveCheckpoint(
  replicationId: string,
  checkpoint: Record<string, any>,
) {
  const sqlite = await getDb();
  await sqlite.execAsync(
    `CREATE TABLE IF NOT EXISTS "_replication_checkpoints"
     (id TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL);`,
  );
  await sqlite.runAsync(
    `INSERT OR REPLACE INTO "_replication_checkpoints" (id, data) VALUES (?, ?);`,
    [replicationId, JSON.stringify(checkpoint)],
  );
}

export async function loadCheckpoint(
  replicationId: string,
): Promise<Record<string, any> | null> {
  const sqlite = await getDb();
  await sqlite.execAsync(
    `CREATE TABLE IF NOT EXISTS "_replication_checkpoints"
     (id TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL);`,
  );
  const row = await sqlite.getFirstAsync<{ data: string }>(
    `SELECT data FROM "_replication_checkpoints" WHERE id = ?;`,
    [replicationId],
  );
  return row ? JSON.parse(row.data) : null;
}

export async function destroyDatabase() {
  if (db) {
    try {
      await db.closeAsync();
    } catch (e) {
      console.warn("[sqlite] close failed", e);
    }
    db = null;
  }
  try {
    await SQLite.deleteDatabaseAsync(DB_NAME);
  } catch (e) {
    console.warn("[sqlite] delete failed", e);
  }
}
