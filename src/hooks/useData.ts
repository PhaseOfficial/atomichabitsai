import { useCallback, useEffect, useState, useRef } from "react";
import { getDb } from "../db/database";
import { subscribeToDatabaseChanges } from "../lib/sync";

export function useData<T>(query: string, params: any[] = []) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const paramsRef = useRef(JSON.stringify(params));
  const queryRef = useRef(query);
  const dataRef = useRef(JSON.stringify([]));

  const fetchData = useCallback(
    async (isCancelled: () => boolean) => {
      // Don't set loading true if we already have data to avoid jitter
      // unless it's the first load
      try {
        const db = await getDb();
        if (!db) {
          if (!isCancelled()) setData([]);
          return;
        }
        
        const currentParams = JSON.parse(paramsRef.current);
        const sanitizedParams = currentParams.map((p: any) =>
          p === null || p === undefined ? null : String(p),
        );

        const result = await db.getAllAsync(queryRef.current, sanitizedParams);

        if (!isCancelled()) {
          const stringifiedResult = JSON.stringify(result);
          // ONLY update state if the data actually changed
          if (stringifiedResult !== dataRef.current) {
            dataRef.current = stringifiedResult;
            setData(result as T[]);
          }
          setError(null);
        }
      } catch (err) {
        if (!isCancelled()) {
          console.error("Database query error:", err, queryRef.current, paramsRef.current);
          setError(err as Error);
        }
      } finally {
        if (!isCancelled()) {
          setLoading(false);
        }
      }
    },
    [], 
  );

  // Handle parameter changes
  useEffect(() => {
    const stringifiedParams = JSON.stringify(params);
    if (stringifiedParams !== paramsRef.current || query !== queryRef.current) {
      paramsRef.current = stringifiedParams;
      queryRef.current = query;
      setLoading(true);
      fetchData(() => false);
    }
  }, [query, JSON.stringify(params), fetchData]);

  // Handle external database changes with a small debounce
  useEffect(() => {
    let cancelled = false;
    const isCancelled = () => cancelled;
    let timeout: any = null;

    fetchData(isCancelled);

    const unsubscribe = subscribeToDatabaseChanges(() => {
      if (cancelled) return;
      
      // Debounce the re-fetch to handle batch mutations
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (!cancelled) {
          fetchData(isCancelled);
        }
      }, 50);
    });

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
      unsubscribe();
    };
  }, [fetchData]);

  const refresh = useCallback(() => fetchData(() => false), [fetchData]);

  return { data, loading, error, refresh };
}
