import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { syncWithSupabase } from '../lib/sync';

export function useSync() {
  useEffect(() => {
    // Initial sync
    syncWithSupabase();

    // Sync on network status change
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        syncWithSupabase();
      }
    });

    // Periodic sync every 5 minutes
    const interval = setInterval(syncWithSupabase, 5 * 60 * 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);
}
