import { useState, useEffect, useRef } from 'react'
import { WORKOUTS } from '../lib/workouts'

export default function WorkoutSession({ type, onComplete }) {
  const workout = WORKOUTS[type]
  if (!workout) return null

  const [warmupChecked, setWarmupChecked] = useState([])
  const [cooldownChecked, setCooldownChecked] = useState([])
  const [exerciseSets, setExerciseSets] = useState(() =>
    workout.circuit.map(ex =>
      ex.timed
        ? { logged: [] }
        : { sets: [{ reps: '', weight: '' }, { reps: '', weight: '' }, { reps: '', weight: '' }] }
    )
  )
  const [timerSeconds, setTimerSeconds] = useState({})
  const [activeTimer, setActiveTimer] = useState(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => () => clearInterval(intervalRef.current), [])

  function startTimer(idx) {
    if (activeTimer === idx) return
    clearInterval(intervalRef.current)
    setActiveTimer(idx)
    intervalRef.current = setInterval(() => {
      setTimerSeconds(prev => ({ ...prev, [idx]: (prev[idx] || 0) + 1 }))
    }, 1000)
  }

  function pauseTimer() {
    clearInterval(intervalRef.current)
    setActiveTimer(null)
  }

  function resetTimer(idx) {
    clearInterval(intervalRef.current)
    setActiveTimer(null)
    setTimerSeconds(prev => ({ ...prev, [idx]: 0 }))
  }

  function logTimedSet(idx) {
    const sec = timerSeconds[idx] || 0
    if (sec === 0) return
    setExerciseSets(prev => {
      const next = [...prev]
      next[idx] = { logged: [...next[idx].logged, { timeSec: sec }] }
      return next
    })
    resetTimer(idx)
  }

  function fmt(sec) {
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
  }

  function updateRepSet(exIdx, setIdx, field, value) {
    setExerciseSets(prev => {
      const next = [...prev]
      const sets = [...next[exIdx].sets]
      sets[setIdx] = { ...sets[setIdx], [field]: value }
      next[exIdx] = { sets }
      return next
    })
  }

  function addSet(exIdx) {
    setExerciseSets(prev => {
      const next = [...prev]
      next[exIdx] = { sets: [...next[exIdx].sets, { reps: '', weight: '' }] }
      return next
    })
  }

  function removeLoggedSet(exIdx, setIdx) {
    setExerciseSets(prev => {
      const next = [...prev]
      const logged = next[exIdx].logged.filter((_, i) => i !== setIdx)
      next[exIdx] = { logged }
      return next
    })
  }

  async function handleComplete() {
    setSaving(true)
    const sets = []
    workout.circuit.forEach((ex, i) => {
      const es = exerciseSets[i]
      if (ex.timed) {
        es.logged.forEach((entry, j) => {
          sets.push({ exercise: ex.name, setNumber: j + 1, timeSec: entry.timeSec })
        })
      } else {
        es.sets.forEach((row, j) => {
          if (row.reps || row.weight) {
            sets.push({
              exercise: ex.name,
              setNumber: j + 1,
              reps: row.reps ? parseInt(row.reps) : null,
              weightKg: row.weight ? parseFloat(row.weight) : null,
            })
          }
        })
      }
    })
    onComplete({ completed: true, notes, sets })
  }

  function toggleCheck(arr, setArr, idx) {
    setArr(arr.includes(idx) ? arr.filter(x => x !== idx) : [...arr, idx])
  }

  return (
    <div style={s.container}>
      {/* Warm-up */}
      <p style={s.sectionLabel}>🌡️ Warm-Up</p>
      {workout.warmup.map((ex, i) => {
        const done = warmupChecked.includes(i)
        return (
          <div key={i} style={s.checkRow} onClick={() => toggleCheck(warmupChecked, setWarmupChecked, i)}>
            <span style={{ ...s.checkIcon, color: done ? '#4caf82' : '#444' }}>{done ? '✓' : '○'}</span>
            <span style={{ ...s.checkName, color: done ? '#555' : '#ccc', textDecoration: done ? 'line-through' : 'none' }}>{ex.name}</span>
            <span style={s.checkDetail}>{ex.detail}</span>
          </div>
        )
      })}

      {/* Circuit */}
      <p style={{ ...s.sectionLabel, marginTop: 24 }}>💪 Circuit · {workout.rounds}</p>
      {workout.circuit.map((ex, i) => {
        const es = exerciseSets[i]
        const sec = timerSeconds[i] || 0
        const running = activeTimer === i
        const pct = ex.targetSec ? Math.min(100, (sec / ex.targetSec) * 100) : 0
        return (
          <div key={i} style={s.exCard}>
            <div style={s.exHeader}>
              <span style={s.exNum}>{i + 1}</span>
              <div style={s.exInfo}>
                <span style={s.exName}>{ex.name}</span>
                <span style={s.exDetail}>{ex.detail}</span>
              </div>
            </div>

            {ex.timed ? (
              <div style={s.timerBlock}>
                <div style={s.timerDisplay}>
                  <span style={{ ...s.timerTime, color: pct >= 100 ? '#4caf82' : '#eee' }}>{fmt(sec)}</span>
                  {ex.targetSec && (
                    <span style={s.timerTarget}>/ {fmt(ex.targetSec)} target</span>
                  )}
                </div>
                {ex.targetSec && (
                  <div style={s.progressBar}>
                    <div style={{ ...s.progressFill, width: `${pct}%`, background: pct >= 100 ? '#4caf82' : '#4f9cf9' }} />
                  </div>
                )}
                <div style={s.timerControls}>
                  <button style={{ ...s.tBtn, background: running ? '#4a3a1e' : '#1e3a4a' }} onClick={() => running ? pauseTimer() : startTimer(i)}>
                    {running ? '⏸ Pause' : '▶ Start'}
                  </button>
                  <button style={{ ...s.tBtn, background: '#2a2a3e' }} onClick={() => resetTimer(i)}>↺ Reset</button>
                  <button style={{ ...s.tBtn, background: sec > 0 ? '#1e3a2a' : '#1a1a2e', opacity: sec > 0 ? 1 : 0.4 }} onClick={() => logTimedSet(i)} disabled={sec === 0}>
                    ✓ Log
                  </button>
                </div>
                {es.logged.length > 0 && (
                  <div style={s.loggedList}>
                    {es.logged.map((entry, j) => (
                      <div key={j} style={s.loggedItem}>
                        <span style={s.loggedText}>Set {j + 1}: {fmt(entry.timeSec)}</span>
                        <button style={s.removeBtn} onClick={() => removeLoggedSet(i, j)}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={s.setsBlock}>
                <div style={s.setsHeader}>
                  <span style={s.colSet}>Set</span>
                  <span style={s.colReps}>Reps</span>
                  <span style={s.colKg}>kg</span>
                </div>
                {es.sets.map((row, j) => (
                  <div key={j} style={s.setRow}>
                    <span style={{ ...s.colSet, color: '#555', fontWeight: 700 }}>{j + 1}</span>
                    <input
                      style={s.setInput}
                      type="number"
                      inputMode="numeric"
                      placeholder="—"
                      value={row.reps}
                      onChange={e => updateRepSet(i, j, 'reps', e.target.value)}
                    />
                    <input
                      style={s.setInput}
                      type="number"
                      inputMode="decimal"
                      placeholder="—"
                      value={row.weight}
                      onChange={e => updateRepSet(i, j, 'weight', e.target.value)}
                    />
                  </div>
                ))}
                <button style={s.addSetBtn} onClick={() => addSet(i)}>+ Set</button>
              </div>
            )}
          </div>
        )
      })}

      {/* Cool-down */}
      <p style={{ ...s.sectionLabel, marginTop: 24 }}>🧊 Cool-Down</p>
      {workout.cooldown.map((ex, i) => {
        const done = cooldownChecked.includes(i)
        return (
          <div key={i} style={s.checkRow} onClick={() => toggleCheck(cooldownChecked, setCooldownChecked, i)}>
            <span style={{ ...s.checkIcon, color: done ? '#4caf82' : '#444' }}>{done ? '✓' : '○'}</span>
            <span style={{ ...s.checkName, color: done ? '#555' : '#ccc', textDecoration: done ? 'line-through' : 'none' }}>{ex.name}</span>
            <span style={s.checkDetail}>{ex.detail}</span>
          </div>
        )
      })}

      {/* Notes */}
      <p style={{ ...s.sectionLabel, marginTop: 24 }}>Notes</p>
      <textarea
        style={s.notes}
        placeholder="How did it feel? Any modifications?"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        rows={3}
      />

      <button style={{ ...s.completeBtn, opacity: saving ? 0.6 : 1 }} onClick={handleComplete} disabled={saving}>
        {saving ? 'Saving…' : '✓ Complete Workout'}
      </button>
    </div>
  )
}

const s = {
  container: { padding: '4px 0 32px' },
  sectionLabel: { margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  checkRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#0d0d1a', borderRadius: 8, marginBottom: 6, cursor: 'pointer', userSelect: 'none' },
  checkIcon: { fontSize: 16, width: 18, textAlign: 'center', flexShrink: 0 },
  checkName: { flex: 1, fontSize: 14, transition: 'color 0.15s' },
  checkDetail: { fontSize: 12, color: '#555', flexShrink: 0 },
  exCard: { background: '#0d0d1a', borderRadius: 10, padding: '12px', marginBottom: 10 },
  exHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  exNum: { width: 24, height: 24, background: '#2a2a3e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#4f9cf9', flexShrink: 0, textAlign: 'center', lineHeight: '24px' },
  exInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  exName: { fontSize: 14, fontWeight: 600, color: '#eee' },
  exDetail: { fontSize: 12, color: '#666' },
  timerBlock: { paddingLeft: 34 },
  timerDisplay: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 },
  timerTime: { fontSize: 36, fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: -1 },
  timerTarget: { fontSize: 13, color: '#555' },
  progressBar: { height: 4, background: '#1a1a2e', borderRadius: 2, marginBottom: 10, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2, transition: 'width 0.5s, background 0.3s' },
  timerControls: { display: 'flex', gap: 8, marginBottom: 10 },
  tBtn: { flex: 1, padding: '8px 4px', border: 'none', borderRadius: 8, color: '#eee', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  loggedList: { display: 'flex', flexDirection: 'column', gap: 4 },
  loggedItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1a1a2e', borderRadius: 6, padding: '4px 8px' },
  loggedText: { fontSize: 13, color: '#4caf82' },
  removeBtn: { background: 'none', border: 'none', color: '#555', fontSize: 14, cursor: 'pointer', padding: '0 2px' },
  setsBlock: { paddingLeft: 34 },
  setsHeader: { display: 'flex', marginBottom: 4 },
  colSet: { width: 30, fontSize: 11, color: '#555', fontWeight: 600 },
  colReps: { flex: 1, fontSize: 11, color: '#555', fontWeight: 600, textAlign: 'center' },
  colKg: { flex: 1, fontSize: 11, color: '#555', fontWeight: 600, textAlign: 'center' },
  setRow: { display: 'flex', alignItems: 'center', marginBottom: 6 },
  setInput: { flex: 1, background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 6, color: '#eee', fontSize: 15, padding: '6px', textAlign: 'center', outline: 'none', marginRight: 6, minWidth: 0 },
  addSetBtn: { background: 'none', border: '1px solid #2a2a3e', borderRadius: 6, color: '#555', fontSize: 12, padding: '4px 10px', cursor: 'pointer', marginTop: 2 },
  notes: { width: '100%', background: '#0d0d1a', border: '1px solid #2a2a3e', borderRadius: 8, color: '#eee', fontSize: 14, padding: 10, resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  completeBtn: { display: 'block', width: '100%', marginTop: 20, padding: '14px', background: '#4caf82', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' },
}
