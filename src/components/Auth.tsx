import React, { useState } from 'react';
import { getSupabase } from '../supabaseClient';
import { LogIn, UserPlus, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const supabase = getSupabase();
    if (!supabase) {
      setError('Supabase is not configured yet. Please configure it in Settings.');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
        });
        if (signUpErr) throw signUpErr;
        
        // Check if email confirmation is required
        if (data.user && data.session === null) {
          setSuccess('Registration successful! Please check your email for confirmation.');
        } else {
          setSuccess('Account created and signed in successfully!');
        }
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });
        if (signInErr) throw signInErr;
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.card}>
        <div style={styles.logoContainer}>
          <div style={styles.logoText}>NutriTrack</div>
          <div style={styles.logoSub}>Your AI-Powered Nutrition Partner</div>
        </div>

        <h2 style={styles.title}>{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
        <p style={styles.subtitle}>
          {isSignUp 
            ? 'Sign up to start tracking your meals, water, and fitness goals.' 
            : 'Sign in to access your logs, trends, and profile targets.'}
        </p>

        {error && (
          <div style={styles.errorAlert}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={styles.successAlert}>
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleAuth} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.passwordWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.passwordInput}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? (
              'Please wait...'
            ) : isSignUp ? (
              <>
                <UserPlus size={16} style={{ marginRight: 8 }} />
                Register Account
              </>
            ) : (
              <>
                <LogIn size={16} style={{ marginRight: 8 }} />
                Sign In
              </>
            )}
          </button>
        </form>

        <div style={styles.switchContainer}>
          <span style={styles.switchText}>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          </span>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setSuccess('');
            }}
            style={styles.switchBtn}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
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
    maxWidth: '420px',
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
    textAlign: 'center' as const,
    marginBottom: '8px',
  },
  logoText: {
    fontSize: '28px',
    fontWeight: 800,
    letterSpacing: '-1.5px',
    background: 'linear-gradient(90deg, #ffffff, #cbf600)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  logoSub: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    marginTop: '4px',
    fontWeight: 500,
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    textAlign: 'center' as const,
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    textAlign: 'center' as const,
    lineHeight: '1.4',
    marginTop: '-8px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    marginTop: '8px',
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
  passwordWrapper: {
    position: 'relative' as const,
    width: '100%',
  },
  passwordInput: {
    width: '100%',
    backgroundColor: 'var(--bg-dark)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '12px 42px 12px 14px',
    fontSize: '14px',
    color: 'var(--text-primary)',
  },
  eyeBtn: {
    position: 'absolute' as const,
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: '4px',
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
    fontSize: '14px',
    fontWeight: 700,
    marginTop: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center' as const,
    gap: '10px',
    backgroundColor: 'rgba(255, 94, 98, 0.05)',
    border: '1px solid rgba(255, 94, 98, 0.25)',
    color: '#ff5e62',
    borderRadius: '12px',
    padding: '12px',
    fontSize: '12px',
    lineHeight: '1.4',
  },
  successAlert: {
    backgroundColor: 'rgba(203, 246, 0, 0.05)',
    border: '1px solid rgba(203, 246, 0, 0.25)',
    color: '#cbf600',
    borderRadius: '12px',
    padding: '12px',
    fontSize: '12px',
    lineHeight: '1.4',
    textAlign: 'center' as const,
  },
  switchContainer: {
    display: 'flex',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: '6px',
    fontSize: '13px',
    marginTop: '8px',
  },
  switchText: {
    color: 'var(--text-muted)',
  },
  switchBtn: {
    background: 'none',
    border: 'none',
    color: '#cbf600',
    fontWeight: 600,
    cursor: 'pointer',
    padding: '0',
  },
};
