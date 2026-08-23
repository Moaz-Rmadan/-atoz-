import { createClient } from '@supabase/supabase-js';

// Production Supabase defaults ensure mobile clients and preview builds stay connected reliably
const DEFAULT_SUPABASE_URL = 'https://konzaudefciolivhohrg.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvbnphdWRlZmNpb2xpdmhvaHJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MTE3MTksImV4cCI6MjEwMjk4NzcxOX0.MHm7wswXDKQoWXwkraPP_Q1KPIesb9Ym6ZHsByMDDAs';

const getEnvVar = (key: string): string | undefined => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch {
    // Ignore runtime access errors
  }
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch {
    // Ignore process access errors
  }
  return undefined;
};

const envUrl = getEnvVar('VITE_SUPABASE_URL');
const envAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

const supabaseUrl =
  envUrl && envUrl !== 'https://placeholder.supabase.co' && !envUrl.includes('placeholder')
    ? envUrl
    : DEFAULT_SUPABASE_URL;

const supabaseAnonKey =
  envAnonKey && envAnonKey !== 'placeholder-anon-key' && !envAnonKey.includes('placeholder')
    ? envAnonKey
    : DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = () => {
  return (
    !!supabaseUrl &&
    !!supabaseAnonKey &&
    supabaseUrl !== 'https://placeholder.supabase.co' &&
    supabaseAnonKey !== 'placeholder-anon-key'
  );
};

export const getSupabaseEndpoint = () => supabaseUrl;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

