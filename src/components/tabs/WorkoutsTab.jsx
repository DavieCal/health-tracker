import { useState, useEffect, useCallback } from 'react'
import Sheet from '../Sheet'
import WorkoutForm from '../forms/WorkoutForm'
import WorkoutDetail from '../WorkoutDetail'
import { getRecentWorkouts, getWorkoutsThisWeek } from '../../lib/db'
import { weekStart, torontoDate, WORKOUT_SCHEDULE, formatShortDate, todaySchedule } from '../../lib/dates'
import { WORKOUTS } from '../../lib/workouts'

const TYPE_LABELS = { A: 'Workout A', B: 'Workout B', stability: 'Stability', bike: 'Bike', rest: 'Rest' }

export default function WorkoutsTab({ onSaved }) {
  const [logSheet, setLogSheet] = useState(false)
  const [detailType, setDetailType] = useState(null)
  const [recent, setRecent] = useState([])
  const [thisWeek, setThisWeek] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [r, w] = await Promise.all([getRecentWorkouts(20), getWorkoutsThisWeek()])
    setRecent(r)
    setThisWeek(w)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function handleSave() {
    setLogSheet(false)
    load()
    onSaved()
  }

  if (loading) return <div style={s.loading}>Loading…</div>

  const ws = weekStart()
  const today = torontoDate()
  const scheduled = todaySchedule()

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(ws + 'T00:00:00')
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    const sched = WORKOUT_SCHEDULE[d.getDay()]
    const logged = thisWeek.find(w => w.toronto_date === dateStr)
    return { dateStr, sched, logged, isToday: dateStr === today }
  })

  return (
    <div style={s.container}>
      <div style={s.headerRow}>
        <h2 style={s.heading}>Workouts</h2>
        <button style={s.logBtn} onClick={() => setLogSheet(true)}>+ Log</button>
      </div>

      {/* Week strip */}
      <p style={s.sectionLabel}>This Week</p>
      <div style={s.weekStrip}>
        {weekDays.map(({ dateStr, sched, logged, isToday }) => (
          <button
            key={dateStr}
            style={{ ...s.dayCell, background: isToday ? '#1e1e3a' : '#1a1a2e', border: isToday ? '1px solid #4f9cf9' : '1px solid transparent' }}
            onClick={() => WORKOUTS[sched.type] && setDetailType(sched.type)}
          >
            <span style={s.dayName}>{['Su','Mo','Tu','We','Th','Fr','Sa'][new Date(dateStr + 'T00:00:00').getDay()]}</span>
            <span style={s.dayEmoji}>{logged ? (logged.completed ? '✅' : '❌') : sched.emoji}</span>
            <span style={{ ...s.dayType, color: logged?.completed ? '#4caf82' : '#666' }}>
              {logged ? TYPE_LABELS[logged.workout_type] : sched.type.toUpperCase()}
            </span>
          </button>
        ))}
      </div>

      {/* Today's workout reference */}
      {WORKOUTS[scheduled.type] && (
        <>
          <div style={s.todayHeader}>
            <div>
              <p style={s.sectionLabel}>Today's Workout</p>
              <p style={s.todayName}>{scheduled.emoji} {WORKOUTS[scheduled.type].name}</p>
            </div>
          </div>
          <div style={s.detailCard}>
            <WorkoutDetail type={scheduled.type} />
          </div>
        </>
      )}

      {/* Recent history */}
      <p style={{ ...s.sectionLabel, marginTop: 24 }}>Recent</p>
      {recent.length === 0 && <p style={s.empty}>No workouts logged yet.</p>}
      {recent.map(w => (
        <div key={w.id} style={s.workoutCard}>
          <div style={s.cardTop}>
            <button
              style={s.cardTypeBtn}
              onClick={() => WORKOUTS[w.workout_type] && setDetailType(w.workout_type)}
            >
              <span style={s.cardEmoji}>{WORKOUT_SCHEDULE[new Date(w.toronto_date + 'T00:00:00').getDay()].emoji}</span>
              <div style={s.cardInfo}>
                <span style={s.cardType}>{TYPE_LABELS[w.workout_type] || w.workout_type}</span>
                <span style={s.cardDate}>{formatShortDate(w.toronto_date)}</span>
              </div>
            </button>
            <span style={{ ...s.cardStatus, color: w.completed ? '#4caf82' : '#e06c75' }}>
              {w.completed ? '✓ Done' : '✗ Skip'}
            </span>
          </div>
          {w.notes && <p style={s.cardNotes}>{w.notes}</p>}
          {w.workout_sets?.length > 0 && (
            <div style={s.sets}>
              {w.workout_sets.map((set, i) => (
                <div key={i} style={s.setRow}>
                  <span style={s.setExercise}>{set.exercise}</span>
                  <span style={s.setStat}>{set.reps ? `${set.reps} reps` : ''}{set.weight_kg ? ` @ ${set.weight_kg}kg` : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Log workout sheet */}
      <Sheet open={logSheet} onClose={() => setLogSheet(false)} title="Log Workout">
        <WorkoutForm onSave={handleSave} />
      </Sheet>

      {/* Workout detail sheet (tap any workout to view) */}
      <Sheet
        open={!!detailType}
        onClose={() => setDetailType(null)}
        title={detailType ? (WORKOUTS[detailType]?.name || '') : ''}
      >
        {detailType && <WorkoutDetail type={detailType} />}
      </Sheet>
    </div>
  )
}

const s = {
  container: { padding: '20px 16px 32px' },
  loading: { padding: 40, textAlign: 'center', color: '#666' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  heading: { margin: 0, fontSize: 22, fontWeight: 700 },
  logBtn: { background: '#4f9cf9', border: 'none', borderRadius: 8, color: '#fff', padding: '8px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  sectionLabel: { margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: 1 },
  weekStrip: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 24 },
  dayCell: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 4px', borderRadius: 10, cursor: 'pointer' },
  dayName: { fontSize: 10, color: '#666', fontWeight: 600 },
  dayEmoji: { fontSize: 18 },
  dayType: { fontSize: 9, fontWeight: 600, textAlign: 'center' },
  todayHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  todayName: { margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: '#eee' },
  detailCard: { background: '#1a1a2e', borderRadius: 14, padding: '14px 14px 8px', marginBottom: 8 },
  workoutCard: { background: '#1a1a2e', borderRadius: 12, padding: 14, marginBottom: 10 },
  cardTop: { display: 'flex', alignItems: 'center', gap: 12 },
  cardTypeBtn: { flex: 1, display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' },
  cardEmoji: { fontSize: 24 },
  cardInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  cardType: { fontWeight: 700, fontSize: 15, color: '#eee' },
  cardDate: { fontSize: 12, color: '#666' },
  cardStatus: { fontWeight: 700, fontSize: 13, flexShrink: 0 },
  cardNotes: { margin: '8px 0 0', fontSize: 13, color: '#aaa' },
  sets: { marginTop: 10, borderTop: '1px solid #2a2a3e', paddingTop: 10 },
  setRow: { display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 13 },
  setExercise: { color: '#ccc' },
  setStat: { color: '#888' },
  empty: { color: '#555', fontSize: 14 },
}
