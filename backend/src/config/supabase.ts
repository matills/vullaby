import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  logger.error('Missing Supabase environment variables');
  throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set');
}

// Client for general operations (respects RLS)
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Admin client (bypasses RLS) - use with caution
export const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null;

logger.info('Supabase client initialized');
