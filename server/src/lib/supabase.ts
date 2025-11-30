import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing Supabase env variables: set SUPABASE_URL and SUPABASE_ANON_KEY (backend)."
  );
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY - required for admin operations (auth.admin, activation flows)."
  );
}

// Client-scoped (RLS-enforced) operations, using anon key
export const supabaseUserScoped = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// Admin client for server-side use only (SERVICE_ROLE)
// WARNING: never expose this key in frontend code.
export const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);
