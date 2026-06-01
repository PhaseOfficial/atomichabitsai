import { getDb } from "../db/database";
import { updateHabitStreak } from "./habit-logic";
import { supabase } from "./supabase";

export interface SyncOperation {
  id?: number;
  table_name: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  payload: string; // JSON string
  created_at?: string;
}

let currentSyncPromise: Promise<void> | null = null;
const databaseChangeListeners = new Set<() => void>();

export const subscribeToDatabaseChanges = (listener: () => void) => {
  databaseChangeListeners.add(listener);
  return () => databaseChangeListeners.delete(listener);
};

const emitDatabaseChange = () => {
  for (const listener of databaseChangeListeners) {
    try {
      listener();
    } catch (err) {
      console.error("Database change listener error:", err);
    }
  }
};

const isUUID = (str: string) => {
  const regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(str);
};

const replaceIdsInPayload = (value: any, oldId: string, newId: string): any => {
  if (value === oldId) {
    return newId;
  }

  if (Array.isArray(value)) {
    return value.map((item) => replaceIdsInPayload(item, oldId, newId));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        replaceIdsInPayload(entry, oldId, newId),
      ]),
    );
  }

  return value;
};

export const addToSyncQueue = async (
  table_name: string,
  operation: "INSERT" | "UPDATE" | "DELETE",
  payload: any,
): Promise<number | undefined> => {
  const db = await getDb();
  const result = await db.runAsync(
    "INSERT INTO sync_queue (table_name, operation, payload) VALUES (?, ?, ?)",
    [table_name, operation, JSON.stringify(payload)],
  );
  return result.lastInsertRowId;
};

/**
 * Updates pending payloads in the sync queue when a temporary ID is replaced by a real UUID
 */
const updateQueuePayloads = async (oldId: string, newId: string) => {
  const db = await getDb();
  const queue: SyncOperation[] = await db.getAllAsync(
    "SELECT * FROM sync_queue",
  );

  for (const item of queue) {
    try {
      const parsedPayload = JSON.parse(item.payload);
      const replacedPayload = replaceIdsInPayload(parsedPayload, oldId, newId);
      const updatedPayload = JSON.stringify(replacedPayload);
      if (updatedPayload !== item.payload) {
        await db.runAsync("UPDATE sync_queue SET payload = ? WHERE id = ?", [
          updatedPayload,
          item.id,
        ]);
      }
    } catch {
      // Keep the original payload if parsing fails
    }
  }
};

const migrateGuestDataToUser = async (userId: string) => {
  const db = await getDb();
  const tablesWithUserId = ["habits", "schedules", "shortcuts", "tasks", "books", "reading_logs", "bookmarks", "logs"];

  for (const table of tablesWithUserId) {
    await db.runAsync(`UPDATE ${table} SET user_id = ? WHERE user_id = ?`, [
      userId,
      "guest",
    ]);
  }

  const queue: SyncOperation[] = await db.getAllAsync(
    "SELECT * FROM sync_queue",
  );

  for (const item of queue) {
    if (item.payload.includes('"user_id":"guest"')) {
      const updatedPayload = item.payload.replace(
        /"user_id":"guest"/g,
        `"user_id":"${userId}"`,
      );
      if (updatedPayload !== item.payload) {
        await db.runAsync("UPDATE sync_queue SET payload = ? WHERE id = ?", [
          updatedPayload,
          item.id,
        ]);
      }
    }
  }
};

const hasPendingHabitInsert = (queue: SyncOperation[], habitId: string) => {
  return queue.some((item) => {
    if (item.table_name !== "habits" || item.operation !== "INSERT") {
      return false;
    }
    try {
      const payload = JSON.parse(item.payload);
      return payload.id === habitId;
    } catch {
      return false;
    }
  });
};

