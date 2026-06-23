import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface Meal {
  id?: number;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO string
  name: string;
  photo_url?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  serving_size: string;
  serving_quantity: number;
  description?: string;
  created_at?: string;
}

export interface WaterLog {
  id?: number;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO string
  amount: number; // in ml
  created_at?: string;
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  let url = (import.meta.env?.VITE_SUPABASE_URL || '').trim();
  let key = (import.meta.env?.VITE_SUPABASE_ANON_KEY || '').trim();

  // If environment variables are empty or contain default placeholders, fall back to localStorage
  if (!url || url.includes('your-project-id.supabase.co')) {
    url = (localStorage.getItem('supabaseUrl') || '').trim();
  }
  if (!key || key === 'your-anon-public-key') {
    key = (localStorage.getItem('supabaseAnonKey') || '').trim();
  }

  if (!url || !key) {
    return null;
  }

  try {
    supabaseInstance = createClient(url, key);
    return supabaseInstance;
  } catch (e) {
    console.error('Error creating Supabase client:', e);
    return null;
  }
}

export function resetSupabaseInstance(url: string, key: string): SupabaseClient | null {
  const finalUrl = url.trim() || import.meta.env?.VITE_SUPABASE_URL || '';
  const finalKey = key.trim() || import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

  if (!finalUrl || !finalKey) {
    supabaseInstance = null;
    return null;
  }
  try {
    supabaseInstance = createClient(finalUrl, finalKey);
    return supabaseInstance;
  } catch (e) {
    console.error('Error resetting Supabase client:', e);
    supabaseInstance = null;
    return null;
  }
}

export async function testSupabaseConnection(url: string, key: string): Promise<{ success: boolean; message: string }> {
  try {
    const testClient = createClient(url, key);
    
    // Attempt to query the meals table to check connection and schema availability
    const { error } = await testClient.from('meals').select('id').limit(1);
    
    if (error) {
      // If error is about table missing, connection is valid but schemas need setup
      if (error.message.includes('relation "meals" does not exist') || error.code === '42P01') {
        return { 
          success: true, 
          message: 'Connected to Supabase, but "meals" table is missing. Run the SQL script to create your tables.' 
        };
      }
      return { 
        success: false, 
        message: `Connection failed: ${error.message}` 
      };
    }
    
    return { success: true, message: 'Connection successful!' };
  } catch (e: any) {
    return { success: false, message: `Invalid Supabase configuration: ${e.message || e}` };
  }
}
