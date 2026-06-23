import React, { useState, useEffect } from 'react';
import { getSetting, setSetting, db } from '../db';
import { Save, RefreshCw, Key, ShieldAlert } from 'lucide-react';

interface SettingsProps {
  onSettingsSaved: () => void;
}

export default function Settings({ onSettingsSaved }: SettingsProps) {
  const [apiKey, setApiKey] = useState('');
  const [calorieGoal, setCalorieGoal] = useState(2000);
  const [proteinGoal, setProteinGoal] = useState(130);
  const [carbGoal, setCarbGoal] = useState(230);
  const [fatGoal, setFatGoal] = useState(65);
  const [waterGoal, setWaterGoal] = useState(2500);
  const [loading, setLoading] = useState(true);
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    async function loadSettings() {
      const key = await getSetting('geminiApiKey', '');
      const cal = await getSetting('goalCalories', 2000);
      const prot = await getSetting('goalProtein', 130);
      const carb = await getSetting('goalCarbs', 230);
      const fat = await getSetting('goalFat', 65);
      const water = await getSetting('goalWater', 2500);

      setApiKey(key);
      setCalorieGoal(cal);
      setProteinGoal(prot);
      setCarbGoal(carb);
      setFatGoal(fat);
      setWaterGoal(water);
      setLoading(false);
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMessage('');

    await setSetting('geminiApiKey', apiKey.trim());
    await setSetting('goalCalories', Math.max(100, Number(calorieGoal) || 2000));
    await setSetting('goalProtein', Math.max(0, Number(proteinGoal) || 130));
    await setSetting('goalCarbs', Math.max(0, Number(carbGoal) || 230));
    await setSetting('goalFat', Math.max(0, Number(fatGoal) || 65));
    await setSetting('goalWater', Math.max(100, Number(waterGoal) || 2500));

    setSavedMessage('Settings saved successfully!');
    onSettingsSaved();

    setTimeout(() => {
      setSavedMessage('');
    }, 3000);
  };

  const handleResetData = async () => {
    if (window.confirm('Are you sure you want to clear ALL logged food and water history? This cannot be undone.')) {
      await db.meals.clear();
      await db.water.clear();
      alert('All local tracker logs cleared.');
      onSettingsSaved();
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <RefreshCw size={24} style={styles.spinner} />
        <p style={{ marginTop: 12, color: 'var(--text-secondary)' }}>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="animate-slide-up" style={styles.container}>
      <h2 style={styles.title}>Settings</h2>
      
      <form onSubmit={handleSave} style={styles.form}>
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Gemini API Configuration</h3>
          <p style={styles.description}>
            NutriTrack uses the Gemini Vision model locally to analyze food photos.
            Your API Key is saved securely in your browser's local database.
          </p>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              <Key size={14} style={{ marginRight: 6 }} /> Gemini API Key
            </label>
            <input
              type="password"
              placeholder="Paste your Gemini API Key here..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={styles.input}
            />
            <small style={styles.helpText}>
              Don't have an API key? You can get a free one from Google AI Studio.
            </small>
          </div>
        </div>

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
          Save Settings
        </button>
      </form>

      <div style={styles.dangerZone}>
        <h3 style={styles.dangerTitle}>
          <ShieldAlert size={16} style={{ marginRight: 6, color: '#ff5e62' }} />
          Danger Zone
        </h3>
        <p style={styles.description}>
          Permanently delete all food logs, water records, and reset database storage.
        </p>
        <button onClick={handleResetData} style={styles.dangerBtn}>
          Reset App Data
        </button>
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
    background: 'var(--text-primary)',
    color: 'var(--bg-dark)',
    border: 'none',
    borderRadius: '12px',
    padding: '14px',
    fontSize: '15px',
    fontWeight: 600,
    marginTop: '8px',
  },
  successAlert: {
    backgroundColor: 'rgba(56, 239, 125, 0.1)',
    border: '1px solid rgba(56, 239, 125, 0.3)',
    color: '#38ef7d',
    borderRadius: '12px',
    padding: '12px',
    fontSize: '13px',
    textAlign: 'center' as const,
  },
  dangerZone: {
    marginTop: '12px',
    backgroundColor: 'rgba(255, 94, 98, 0.05)',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid rgba(255, 94, 98, 0.2)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  dangerTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#ff5e62',
    display: 'flex',
    alignItems: 'center' as const,
  },
  dangerBtn: {
    backgroundColor: 'rgba(255, 94, 98, 0.1)',
    color: '#ff5e62',
    border: '1px solid rgba(255, 94, 98, 0.3)',
    borderRadius: '12px',
    padding: '12px',
    fontSize: '14px',
    fontWeight: 600,
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
