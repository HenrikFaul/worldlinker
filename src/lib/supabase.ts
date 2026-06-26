import type { SupabaseClient } from '@supabase/supabase-js';

// Cloud is entirely optional. When the env vars are absent the game stays 100%
// functional offline and getSupabase() resolves to null. The supabase-js library
// is dynamically imported so it only ships (as a separate chunk) when cloud is
// actually configured and used — keeping the initial bundle lean.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isCloudConfigured = (): boolean => Boolean(url && anonKey);

let clientPromise: Promise<SupabaseClient | null> | null = null;

export function getSupabase(): Promise<SupabaseClient | null> {
  if (!isCloudConfigured()) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(url!, anonKey!, { auth: { persistSession: true, autoRefreshToken: true } }),
    );
  }
  return clientPromise;
}
