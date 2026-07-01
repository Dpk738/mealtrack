import React, { useState } from 'react';
import { testSupabaseConnection, resetSupabaseInstance } from '../supabaseClient';
import { Database, Link2, Key, HelpCircle, AlertCircle, Check, Laptop, Smartphone } from 'lucide-react';
import MinimalistLogo from './MinimalistLogo';

interface DbSetupProps {
  onSuccess: () => void;
}

export default function DbSetup({ onSuccess }: DbSetupProps) {
  const [activeTab, setActiveTab] = useState<'local' | 'shared'>('local');
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !anonKey) {
      setError('Please provide both the Supabase URL and Anon Key.');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const result = await testSupabaseConnection(url.trim(), anonKey.trim());
      if (result.success) {
        // Save to localStorage for this device
        localStorage.setItem('supabaseUrl', url.trim());
        localStorage.setItem('supabaseAnonKey', anonKey.trim());
        
        // Reset the Supabase instance
        resetSupabaseInstance(url.trim(), anonKey.trim());
        
        setSuccess('Database connected successfully!');
        
        // Trigger parent refresh to switch to login view
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        setError(result.message || 'Failed to connect. Please check your credentials and try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while testing the connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.card}>
        <div style={styles.logoContainer}>
          <MinimalistLogo size={28} />
          <div style={styles.logoSub}>Your AI-Powered Nutrition Partner</div>
        </div>

        <div style={styles.iconWrapper}>
          <div style={styles.dbIconContainer}>
            <Database size={32} style={{ color: '#cbf600' }} />
          </div>
          <div style={styles.syncIndicator}>
            <Laptop size={16} style={{ color: 'var(--text-muted)' }} />
            <div style={styles.pulseLine}></div>
            <Smartphone size={16} style={{ color: 'var(--text-muted)' }} />
          </div>
        </div>

        <h2 style={styles.title}>Database Setup Required</h2>
        <p style={styles.subtitle}>
          NutriTrack uses Supabase to store and sync your meals, water, targets, and AI configurations securely in real-time.
        </p>

        {/* Setup Options Tabs */}
        <div style={styles.tabsContainer}>
          <button 
            type="button" 
            style={{ 
              ...styles.tabButton, 
              ...(activeTab === 'local' ? styles.activeTab : {}) 
            }}
            onClick={() => setActiveTab('local')}
          >
            Quick Local Setup
          </button>
          <button 
            type="button" 
            style={{ 
              ...styles.tabButton, 
              ...(activeTab === 'shared' ? styles.activeTab : {}) 
            }}
            onClick={() => setActiveTab('shared')}
          >
            Shared Config (.env)
          </button>
        </div>

        {error && (
          <div style={styles.errorAlert}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={styles.successAlert}>
            <Check size={16} style={{ flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}

        {activeTab === 'local' ? (
          <form onSubmit={handleConnect} style={styles.form}>
            <p style={styles.tabDescription}>
              Paste your Supabase credentials here to initialize this device. Credentials will be stored in your browser's local storage.
            </p>
            
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                <Link2 size={13} style={{ marginRight: 6 }} /> Supabase Project URL
              </label>
              <input
                type="text"
                placeholder="https://your-project-id.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>
                <Key size={13} style={{ marginRight: 6 }} /> Supabase Anon Key
              </label>
              <input
                type="password"
                placeholder="Paste your public anon key here..."
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                style={styles.input}
                required
              />
            </div>

            <button type="submit" disabled={loading} style={styles.submitBtn}>
              {loading ? 'Verifying Connection...' : 'Connect Database'}
            </button>
          </form>
        ) : (
          <div style={styles.sharedContainer}>
            <p style={styles.tabDescription}>
              To connect all your devices automatically (including your phone and laptop) without typing keys repeatedly:
            </p>
            <ol style={styles.list}>
              <li style={styles.listItem}>
                Locate or create the file **`.env`** in the root of your project directory.
              </li>
              <li style={styles.listItem}>
                Add your Supabase details to it:
                <pre style={styles.codeBlock}>
{`VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key`}
                </pre>
              </li>
              <li style={styles.listItem}>
                Restart the development server (`npm run dev`).
              </li>
              <li style={styles.listItem}>
                Refresh this page on any device! The application will load pre-configured.
              </li>
            </ol>
            
            <div style={styles.infoBox}>
              <HelpCircle size={16} style={{ color: '#cbf600', flexShrink: 0, marginTop: 2 }} />
              <span style={styles.infoText}>
                Once configured via `.env`, all devices connected to your laptop's server (via local Wi-Fi or host) will authenticate instantly.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    width: '100%',
    padding: '24px 16px',
    backgroundColor: '#030303',
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '24px',
    padding: '32px 24px',
    border: '1px solid var(--border-color)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  logoContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    textAlign: 'center' as const,
    marginBottom: '4px',
    gap: '8px',
  },
  logoSub: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    marginTop: '4px',
    fontWeight: 500,
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
  },
  iconWrapper: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '12px',
    margin: '12px 0 4px 0',
  },
  dbIconContainer: {
    width: '64px',
    height: '64px',
    borderRadius: '20px',
    backgroundColor: 'rgba(203, 246, 0, 0.05)',
    border: '1px solid rgba(203, 246, 0, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  pulseLine: {
    width: '40px',
    height: '2px',
    backgroundColor: 'var(--border-color)',
    position: 'relative' as const,
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    textAlign: 'center' as const,
    marginTop: '-8px',
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    textAlign: 'center' as const,
    lineHeight: '1.5',
    marginTop: '-10px',
  },
  tabsContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    backgroundColor: 'var(--bg-dark)',
    borderRadius: '12px',
    padding: '4px',
    border: '1px solid var(--border-color)',
  },
  tabButton: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    padding: '8px 12px',
    fontSize: '13px',
    fontWeight: 600,
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  activeTab: {
    backgroundColor: 'rgba(203, 246, 0, 0.08)',
    color: 'var(--text-primary)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  tabDescription: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
    margin: '0 0 4px 0',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: 'var(--bg-dark)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '12px 14px',
    fontSize: '14px',
    color: 'var(--text-primary)',
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#cbf600',
    color: 'var(--bg-dark)',
    border: 'none',
    borderRadius: '12px',
    padding: '14px',
    fontSize: '14px',
    fontWeight: 700,
    marginTop: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  sharedContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  list: {
    margin: '0',
    paddingLeft: '18px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  listItem: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
  },
  codeBlock: {
    margin: '6px 0 0 0',
    backgroundColor: '#000000',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '10px',
    fontSize: '11px',
    fontFamily: 'monospace',
    overflowX: 'auto' as const,
    whiteSpace: 'pre' as const,
  },
  infoBox: {
    display: 'flex',
    gap: '10px',
    backgroundColor: 'rgba(203, 246, 0, 0.03)',
    border: '1px solid rgba(203, 246, 0, 0.15)',
    borderRadius: '12px',
    padding: '10px 12px',
    marginTop: '4px',
  },
  infoText: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: 'rgba(203, 246, 0, 0.05)',
    border: '1px solid rgba(203, 246, 0, 0.25)',
    color: '#cbf600',
    borderRadius: '12px',
    padding: '12px',
    fontSize: '12px',
    lineHeight: '1.4',
  },
  successAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: 'rgba(203, 246, 0, 0.05)',
    border: '1px solid rgba(203, 246, 0, 0.25)',
    color: '#cbf600',
    borderRadius: '12px',
    padding: '12px',
    fontSize: '12px',
    lineHeight: '1.4',
  },
};
