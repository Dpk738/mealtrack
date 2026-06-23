import { useState } from 'react';
import type { Meal } from '../supabaseClient';
import { Calendar, Trash2, Edit2, ChevronLeft, ChevronRight, Save, X, Utensils } from 'lucide-react';

interface HistoryProps {
  meals: Meal[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  onUpdateMeal: (meal: Meal) => void;
  onDeleteMeal: (id: number) => void;
}


export default function History({
  meals,
  selectedDate,
  onDateChange,
  onUpdateMeal,
  onDeleteMeal
}: HistoryProps) {
  const [editingMealId, setEditingMealId] = useState<number | null>(null);
  
  // Edit Form State
  const [editName, setEditName] = useState('');
  const [editQty, setEditQty] = useState(1);
  const [editSize, setEditSize] = useState('');
  const [editCal, setEditCal] = useState(0);
  const [editProt, setEditProt] = useState(0);
  const [editCarb, setEditCarb] = useState(0);
  const [editFat, setEditFat] = useState(0);
  const [editFiber, setEditFiber] = useState(0);
  const [editSugar, setEditSugar] = useState(0);
  const [editDesc, setEditDesc] = useState('');

  // Navigate date
  const changeDateByAmount = (days: number) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    onDateChange(`${yyyy}-${mm}-${dd}`);
  };

  const handleEditClick = (meal: Meal) => {
    if (!meal.id) return;
    setEditingMealId(meal.id);
    setEditName(meal.name);
    setEditQty(meal.serving_quantity);
    setEditSize(meal.serving_size);
    setEditCal(meal.calories);
    setEditProt(meal.protein);
    setEditCarb(meal.carbs);
    setEditFat(meal.fat);
    setEditFiber(meal.fiber || 0);
    setEditSugar(meal.sugar || 0);
    setEditDesc(meal.description || '');
  };

  const handleSaveEdit = (meal: Meal) => {
    if (!meal.id) return;
    
    onUpdateMeal({
      ...meal,
      name: editName.trim(),
      serving_quantity: Math.max(0.1, Number(editQty) || 1),
      serving_size: editSize.trim(),
      calories: Math.max(0, Math.round(Number(editCal) || 0)),
      protein: Math.max(0, Number(editProt) || 0),
      carbs: Math.max(0, Number(editCarb) || 0),
      fat: Math.max(0, Number(editFat) || 0),
      fiber: Math.max(0, Number(editFiber) || 0),
      sugar: Math.max(0, Number(editSugar) || 0),
      description: editDesc.trim() || undefined,
    });

    setEditingMealId(null);
  };

