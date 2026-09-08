import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** False when the build had no Supabase credentials. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    "Supabase environment variables are missing. Transaction history and saved recipient lists will not work."
  );
}

/**
 * createClient throws on an empty url or key, and this runs at module load.
 * An unconfigured build therefore took the whole app down before React
 * mounted: no error boundary, no loading screen, just a blank page with
 * nothing on it to explain why.
 *
 * Placeholders keep the app bootable. Supabase calls then fail one at a time
 * and are handled by the existing error paths at each call site, so the rest
 * of the app -- connecting a wallet, building a split, sending it -- carries
 * on working without a database.
 */
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key"
);
