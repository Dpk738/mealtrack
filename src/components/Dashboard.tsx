import { useState, useEffect } from 'react';
import { getSupabase } from '../supabaseClient';
import type { Meal, WaterLog } from '../supabaseClient';
import { generateDailySummary } from '../gemini';
import { Flame, Droplet, Brain, Plus, Award, ChevronRight, Database } from 'lucide-react';

interface DashboardProps {
  meals: Meal[];
  waterLogs: WaterLog[];
  goals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    water: number;
  };
  selectedDate: string;
  onAddWater: (amount: number) => void;
  onNavigate: (tab: any) => void;
}

export default function Dashboard({
  meals,
  waterLogs,
  goals,
  selectedDate,
  onAddWater,
  onNavigate
}: DashboardProps) {
  const [insight, setInsight] = useState('');
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [customWater, setCustomWater] = useState(250);
  const [showCustomWaterInput, setShowCustomWaterInput] = useState(false);

  // Load saved insights for current date from localStorage
  useEffect(() => {
    const cached = localStorage.getItem(`insight_${selectedDate}`);
    if (cached) {
      setInsight(cached);
    } else {
      setInsight('');
    }
  }, [selectedDate]);

  // Totals calculations
  const totalCal = meals.reduce((sum, m) => sum + (m.calories * (m.serving_quantity || 1)), 0);
  const totalProt = meals.reduce((sum, m) => sum + (m.protein * (m.serving_quantity || 1)), 0);
  const totalCarb = meals.reduce((sum, m) => sum + (m.carbs * (m.serving_quantity || 1)), 0);
  const totalFat = meals.reduce((sum, m) => sum + (m.fat * (m.serving_quantity || 1)), 0);
  const totalWater = waterLogs.reduce((sum, w) => sum + w.amount, 0);

  // Percent calculations
  const calPercent = Math.min(100, Math.round((totalCal / goals.calories) * 100)) || 0;
  const protPercent = Math.min(100, Math.round((totalProt / goals.protein) * 100)) || 0;
  const carbPercent = Math.min(100, Math.round((totalCarb / goals.carbs) * 100)) || 0;
  const fatPercent = Math.min(100, Math.round((totalFat / goals.fat) * 100)) || 0;
  const waterPercent = Math.min(100, Math.round((totalWater / goals.water) * 100)) || 0;

  // Handle request for AI summary insights
  const handleGenerateInsight = async () => {
    setLoadingInsight(true);
    try {
      const apiKey = localStorage.getItem('geminiApiKey') || '';
      const modelName = localStorage.getItem('geminiModel') || 'gemini-2.5-flash';
      const response = await generateDailySummary(meals, waterLogs, goals, apiKey, modelName);
      setInsight(response);
      localStorage.setItem(`insight_${selectedDate}`, response);
    } catch (e) {
      console.error(e);
      setInsight('Could not connect to Gemini. Check your network or API Key in Settings.');
    } finally {
      setLoadingInsight(false);
    }
  };

  // Helper for progress ring SVG rendering
  const ProgressRing = ({
    size,
    stroke,
    percent,
    gradientId,
    children
  }: {
    size: number;
    stroke: number;
    percent: number;
    gradientId: string;
    children?: React.ReactNode;
  }) => {
    const radius = (size - stroke) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percent / 100) * circumference;

    return (
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Track circle */}
          <circle
            stroke="rgba(39, 39, 42, 0.5)"
            fill="transparent"
            strokeWidth={stroke}
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          {/* Active progress circle */}
          <circle
            stroke={`url(#${gradientId})`}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={`${circumference} ${circumference}`}
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.6s ease' }}
            strokeLinecap="round"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
        </svg>
        <div style={styles.ringCenter}>
          {children}
        </div>
      </div>
    );
  };

  const remainingCal = goals.calories - totalCal;
  const isSupabaseConfigured = !!getSupabase();

  return (
    <div className="animate-slide-up dashboard-grid" style={styles.container}>
      {/* Target Gradients definition for progress rings */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <linearGradient id="calGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#cbf600" />
          </linearGradient>
          <linearGradient id="protGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#a1a1aa" />
          </linearGradient>
          <linearGradient id="carbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#cbf600" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
          <linearGradient id="fatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#cbf600" />
          </linearGradient>
          <linearGradient id="waterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#cbf600" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
        </defs>
      </svg>

      {/* Main Calories Circle Section */}
      <div className="main-ring-card-responsive" style={styles.mainRingCard}>
        <ProgressRing size={170} stroke={12} percent={calPercent} gradientId="calGrad">
          <div style={styles.calorieTextContainer}>
            <Flame size={24} style={{ color: 'var(--color-cal)', marginBottom: 2 }} />
            <span style={styles.calValue}>{Math.round(totalCal)}</span>
            <span style={styles.calGoal}>of {goals.calories} kcal</span>
          </div>
        </ProgressRing>

        <div className="main-ring-card-details-responsive" style={styles.calSummaryDetails}>
          {remainingCal >= 0 ? (
            <div style={styles.calStatusText}>
              <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{Math.round(remainingCal)}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}> kcal remaining</span>
            </div>
          ) : (
            <div style={styles.calStatusText}>
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#cbf600' }}>{Math.round(Math.abs(remainingCal))}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}> kcal over limit</span>
            </div>
          )}
          <button style={styles.quickAddLogBtn} onClick={() => onNavigate('camera')}>
            Log Food <ChevronRight size={14} style={{ marginLeft: 2 }} />
          </button>
        </div>
      </div>

      {/* Macros Row Section */}
      <div style={styles.macrosCard}>
        <div style={styles.macroCol}>
          <ProgressRing size={74} stroke={6} percent={protPercent} gradientId="protGrad">
            <span style={styles.macroPercentText}>{protPercent}%</span>
          </ProgressRing>
          <span style={styles.macroLabel}>Protein</span>
          <span style={styles.macroAmount}>{Math.round(totalProt)}g / {goals.protein}g</span>
        </div>

        <div style={styles.macroCol}>
          <ProgressRing size={74} stroke={6} percent={carbPercent} gradientId="carbGrad">
            <span style={styles.macroPercentText}>{carbPercent}%</span>
          </ProgressRing>
          <span style={styles.macroLabel}>Carbs</span>
          <span style={styles.macroAmount}>{Math.round(totalCarb)}g / {goals.carbs}g</span>
        </div>

        <div style={styles.macroCol}>
          <ProgressRing size={74} stroke={6} percent={fatPercent} gradientId="fatGrad">
            <span style={styles.macroPercentText}>{fatPercent}%</span>
          </ProgressRing>
          <span style={styles.macroLabel}>Fat</span>
          <span style={styles.macroAmount}>{Math.round(totalFat)}g / {goals.fat}g</span>
        </div>
      </div>

      {/* Water Intake Section */}
      <div style={styles.waterCard}>
        <div style={styles.waterHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Droplet size={18} style={{ color: 'var(--color-water)' }} />
            <span style={styles.waterTitle}>Water Tracker</span>
          </div>
          <span style={styles.waterSubtitle}>
            {totalWater} ml / {goals.water} ml
          </span>
        </div>

        <div style={styles.progressBarBg}>
          <div
            style={{
              ...styles.progressBarFill,
              width: `${waterPercent}%`,
              boxShadow: waterPercent > 0 ? '0 0 10px rgba(0, 242, 254, 0.4)' : 'none'
            }}
          />
        </div>

        <div style={styles.waterQuickGrid}>
          <button style={styles.waterBtn} onClick={() => onAddWater(250)}>+250ml</button>
          <button style={styles.waterBtn} onClick={() => onAddWater(500)}>+500ml</button>
          <button style={styles.waterBtn} onClick={() => onAddWater(750)}>+750ml</button>
          <button
            style={{ ...styles.waterBtn, background: showCustomWaterInput ? 'var(--bg-dark)' : 'rgba(255, 255, 255, 0.03)' }}
            onClick={() => setShowCustomWaterInput(!showCustomWaterInput)}
          >
            Custom
          </button>
        </div>

        {showCustomWaterInput && (
          <div className="animate-fade-in" style={styles.customWaterRow}>
            <input
              type="range"
              min="50"
              max="1500"
              step="50"
              value={customWater}
              onChange={(e) => setCustomWater(Number(e.target.value))}
              style={styles.slider}
            />
            <div style={styles.customWaterLabelRow}>
              <span>{customWater} ml</span>
              <button
                style={styles.customWaterAddBtn}
                onClick={() => {
                  onAddWater(customWater);
                  setShowCustomWaterInput(false);
                }}
              >
                <Plus size={14} style={{ marginRight: 4 }} /> Add
              </button>
            </div>
          </div>
        )}

        {totalWater < goals.water ? (
          <span style={styles.waterRemainingText}>
            Drink {goals.water - totalWater} ml more to reach your goal today.
          </span>
        ) : (
          <span style={styles.waterGoalReached}>
            <Award size={14} style={{ marginRight: 4, display: 'inline' }} />
            Water goal achieved for today!
          </span>
        )}
      </div>

      {/* Onboarding Setup Guide */}
      {!isSupabaseConfigured && (
        <div style={styles.onboardingCard}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <Database size={20} style={{ color: '#cbf600', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h3 style={styles.onboardingTitle}>Setup Cloud Database</h3>
              <p style={styles.onboardingText}>
                Connect a free Supabase database to start logging food, uploading pictures, and backing up your nutrition metrics.
              </p>
              <button onClick={() => onNavigate('settings')} style={styles.onboardingBtn}>
                Configure Setup <ChevronRight size={12} style={{ marginLeft: 4 }} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Insights Card */}
      <div style={styles.insightCard}>
        <div style={styles.insightHeader}>
          <Brain size={18} style={{ color: '#cbf600' }} />
          <span style={styles.insightTitle}>AI Daily Insights</span>
        </div>
        
        {insight ? (
          <div style={styles.insightBody}>
            {insight.split('\n').filter(line => line.trim()).map((line, idx) => (
              <p key={idx} style={styles.insightLine}>{line}</p>
            ))}
          </div>
        ) : (
          <p style={styles.insightPlaceholder}>
            No insights generated yet. Let Gemini summarize your performance, nutrient compliance, and hydration.
          </p>
        )}

        <button
          onClick={handleGenerateInsight}
          disabled={loadingInsight || (meals.length === 0 && waterLogs.length === 0)}
          style={{
            ...styles.insightBtn,
            opacity: (meals.length === 0 && waterLogs.length === 0) ? 0.5 : 1
          }}
        >
          {loadingInsight ? 'Analyzing logs...' : 'Regenerate Insights'}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px 16px',
    paddingBottom: '100px',
  },
  mainRingCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '20px',
    padding: '24px',
    border: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center' as const,
    justifyContent: 'space-around' as const,
    gap: '16px',
  },
  ringCenter: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    pointerEvents: 'none' as const,
  },
  calorieTextContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  calValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    lineHeight: 1.1,
  },
  calGoal: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  calSummaryDetails: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    alignItems: 'flex-start' as const,
  },
  calStatusText: {
    display: 'flex',
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
  },
  quickAddLogBtn: {
    display: 'flex',
    alignItems: 'center' as const,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '8px 14px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontWeight: 600,
  },
  macrosCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '20px',
    padding: '20px 16px',
    border: '1px solid var(--border-color)',
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  macroCol: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    gap: '6px',
  },
  macroPercentText: {
    fontSize: '13px',
    fontWeight: 700,
  },
  macroLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  macroAmount: {
    fontSize: '10px',
    color: 'var(--text-muted)',
  },
  waterCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '20px',
    padding: '20px',
    border: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '14px',
  },
  waterHeader: {
    display: 'flex',
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  waterTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  waterSubtitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--color-water)',
  },
  progressBarBg: {
    width: '100%',
    height: '8px',
    backgroundColor: 'rgba(39, 39, 42, 0.6)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    background: 'var(--grad-water)',
    borderRadius: '4px',
    transition: 'width 0.5s cubic-bezier(0.1, 0.8, 0.2, 1)',
  },
  waterQuickGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
  },
  waterBtn: {
    backgroundColor: 'rgba(203, 246, 0, 0.03)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    padding: '10px 0',
    color: 'var(--text-primary)',
    fontSize: '12px',
    fontWeight: 600,
  },
  customWaterRow: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    marginTop: '6px',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
  },
  slider: {
    width: '100%',
    cursor: 'pointer',
  },
  customWaterLabelRow: {
    display: 'flex',
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    fontSize: '13px',
    fontWeight: 600,
  },
  customWaterAddBtn: {
    display: 'flex',
    alignItems: 'center' as const,
    backgroundColor: 'var(--text-primary)',
    color: 'var(--bg-dark)',
    border: 'none',
    borderRadius: '8px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 600,
  },
  waterRemainingText: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    textAlign: 'center' as const,
  },
  waterGoalReached: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#cbf600',
    textAlign: 'center' as const,
    display: 'flex',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  insightCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '20px',
    padding: '20px',
    border: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '14px',
  },
  insightHeader: {
    display: 'flex',
    alignItems: 'center' as const,
    gap: '8px',
  },
  insightTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  insightBody: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  insightLine: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
    borderLeft: '2px solid #cbf600',
    paddingLeft: '8px',
  },
  insightPlaceholder: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    lineHeight: '1.4',
    textAlign: 'center' as const,
    padding: '8px 0',
  },
  insightBtn: {
    backgroundColor: 'rgba(203, 246, 0, 0.08)',
    border: '1px solid rgba(203, 246, 0, 0.2)',
    borderRadius: '12px',
    padding: '10px',
    color: '#cbf600',
    fontSize: '13px',
    fontWeight: 600,
    marginTop: '4px',
  },
  onboardingCard: {
    backgroundColor: 'rgba(203, 246, 0, 0.05)',
    border: '1px solid rgba(203, 246, 0, 0.25)',
    borderRadius: '20px',
    padding: '18px',
    marginBottom: '4px',
  },
  onboardingTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '6px',
    letterSpacing: '-0.3px',
  },
  onboardingText: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
    marginBottom: '12px',
  },
  onboardingBtn: {
    display: 'flex',
    alignItems: 'center' as const,
    backgroundColor: '#cbf600',
    color: 'var(--bg-dark)',
    border: 'none',
    borderRadius: '10px',
    padding: '8px 14px',
    fontSize: '12px',
    fontWeight: 700,
  },
};
