import { useEffect } from "react";

export function useSync() {
  useEffect(() => {
    // Sync is skipped on web because local SQLite and offline queueing are not supported.
  }, []);
}