const processSyncItem = async (item: SyncOperation, user: any, db: any) => {
  let payload: any;
  try {
    payload = JSON.parse(item.payload);
  } catch (e) {
    console.error(`Failed to parse payload for item ${item.id}:`, item.payload);
    await db.runAsync("DELETE FROM sync_queue WHERE id = ?", [item.id]);
    return true;
  }

  const tablesWithUserId = ["habits", "schedules", "shortcuts", "tasks", "books", "reading_logs", "bookmarks", "logs", "sync_history"];

  // HEAL: Strip 'last_page_read' from books if it exists (legacy column mismatch)
  if (item.table_name === "books" && payload.hasOwnProperty("last_page_read")) {
    const { last_page_read, ...cleanPayload } = payload;
    payload = cleanPayload;
  }

  // HEAL: Detect and fix missing columns in reading_logs on server
  if (item.table_name === "reading_logs") {
    // If the server doesn't have these yet, we might want to strip them
    // but for now we'll let it fail and provide the SQL to the user.
    // However, to keep sync moving for other items, we can add a check:
  }

  // HEAL: Detect and fix "undefined" strings in UUID fields
  if (payload.id === "undefined") {
    console.warn(`Item ${item.id} (${item.table_name}) has "undefined" as ID. Abandoning.`);
    await db.runAsync("DELETE FROM sync_queue WHERE id = ?", [item.id]);
    return true;
  }

  if (payload.user_id === "undefined") {
    payload.user_id = user.id;
  }

  // Handle foreign key relationships that might still be using temporary IDs
  const fkFields: Record<string, string> = {
    'logs': 'habit_id',
    'reading_logs': 'book_id',
    'bookmarks': 'book_id',
    'habits': 'anchor_habit_id'
  };

  const fkField = fkFields[item.table_name];
  if (fkField && payload[fkField]) {
    const fkValue = payload[fkField];
    
    if (fkValue === 'focus-session' && item.table_name === 'logs') {
      await db.runAsync("DELETE FROM sync_queue WHERE id = ?", [item.id]);
      return true;
    }

    if (fkValue === 'undefined') {
        console.warn(`Item ${item.id} (${item.table_name}) has "undefined" as ${fkField}. Abandoning.`);
        await db.runAsync("DELETE FROM sync_queue WHERE id = ?", [item.id]);
        return true;
    }

    if (!isUUID(fkValue)) {
      // Try to find the mapped UUID in sync_history or local table
      const history = await db.getFirstAsync<{new_id: string}>(
        "SELECT new_id FROM sync_history WHERE old_id = ?", 
        [fkValue]
      );
      
      if (history && isUUID(history.new_id)) {
        payload[fkField] = history.new_id;
        await db.runAsync("UPDATE sync_queue SET payload = ? WHERE id = ?", [JSON.stringify(payload), item.id]);
      } else {
        // Threshold check for orphaned items
        const createdTime = item.created_at ? new Date(item.created_at).getTime() : Date.now();
        const now = Date.now();
        if (now - createdTime > 30 * 60 * 1000) {
          console.warn(`Abandoning orphaned ${item.table_name} item ${item.id}: ${fkField} "${fkValue}" is not a UUID after 30m.`);
          await db.runAsync("DELETE FROM sync_queue WHERE id = ?", [item.id]);
          return true;
        }

        console.warn(`Postponing sync for ${item.table_name} ${item.id}: ${fkField} "${fkValue}" is still a temporary ID.`);
        return false;
      }
    }
  }

  let error;
  let remoteData;

  switch (item.operation) {
    case "INSERT": {
      const { id: localId, ...insertPayload } = payload;

      if (tablesWithUserId.includes(item.table_name)) {
        if (insertPayload.user_id === "guest" || !insertPayload.user_id || insertPayload.user_id === "undefined") {
          insertPayload.user_id = user.id;
        }
      }

      const { data: insertedData, error: insertError } = await supabase
        .from(item.table_name)
        .insert(insertPayload)
        .select()
        .single();

      error = insertError;
      remoteData = insertedData;

      if (!error && remoteData) {
        await db.withTransactionAsync(async () => {
          // Special case for habits/logs relationship
          if (item.table_name === "habits") {
            await db.runAsync(
              "UPDATE logs SET habit_id = ? WHERE habit_id = ?",
              [remoteData.id, localId],
            );
          }

          if (tablesWithUserId.includes(item.table_name)) {
            await db.runAsync(
              `UPDATE ${item.table_name} SET id = ?, user_id = ? WHERE id = ?`,
              [remoteData.id, user.id, localId],
            );
          } else {
            await db.runAsync(
              `UPDATE ${item.table_name} SET id = ? WHERE id = ?`,
              [remoteData.id, localId],
            );
          }

          // Record ID mapping in sync_history
          await db.runAsync(
            "INSERT OR REPLACE INTO sync_history (old_id, new_id, table_name) VALUES (?, ?, ?)",
            [localId, remoteData.id, item.table_name]
          );

          await updateQueuePayloads(localId, remoteData.id);
        });

        emitDatabaseChange();
      }
      break;
    }

    case "UPDATE": {
      if (
        tablesWithUserId.includes(item.table_name) &&
        (payload.user_id === "guest" || payload.user_id === "undefined")
      ) {
        payload.user_id = user.id;
      }

      // Final check: if ID is still not a UUID for an update, it's doomed unless we find it in history
      if (!isUUID(payload.id)) {
          const history = await db.getFirstAsync<{new_id: string}>("SELECT new_id FROM sync_history WHERE old_id = ?", [payload.id]);
          if (history && isUUID(history.new_id)) {
              payload.id = history.new_id;
          } else {
              console.error(`Cannot UPDATE ${item.table_name}: ID ${payload.id} is not a UUID and no mapping found.`);
              await db.runAsync("DELETE FROM sync_queue WHERE id = ?", [item.id]);
              return true;
          }
      }

      ({ error } = await supabase
        .from(item.table_name)
        .update(payload)
        .eq("id", payload.id));
      break;
    }

    case "DELETE": {
      if (!isUUID(payload.id)) {
          const history = await db.getFirstAsync<{new_id: string}>("SELECT new_id FROM sync_history WHERE old_id = ?", [payload.id]);
          if (history && isUUID(history.new_id)) {
              payload.id = history.new_id;
          } else {
              // If we can't find the remote ID, it probably never synced, so just delete locally
              await db.runAsync("DELETE FROM sync_queue WHERE id = ?", [item.id]);
              return true;
          }
      }
      ({ error } = await supabase
        .from(item.table_name)
        .delete()
        .eq("id", payload.id));
      break;
    }
  }

  if (!error) {
    await db.runAsync("DELETE FROM sync_queue WHERE id = ?", [item.id]);
    emitDatabaseChange();
  } else {
    console.error(
      `Sync error for item ${item.id} (${item.table_name}):`,
      error.message,
      "Payload:", JSON.stringify(payload)
    );
    if (
      error.code === "42P01" ||
      error.code === "23503" ||
      error.code === "22P02" ||
      error.message.includes("row-level security") ||
      error.message.includes("uuid")
    ) {
      await db.runAsync("DELETE FROM sync_queue WHERE id = ?", [item.id]);
      emitDatabaseChange();
    }
  }

  return true;
};

