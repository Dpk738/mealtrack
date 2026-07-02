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
    
    // 1. Check if 'meals' table exists
    const { error: mealsErr } = await testClient.from('meals').select('id').limit(1);
    if (mealsErr) {
      if (mealsErr.message.includes('relation "meals" does not exist') || mealsErr.code === '42P01') {
        return { 
          success: false, 
          message: 'Connected to Supabase, but "meals" table is missing. Please run the SQL script to create your tables.' 
        };
      }
      return { 
        success: false, 
        message: `Connection failed: ${mealsErr.message}` 
      };
    }

    // 2. Check if 'water' table exists
    const { error: waterErr } = await testClient.from('water').select('id').limit(1);
    if (waterErr) {
      if (waterErr.message.includes('relation "water" does not exist') || waterErr.code === '42P01') {
        return { 
          success: false, 
          message: 'Connected to Supabase, but "water" table is missing. Please run the SQL script to create your tables.' 
        };
      }
      return { 
        success: false, 
        message: `Connection failed: ${waterErr.message}` 
      };
    }

    // 3. Check if 'profiles' table exists
    const { error: profilesErr } = await testClient.from('profiles').select('id').limit(1);
    if (profilesErr) {
      if (profilesErr.message.includes('relation "profiles" does not exist') || profilesErr.code === '42P01') {
        return { 
          success: false, 
          message: 'Connected to Supabase, but "profiles" table is missing. Please run the SQL script to create your tables.' 
        };
      }
      return { 
        success: false, 
        message: `Connection failed: ${profilesErr.message}` 
      };
    }
    
    return { success: true, message: 'Connection successful!' };
  } catch (e: any) {
    return { success: false, message: `Invalid Supabase configuration: ${e.message || e}` };
  }
}
