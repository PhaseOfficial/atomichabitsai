import { supabase } from './supabase';
import { getDb } from '../db/database';
import { updateHabitStreak } from './habit-logic';

export interface SyncOperation {
  id?: number;
  table_name: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: string; // JSON string
  created_at?: string;
}

const isUUID = (str: string) => {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(str);
};

export const addToSyncQueue = async (
  table_name: string,
  operation: 'INSERT' | 'UPDATE' | 'DELETE',
  payload: any
) => {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO sync_queue (table_name, operation, payload) VALUES (?, ?, ?)',
    [table_name, operation, JSON.stringify(payload)]
  );
};

/**
 * Updates pending payloads in the sync queue when a temporary ID is replaced by a real UUID
 */
const updateQueuePayloads = async (oldId: string, newId: string) => {
  const db = await getDb();
  const queue: SyncOperation[] = await db.getAllAsync('SELECT * FROM sync_queue');
  
  for (const item of queue) {
    if (item.payload.includes(oldId)) {
      // Use more careful replacement for IDs to avoid partial matches
      // but IDs here are usually unique strings like "8zztim"
      const updatedPayload = item.payload.replace(new RegExp(`"${oldId}"`, 'g'), `"${newId}"`);
      if (updatedPayload !== item.payload) {
        await db.runAsync('UPDATE sync_queue SET payload = ? WHERE id = ?', [updatedPayload, item.id]);
      }
    }
  }
};

export const syncWithSupabase = async () => {
  const db = await getDb();
  const queue: SyncOperation[] = await db.getAllAsync('SELECT * FROM sync_queue ORDER BY id ASC');

  if (queue.length === 0) {
    await pullFromServer();
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();

  for (const item of queue) {
    try {
      // Re-fetch item from DB to get latest payload (might have been updated by previous iteration)
      const currentItem = await db.getFirstAsync<SyncOperation>('SELECT * FROM sync_queue WHERE id = ?', [item.id]);
      if (!currentItem) continue;
      
      const payload = JSON.parse(currentItem.payload);
      
      if (!user) continue; 
      
      // Validation for habit_id in logs - if it's not a UUID, we can't sync it yet
      if (item.table_name === 'logs' && payload.habit_id && !isUUID(payload.habit_id)) {
        console.warn(`Postponing sync for log ${item.id}: habit_id "${payload.habit_id}" is still a temporary ID`);
        continue; 
      }

      let error;
      let remoteData;

      const tablesWithUserId = ['habits', 'schedules', 'shortcuts', 'tasks'];

      switch (item.operation) {
        case 'INSERT':
          // ALWAYS remove the local temp ID for INSERTs so Supabase can generate a valid UUID
          const { id: localId, ...insertPayload } = payload;
          
          if (tablesWithUserId.includes(item.table_name)) {
            if (insertPayload.user_id === 'guest' || !insertPayload.user_id) {
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
            // Re-fetch item to ensure we haven't lost it in a concurrent run
            await db.withTransactionAsync(async () => {
              // 1. Update foreign keys in other local tables first
              if (item.table_name === 'habits') {
                await db.runAsync('UPDATE logs SET habit_id = ? WHERE habit_id = ?', [remoteData.id, localId]);
              }

              // 2. Update the actual table locally
              if (tablesWithUserId.includes(item.table_name)) {
                await db.runAsync(
                  `UPDATE ${item.table_name} SET id = ?, user_id = ? WHERE id = ?`,
                  [remoteData.id, user.id, localId]
                );
              } else {
                await db.runAsync(
                  `UPDATE ${item.table_name} SET id = ? WHERE id = ?`,
                  [remoteData.id, localId]
                );
              }

              // 3. Update other items in the sync queue that might use this old ID
              await updateQueuePayloads(localId, remoteData.id);
            });
          }
          break;
          
        case 'UPDATE':
          if (tablesWithUserId.includes(item.table_name) && payload.user_id === 'guest') {
            payload.user_id = user.id;
          }
          ({ error } = await supabase.from(item.table_name).update(payload).eq('id', payload.id));
          break;
          
        case 'DELETE':
          ({ error } = await supabase.from(item.table_name).delete().eq('id', payload.id));
          break;
      }

      if (!error) {
        await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [item.id]);
      } else {
        console.error(`Sync error for item ${item.id} (${item.table_name}):`, error.message);
        // If it's an RLS or invalid input error that won't be fixed by retrying, remove it
        if (error.code === '42P01' || error.code === '23503' || error.code === '22P02' || error.message.includes('row-level security')) {
           await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [item.id]);
        }
      }
    } catch (err) {
      console.error('Failed to parse sync item payload:', item.id, err);
      await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [item.id]);
    }
  }
};

