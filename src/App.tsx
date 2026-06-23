import { useState, useEffect } from 'react';
import { db, getSetting } from './db';
import type { Meal, WaterLog } from './db';
import Dashboard from './components/Dashboard';
import CameraLog from './components/CameraLog';
import History from './components/History';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import { Home, Camera, History as HistoryIcon, BarChart2, Settings as SettingsIcon } from 'lucide-react';
import './App.css';

type Tab = 'dashboard' | 'camera' | 'history' | 'analytics' | 'settings';

const getTodayDateString = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatHeaderDate = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';
  return new Date(
    parseInt(parts[0], 10),
    parseInt(parts[1], 10) - 1,
    parseInt(parts[2], 10)
  ).toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [meals, setMeals] = useState<Meal[]>([]);
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
  const [goals, setGoals] = useState({
    calories: 2000,
    protein: 130,
    carbs: 230,
    fat: 65,
    water: 2500,
  });

  // Bootstrap initial configurations on mount
  useEffect(() => {
    async function bootstrap() {
      const todayStr = getTodayDateString();
      setSelectedDate(todayStr);

      const hasCal = await db.settings.get('goalCalories');
      if (!hasCal) {
        await db.settings.bulkPut([
          { key: 'goalCalories', value: 2000 },
          { key: 'goalProtein', value: 130 },
          { key: 'goalCarbs', value: 230 },
          { key: 'goalFat', value: 65 },
          { key: 'goalWater', value: 2500 },
          { key: 'geminiApiKey', value: '' }
        ]);
      }
      
      await refreshGoals();
    }
    bootstrap();
  }, []);

  // Reload meals and water logs whenever active date or tab changes
  useEffect(() => {
    if (!selectedDate) return;
    loadDayData();
  }, [selectedDate, activeTab]);

  const loadDayData = async () => {
    const dayMeals = await db.meals.where('date').equals(selectedDate).toArray();
    const dayWater = await db.water.where('date').equals(selectedDate).toArray();
    setMeals(dayMeals);
    setWaterLogs(dayWater);
  };

  const refreshGoals = async () => {
    const cal = await getSetting('goalCalories', 2000);
    const prot = await getSetting('goalProtein', 130);
    const carb = await getSetting('goalCarbs', 230);
    const fat = await getSetting('goalFat', 65);
    const water = await getSetting('goalWater', 2500);

    setGoals({
      calories: cal,
      protein: prot,
      carbs: carb,
      fat: fat,
      water: water
    });
  };

  const handleAddWater = async (amount: number) => {
    if (amount <= 0) return;
    const newLog: WaterLog = {
      date: selectedDate,
      timestamp: new Date().toISOString(),
      amount
    };
    await db.water.add(newLog);
    await loadDayData();
  };

  const handleMealSaved = async (mealData: Omit<Meal, 'date' | 'timestamp'>) => {
    const newMeal: Meal = {
      ...mealData,
      date: selectedDate,
      timestamp: new Date().toISOString()
    };
    await db.meals.add(newMeal);
    await loadDayData();
    setActiveTab('dashboard'); // Redirect to dashboard to see results
  };

  const handleUpdateMeal = async (updatedMeal: Meal) => {
    if (!updatedMeal.id) return;
    await db.meals.put(updatedMeal);
    await loadDayData();
  };

  const handleDeleteMeal = async (id: number) => {
    await db.meals.delete(id);
    await loadDayData();
  };

  const handleSettingsSaved = async () => {
    await refreshGoals();
    await loadDayData();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            meals={meals}
            waterLogs={waterLogs}
            goals={goals}
            selectedDate={selectedDate}
            onAddWater={handleAddWater}
            onNavigate={(tab) => setActiveTab(tab as Tab)}
          />
        );
      case 'camera':
        return (
          <CameraLog
            onMealSaved={handleMealSaved}
            onNavigate={(tab) => setActiveTab(tab as Tab)}
          />
        );
      case 'history':
        return (
          <History
            meals={meals}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onUpdateMeal={handleUpdateMeal}
            onDeleteMeal={handleDeleteMeal}
          />
        );
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return <Settings onSettingsSaved={handleSettingsSaved} />;
      default:
        return null;
    }
  };

  return (
    <div style={styles.appContainer}>
      {/* Top Header */}
      <header style={styles.header}>
        <h1 style={styles.logo}>NutriTrack</h1>
        <span style={styles.dateDisplay}>
          {formatHeaderDate(selectedDate)}
        </span>
      </header>

      {/* Main Screen Content */}
      <main style={styles.main}>
        {renderContent()}
      </main>

      {/* Glassmorphic Bottom Navigation Bar */}
      <nav style={styles.navBar}>
        <button
          style={{ ...styles.navItem, ...(activeTab === 'dashboard' ? styles.activeNavItem : {}) }}
          onClick={() => setActiveTab('dashboard')}
        >
          <Home size={20} />
          <span style={styles.navLabel}>Today</span>
        </button>

        <button
          style={{ ...styles.navItem, ...(activeTab === 'history' ? styles.activeNavItem : {}) }}
          onClick={() => setActiveTab('history')}
        >
          <HistoryIcon size={20} />
          <span style={styles.navLabel}>History</span>
        </button>

        {/* Highlighted quick-log camera button */}
        <button
          style={styles.navItemCamera}
          onClick={() => setActiveTab('camera')}
        >
          <div style={styles.cameraIconContainer}>
            <Camera size={22} style={{ color: 'var(--bg-dark)' }} />
          </div>
        </button>

        <button
          style={{ ...styles.navItem, ...(activeTab === 'analytics' ? styles.activeNavItem : {}) }}
          onClick={() => setActiveTab('analytics')}
        >
          <BarChart2 size={20} />
          <span style={styles.navLabel}>Trends</span>
        </button>

        <button
          style={{ ...styles.navItem, ...(activeTab === 'settings' ? styles.activeNavItem : {}) }}
          onClick={() => setActiveTab('settings')}
        >
          <SettingsIcon size={20} />
          <span style={styles.navLabel}>Setup</span>
        </button>
      </nav>
    </div>
  );
}

