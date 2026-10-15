import { createClient, SupabaseClient } from '@supabase/supabase-js';

const env = (import.meta as any).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL || 'https://api.alhawia.store';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_dBIW0ICS5NhTyAQgNTjdpw_UFpQEzW1';

let supabaseClient: SupabaseClient | null = null;
let currentClientToken: string | null = null;

export function getSupabase(): SupabaseClient {
  const token = typeof window !== 'undefined' ? localStorage.getItem('shabakati_access_token') : null;

  if (!supabaseClient || currentClientToken !== token) {
    currentClientToken = token;
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: token ? {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      } : {},
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return supabaseClient;
}

export const SUPABASE_URL = supabaseUrl;
export const SUPABASE_ANON_KEY = supabaseAnonKey;

