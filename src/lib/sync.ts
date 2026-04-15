import { supabase } from './supabase';
import { getDb } from '../db/database';
import * as SQLite from 'expo-sqlite';

export interface SyncOperation {
  id?: number;
  table_name: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: string; // JSON string
  created_at?: string;
}

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

export const syncWithSupabase = async () => {
  const db = await getDb();
  const queue: SyncOperation[] = await db.getAllAsync('SELECT * FROM sync_queue ORDER BY id ASC');

  if (queue.length === 0) return;

  for (const item of queue) {
    try {
      const payload = JSON.parse(item.payload);
      let error;

      switch (item.operation) {
        case 'INSERT':
          ({ error } = await supabase.from(item.table_name).insert(payload));
          break;
        case 'UPDATE':
          // Assume payload contains the primary key 'id'
          ({ error } = await supabase.from(item.table_name).update(payload).eq('id', payload.id));
          break;
        case 'DELETE':
          ({ error } = await supabase.from(item.table_name).delete().eq('id', payload.id));
          break;
      }

      if (!error) {
        // Success: Remove from local queue
        await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [item.id]);
      } else {
        console.error(`Sync error for item ${item.id}:`, error.message);
        // Maybe break here to avoid processing out-of-order dependencies if needed
      }
    } catch (err) {
      console.error('Failed to parse sync item payload:', item.id, err);
    }
  }
};

/**
 * Perform a local mutation and queue for sync.
 */
export const performMutation = async (
  table_name: string,
  operation: 'INSERT' | 'UPDATE' | 'DELETE',
  payload: any
) => {
  const db = await getDb();
  
  // Apply to local DB
  switch (operation) {
    case 'INSERT':
      const keys = Object.keys(payload).join(',');
      const placeholders = Object.keys(payload).map(() => '?').join(',');
      const values = Object.values(payload);
      await db.runAsync(`INSERT INTO ${table_name} (${keys}) VALUES (${placeholders})`, values as any);
      break;
    case 'UPDATE':
      const setClause = Object.keys(payload)
        .filter(k => k !== 'id')
        .map(k => `${k} = ?`)
        .join(',');
      const updateValues = [...Object.entries(payload).filter(([k]) => k !== 'id').map(([, v]) => v), payload.id];
      await db.runAsync(`UPDATE ${table_name} SET ${setClause} WHERE id = ?`, updateValues as any);
      break;
    case 'DELETE':
      await db.runAsync(`DELETE FROM ${table_name} WHERE id = ?`, [payload.id]);
      break;
  }

  // Queue for sync
  await addToSyncQueue(table_name, operation, payload);
  
  // Try sync immediately if online (optional, can be done by a hook)
  syncWithSupabase().catch(console.error);
};
