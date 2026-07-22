import "server-only";

import { createClient } from "@supabase/supabase-js";
import {
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/env";

export function hasServiceRole(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

/** Service-role client — server only. Bypasses RLS; never import in client components. */
export function createServiceClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured");
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(getSupabaseUrl(), key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
