import NetInfo from "@react-native-community/netinfo";
import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { syncWithSupabase } from "../lib/sync";

export function useSync() {
  useEffect(() => {
    // Initial sync
    syncWithSupabase();

    // Sync on network status change
    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        syncWithSupabase();
      }
    });

    // Sync on auth state changes so guest data is migrated when signing in
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange(() => {
      syncWithSupabase();
    });

    // Periodic sync every 5 minutes
    const interval = setInterval(syncWithSupabase, 5 * 60 * 1000);

    return () => {
      unsubscribeNetInfo();
      authSubscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);
}
