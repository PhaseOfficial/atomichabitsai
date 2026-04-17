import { useCallback, useEffect, useState } from "react";
import { getDb } from "../db/database";
import { subscribeToDatabaseChanges } from "../lib/sync";

export function useData<T>(query: string, params: any[] = []) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(
    async (isCancelled: () => boolean) => {
      setLoading(true);
      try {
        const db = await getDb();
        if (!db) {
          if (!isCancelled()) setData([]);
          return;
        }
        // Ensure all params are strings or numbers for SQLite, handle undefined as null
        const sanitizedParams = params.map((p) =>
          p === null || p === undefined ? null : String(p),
        );

        const result = await db.getAllAsync(query, sanitizedParams);

        if (!isCancelled()) {
          setData(result as T[]);
          setError(null);
        }
      } catch (err) {
        if (!isCancelled()) {
          console.error("Database query error:", err, query, params);
          setError(err as Error);
        }
      } finally {
        if (!isCancelled()) {
          setLoading(false);
        }
      }
    },
    [query, JSON.stringify(params)],
  );

  useEffect(() => {
    let cancelled = false;
    const isCancelled = () => cancelled;

    fetchData(isCancelled);
    const unsubscribe = subscribeToDatabaseChanges(() => {
      if (!cancelled) {
        fetchData(isCancelled);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [fetchData]);

  return { data, loading, error, refresh: () => fetchData(() => false) };
}
