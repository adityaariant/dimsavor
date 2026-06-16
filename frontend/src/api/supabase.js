import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kfbngaiwjvtdjadvbqzo.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_kaO0G6xCCHVLiDIlASudUw_O2N4wbNN';

export const supabase = createClient(supabaseUrl, supabaseKey);
