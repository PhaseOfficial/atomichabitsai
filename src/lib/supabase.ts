import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  "https://xhkkjelhmvepsouuibvs.supabase.co";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_g0QLc9OmyjBI1-mtUvz8Gg_qK8DG-Nl";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
