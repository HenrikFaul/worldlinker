import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Cloud is entirely optional: when the env vars are absent (e.g. local play with
// no project), the app stays 100% functional offline and these are no-ops.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: { persistSession: true, autoRefreshToken: true },
      })
    : null;

export const isCloudEnabled = () => supabase !== null;
