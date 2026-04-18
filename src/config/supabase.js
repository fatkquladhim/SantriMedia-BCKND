import { createClient } from '@supabase/supabase-js';
import { env } from './environment.js';

// Admin client — uses service role key, bypasses RLS
export const supabaseAdmin = createClient(
    env.supabase.url,
    env.supabase.serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

// Public client — uses anon key, respects RLS
export const supabase = createClient(
    env.supabase.url,
    env.supabase.anonKey
);
