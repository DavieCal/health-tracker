import { useState, useEffect, useRef } from 'react'
import { MOBILITY_MODES, MOBILITY_PHASES } from '../lib/mobility'

export default function MobilitySession({ initialMode = 'full', onComplete }) {
  const [mode, setMode] = useState(initialMode)
  const [checked, setChecked] = useState([])          // step keys "phaseIdx-stepIdx"
  const [timerSeconds, setTimerSeconds] = useState({}) // step key → elapsed sec
  const [activeTimer, setActiveTimer] = useState(null) // step key currently counting
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const intervalRef = useRef(null)
  const startedAtRef = useRef(null)                    // first interaction, for logged duration

  useEffect(() => () => clearInterval(intervalRef.current), [])

  function markStarted() {
    if (!startedAtRef.current) startedAtRef.current = nowMs()
  }

  function startTimer(key, targetSec) {
    markStarted()
    clearInterval(intervalRef.current)
    setActiveTimer(key)
    intervalRef.current = setInterval(() => {
      setTimerSeconds(prev => {
        const next = (prev[key] || 0) + 1
        if (next === targetSec) navigator.vibrate?.(300)  // buzz at target (Android only)
        return { ...prev, [key]: next }
      })
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

  function toggleStep(key) {
    markStarted()
    const nowDone = !checked.includes(key)
    setChecked(c => nowDone ? [...c, key] : c.filter(x => x !== key))
    if (nowDone && activeTimer === key) pauseTimer()
  }

  const modeInfo = MOBILITY_MODES[mode]
  const phases = MOBILITY_PHASES.map((p, pi) => ({
    ...p,
    steps: p.steps
      .map((st, si) => ({ ...st, key: `${pi}-${si}` }))
      .filter(st => st.dose[mode] != null),
  }))
  const activeKeys = phases.flatMap(p => p.steps.map(st => st.key))
  const stepNumber = Object.fromEntries(activeKeys.map((k, i) => [k, i + 1]))
  const doneCount = activeKeys.filter(k => checked.includes(k)).length
  const pct = activeKeys.length ? (doneCount / activeKeys.length) * 100 : 0

  async function handleComplete() {
    setSaving(true)
    setError(null)
    pauseTimer()
    const durationMin = startedAtRef.current
      ? Math.max(1, Math.round((nowMs() - startedAtRef.current) / 60000))
      : modeInfo.targetMin
    try {
      await onComplete({ mode, durationMin, stepsDone: doneCount, stepsTotal: activeKeys.length, notes })
    } catch (e) {
      setError(e.message || 'Save failed')
      setSaving(false)
    }
  }

  return (
    <div style={s.container}>
      {/* Mode toggle */}
      <div style={s.modeRow}>
        {Object.entries(MOBILITY_MODES).map(([id, m]) => (
          <button
            key={id}
            style={{ ...s.modeBtn, background: mode === id ? '#e9b949' : '#0d0d1a', color: mode === id ? '#121a2b' : '#888' }}
            onClick={() => setMode(id)}
          >
            <span style={s.modeLabel}>{m.label}</span>
            <span style={s.modeRange}>{m.range}</span>
          </button>
        ))}
      </div>
      <p style={s.hint}>{modeInfo.hint}</p>

      {/* Step progress */}
      <div style={s.progressRow}>
        <div style={s.progressBar}>
          <div style={{ ...s.progressFill, width: `${pct}%` }} />
        </div>
        <span style={s.stepCount}>{doneCount}/{activeKeys.length}</span>
      </div>

      {phases.map(phase => (
        <div key={phase.name}>
          <p style={s.sectionLabel}>{phase.name}</p>
          <p style={s.phaseNote}>{phase.note}</p>
          {phase.steps.map(st => {
            const done = checked.includes(st.key)
            const targetSec = st.timed?.[mode]
            const sec = timerSeconds[st.key] || 0
            const running = activeTimer === st.key
            const tPct = targetSec ? Math.min(100, (sec / targetSec) * 100) : 0
            const hit = targetSec && sec >= targetSec
            return (
              <div key={st.key} style={s.stepCard}>
                <button
                  style={{ ...s.check, background: done ? '#e9b949' : 'transparent', borderColor: done ? '#e9b949' : '#555', color: done ? '#121a2b' : '#aaa' }}
                  onClick={() => toggleStep(st.key)}
                  aria-pressed={done}
                  aria-label={`Mark ${st.name} done`}
                >
                  {done ? '✓' : stepNumber[st.key]}
                </button>
                <div style={s.stepBody}>
                  <span style={{ ...s.stepName, color: done ? '#666' : '#eee', textDecoration: done ? 'line-through' : 'none' }}>{st.name}</span>
                  <span style={s.dose}>{st.dose[mode]}</span>
                  {!done && (
                    <>
                      {st.cue && <p style={s.cue}>{st.cue}</p>}
                      {mode === 'quick' && st.quickCue && <p style={s.quickCue}>{st.quickCue}</p>}
                      {st.breath && <p style={s.breath}><b style={s.breathLabel}>Breath:</b> {st.breath}</p>}

                      {targetSec && (
                        <div style={s.timerBlock}>
                          <div style={s.timerDisplay}>
                            <span style={{ ...s.timerTime, color: hit ? '#4caf82' : '#eee' }}>{fmt(sec)}</span>
                            <span style={s.timerTarget}>/ {fmt(targetSec)}</span>
                          </div>
                          <div style={s.tBar}>
                            <div style={{ ...s.tFill, width: `${tPct}%`, background: hit ? '#4caf82' : '#e9b949' }} />
                          </div>
                          <div style={s.timerControls}>
                            <button style={{ ...s.tBtn, background: running ? '#4a3a1e' : '#1e3a4a' }} onClick={() => running ? pauseTimer() : startTimer(st.key, targetSec)}>
                              {running ? '⏸ Pause' : sec > 0 ? '▶ Resume' : '▶ Start'}
                            </button>
                            <button style={{ ...s.tBtn, background: '#2a2a3e' }} onClick={() => resetTimer(st.key)}>↺ Reset</button>
                          </div>
                        </div>
                      )}

                      {st.links.length > 0 && (
                        <div style={s.links}>
                          {st.links.map(l => (
                            <a key={l.url} style={s.link} href={l.url} target="_blank" rel="noopener noreferrer">▶ {l.label}</a>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ))}

      <p style={{ ...s.sectionLabel, marginTop: 20 }}>Notes</p>
      <textarea
        style={s.notes}
        placeholder="Tight spots? How did it feel?"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        rows={2}
      />

      {error && <p style={s.error}>{error}</p>}
      <button style={{ ...s.completeBtn, opacity: saving ? 0.6 : 1 }} onClick={handleComplete} disabled={saving}>
        {saving ? 'Saving…' : '✓ Done'}
      </button>
    </div>
  )
}

function fmt(sec) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

const s = {
  container: { padding: '4px 0 32px' },
  modeRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 },
  modeBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '10px 8px', border: '1px solid #2a2a3e', borderRadius: 10, cursor: 'pointer' },
  modeLabel: { fontSize: 15, fontWeight: 700 },
  modeRange: { fontSize: 12, fontWeight: 600, opacity: 0.85 },
  hint: { margin: '0 0 14px', fontSize: 13, color: '#888' },
  progressRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 },
  progressBar: { flex: 1, height: 6, background: '#0d0d1a', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', background: '#e9b949', borderRadius: 3, transition: 'width 0.3s' },
  stepCount: { fontSize: 14, fontWeight: 700, color: '#e9b949', fontVariantNumeric: 'tabular-nums' },
  sectionLabel: { margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  phaseNote: { margin: '0 0 10px', fontSize: 13, color: '#555' },
  stepCard: { display: 'flex', gap: 12, background: '#0d0d1a', borderRadius: 10, padding: 12, marginBottom: 8 },
  check: { width: 36, height: 36, flexShrink: 0, borderRadius: '50%', border: '2px solid', fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  stepBody: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 },
  stepName: { fontSize: 15, fontWeight: 700 },
  dose: { fontSize: 13, fontWeight: 600, color: '#e9b949' },
  cue: { margin: '6px 0 0', fontSize: 13, color: '#bbb', lineHeight: 1.45 },
  quickCue: { margin: '4px 0 0', fontSize: 12, color: '#e5a550' },
  breath: { margin: '4px 0 0', fontSize: 13, color: '#888' },
  breathLabel: { color: '#ccc' },
  timerBlock: { marginTop: 10 },
  timerDisplay: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 },
  timerTime: { fontSize: 30, fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: -1 },
  timerTarget: { fontSize: 13, color: '#555' },
  tBar: { height: 4, background: '#1a1a2e', borderRadius: 2, marginBottom: 8, overflow: 'hidden' },
  tFill: { height: '100%', borderRadius: 2, transition: 'width 0.5s, background 0.3s' },
  timerControls: { display: 'flex', gap: 8 },
  tBtn: { flex: 1, padding: '8px 4px', border: 'none', borderRadius: 8, color: '#eee', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  links: { display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  link: { fontSize: 13, fontWeight: 600, color: '#4f9cf9', textDecoration: 'none' },
  notes: { width: '100%', background: '#0d0d1a', border: '1px solid #2a2a3e', borderRadius: 8, color: '#eee', fontSize: 14, padding: 10, resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  error: { color: '#e06c75', fontSize: 13, margin: '10px 0 0' },
  completeBtn: { display: 'block', width: '100%', marginTop: 16, padding: 14, background: '#4caf82', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' },
}

// Only called from event handlers; kept outside the component for the react-hooks/purity lint rule.
function nowMs() { return Date.now() }
