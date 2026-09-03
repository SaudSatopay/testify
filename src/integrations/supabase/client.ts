import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * True when the frontend has been pointed at a Supabase project.
 * When false the app renders a guided setup screen instead of crashing —
 * see <SupabaseSetupScreen />.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * The shared Supabase client. Only the public URL + anon (publishable) key
 * are used here — the anon key is safe to ship to browsers because every
 * table is protected by Row Level Security. Secret keys (service role,
 * AI provider keys) live exclusively in Edge Function secrets.
 */
export const supabase = createClient<Database>(
  supabaseUrl ?? "https://placeholder.supabase.co",
  supabaseAnonKey ?? "public-anon-key-placeholder",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "testify-auth",
    },
  },
);
