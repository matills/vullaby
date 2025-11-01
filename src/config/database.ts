import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './env';

const createSupabaseClient = (useServiceKey = false): SupabaseClient => {
  const key = useServiceKey ? config.supabase.serviceKey : config.supabase.anonKey;
  
  if (!key) {
    throw new Error(`Supabase ${useServiceKey ? 'service' : 'anon'} key is missing`);
  }

  return createClient(config.supabase.url, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
    },
  });
};

export const supabase = createSupabaseClient();
export const supabaseAdmin = config.supabase.serviceKey 
  ? createSupabaseClient(true)
  : supabase;