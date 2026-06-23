import { useState, useEffect } from 'react';
import { db, getSetting } from '../db';
import type { Meal, WaterLog } from '../db';
import { Flame, Droplet, Dumbbell, Egg, Disc } from 'lucide-react';

type Timeframe = 'week' | 'month' | 'year';
type Metric = 'calories' | 'protein' | 'carbs' | 'fat' | 'water';

interface ChartDataPoint {
  label: string;
  value: number;
}

export default function Analytics() {
  const [timeframe, setTimeframe] = useState<Timeframe>('week');
  const [metric, setMetric] = useState<Metric>('calories');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [goalValue, setGoalValue] = useState(2000);
  const [average, setAverage] = useState(0);

  // Reload data when timeframe or metric changes
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const now = new Date();
      let startDate = new Date();

      // Retrieve targets
      let goal = 2000;
      if (metric === 'calories') goal = await getSetting('goalCalories', 2000);
      else if (metric === 'protein') goal = await getSetting('goalProtein', 130);
      else if (metric === 'carbs') goal = await getSetting('goalCarbs', 230);
      else if (metric === 'fat') goal = await getSetting('goalFat', 65);
      else if (metric === 'water') goal = await getSetting('goalWater', 2500);
      setGoalValue(goal);

      const points: ChartDataPoint[] = [];

      if (timeframe === 'week') {
        // Last 7 days
        startDate.setDate(now.getDate() - 6);
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        // Query DB
        const meals = await db.meals.where('date').aboveOrEqual(formatDate(startDate)).toArray();
        const water = await db.water.where('date').aboveOrEqual(formatDate(startDate)).toArray();

        for (let i = 0; i < 7; i++) {
          const checkDate = new Date(startDate);
          checkDate.setDate(startDate.getDate() + i);
          const dateStr = formatDate(checkDate);
          
          const sum = calculateTotal(meals, water, dateStr, metric);
          points.push({
            label: dayNames[checkDate.getDay()],
            value: sum
          });
        }
      } else if (timeframe === 'month') {
        // Last 30 days, group in chunks of 5 days or show all 30 days
        startDate.setDate(now.getDate() - 29);
        const meals = await db.meals.where('date').aboveOrEqual(formatDate(startDate)).toArray();
        const water = await db.water.where('date').aboveOrEqual(formatDate(startDate)).toArray();

        // Let's create 6 points of 5-day ranges for neat charts
        for (let i = 0; i < 6; i++) {
          let rangeSum = 0;
          let label = '';
          
          for (let j = 0; j < 5; j++) {
            const checkDate = new Date(startDate);
            checkDate.setDate(startDate.getDate() + (i * 5) + j);
            const dateStr = formatDate(checkDate);
            rangeSum += calculateTotal(meals, water, dateStr, metric);

            if (j === 0) {
              label = `${checkDate.getMonth() + 1}/${checkDate.getDate()}`;
            }
          }
          points.push({
            label,
            value: Math.round(rangeSum / 5) // Average daily intake in that 5-day span
          });
        }
      } else if (timeframe === 'year') {
        // Last 12 months
        startDate.setMonth(now.getMonth() - 11);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        // We will fetch all meals & water logs for the past year
        const startYearMonth = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-01`;
        const meals = await db.meals.where('date').aboveOrEqual(startYearMonth).toArray();
        const water = await db.water.where('date').aboveOrEqual(startYearMonth).toArray();

        for (let i = 0; i < 12; i++) {
          const checkMonth = new Date(startDate);
          checkMonth.setMonth(startDate.getMonth() + i);
          const year = checkMonth.getFullYear();
          const monthIdx = checkMonth.getMonth();
          
          // Filter values in this month
          const monthStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
          
          const filteredMeals = meals.filter(m => m.date.startsWith(monthStr));
          const filteredWater = water.filter(w => w.date.startsWith(monthStr));

          // Calculate average per day in month
          const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
          let sum = 0;
          
          if (metric === 'water') {
            const totalWater = filteredWater.reduce((acc, w) => acc + w.amount, 0);
            sum = totalWater / daysInMonth;
          } else {
            const totalMacro = filteredMeals.reduce((acc, m) => {
              const qty = m.servingQuantity || 1;
              if (metric === 'calories') return acc + (m.calories * qty);
              if (metric === 'protein') return acc + (m.protein * qty);
              if (metric === 'carbs') return acc + (m.carbs * qty);
              if (metric === 'fat') return acc + (m.fat * qty);
              return acc;
            }, 0);
            sum = totalMacro / daysInMonth;
          }

          points.push({
            label: monthNames[monthIdx],
            value: Math.round(sum)
          });
        }
      }

      setChartData(points);
      
      const totalSum = points.reduce((sum, p) => sum + p.value, 0);
      setAverage(Math.round(totalSum / points.length));
      setLoading(false);
    }

    loadData();
  }, [timeframe, metric]);

  const formatDate = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const calculateTotal = (meals: Meal[], water: WaterLog[], dateStr: string, metricType: Metric): number => {
    if (metricType === 'water') {
      return water.filter(w => w.date === dateStr).reduce((sum, w) => sum + w.amount, 0);
    } else {
      return meals
        .filter(m => m.date === dateStr)
        .reduce((sum, m) => {
          const qty = m.servingQuantity || 1;
          if (metricType === 'calories') return sum + (m.calories * qty);
          if (metricType === 'protein') return sum + (m.protein * qty);
          if (metricType === 'carbs') return sum + (m.carbs * qty);
          if (metricType === 'fat') return sum + (m.fat * qty);
          return sum;
        }, 0);
    }
  };

  // SVG Chart Helper drawing parameters
  const chartHeight = 180;
  const chartWidth = 400;
  const paddingX = 40;
  const paddingY = 25;

  const maxVal = Math.max(goalValue * 1.2, ...chartData.map((d) => d.value)) || 100;
  
  // Create path points
  const points = chartData.map((pt, i) => {
    const x = paddingX + (i * (chartWidth - 2 * paddingX)) / (chartData.length - 1 || 1);
    const y = chartHeight - paddingY - (pt.value / maxVal) * (chartHeight - 2 * paddingY);
    return { x, y, label: pt.label, value: pt.value };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z` 
    : '';



  const getMetricColor = () => {
    if (metric === 'calories') return '#cbf600';
    if (metric === 'protein') return '#ffffff';
    if (metric === 'carbs') return '#cbf600';
    if (metric === 'fat') return '#ffffff';
    return '#cbf600';
  };

  const getMetricUnit = () => {
    return metric === 'calories' ? 'kcal' : metric === 'water' ? 'ml' : 'g';
  };

  return (
    <div className="animate-slide-up" style={styles.container}>
      <h2 style={styles.title}>Analytics</h2>

      {/* Timeframe selector tabs */}
      <div style={styles.timeframeTabs}>
        <button
          style={{ ...styles.timeTab, ...(timeframe === 'week' ? styles.activeTimeTab : {}) }}
          onClick={() => setTimeframe('week')}
        >
          Week
        </button>
        <button
          style={{ ...styles.timeTab, ...(timeframe === 'month' ? styles.activeTimeTab : {}) }}
          onClick={() => setTimeframe('month')}
        >
          Month
        </button>
        <button
          style={{ ...styles.timeTab, ...(timeframe === 'year' ? styles.activeTimeTab : {}) }}
          onClick={() => setTimeframe('year')}
        >
          Year
        </button>
      </div>

      {/* Metric selection pills */}
      <div style={styles.metricRow}>
        <button
          style={{ ...styles.metricPill, ...(metric === 'calories' ? styles.activeCalPill : {}) }}
          onClick={() => setMetric('calories')}
        >
          <Flame size={12} style={{ marginRight: 4 }} /> Calories
        </button>
        <button
          style={{ ...styles.metricPill, ...(metric === 'water' ? styles.activeWaterPill : {}) }}
          onClick={() => setMetric('water')}
        >
          <Droplet size={12} style={{ marginRight: 4 }} /> Water
        </button>
        <button
          style={{ ...styles.metricPill, ...(metric === 'protein' ? styles.activeProtPill : {}) }}
          onClick={() => setMetric('protein')}
        >
          <Dumbbell size={12} style={{ marginRight: 4 }} /> Protein
        </button>
        <button
          style={{ ...styles.metricPill, ...(metric === 'carbs' ? styles.activeCarbPill : {}) }}
          onClick={() => setMetric('carbs')}
        >
          <Egg size={12} style={{ marginRight: 4 }} /> Carbs
        </button>
        <button
          style={{ ...styles.metricPill, ...(metric === 'fat' ? styles.activeFatPill : {}) }}
          onClick={() => setMetric('fat')}
        >
          <Disc size={12} style={{ marginRight: 4 }} /> Fat
        </button>
      </div>

      {/* Summary insights bar */}
      <div style={styles.summaryStatsCard}>
        <div style={styles.statBox}>
          <span style={styles.statLabel}>Daily Target</span>
          <span style={styles.statVal}>{goalValue} {getMetricUnit()}</span>
        </div>
        <div style={styles.statDivider} />
        <div style={styles.statBox}>
          <span style={styles.statLabel}>Period Average</span>
          <span style={{ ...styles.statVal, color: getMetricColor() }}>
            {average} {getMetricUnit()}
          </span>
        </div>
      </div>

      {/* SVG Custom Line Chart Card */}
      <div style={styles.chartCard}>
        {loading ? (
          <div style={styles.chartLoader}>
            <div style={styles.spinner} />
            <p style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: '13px' }}>Loading historical data...</p>
          </div>
        ) : (
          <div style={styles.chartWrapper}>
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height="100%">
              {/* Gradients definitions locally just to be robust */}
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={getMetricColor()} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={getMetricColor()} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line
                x1={paddingX}
                y1={chartHeight - paddingY}
                x2={chartWidth - paddingX}
                y2={chartHeight - paddingY}
                stroke="var(--border-color)"
                strokeWidth={1}
              />
              <line
                x1={paddingX}
                y1={paddingY}
                x2={chartWidth - paddingX}
                y2={paddingY}
                stroke="rgba(39, 39, 42, 0.3)"
                strokeDasharray="4 4"
                strokeWidth={1}
              />

              {/* Goal reference dashed line */}
              {goalValue < maxVal && (
                <g>
                  <line
                    x1={paddingX}
                    y1={chartHeight - paddingY - (goalValue / maxVal) * (chartHeight - 2 * paddingY)}
                    x2={chartWidth - paddingX}
                    y2={chartHeight - paddingY - (goalValue / maxVal) * (chartHeight - 2 * paddingY)}
                    stroke="rgba(255, 255, 255, 0.15)"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                  />
                  <text
                    x={chartWidth - paddingX - 4}
                    y={chartHeight - paddingY - (goalValue / maxVal) * (chartHeight - 2 * paddingY) - 5}
                    fill="var(--text-muted)"
                    fontSize="9px"
                    textAnchor="end"
                    fontWeight="600"
                  >
                    Target: {goalValue}
                  </text>
                </g>
              )}

              {/* Area filled path */}
              {areaPath && <path d={areaPath} fill="url(#areaGrad)" />}

              {/* Line path */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke={getMetricColor()}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data points & tooltips */}
              {points.map((pt, i) => (
                <g key={i}>
                  {/* Point Circle */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={4}
                    fill="var(--bg-card)"
                    stroke={getMetricColor()}
                    strokeWidth={2.5}
                  />

                  {/* Value Label on Top */}
                  <text
                    x={pt.x}
                    y={pt.y - 10}
                    fill="var(--text-primary)"
                    fontSize="9px"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    {pt.value}
                  </text>

                  {/* Date axis label */}
                  <text
                    x={pt.x}
                    y={chartHeight - 8}
                    fill="var(--text-muted)"
                    fontSize="10px"
                    textAnchor="middle"
                    fontWeight="600"
                  >
                    {pt.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        )}
      </div>

      {/* Insight bullet details card */}
      <div style={styles.chartDetailsCard}>
        <h3 style={styles.detailsHeading}>Historical Trends</h3>
        <p style={styles.detailsText}>
          Your intake of <strong>{metric}</strong> averaged <strong>{average} {getMetricUnit()}</strong> per day over this {timeframe}. 
          {average >= goalValue ? (
            <span style={{ color: '#38ef7d' }}> You are meeting or exceeding your daily target on average!</span>
          ) : (
            <span style={{ color: '#ffd600' }}> You are averaging {Math.round((average / goalValue) * 100)}% of your target level.</span>
          )}
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    paddingBottom: '100px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.5px',
  },
  timeframeTabs: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    padding: '4px',
    border: '1px solid var(--border-color)',
  },
  timeTab: {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    borderRadius: '8px',
    padding: '8px 0',
    fontSize: '13px',
    fontWeight: 600,
    textAlign: 'center' as const,
  },
  activeTimeTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: 'var(--text-primary)',
  },
  metricRow: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto' as const,
    padding: '4px 0',
    msOverflowStyle: 'none' as const, /* IE and Edge */
    scrollbarWidth: 'none' as const, /* Firefox */
  },
  metricPill: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '20px',
    padding: '6px 14px',
    color: 'var(--text-secondary)',
    fontSize: '12px',
    fontWeight: 600,
    whiteSpace: 'nowrap' as const,
    display: 'flex',
    alignItems: 'center' as const,
  },
  activeCalPill: {
    backgroundColor: 'rgba(203, 246, 0, 0.08)',
    borderColor: 'rgba(203, 246, 0, 0.25)',
    color: '#cbf600',
  },
  activeWaterPill: {
    backgroundColor: 'rgba(203, 246, 0, 0.08)',
    borderColor: 'rgba(203, 246, 0, 0.25)',
    color: '#cbf600',
  },
  activeProtPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
    color: '#ffffff',
  },
  activeCarbPill: {
    backgroundColor: 'rgba(203, 246, 0, 0.08)',
    borderColor: 'rgba(203, 246, 0, 0.25)',
    color: '#cbf600',
  },
  activeFatPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
    color: '#ffffff',
  },
  summaryStatsCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '16px',
    padding: '16px',
    border: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'space-around' as const,
    alignItems: 'center' as const,
  },
  statBox: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    gap: '2px',
  },
  statLabel: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
  },
  statVal: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  statDivider: {
    width: '1px',
    height: '24px',
    backgroundColor: 'var(--border-color)',
  },
  chartCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '20px',
    padding: '16px',
    border: '1px solid var(--border-color)',
    minHeight: '200px',
    display: 'flex',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  chartLoader: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '2px solid rgba(255, 255, 255, 0.05)',
    borderTopColor: 'var(--text-secondary)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  chartWrapper: {
    width: '100%',
    height: '100%',
  },
  chartDetailsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    borderRadius: '16px',
    padding: '16px',
    border: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  detailsHeading: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  detailsText: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
  },
};
