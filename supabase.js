import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://mcjumnvjgehqnojfhuga.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_7pH_7UmCE7qNbYa2pQlrQg_lCJ5BcU3';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
