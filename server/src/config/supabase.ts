import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.ts';

// Validate required environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  logger.error('SUPABASE_URL environment variable is required');
  process.exit(1);
}

if (!supabaseServiceKey) {
  logger.warn('SUPABASE_SERVICE_ROLE_KEY not found, using anon key');
}

if (!supabaseAnonKey) {
  logger.error('SUPABASE_ANON_KEY environment variable is required');
  process.exit(1);
}

// Create Supabase client for admin operations
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Create Supabase client for user operations
export const supabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    }
  }
);

// Test database connection
export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      logger.error('Database connection test failed:', error.message);
      return false;
    }
    
    logger.info('✅ Database connection test successful');
    return true;
  } catch (error) {
    logger.error('Database connection test error:', error);
    return false;
  }
};