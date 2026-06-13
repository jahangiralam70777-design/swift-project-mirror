// Patched client to use generic database types while the exact schema is being restored
import { createClient } from '@supabase/supabase-js';

export type GenericDatabase = {
  __InternalSupabase: { PostgrestVersion: "14.5" }
  public: {
    Tables: { [tableName: string]: { Row: Record<string, any>; Insert: Record<string, any>; Update: Record<string, any>; Relationships: any[] } }
    Views: { [viewName: string]: { Row: Record<string, any>; Relationships: any[] } }
    Functions: { [funcName: string]: { Args: Record<string, any>; Returns: any } }
    Enums: { [enumName: string]: string }
    CompositeTypes: { [typeName: string]: any }
  }
}

function createSupabaseClient() {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ['SUPABASE_URL'] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ['SUPABASE_PUBLISHABLE_KEY'] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(', ')}. Connect Supabase in Lovable Cloud.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return createClient<GenericDatabase>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    }
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

export function getSupabaseClient() {
  if (!_supabase) {
    _supabase = createSupabaseClient();
  }
  return _supabase;
}

export const supabase = getSupabaseClient();
