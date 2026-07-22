export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

export function requireAuthToWatch(): boolean {
  const raw = process.env.REQUIRE_AUTH_TO_WATCH?.trim().toLowerCase();
  if (raw === "false" || raw === "0") return false;
  // Default on when Supabase is configured
  if (raw === "true" || raw === "1") return true;
  return isSupabaseConfigured();
}

export function requireSubscription(): boolean {
  const raw = process.env.REQUIRE_SUBSCRIPTION?.trim().toLowerCase();
  return raw === "true" || raw === "1";
}

export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  return url;
}

export function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return key;
}
