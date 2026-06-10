import NetInfo from "@react-native-community/netinfo";
import { useCallback } from "react";
import { api } from "@/common/api/api-client";
import { useDatabase } from "@/db/use-db";
import { useAuthUser } from "@/features/auth/auth-store";
import { generateObjectIdHex } from "@/common/utils/id";
import { enqueue } from "@/sync/outbox";
import {
  triggerCollectionSync,
  triggerManualSync,
} from "@/sync/network-monitor";
import { DEFAULT_CATEGORIES } from "@/features/categories/constants";
import type { GroupDoc } from "@/db/schemas/group.schema";

type CreateGroupInput = {
  name: string;
  description?: string;
  allCreateExpenses?: boolean;
  /** Local `file://` URI or remote URL; uploaded on push. */
  imageUrl?: string;
};

type UpdateGroupInput = {
  name?: string;
  description?: string;
  imageUrl?: string;
};

/** Generates a 6-char uppercase invite code locally (works offline). */
function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function syncOnlineIfPossible(fn: () => Promise<unknown>) {
  const net = await NetInfo.fetch();
  if (net.isConnected && net.isInternetReachable !== false) {
    try {
      await fn();
    } catch (e) {
      console.error("[sync] groups sync after mutation failed", e);
    }
  }
}

/**
 * Group mutations. `createGroup` writes the group, the admin's membership and
 * the 5 default categories locally (offline-first) and enqueues each for push.
 * `joinGroup` is an online-only action: the server resolves the invite code and
 * creates the membership, then we pull the now-visible group data down.
 */
export function useGroupsMutations() {
  const { db } = useDatabase();
  const authUser = useAuthUser();

  const createGroup = useCallback(
    async (input: CreateGroupInput): Promise<string> => {
      if (!db) throw new Error("Database not ready");
      if (!authUser) throw new Error("Not authenticated");

      const now = new Date().toISOString();
      const groupId = generateObjectIdHex();
      const group: GroupDoc = {
        _id: groupId,
        name: input.name,
        ...(input.description ? { description: input.description } : {}),
        ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
        inviteCode: generateInviteCode(),
        adminUserId: authUser._id,
        allCreateExpenses: input.allCreateExpenses ?? true,
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      };
      await (db.groups as any).insert(group);
      await enqueue(db, {
        collectionName: "groups",
        docId: groupId,
        operation: "create",
        payload: group as unknown as Record<string, unknown>,
      });

      // Admin membership
      const memberId = generateObjectIdHex();
      const member = {
        _id: memberId,
        groupId,
        userId: authUser._id,
        createdAt: now,
        updatedAt: now,
      };
      await (db.groupMembers as any).insert(member);
      await enqueue(db, {
        collectionName: "groupMembers",
        docId: memberId,
        operation: "create",
        payload: member,
      });

      // Seed default categories
      for (const c of DEFAULT_CATEGORIES) {
        const catId = generateObjectIdHex();
        const category = {
          _id: catId,
          groupId,
          name: c.name,
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
      }

      await syncOnlineIfPossible(async () => {
        await triggerCollectionSync(db, "groups");
        await triggerCollectionSync(db, "groupMembers");
        await triggerCollectionSync(db, "categories");
      });

      return groupId;
    },
    [db, authUser],
  );

  /**
   * Update a group's editable fields (name/description/cover image). Offline-first:
   * patches the local doc, enqueues an `update` push, and triggers a sync if online.
   * A local `file://` imageUrl is uploaded to S3 by the push pipeline on drain.
   */
  const updateGroup = useCallback(
    async (groupId: string, input: UpdateGroupInput): Promise<void> => {
      if (!db) throw new Error("Database not ready");

      const doc = await (db.groups as any)
        .findOne({ selector: { _id: groupId } })
        .exec();
      if (!doc) throw new Error("Grupo não encontrado");

      const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
      if (input.name !== undefined) patch.name = input.name;
      if (input.description !== undefined) patch.description = input.description;
      if (input.imageUrl !== undefined) patch.imageUrl = input.imageUrl;

      await doc.patch(patch);

      await enqueue(db, {
        collectionName: "groups",
        docId: groupId,
        operation: "update",
        payload: { _id: groupId, ...patch },
      });

      await syncOnlineIfPossible(async () => {
        await triggerCollectionSync(db, "groups");
      });
    },
    [db],
  );

  /**
   * Join a group by invite code. Online-only: posts to the dedicated endpoint
   * (server resolves the code + creates membership), then pulls everything so
   * the new group, members, categories and expenses appear locally.
   */
  const joinGroup = useCallback(
    async (inviteCode: string): Promise<void> => {
      if (!db) throw new Error("Database not ready");
      const net = await NetInfo.fetch();
      if (!net.isConnected) {
        throw new Error("É preciso estar online para entrar em um grupo");
      }
      await api.post("/groups/join", { inviteCode: inviteCode.toUpperCase() });
      await triggerManualSync(db);
    },
    [db],
  );

  return { createGroup, updateGroup, joinGroup };
}
