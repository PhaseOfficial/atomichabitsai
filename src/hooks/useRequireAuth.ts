import type { User } from "@supabase/supabase-js";
import { useRouter } from "expo-router";
import { useEffect } from "react";

export function useRequireAuth(user: User | null, loading: boolean) {
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);
}
