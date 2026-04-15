
export interface SyncOperation {
  id?: number;
  table_name: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  payload: string;
  created_at?: string;
}

export const addToSyncQueue = async (
  table_name: string,
  operation: "INSERT" | "UPDATE" | "DELETE",
  payload: any,
) => {
  console.warn("Sync queue is disabled on web.");
};

export const syncWithSupabase = async () => {
  console.warn("Sync is disabled on web.");
};

export const performMutation = async (
  table_name: string,
  operation: "INSERT" | "UPDATE" | "DELETE",
  payload: any,
) => {
  console.warn("Local mutation sync is disabled on web.");
  await addToSyncQueue(table_name, operation, payload);
  await syncWithSupabase();
};
