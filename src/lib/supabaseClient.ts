import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Fails loudly at boot rather than as a confusing "fetch failed" once the
  // reader is already looking at the login screen.
  throw new Error(
    "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquent — copie .env.example vers .env et renseigne ton projet Supabase.",
  );
}

export const supabase = createClient(url, anonKey);
