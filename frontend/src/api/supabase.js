import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;


if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Anon Key. Pastikan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY sudah diisi di Vercel/Environment Variables.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
