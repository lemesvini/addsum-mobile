import {
  createRxDatabase,
  type RxDatabase,
  type RxCollection,
  addRxPlugin,
} from "rxdb";
import { getRxStorageMemory } from "rxdb/plugins/storage-memory";
import { RxDBDevModePlugin } from "rxdb/plugins/dev-mode";
import * as Crypto from "expo-crypto";

import { wrappedValidateAjvStorageAllowUnion } from "./wrapped-validate-ajv-storage";

import { userSchema, type UserDoc } from "./schemas/user.schema";
import { groupSchema, type GroupDoc } from "./schemas/group.schema";
import {
  groupMemberSchema,
  type GroupMemberDoc,
} from "./schemas/group-member.schema";
import { categorySchema, type CategoryDoc } from "./schemas/category.schema";
import { expenseSchema, type ExpenseDoc } from "./schemas/expense.schema";
import {
  expenseParticipantSchema,
  type ExpenseParticipantDoc,
} from "./schemas/expense-participant.schema";
import { syncQueueSchema } from "./schemas/sync-queue.schema";
import {
  initTable,
  loadCollection,
  persistDoc,
  removeDoc,
} from "./sqlite-persistence";

if (__DEV__) {
  try {
    addRxPlugin(RxDBDevModePlugin);
  } catch {
    // ignore duplicate plugin registration on fast refresh
  }
}

function getAppStorage() {
  const memory = getRxStorageMemory();
  if (__DEV__) {
    return wrappedValidateAjvStorageAllowUnion({ storage: memory });
  }
  return memory;
}

async function hashFunction(
  input: string | ArrayBuffer | Blob,
): Promise<string> {
  const text =
    typeof input === "string"
      ? input
      : input instanceof ArrayBuffer
        ? new TextDecoder().decode(input)
        : await (input as Blob).text();
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text, {
    encoding: Crypto.CryptoEncoding.HEX,
  });
}

export type DatabaseCollections = {
  users: RxCollection<UserDoc>;
  groups: RxCollection<GroupDoc>;
  groupMembers: RxCollection<GroupMemberDoc>;
  categories: RxCollection<CategoryDoc>;
  expenses: RxCollection<ExpenseDoc>;
  expenseParticipants: RxCollection<ExpenseParticipantDoc>;
  syncQueue: RxCollection<any>;
};

export type CollectionName = keyof DatabaseCollections;
export type AppDatabase = RxDatabase<DatabaseCollections>;

export const COLLECTIONS: { name: CollectionName; schema: any }[] = [
  { name: "users", schema: userSchema },
  { name: "groups", schema: groupSchema },
  { name: "groupMembers", schema: groupMemberSchema },
  { name: "categories", schema: categorySchema },
  { name: "expenses", schema: expenseSchema },
  { name: "expenseParticipants", schema: expenseParticipantSchema },
  { name: "syncQueue", schema: syncQueueSchema },
];

export async function createDatabase(): Promise<AppDatabase> {
  const db = await createRxDatabase<DatabaseCollections>({
    name: "genesisdb",
    storage: getAppStorage(),
    hashFunction,
    multiInstance: false,
    ...(__DEV__ ? { ignoreDuplicate: true, closeDuplicates: true } : {}),
  });

  const configs: Record<string, { schema: any }> = {};
  for (const col of COLLECTIONS) configs[col.name] = { schema: col.schema };
  await db.addCollections(configs);

  for (const col of COLLECTIONS) {
    await initTable(col.name);
    const docs = await loadCollection<any>(col.name);
    if (docs.length > 0) {
      try {
        await (db[col.name] as any).bulkInsert(docs);
      } catch (e) {
        console.warn(`[db] hydration bulkInsert ${col.name} failed`, e);
      }
    }
  }

  for (const col of COLLECTIONS) {
    (db[col.name] as any).$.subscribe((event: any) => {
      const d = event.documentData;
      if (!d) return;
      if (event.operation === "DELETE") {
        removeDoc(col.name, d._id).catch((err) =>
          console.error("[db] removeDoc failed", err),
        );
      } else {
        persistDoc(col.name, d).catch((err) =>
          console.error("[db] persistDoc failed", err),
        );
      }
    });
  }

  return db;
}