export const pullFromServer = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const db = await getDb();
  const tables = ['habits', 'schedules', 'logs', 'shortcuts', 'tasks'];

  for (const table of tables) {
    try {
      let query = supabase.from(table).select('*');
      
      const tablesWithUserId = ['habits', 'schedules', 'shortcuts', 'tasks'];
      if (tablesWithUserId.includes(table)) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (!error && data) {
        for (const remoteItem of data) {
          const localItem = await db.getFirstAsync(`SELECT id FROM ${table} WHERE id = ?`, [remoteItem.id]);
          
          if (localItem) {
            const keys = Object.keys(remoteItem).filter(k => k !== 'id');
            const setClause = keys.map(k => `${k} = ?`).join(',');
            const values = [...keys.map(k => {
              const val = remoteItem[k];
              return typeof val === 'object' ? JSON.stringify(val) : val;
            }), remoteItem.id];
            
            await db.runAsync(`UPDATE ${table} SET ${setClause} WHERE id = ?`, values as any);
          } else {
            const keys = Object.keys(remoteItem);
            const placeholders = keys.map(() => '?').join(',');
            const values = keys.map(k => {
              const val = remoteItem[k];
              return typeof val === 'object' ? JSON.stringify(val) : val;
            });
            
            await db.runAsync(`INSERT OR IGNORE INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`, values as any);
          }
        }
      }
    } catch (err) {
      console.error(`Failed to pull table ${table}:`, err);
    }
  }
};

export const performMutation = async (
  table_name: string,
  operation: 'INSERT' | 'UPDATE' | 'DELETE',
  payload: any
) => {
  const db = await getDb();
  
  switch (operation) {
    case 'INSERT':
      const keys = Object.keys(payload).join(',');
      const placeholders = Object.keys(payload).map(() => '?').join(',');
      const values = Object.values(payload).map(v => typeof v === 'object' ? JSON.stringify(v) : v);
      await db.runAsync(`INSERT INTO ${table_name} (${keys}) VALUES (${placeholders})`, values as any);
      break;
    case 'UPDATE':
      const setClause = Object.keys(payload)
        .filter(k => k !== 'id')
        .map(k => `${k} = ?`)
        .join(',');
      const updateValues = [
        ...Object.entries(payload)
          .filter(([k]) => k !== 'id')
          .map(([, v]) => typeof v === 'object' ? JSON.stringify(v) : v), 
        payload.id
      ];
      await db.runAsync(`UPDATE ${table_name} SET ${setClause} WHERE id = ?`, updateValues as any);
      break;
    case 'DELETE':
      await db.runAsync(`DELETE FROM ${table_name} WHERE id = ?`, [payload.id]);
      break;
  }

  // Handle streak maintenance
  if (table_name === 'logs') {
    if (payload.habit_id) {
      await updateHabitStreak(payload.habit_id);
    }
  } else if (table_name === 'habits' && (operation === 'UPDATE' || operation === 'INSERT')) {
    // If weekend_flexibility changed or new habit added, recalculate/init
    await updateHabitStreak(payload.id);
  }

  await addToSyncQueue(table_name, operation, payload);
  syncWithSupabase().catch(console.error);
};
