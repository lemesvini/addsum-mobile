import NetInfo from "@react-native-community/netinfo";
import { useCallback } from "react";
import { generateObjectIdHex } from "@/common/utils/id";
import { useDatabase } from "@/db/use-db";
import type { CategoryDoc } from "@/db/schemas/category.schema";
import { triggerCollectionSync } from "@/sync/network-monitor";
import { enqueue } from "@/sync/outbox";

async function syncOnlineIfPossible(fn: () => Promise<unknown>) {
  const net = await NetInfo.fetch();
  if (net.isConnected && net.isInternetReachable !== false) {
    try {
      await fn();
    } catch (e) {
      console.error("[sync] categories sync after mutation failed", e);
    }
  }
}

/**
 * Category mutations. `createCategory` writes the category locally
 * (offline-first) and enqueues it for push, mirroring the default-category seed
 * in `useGroupsMutations`.
 */
export function useCategoriesMutations() {
  const { db } = useDatabase();

  const createCategory = useCallback(
    async (groupId: string, name: string): Promise<CategoryDoc> => {
      if (!db) throw new Error("Banco de dados indisponível");
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Informe um nome para a categoria");

      const now = new Date().toISOString();
      const catId = generateObjectIdHex();
      const category: CategoryDoc = {
        _id: catId,
        groupId,
        name: trimmed,
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      };

      await (db.categories as any).insert(category);
      await enqueue(db, {
        collectionName: "categories",
        docId: catId,
        operation: "create",
        payload: category,
      });
      await syncOnlineIfPossible(async () => {
        await triggerCollectionSync(db, "categories");
      });

      return category;
    },
    [db],
  );

  return { createCategory };
}