export const syncWithSupabase = async () => {
  if (currentSyncPromise) {
    return currentSyncPromise;
  }

  currentSyncPromise = (async () => {
    const db = await getDb();
    const queue: SyncOperation[] = await db.getAllAsync(
      "SELECT * FROM sync_queue ORDER BY id ASC",
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      if (queue.length === 0) {
        await pullFromServer();
      }
      return;
    }

    await migrateGuestDataToUser(user.id);

    if (queue.length === 0) {
      await pullFromServer();
      return;
    }

    let remainingItems = queue;
    let iteration = 0;

    while (remainingItems.length > 0 && iteration < 4) {
      const nextItems: SyncOperation[] = [];
      let anyAttempted = false;

      for (const item of remainingItems) {
        const currentItem = await db.getFirstAsync<SyncOperation>(
          "SELECT * FROM sync_queue WHERE id = ?",
          [item.id],
        );
        if (!currentItem) {
          anyAttempted = true;
          continue;
        }

        const payload = JSON.parse(currentItem.payload);

        if (
          item.table_name === "logs" &&
          payload.habit_id &&
          !isUUID(payload.habit_id) &&
          hasPendingHabitInsert(remainingItems, payload.habit_id)
        ) {
          nextItems.push(item);
          continue;
        }

        const attempted = await processSyncItem(currentItem, user, db);
        if (attempted) {
          anyAttempted = true;
        } else {
          nextItems.push(item);
        }
      }

      if (!anyAttempted) {
        break;
      }

      remainingItems = nextItems;
      iteration += 1;
    }
  })().finally(() => {
    currentSyncPromise = null;
  });

  return currentSyncPromise;
};

