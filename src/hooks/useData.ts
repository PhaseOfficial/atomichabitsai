import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../db/database';

export function useData<T>(query: string, params: any[] = []) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const db = await getDb();
      // Ensure all params are strings or numbers for SQLite
      const sanitizedParams = params.map(p => p === null ? null : String(p));
      const result = await db.getAllAsync(query, sanitizedParams);
      setData(result as T[]);
      setError(null);
    } catch (err) {
      console.error('Database query error:', err, query, params);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [query, JSON.stringify(params)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}
