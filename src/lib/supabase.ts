import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
	throw new Error('Missing Supabase env variables: set SUPABASE_URL and SUPABASE_ANON_KEY');
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
	throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY - required for admin operations');
}

export const supabaseUserScoped = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// For admin use (server-side only) - uses SERVICE_ROLE key for full permissions
// WARNING: service role key must never be exposed to the browser.
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);