export const pullFromServer = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const db = await getDb();

  // Get last sync time
  const lastSyncResult = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'last_pulled_at'",
  );
  const lastPulledAt = lastSyncResult?.value;

  const tables = ["habits", "schedules", "logs", "shortcuts", "tasks", "books", "reading_logs", "bookmarks", "sync_history"];

  for (const table of tables) {
    try {
      let syncTouchedLocalRows = false;
      let query = supabase.from(table).select("*");

      const tablesWithUserId = ["habits", "schedules", "shortcuts", "tasks", "books", "reading_logs", "bookmarks", "logs", "sync_history"];
      if (tablesWithUserId.includes(table)) {
        query = query.eq("user_id", user.id);
      }

      // Incremental sync logic
      if (lastPulledAt) {
        const timeColumn = table === "logs" ? "created_at" : "updated_at";
        query = query.gt(timeColumn, lastPulledAt);
      }

      const { data, error } = await query;

      if (!error && data) {
        for (const remoteItem of data) {
          const localItem = await db.getFirstAsync(
            `SELECT id FROM ${table} WHERE id = ?`,
            [remoteItem.id],
          );

          if (localItem) {
            const keys = Object.keys(remoteItem).filter((k) => k !== "id");
            const setClause = keys.map((k) => `${k} = ?`).join(",");
            const values = [
              ...keys.map((k) => {
                const val = remoteItem[k];
                return typeof val === "object" ? JSON.stringify(val) : val;
              }),
              remoteItem.id,
            ];

            await db.runAsync(
              `UPDATE ${table} SET ${setClause} WHERE id = ?`,
              values as any,
            );
            syncTouchedLocalRows = true;
          } else {
            const keys = Object.keys(remoteItem);
            const placeholders = keys.map(() => "?").join(",");
            const values = keys.map((k) => {
              const val = remoteItem[k];
              return typeof val === "object" ? JSON.stringify(val) : val;
            });

            await db.runAsync(
              `INSERT OR IGNORE INTO ${table} (${keys.join(",")}) VALUES (${placeholders})`,
              values as any,
            );
            syncTouchedLocalRows = true;
          }
        }
      }

      if (syncTouchedLocalRows) {
        emitDatabaseChange();
      }
    } catch (err) {
      console.error(`Failed to pull table ${table}:`, err);
    }
  }

  // Update last sync time
  const now = new Date().toISOString();
  await db.runAsync(
    "INSERT OR REPLACE INTO settings (key, value) VALUES ('last_pulled_at', ?)",
    [now],
  );
};

export const performMutation = async (
  table_name: string,
  operation: "INSERT" | "UPDATE" | "DELETE",
  payload: any,
) => {
  console.log("performMutation START", { table_name, operation, payload });
  
  if (!payload || (typeof payload === 'object' && Object.keys(payload).length === 0)) {
    console.warn("performMutation: empty payload, skipping execution.", { table_name, operation });
    return undefined;
  }

  const db = await getDb();

  switch (operation) {
    case "INSERT":
      const keys = Object.keys(payload).join(",");
      const placeholders = Object.keys(payload)
        .map(() => "?")
        .join(",");
      const values = Object.values(payload).map((v) =>
        typeof v === "object" ? JSON.stringify(v) : v,
      );
      await db.runAsync(
        `INSERT INTO ${table_name} (${keys}) VALUES (${placeholders})`,
        values as any,
      );
      break;
    case "UPDATE":
      const updateKeys = Object.keys(payload).filter((k) => k !== "id");
      if (updateKeys.length === 0) {
        console.warn("performMutation: nothing to update except ID, skipping.", { table_name });
        return undefined;
      }
      const setClause = updateKeys
        .map((k) => `${k} = ?`)
        .join(",");
      const updateValues = [
        ...updateKeys.map((k) => {
            const v = payload[k];
            return typeof v === "object" ? JSON.stringify(v) : v;
        }),
        payload.id,
      ];
      await db.runAsync(
        `UPDATE ${table_name} SET ${setClause} WHERE id = ?`,
        updateValues as any,
      );
      break;
    case "DELETE":
      if (!payload.id) {
          console.error("performMutation: DELETE missing ID.", { table_name });
          return undefined;
      }
      await db.runAsync(`DELETE FROM ${table_name} WHERE id = ?`, [payload.id]);
      break;
  }

  emitDatabaseChange();

  // Handle streak maintenance
  if (table_name === "logs") {
    if (payload.habit_id) {
      await updateHabitStreak(payload.habit_id);
    }
  } else if (
    table_name === "habits" &&
    (operation === "UPDATE" || operation === "INSERT")
  ) {
    // If weekend_flexibility changed or new habit added, recalculate/init
    await updateHabitStreak(payload.id);
  }

  const syncId = await addToSyncQueue(table_name, operation, payload);
  console.log("performMutation RESULT", { success: !!syncId, syncId });
  syncWithSupabase().catch(console.error);
  return syncId;
};
