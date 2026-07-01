import React, { useState, useEffect } from 'react';
import { resetSupabaseInstance, testSupabaseConnection, getSupabase } from '../supabaseClient';
import { Save, Key, Database, Link2, Copy, Check } from 'lucide-react';

interface SettingsProps {
  onSettingsSaved: () => void;
}

export default function Settings({ onSettingsSaved }: SettingsProps) {
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  
  const [calorieGoal, setCalorieGoal] = useState(2000);
  const [proteinGoal, setProteinGoal] = useState(130);
  const [carbGoal, setCarbGoal] = useState(230);
  const [fatGoal, setFatGoal] = useState(65);
  const [waterGoal, setWaterGoal] = useState(2500);

  const [connectionStatus, setConnectionStatus] = useState<{ type: 'success' | 'error' | ''; message: string }>({
    type: '',
    message: ''
  });
  const [testingConnection, setTestingConnection] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Load config from localStorage
    setSupabaseUrl(localStorage.getItem('supabaseUrl') || '');
    setSupabaseAnonKey(localStorage.getItem('supabaseAnonKey') || '');
    setApiKey(localStorage.getItem('geminiApiKey') || '');
    setSelectedModel(localStorage.getItem('geminiModel') || 'gemini-2.5-flash');

    setCalorieGoal(Number(localStorage.getItem('goalCalories')) || 2000);
    setProteinGoal(Number(localStorage.getItem('goalProtein')) || 130);
    setCarbGoal(Number(localStorage.getItem('goalCarbs')) || 230);
    setFatGoal(Number(localStorage.getItem('goalFat')) || 65);
    setWaterGoal(Number(localStorage.getItem('goalWater')) || 2500);

    const checkUser = async () => {
      const supabase = getSupabase();
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      }
    };
    checkUser();
  }, []);

  const handleTestConnection = async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      setConnectionStatus({ type: 'error', message: 'Please input both Supabase URL and Anon Key first.' });
      return;
    }
    setTestingConnection(true);
    setConnectionStatus({ type: '', message: '' });
    
    const result = await testSupabaseConnection(supabaseUrl.trim(), supabaseAnonKey.trim());
    setConnectionStatus({
      type: result.success ? 'success' : 'error',
      message: result.message
    });
    setTestingConnection(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMessage('');

    // Save to localStorage (as cache/fallback)
    localStorage.setItem('supabaseUrl', supabaseUrl.trim());
    localStorage.setItem('supabaseAnonKey', supabaseAnonKey.trim());
    localStorage.setItem('geminiApiKey', apiKey.trim());
    localStorage.setItem('geminiModel', selectedModel);

    const goalCals = Math.max(100, Number(calorieGoal) || 2000);
    const goalProt = Math.max(0, Number(proteinGoal) || 130);
    const goalCarbs = Math.max(0, Number(carbGoal) || 230);
    const goalFat = Math.max(0, Number(fatGoal) || 65);
    const goalWater = Math.max(100, Number(waterGoal) || 2500);

    localStorage.setItem('goalCalories', String(goalCals));
    localStorage.setItem('goalProtein', String(goalProt));
    localStorage.setItem('goalCarbs', String(goalCarbs));
    localStorage.setItem('goalFat', String(goalFat));
    localStorage.setItem('goalWater', String(goalWater));

    // Reset supabase client instance singleton
    resetSupabaseInstance(supabaseUrl.trim(), supabaseAnonKey.trim());

    // Save user profile details to Supabase if logged in
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error } = await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              gemini_api_key: apiKey.trim(),
              goal_calories: goalCals,
              goal_protein: goalProt,
              goal_carbs: goalCarbs,
              goal_fat: goalFat,
              goal_water: goalWater,
              updated_at: new Date().toISOString()
            });
          if (error) {
            console.error('Error saving profile to Supabase:', error);
          }
        }
      } catch (err) {
        console.error('Error writing user profile:', err);
      }
    }

    setSavedMessage('Configuration saved successfully!');
    onSettingsSaved();

    setTimeout(() => {
      setSavedMessage('');
    }, 3000);
  };

  const handleLogout = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) console.error('Sign out error:', error);
      setUser(null);
      onSettingsSaved(); // Refresh App state
    } catch (e) {
      console.error('Error signing out:', e);
    }
  };

  const sqlSchema = `-- Run this in your Supabase SQL Editor:

-- 1. Create profiles table (holds goals and Gemini API keys securely)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  gemini_api_key text,
  goal_calories numeric DEFAULT 2000 NOT NULL,
  goal_protein numeric DEFAULT 130 NOT NULL,
  goal_carbs numeric DEFAULT 230 NOT NULL,
  goal_fat numeric DEFAULT 65 NOT NULL,
  goal_water numeric DEFAULT 2500 NOT NULL
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow individual read" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Allow individual insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Allow individual update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Create meals table with user_id
CREATE TABLE IF NOT EXISTS public.meals (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date text NOT NULL,
  timestamp timestamp with time zone NOT NULL,
  name text NOT NULL,
  photo_url text,
  calories numeric DEFAULT 0 NOT NULL,
  protein numeric DEFAULT 0 NOT NULL,
  carbs numeric DEFAULT 0 NOT NULL,
  fat numeric DEFAULT 0 NOT NULL,
  fiber numeric DEFAULT 0 NOT NULL,
  sugar numeric DEFAULT 0 NOT NULL,
  serving_size text DEFAULT '1 portion'::text NOT NULL,
  serving_quantity numeric DEFAULT 1 NOT NULL,
  description text
);

-- 3. Create water table with user_id
CREATE TABLE IF NOT EXISTS public.water (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date text NOT NULL,
  timestamp timestamp with time zone NOT NULL,
  amount numeric DEFAULT 0 NOT NULL
);

-- Enable RLS Policies for user isolation
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow user read meals" ON public.meals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow user insert meals" ON public.meals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow user update meals" ON public.meals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Allow user delete meals" ON public.meals FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Allow user read water" ON public.water FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow user insert water" ON public.water FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow user update water" ON public.water FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Allow user delete water" ON public.water FOR DELETE USING (auth.uid() = user_id);

-- 4. Set up auto-profile creation trigger on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, gemini_api_key, goal_calories, goal_protein, goal_carbs, goal_fat, goal_water)
  VALUES (new.id, '', 2000, 130, 230, 65, 2500);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="animate-slide-up" style={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', width: '100%', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '8px' }}>
        <h2 style={styles.title}>Setup & Goals</h2>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'rgba(203, 246, 0, 0.03)', padding: '6px 12px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Logged in as <strong style={{ color: 'var(--text-primary)' }}>{user.email}</strong></span>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                backgroundColor: 'rgba(203, 246, 0, 0.05)',
                border: '1px solid var(--border-color)',
                color: '#cbf600',
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Log Out
            </button>
          </div>
        )}
      </div>
      
      <div className="settings-grid" style={{ width: '100%' }}>
        {/* Left Column: Form Settings */}
        <div className="settings-left-col" style={{ width: '100%' }}>
          <form onSubmit={handleSave} style={styles.form}>
            {/* Supabase config card */}
            <div style={styles.section}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={18} style={{ color: '#cbf600' }} />
                <h3 style={styles.sectionTitle}>Supabase Cloud Database</h3>
              </div>
              <p style={styles.description}>
                Log into Supabase, create a free project, and paste your connection details below.
              </p>

              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  <Link2 size={13} style={{ marginRight: 6 }} /> Supabase Project URL
                </label>
                <input
                  type="text"
                  placeholder="https://your-project-id.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  <Key size={13} style={{ marginRight: 6 }} /> Supabase Anon Key (Public API Key)
                </label>
                <input
                  type="password"
                  placeholder="Paste your anon public key here..."
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  style={styles.input}
                />
              </div>

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingConnection}
                style={styles.connectionTestBtn}
              >
                {testingConnection ? 'Testing Connection...' : 'Test Connection'}
              </button>

              {connectionStatus.message && (
                <div
                  style={{
                    ...styles.connectionAlert,
                    backgroundColor: connectionStatus.type === 'success' ? 'rgba(203, 246, 0, 0.05)' : 'rgba(255, 94, 98, 0.05)',
                    borderColor: connectionStatus.type === 'success' ? 'rgba(203, 246, 0, 0.25)' : 'rgba(255, 94, 98, 0.25)',
                    color: connectionStatus.type === 'success' ? '#cbf600' : '#ff5e62',
                  }}
                >
                  {connectionStatus.message}
                </div>
              )}
            </div>

            {/* Gemini Vision config card */}
            <div style={styles.section}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={18} style={{ color: '#cbf600' }} />
                <h3 style={styles.sectionTitle}>Gemini API Configuration</h3>
              </div>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>Gemini API Key</label>
                <input
                  type="password"
                  placeholder="Paste your Gemini API Key here..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Gemini AI Model</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  style={styles.input}
                >
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (Standard - Recommended)</option>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fast)</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (Legacy)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (Detailed)</option>
                </select>
              </div>
            </div>

            {/* Daily Targets config card */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Daily Targets</h3>
              
              <div style={styles.grid}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Calories (kcal)</label>
                  <input
                    type="number"
                    min="500"
                    max="10000"
                    value={calorieGoal}
                    onChange={(e) => setCalorieGoal(Number(e.target.value))}
                    style={styles.input}
                    required
                  />
                </div>
                
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Water (ml)</label>
                  <input
                    type="number"
                    min="100"
                    max="20000"
                    value={waterGoal}
                    onChange={(e) => setWaterGoal(Number(e.target.value))}
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Protein (g)</label>
                  <input
                    type="number"
                    min="0"
                    max="500"
                    value={proteinGoal}
                    onChange={(e) => setProteinGoal(Number(e.target.value))}
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Carbohydrates (g)</label>
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    value={carbGoal}
                    onChange={(e) => setCarbGoal(Number(e.target.value))}
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Fat (g)</label>
                  <input
                    type="number"
                    min="0"
                    max="500"
                    value={fatGoal}
                    onChange={(e) => setFatGoal(Number(e.target.value))}
                    style={styles.input}
                    required
                  />
                </div>
              </div>
            </div>

            {savedMessage && (
              <div style={styles.successAlert} className="animate-fade-in">
                {savedMessage}
              </div>
            )}

            <button type="submit" style={styles.submitBtn}>
              <Save size={16} style={{ marginRight: 8 }} />
              Save Configurations
            </button>
          </form>
        </div>

        {/* Right Column: SQL Migration Code */}
        <div className="settings-right-col" style={{ width: '100%' }}>
          <div style={styles.sqlCard}>
            <div style={styles.sqlHeader}>
              <span style={styles.sqlTitle}>Supabase SQL Schema Setup</span>
              <button onClick={handleCopySql} style={styles.copyBtn}>
                {copiedSql ? (
                  <>
                    <Check size={14} style={{ marginRight: 4 }} /> Copied
                  </>
                ) : (
                  <>
                    <Copy size={14} style={{ marginRight: 4 }} /> Copy SQL
                  </>
                )}
              </button>
            </div>
            <p style={{ ...styles.description, marginBottom: 12 }}>
              Copy this script, open the **SQL Editor** inside your Supabase dashboard, click "New Query", paste it, and run it.
            </p>
            <pre style={styles.sqlCodeBlock}>{sqlSchema}</pre>
            <p style={{ ...styles.description, marginTop: 12 }}>
              ⚠️ **Storage Bucket Reminder:** Go to **Storage** inside Supabase, create a **Public** bucket named **`meal-photos`**, and configure public access policies to allow image uploads.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '24px 20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
    paddingBottom: '100px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.5px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
  },
  section: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  description: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center' as const,
  },
  input: {
    width: '100%',
  },
  helpText: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    background: '#cbf600',
    color: 'var(--bg-dark)',
    border: 'none',
    borderRadius: '12px',
    padding: '14px',
    fontSize: '15px',
    fontWeight: 700,
    marginTop: '8px',
  },
  connectionTestBtn: {
    backgroundColor: 'rgba(203, 246, 0, 0.05)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    borderRadius: '10px',
    padding: '10px',
    fontSize: '13px',
    fontWeight: 600,
  },
  connectionAlert: {
    border: '1px solid',
    borderRadius: '10px',
    padding: '10px',
    fontSize: '12px',
    lineHeight: '1.4',
  },
  successAlert: {
    backgroundColor: 'rgba(203, 246, 0, 0.05)',
    border: '1px solid rgba(203, 246, 0, 0.25)',
    color: '#cbf600',
    borderRadius: '12px',
    padding: '12px',
    fontSize: '13px',
    textAlign: 'center' as const,
  },
  sqlCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid var(--border-color)',
  },
  sqlHeader: {
    display: 'flex',
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: '10px',
  },
  sqlTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  copyBtn: {
    backgroundColor: 'rgba(203, 246, 0, 0.05)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    borderRadius: '8px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center' as const,
  },
  sqlCodeBlock: {
    width: '100%',
    maxHeight: '180px',
    overflowY: 'auto' as const,
    backgroundColor: '#000000',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    padding: '12px',
    fontSize: '11px',
    fontFamily: 'monospace',
    whiteSpace: 'pre' as const,
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minHeight: '200px',
  },
  spinner: {
    animation: 'spin 1.5s linear infinite',
  },
};