  const handleDeleteClick = (id?: number) => {
    if (!id) return;
    if (window.confirm('Delete this meal log?')) {
      onDeleteMeal(id);
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Day totals for header summary
  const totalCal = meals.reduce((sum, m) => sum + (m.calories * (m.serving_quantity || 1)), 0);
  const totalProt = meals.reduce((sum, m) => sum + (m.protein * (m.serving_quantity || 1)), 0);
  const totalCarb = meals.reduce((sum, m) => sum + (m.carbs * (m.serving_quantity || 1)), 0);
  const totalFat = meals.reduce((sum, m) => sum + (m.fat * (m.serving_quantity || 1)), 0);

  return (
    <div className="animate-slide-up" style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>History</h2>
        
        {/* Date Navigator */}
        <div style={styles.dateSelector}>
          <button style={styles.arrowBtn} onClick={() => changeDateByAmount(-1)}>
            <ChevronLeft size={16} />
          </button>
          
          <div style={styles.dateLabelContainer}>
            <Calendar size={14} style={{ color: 'var(--text-secondary)' }} />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              style={styles.datePickerInput}
            />
          </div>

          <button style={styles.arrowBtn} onClick={() => changeDateByAmount(1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Mini Summary of the Day */}
      {meals.length > 0 && (
        <div style={styles.daySummaryBox}>
          <div style={styles.summaryItem}>
            <span style={styles.summaryVal}>{Math.round(totalCal)}</span>
            <span style={styles.summaryLabel}>kcal</span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryVal}>{Math.round(totalProt)}g</span>
            <span style={styles.summaryLabel}>Prot</span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryVal}>{Math.round(totalCarb)}g</span>
            <span style={styles.summaryLabel}>Carbs</span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryVal}>{Math.round(totalFat)}g</span>
            <span style={styles.summaryLabel}>Fat</span>
          </div>
        </div>
      )}

      {/* Meals Log List */}
      <div className="history-list">
        {meals.length === 0 ? (
          <div style={styles.emptyState}>
            <Utensils size={32} style={{ color: 'var(--text-muted)' }} />
            <p style={styles.emptyText}>No food logs found for this date.</p>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Head to the Log tab to snap a photo or input manually.
            </span>
          </div>
        ) : (
          meals.map((meal) => {
            const isEditing = editingMealId === meal.id;

            return (
              <div key={meal.id} style={styles.mealCard}>
                {isEditing ? (
                  /* Edit Mode Form Inline */
                  <div style={styles.editForm}>
                    <div style={styles.editRow}>
                      <label style={styles.editLabel}>Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        style={styles.editInput}
                      />
                    </div>

                    <div style={styles.editRow}>
                      <label style={styles.editLabel}>Breakdown</label>
                      <input
                        type="text"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        style={styles.editInput}
                        placeholder="Portion and calorie breakdown..."
                      />
                    </div>
                    
                    <div style={styles.editGrid}>
                      <div>
                        <label style={styles.editLabel}>Qty</label>
                        <input
                          type="number"
                          step="0.1"
                          value={editQty}
                          onChange={(e) => setEditQty(Number(e.target.value))}
                          style={styles.editInput}
                        />
                      </div>
                      <div>
                        <label style={styles.editLabel}>Unit</label>
                        <input
                          type="text"
                          value={editSize}
                          onChange={(e) => setEditSize(e.target.value)}
                          style={styles.editInput}
                        />
                      </div>
                      <div>
                        <label style={styles.editLabel}>kcal</label>
                        <input
                          type="number"
                          value={editCal}
                          onChange={(e) => setEditCal(Number(e.target.value))}
                          style={styles.editInput}
                        />
                      </div>
                    </div>

                    <div style={styles.editGrid}>
                      <div>
                        <label style={styles.editLabel}>P (g)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={editProt}
                          onChange={(e) => setEditProt(Number(e.target.value))}
                          style={styles.editInput}
                        />
                      </div>
                      <div>
                        <label style={styles.editLabel}>C (g)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={editCarb}
                          onChange={(e) => setEditCarb(Number(e.target.value))}
                          style={styles.editInput}
                        />
                      </div>
                      <div>
                        <label style={styles.editLabel}>F (g)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={editFat}
                          onChange={(e) => setEditFat(Number(e.target.value))}
                          style={styles.editInput}
                        />
                      </div>
                    </div>

                    <div style={styles.editGrid}>
                      <div>
                        <label style={styles.editLabel}>Fiber (g)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={editFiber}
                          onChange={(e) => setEditFiber(Number(e.target.value))}
                          style={styles.editInput}
                        />
                      </div>
                      <div>
                        <label style={styles.editLabel}>Sugar (g)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={editSugar}
                          onChange={(e) => setEditSugar(Number(e.target.value))}
                          style={styles.editInput}
                        />
                      </div>
                      <div />
                    </div>

                    <div style={styles.editActions}>
                      <button type="button" onClick={() => setEditingMealId(null)} style={styles.editCancelBtn}>
                        <X size={14} style={{ marginRight: 4 }} /> Cancel
                      </button>
                      <button type="button" onClick={() => handleSaveEdit(meal)} style={styles.editSaveBtn}>
                        <Save size={14} style={{ marginRight: 4 }} /> Save
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Standard Display Mode */
                  <div style={styles.mealLayout}>
                    {/* Meal Image */}
                    <div style={styles.mealImageWrapper}>
                      {meal.photo_url ? (
                        <img src={meal.photo_url} alt={meal.name} style={styles.mealPhoto} />
                      ) : (
                        <div style={styles.mealPhotoPlaceholder}>
                          <Utensils size={18} style={{ color: 'var(--text-muted)' }} />
                        </div>
                      )}
                    </div>

                    {/* Meal Details */}
                    <div style={styles.mealDetails}>
                      <div style={styles.mealHeaderRow}>
                        <span style={styles.mealName}>{meal.name}</span>
                        <span style={styles.mealCalories}>
                          {Math.round(meal.calories * meal.serving_quantity)} kcal
                        </span>
                      </div>

                      <div style={styles.mealMetaRow}>
                        <span>{formatTime(meal.timestamp)}</span>
                        <span>•</span>
                        <span>{meal.serving_quantity} {meal.serving_size}</span>
                      </div>

                      {meal.description && (
                        <div style={styles.mealDescription}>{meal.description}</div>
                      )}

                      {/* Macronutrient badges */}
                      <div style={styles.macrosRow}>
                        <span style={styles.macroBadge}>
                          P: <strong style={{ color: 'var(--text-primary)' }}>{Math.round(meal.protein * meal.serving_quantity)}g</strong>
                        </span>
                        <span style={styles.macroBadge}>
                          C: <strong style={{ color: 'var(--text-primary)' }}>{Math.round(meal.carbs * meal.serving_quantity)}g</strong>
                        </span>
                        <span style={styles.macroBadge}>
                          F: <strong style={{ color: 'var(--text-primary)' }}>{Math.round(meal.fat * meal.serving_quantity)}g</strong>
                        </span>
                      </div>

                      {/* Fiber and sugar details */}
                      {(meal.fiber !== undefined || meal.sugar !== undefined) && (
                        <div style={styles.minorMacrosRow}>
                          {meal.fiber !== undefined && (
                            <span style={styles.minorMacroText}>Fiber: {Math.round(meal.fiber * meal.serving_quantity * 10) / 10}g</span>
                          )}
                          {meal.fiber !== undefined && meal.sugar !== undefined && <span style={{ color: 'var(--text-muted)' }}>|</span>}
                          {meal.sugar !== undefined && (
                            <span style={styles.minorMacroText}>Sugar: {Math.round(meal.sugar * meal.serving_quantity * 10) / 10}g</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Panel */}
                    <div style={styles.cardActions}>
                      <button style={styles.actionIconBtn} onClick={() => handleEditClick(meal)}>
                        <Edit2 size={13} style={{ color: 'var(--text-secondary)' }} />
                      </button>
                      <button style={styles.actionIconBtn} onClick={() => handleDeleteClick(meal.id)}>
                        <Trash2 size={13} style={{ color: '#ff5e62' }} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
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
  header: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.5px',
  },
  dateSelector: {
    display: 'flex',
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    padding: '4px 8px',
    border: '1px solid var(--border-color)',
  },
  arrowBtn: {
    background: 'none',
    border: 'none',
    padding: '8px',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center' as const,
  },
  dateLabelContainer: {
    display: 'flex',
    alignItems: 'center' as const,
    gap: '8px',
  },
  datePickerInput: {
    background: 'none',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontWeight: 600,
    padding: '4px 0',
    cursor: 'pointer',
  },
  daySummaryBox: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '12px 6px',
    textAlign: 'center' as const,
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  summaryVal: {
    fontSize: '14px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  summaryLabel: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    textAlign: 'center' as const,
    padding: '48px 24px',
    gap: '12px',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '20px',
    border: '1px solid var(--border-color)',
  },
  emptyText: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  mealCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
    padding: '12px',
    overflow: 'hidden',
  },
  mealLayout: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center' as const,
  },
  mealImageWrapper: {
    width: '64px',
    height: '64px',
    borderRadius: '10px',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border-color)',
    flexShrink: 0,
  },
  mealPhoto: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  mealPhotoPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  mealDetails: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    overflow: 'hidden',
  },
  mealHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between' as const,
    alignItems: 'baseline' as const,
    gap: '8px',
  },
  mealName: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  mealCalories: {
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--color-cal)',
    flexShrink: 0,
  },
  mealMetaRow: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    display: 'flex',
    gap: '6px',
  },
  mealDescription: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
    marginTop: '3px',
    marginBottom: '1px',
  },
  macrosRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '4px',
  },
  macroBadge: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
  },
  minorMacrosRow: {
    display: 'flex',
    gap: '6px',
    marginTop: '2px',
    fontSize: '10px',
    color: 'var(--text-muted)',
  },
  minorMacroText: {
    color: 'var(--text-muted)',
  },
  cardActions: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    alignSelf: 'stretch',
    justifyContent: 'center' as const,
    borderLeft: '1px solid var(--border-color)',
    paddingLeft: '10px',
  },
  actionIconBtn: {
    background: 'none',
    border: 'none',
    padding: '4px',
    display: 'flex',
    alignItems: 'center' as const,
  },
  editForm: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    width: '100%',
  },
  editRow: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  editGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  editLabel: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  editInput: {
    width: '100%',
    padding: '6px 10px',
    fontSize: '13px',
  },
  editActions: {
    display: 'flex',
    justifyContent: 'flex-end' as const,
    gap: '8px',
    marginTop: '6px',
    borderTop: '1px solid var(--border-color)',
    paddingTop: '8px',
  },
  editSaveBtn: {
    display: 'flex',
    alignItems: 'center' as const,
    backgroundColor: 'var(--text-primary)',
    color: 'var(--bg-dark)',
    border: 'none',
    borderRadius: '8px',
    padding: '6px 14px',
    fontSize: '12px',
    fontWeight: 600,
  },
  editCancelBtn: {
    display: 'flex',
    alignItems: 'center' as const,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    borderRadius: '8px',
    padding: '6px 14px',
    fontSize: '12px',
    fontWeight: 600,
  },
};