const styles = {
  appContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    minHeight: '100vh',
    width: '100%',
    position: 'relative' as const,
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(9, 9, 11, 0.8)',
    backdropFilter: 'blur(10px)',
    position: 'sticky' as const,
    top: 0,
    zIndex: 90,
  },
  logo: {
    fontSize: '20px',
    fontWeight: 800,
    letterSpacing: '-1px',
    background: 'linear-gradient(90deg, #ffffff, #cbf600)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  dateDisplay: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: '4px 10px',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
  },
  main: {
    flexGrow: 1,
    width: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  navBar: {
    position: 'fixed' as const,
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: '480px',
    height: '68px',
    backgroundColor: 'rgba(24, 24, 27, 0.85)',
    backdropFilter: 'blur(12px)',
    borderTop: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'space-around' as const,
    alignItems: 'center' as const,
    paddingBottom: '8px',
    zIndex: 100,
  },
  navItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: '3px',
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    width: '56px',
    height: '100%',
    transition: 'color 0.2s',
  },
  activeNavItem: {
    color: 'var(--text-primary)',
  },
  navLabel: {
    fontSize: '10px',
    fontWeight: 600,
  },
  navItemCamera: {
    display: 'flex',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: 'transparent',
    border: 'none',
    width: '56px',
    height: '100%',
    transform: 'translateY(-14px)',
  },
  cameraIconContainer: {
    width: '48px',
    height: '48px',
    borderRadius: '24px',
    backgroundColor: '#cbf600',
    display: 'flex',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    boxShadow: '0 4px 15px rgba(203, 246, 0, 0.35)',
    border: '3px solid var(--bg-dark)',
  },
};
