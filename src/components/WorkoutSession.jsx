import { useState, useEffect, useRef } from 'react'
import useWakeLock from '../hooks/useWakeLock'
import { WORKOUTS, EQUIPMENT, equipmentFor, optionsFor, defaultOption, resolveExercise } from '../lib/workouts'
import { getLastExerciseWeight } from '../lib/db'

const EQUIP_KEY = 'ht-equipment'

function loadEquipment() {
  try { return JSON.parse(localStorage.getItem(EQUIP_KEY)) || [] } catch { return [] }
}
function saveEquipment(list) {
  try { localStorage.setItem(EQUIP_KEY, JSON.stringify(list)) } catch { /* storage unavailable */ }
}

const emptyRepSets = () => [{ reps: '', weight: '' }, { reps: '', weight: '' }, { reps: '', weight: '' }]
const emptyWeightSets = (w = '') => [{ weight: w }, { weight: w }, { weight: w }]

export default function WorkoutSession({ type, onComplete }) {
  useWakeLock()
  const workout = WORKOUTS[type]

  const [equipment, setEquipment] = useState(loadEquipment)   // e.g. ['band']
  const [choice, setChoice] = useState({})                     // base name → chosen version key ('bodyweight' | 'band' …)
  const [warmupChecked, setWarmupChecked] = useState([])
  const [cooldownChecked, setCooldownChecked] = useState([])
  const [repSets, setRepSets] = useState({})                   // base name → [{reps, weight}]
  const [timedLogs, setTimedLogs] = useState({})               // base name → [{timeSec}]
  const [finisherSets, setFinisherSets] = useState(() =>
    Object.fromEntries((workout?.finisher || []).map(ex => [ex.name, emptyWeightSets()]))
  )
  const [timerSeconds, setTimerSeconds] = useState({})
  const [activeTimer, setActiveTimer] = useState(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const intervalRef = useRef(null)
  const finisherTouched = useRef(false)

  useEffect(() => () => clearInterval(intervalRef.current), [])

  // Prefill finisher weights with the last weight used, unless already edited.
  useEffect(() => {
    let cancelled = false
    for (const ex of workout?.finisher || []) {
      getLastExerciseWeight(ex.name)
        .then(w => {
          if (cancelled || w == null || finisherTouched.current) return
          setFinisherSets(prev => ({ ...prev, [ex.name]: emptyWeightSets(String(w)) }))
        })
        .catch(() => {})
    }
    return () => { cancelled = true }
  }, [workout])

  if (!workout) return null

  const availableEquipment = equipmentFor(workout)
  const circuit = workout.circuit
    .filter(ex => !ex.requires || equipment.includes(ex.requires))
    .map(ex => {
      const version = choice[ex.name] || defaultOption(ex, equipment)
      return { base: ex, ex: resolveExercise(ex, version), version }
    })

  // The picker sets the default for every exercise; per-exercise toggles override it.
  function toggleEquipment(key) {
    const next = equipment.includes(key) ? equipment.filter(k => k !== key) : [...equipment, key]
    setEquipment(next)
    setChoice({})
    saveEquipment(next)
  }

  // ── timers ──
  function startTimer(key) {
    if (activeTimer === key) return
    clearInterval(intervalRef.current)
    setActiveTimer(key)
    intervalRef.current = setInterval(() => {
      setTimerSeconds(prev => ({ ...prev, [key]: (prev[key] || 0) + 1 }))
    }, 1000)
  }
  function pauseTimer() {
    clearInterval(intervalRef.current)
    setActiveTimer(null)
  }
  function resetTimer(key) {
    if (activeTimer === key) pauseTimer()
    setTimerSeconds(prev => ({ ...prev, [key]: 0 }))
  }
  function logTimedSet(key) {
    const sec = timerSeconds[key] || 0
    if (sec === 0) return
    setTimedLogs(prev => ({ ...prev, [key]: [...(prev[key] || []), { timeSec: sec }] }))
    resetTimer(key)
  }
  function removeLoggedSet(key, idx) {
    setTimedLogs(prev => ({ ...prev, [key]: prev[key].filter((_, i) => i !== idx) }))
  }

  // ── rep sets ──
  function updateRepSet(key, idx, field, value) {
    setRepSets(prev => {
      const sets = [...(prev[key] || emptyRepSets())]
      sets[idx] = { ...sets[idx], [field]: value }
      return { ...prev, [key]: sets }
    })
  }
  function addRepSet(key) {
    setRepSets(prev => ({ ...prev, [key]: [...(prev[key] || emptyRepSets()), { reps: '', weight: '' }] }))
  }

  // ── finisher ──
  function updateFinisher(key, idx, value) {
    finisherTouched.current = true
    setFinisherSets(prev => {
      const sets = [...prev[key]]
      sets[idx] = { weight: value }
      return { ...prev, [key]: sets }
    })
  }
  function addFinisherSet(key) {
    finisherTouched.current = true
    setFinisherSets(prev => {
      const sets = prev[key]
      return { ...prev, [key]: [...sets, { weight: sets[sets.length - 1]?.weight || '' }] }
    })
  }

  function handleComplete() {
    setSaving(true)
    pauseTimer()
    const sets = []
    circuit.forEach(({ base, ex }) => {
      if (ex.timed) {
        (timedLogs[base.name] || []).forEach((entry, j) => {
          sets.push({ exercise: ex.name, setNumber: j + 1, timeSec: entry.timeSec })
        })
      } else {
        (repSets[base.name] || []).forEach((row, j) => {
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
    ;(workout.finisher || []).forEach(ex => {
      finisherSets[ex.name].forEach((row, j) => {
        if (row.weight) sets.push({ exercise: ex.name, setNumber: j + 1, weightKg: parseFloat(row.weight) })
      })
    })
    onComplete({ completed: true, notes, sets })
  }

  function toggleCheck(arr, setArr, idx) {
    setArr(arr.includes(idx) ? arr.filter(x => x !== idx) : [...arr, idx])
  }

  return (
    <div style={s.container}>
      {/* Equipment picker */}
      {availableEquipment.length > 0 && (
        <div style={s.equipBlock}>
          <p style={s.sectionLabel}>🧰 Default for today</p>
          <div style={s.equipRow}>
            <span style={{ ...s.equipChip, ...s.equipChipOn, cursor: 'default' }}>🤸 Bodyweight</span>
            {availableEquipment.map(k => {
              const on = equipment.includes(k)
              return (
                <button key={k} style={{ ...s.equipChip, ...(on ? s.equipChipOn : {}) }} onClick={() => toggleEquipment(k)}>
                  {EQUIPMENT[k].emoji} {EQUIPMENT[k].label}
                </button>
              )
            })}
          </div>
        </div>
      )}

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
      {circuit.map(({ base, ex, version }, i) => {
        const key = base.name
        const sec = timerSeconds[key] || 0
        const running = activeTimer === key
        const pct = ex.targetSec ? Math.min(100, (sec / ex.targetSec) * 100) : 0
        const logged = timedLogs[key] || []
        const rows = repSets[key] || emptyRepSets()
        const options = optionsFor(base)
        return (
          <div key={key} style={s.exCard}>
            <div style={s.exHeader}>
              <span style={s.exNum}>{i + 1}</span>
              <div style={s.exInfo}>
                <span style={s.exName}>{ex.name}</span>
                <span style={s.exDetail}>{ex.detail}</span>
              </div>
            </div>
            <div style={s.optRow}>
              {options.length > 1 ? options.map(k => (
                <button
                  key={k}
                  style={{ ...s.optBtn, ...(version === k ? s.optBtnOn : {}) }}
                  onClick={() => setChoice(prev => ({ ...prev, [key]: k }))}
                >
                  {EQUIPMENT[k].emoji} {EQUIPMENT[k].label}
                </button>
              )) : (
                <span style={s.optOnly}>{EQUIPMENT[options[0]].emoji} {EQUIPMENT[options[0]].label} only</span>
              )}
            </div>
            {ex.cue && <p style={s.exCue}>{ex.cue}</p>}

            {ex.timed ? (
              <div style={s.timerBlock}>
                <div style={s.timerDisplay}>
                  <span style={{ ...s.timerTime, color: pct >= 100 ? '#4caf82' : '#eee' }}>{fmt(sec)}</span>
                  {ex.targetSec && <span style={s.timerTarget}>/ {fmt(ex.targetSec)} target</span>}
                </div>
                {ex.targetSec && (
                  <div style={s.progressBar}>
                    <div style={{ ...s.progressFill, width: `${pct}%`, background: pct >= 100 ? '#4caf82' : '#4f9cf9' }} />
                  </div>
                )}
                <div style={s.timerControls}>
                  <button style={{ ...s.tBtn, background: running ? '#4a3a1e' : '#1e3a4a' }} onClick={() => running ? pauseTimer() : startTimer(key)}>
                    {running ? '⏸ Pause' : '▶ Start'}
                  </button>
                  <button style={{ ...s.tBtn, background: '#2a2a3e' }} onClick={() => resetTimer(key)}>↺ Reset</button>
                  <button style={{ ...s.tBtn, background: sec > 0 ? '#1e3a2a' : '#1a1a2e', opacity: sec > 0 ? 1 : 0.4 }} onClick={() => logTimedSet(key)} disabled={sec === 0}>
                    ✓ Log
                  </button>
                </div>
                {logged.length > 0 && (
                  <div style={s.loggedList}>
                    {logged.map((entry, j) => (
                      <div key={j} style={s.loggedItem}>
                        <span style={s.loggedText}>Set {j + 1}: {fmt(entry.timeSec)}</span>
                        <button style={s.removeBtn} onClick={() => removeLoggedSet(key, j)}>✕</button>
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
                {rows.map((row, j) => (
                  <div key={j} style={s.setRow}>
                    <span style={{ ...s.colSet, color: '#555', fontWeight: 700 }}>{j + 1}</span>
                    <input style={s.setInput} type="number" inputMode="numeric" placeholder="—"
                      value={row.reps} onChange={e => updateRepSet(key, j, 'reps', e.target.value)} />
                    <input style={s.setInput} type="number" inputMode="decimal" placeholder="—"
                      value={row.weight} onChange={e => updateRepSet(key, j, 'weight', e.target.value)} />
                  </div>
                ))}
                <button style={s.addSetBtn} onClick={() => addRepSet(key)}>+ Set</button>
              </div>
            )}
          </div>
        )
      })}

      {/* Finisher */}
      {workout.finisher?.length > 0 && (
        <>
          <p style={{ ...s.sectionLabel, marginTop: 24 }}>🏁 Finisher</p>
          {workout.finisher.map(ex => (
            <div key={ex.name} style={s.exCard}>
              <div style={s.exHeader}>
                <span style={s.exNum}>🧳</span>
                <div style={s.exInfo}>
                  <span style={s.exName}>{ex.name}</span>
                  <span style={s.exDetail}>{ex.detail}</span>
                </div>
              </div>
              {ex.cue && <p style={s.exCue}>{ex.cue}</p>}
              <div style={s.setsBlock}>
                <div style={s.setsHeader}>
                  <span style={s.colSet}>Carry</span>
                  <span style={s.colKg}>kg (total)</span>
                </div>
                {finisherSets[ex.name].map((row, j) => (
                  <div key={j} style={s.setRow}>
                    <span style={{ ...s.colSet, color: '#555', fontWeight: 700 }}>{j + 1}</span>
                    <input style={s.setInput} type="number" inputMode="decimal" placeholder="—"
                      value={row.weight} onChange={e => updateFinisher(ex.name, j, e.target.value)} />
                  </div>
                ))}
                <button style={s.addSetBtn} onClick={() => addFinisherSet(ex.name)}>+ Carry</button>
              </div>
            </div>
          ))}
        </>
      )}

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

function fmt(sec) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

const s = {
  container: { padding: '4px 0 32px' },
  sectionLabel: { margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  equipBlock: { marginBottom: 20 },
  equipRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  equipChip: { padding: '6px 12px', border: '1px solid #2a2a3e', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: '#0d0d1a', color: '#888' },
  equipChipOn: { background: '#1e3a4a', borderColor: '#4f9cf9', color: '#eee' },
  optRow: { display: 'flex', gap: 6, margin: '0 0 8px 34px' },
  optBtn: { padding: '4px 10px', border: '1px solid #2a2a3e', borderRadius: 14, background: 'none', color: '#666', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  optBtnOn: { background: '#1e3a4a', borderColor: '#4f9cf9', color: '#eee' },
  optOnly: { fontSize: 11, fontWeight: 600, color: '#4caf82' },
  checkRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#0d0d1a', borderRadius: 8, marginBottom: 6, cursor: 'pointer', userSelect: 'none' },
  checkIcon: { fontSize: 16, width: 18, textAlign: 'center', flexShrink: 0 },
  checkName: { flex: 1, fontSize: 14, transition: 'color 0.15s' },
  checkDetail: { fontSize: 12, color: '#555', flexShrink: 0 },
  exCard: { background: '#0d0d1a', borderRadius: 10, padding: '12px', marginBottom: 10 },
  exHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 },
  exNum: { width: 24, height: 24, background: '#2a2a3e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#4f9cf9', flexShrink: 0, textAlign: 'center', lineHeight: '24px' },
  exInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 },
  exName: { fontSize: 14, fontWeight: 600, color: '#eee' },
  exDetail: { fontSize: 12, color: '#666' },
  exCue: { margin: '0 0 10px 34px', fontSize: 12, color: '#888', lineHeight: 1.45 },
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
  colSet: { width: 44, fontSize: 11, color: '#555', fontWeight: 600 },
  colReps: { flex: 1, fontSize: 11, color: '#555', fontWeight: 600, textAlign: 'center' },
  colKg: { flex: 1, fontSize: 11, color: '#555', fontWeight: 600, textAlign: 'center' },
  setRow: { display: 'flex', alignItems: 'center', marginBottom: 6 },
  setInput: { flex: 1, background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 6, color: '#eee', fontSize: 15, padding: '6px', textAlign: 'center', outline: 'none', marginRight: 6, minWidth: 0 },
  addSetBtn: { background: 'none', border: '1px solid #2a2a3e', borderRadius: 6, color: '#555', fontSize: 12, padding: '4px 10px', cursor: 'pointer', marginTop: 2 },
  notes: { width: '100%', background: '#0d0d1a', border: '1px solid #2a2a3e', borderRadius: 8, color: '#eee', fontSize: 14, padding: 10, resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  completeBtn: { display: 'block', width: '100%', marginTop: 20, padding: '14px', background: '#4caf82', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' },
}
