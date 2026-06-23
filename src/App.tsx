import { useState, useEffect, useRef } from 'react';
import { getSupabase } from './supabaseClient';
import type { Meal, WaterLog } from './supabaseClient';
import Dashboard from './components/Dashboard';
import CameraLog from './components/CameraLog';
import History from './components/History';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import Auth from './components/Auth';
import { Home, Camera, History as HistoryIcon, BarChart2, Settings as SettingsIcon } from 'lucide-react';
import './App.css';

// Get current date string formatted as YYYY-MM-DD
const getTodayDateString = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

type Tab = 'dashboard' | 'camera' | 'history' | 'analytics' | 'settings';

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

  const mainRef = useRef<HTMLElement>(null);

  // Force scroll reset on mount and whenever tab changes
  useEffect(() => {
    // Prevent the browser from trying to restore scroll positions on reload (helps with dynamic content offset issues)
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    const resetScroll = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      if (mainRef.current) {
        mainRef.current.scrollTop = 0;
      }
    };

    resetScroll();

    // Re-check after rendering has completed to handle any layout shifts from animations
    const frameId = requestAnimationFrame(resetScroll);
    const timer = setTimeout(resetScroll, 50);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timer);
    };
  }, [activeTab]);

  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const isSupabaseConfigured = getSupabase() !== null;

  // Supabase Auth Session listener
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Bootstrap initial configurations on mount
  useEffect(() => {
    function bootstrap() {
      const todayStr = getTodayDateString();
      setSelectedDate(todayStr);

      const hasCal = localStorage.getItem('goalCalories');
      if (!hasCal) {
        localStorage.setItem('goalCalories', '2000');
        localStorage.setItem('goalProtein', '130');
        localStorage.setItem('goalCarbs', '230');
        localStorage.setItem('goalFat', '65');
        localStorage.setItem('goalWater', '2500');
        localStorage.setItem('geminiApiKey', '');
      }
      
      refreshGoals();
    }
    bootstrap();
  }, []);

  // Load goals and API key from Supabase profiles table on sign in
  useEffect(() => {
    if (!session?.user?.id) {
      refreshGoals();
      return;
    }

    const loadProfile = async () => {
      const supabase = getSupabase();
      if (!supabase) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.log('Profile fetch error (possibly new user):', error.message);
          return;
        }

        if (data) {
          setGoals({
            calories: Number(data.goal_calories) || 2000,
            protein: Number(data.goal_protein) || 130,
            carbs: Number(data.goal_carbs) || 230,
            fat: Number(data.goal_fat) || 65,
            water: Number(data.goal_water) || 2500,
          });
          
          if (data.gemini_api_key) {
            localStorage.setItem('geminiApiKey', data.gemini_api_key);
          }
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
    };

    loadProfile();
  }, [session]);

  // Reload meals and water logs whenever active date, tab or user changes
  useEffect(() => {
    if (!selectedDate) return;
    loadDayData();
  }, [selectedDate, activeTab, session]);

  const loadDayData = async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setMeals([]);
      setWaterLogs([]);
      return;
    }

    try {
      let mealsQuery = supabase.from('meals').select('*').eq('date', selectedDate);
      let waterQuery = supabase.from('water').select('*').eq('date', selectedDate);

      // Filter by current authenticated user
      if (session?.user?.id) {
        mealsQuery = mealsQuery.eq('user_id', session.user.id);
        waterQuery = waterQuery.eq('user_id', session.user.id);
      } else {
        // Fallback or empty if not logged in (to satisfy RLS)
        mealsQuery = mealsQuery.is('user_id', null);
        waterQuery = waterQuery.is('user_id', null);
      }

      const { data: dayMeals, error: mealsErr } = await mealsQuery;
      if (mealsErr) console.error('Meals query error:', mealsErr);

      const { data: dayWater, error: waterErr } = await waterQuery;
      if (waterErr) console.error('Water query error:', waterErr);

      setMeals(dayMeals || []);
      setWaterLogs(dayWater || []);
    } catch (e) {
      console.error('Error loading data from Supabase:', e);
      setMeals([]);
      setWaterLogs([]);
    }
  };

  const refreshGoals = () => {
    const cal = Number(localStorage.getItem('goalCalories')) || 2000;
    const prot = Number(localStorage.getItem('goalProtein')) || 130;
    const carb = Number(localStorage.getItem('goalCarbs')) || 230;
    const fat = Number(localStorage.getItem('goalFat')) || 65;
    const water = Number(localStorage.getItem('goalWater')) || 2500;

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
    const supabase = getSupabase();
    if (!supabase) return;

    const newLog = {
      date: selectedDate,
      timestamp: new Date().toISOString(),
      amount,
      user_id: session?.user?.id || null
    };

    try {
      const { error } = await supabase.from('water').insert([newLog]);
      if (error) console.error('Add water error:', error);
      await loadDayData();
    } catch (e) {
      console.error('Error adding water to Supabase:', e);
    }
  };

  const handleMealSaved = async (mealData: Omit<Meal, 'date' | 'timestamp'>) => {
    const supabase = getSupabase();
    if (!supabase) return;

    const newMeal = {
      ...mealData,
      date: selectedDate,
      timestamp: new Date().toISOString(),
      user_id: session?.user?.id || null
    };

    try {
      const { error } = await supabase.from('meals').insert([newMeal]);
      if (error) console.error('Save meal error:', error);
      await loadDayData();
      setActiveTab('dashboard'); // Redirect to dashboard to see results
    } catch (e) {
      console.error('Error saving meal to Supabase:', e);
    }
  };

  const handleUpdateMeal = async (updatedMeal: Meal) => {
    if (!updatedMeal.id) return;
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      let query = supabase
        .from('meals')
        .update({
          name: updatedMeal.name,
          serving_quantity: updatedMeal.serving_quantity,
          serving_size: updatedMeal.serving_size,
          calories: updatedMeal.calories,
          protein: updatedMeal.protein,
          carbs: updatedMeal.carbs,
          fat: updatedMeal.fat,
          fiber: updatedMeal.fiber,
          sugar: updatedMeal.sugar,
          description: updatedMeal.description
        })
        .eq('id', updatedMeal.id);

      if (session?.user?.id) {
        query = query.eq('user_id', session.user.id);
      }

      const { error } = await query;
      if (error) console.error('Update meal error:', error);
      await loadDayData();
    } catch (e) {
      console.error('Error updating meal in Supabase:', e);
    }
  };

  const handleDeleteMeal = async (id: number) => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      let query = supabase
        .from('meals')
        .delete()
        .eq('id', id);

      if (session?.user?.id) {
        query = query.eq('user_id', session.user.id);
      }

      const { error } = await query;
      if (error) console.error('Delete meal error:', error);
      await loadDayData();
    } catch (e) {
      console.error('Error deleting meal from Supabase:', e);
    }
  };

  const handleSettingsSaved = () => {
    refreshGoals();
    // Re-initialize session listener since Supabase instance has changed
    const supabase = getSupabase();
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setAuthLoading(false);
      });
    } else {
      setSession(null);
      setAuthLoading(false);
    }
    loadDayData();
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr + 'T00:00:00');
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
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

  if (isSupabaseConfigured && authLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#030303',
        gap: '16px'
      }}>
        <div className="animate-spin-loader"></div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>
          Connecting securely...
        </div>
      </div>
    );
  }

  if (isSupabaseConfigured && !session) {
    return <Auth />;
  }

  return (
    <div className="app-main-layout">
      {/* Left Sidebar for Desktop/Laptop */}
      <aside className="app-sidebar">
        <div>
          <div className="sidebar-logo">NutriTrack</div>
          <nav className="sidebar-menu">
            <button
              className={`sidebar-item ${activeTab === 'dashboard' ? 'sidebar-item-active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <Home size={18} />
              <span>Today</span>
            </button>
            <button
              className={`sidebar-item ${activeTab === 'history' ? 'sidebar-item-active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <HistoryIcon size={18} />
              <span>History</span>
            </button>
            <button
              className={`sidebar-item ${activeTab === 'analytics' ? 'sidebar-item-active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              <BarChart2 size={18} />
              <span>Trends</span>
            </button>
            <button
              className={`sidebar-item ${activeTab === 'settings' ? 'sidebar-item-active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <SettingsIcon size={18} />
              <span>Setup</span>
            </button>
          </nav>
        </div>
        <button
          className="sidebar-camera-btn"
          onClick={() => setActiveTab('camera')}
        >
          <Camera size={18} />
          <span>Log Food</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <div className="app-content-wrapper">
        {/* Top Header */}
        <header style={styles.header}>
          <h1 className="app-header-logo" style={styles.logo}>NutriTrack</h1>
          <span style={styles.dateDisplay}>
            {formatDateDisplay(selectedDate)}
          </span>
        </header>

        {/* Main Screen Content */}
        <main ref={mainRef} className="app-scrollable-content" style={styles.main}>
          {renderContent()}
        </main>
      </div>

      {/* Glassmorphic Bottom Navigation Bar for Mobile */}
      <nav className="app-bottom-nav" style={styles.navBar}>
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
    maxWidth: '1024px',
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
