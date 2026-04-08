import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "@/lib/supabase/env";

let serverClient: SupabaseClient | null = null;

export function getSupabaseServerClient() {
  if (serverClient) {
    return serverClient;
  }

  const { url, anonKey } = getSupabaseEnv();

  serverClient = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return serverClient;
}
