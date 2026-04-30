import { useState } from 'react'
import { logWorkout } from '../../lib/db'
import { todaySchedule, WORKOUT_SCHEDULE } from '../../lib/dates'

const TYPES = [
  { id: 'A',         label: 'Workout A' },
  { id: 'B',         label: 'Workout B' },
  { id: 'stability', label: 'Stability' },
  { id: 'bike',      label: 'Bike' },
  { id: 'rest',      label: 'Rest' },
]

const EXERCISES_A = ['Incline DB Press', 'Cable Flyes', 'Overhead Press', 'Lateral Raises', 'Plank', 'Dead Bug']
const EXERCISES_B = ['Goblet Squat', 'Romanian DL', 'Leg Press', 'Calf Raises', 'Hip Thrust', 'Leg Curl']

export default function WorkoutForm({ onSave }) {
  const scheduled = todaySchedule()
  const [type, setType] = useState(scheduled.type)
  const [completed, setCompleted] = useState(true)
  const [notes, setNotes] = useState('')
  const [showSets, setShowSets] = useState(false)
  const [sets, setSets] = useState([])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  const suggestedExercises = type === 'A' ? EXERCISES_A : type === 'B' ? EXERCISES_B : []

  function addSet(exercise = '') {
    setSets(prev => [...prev, { exercise, setNumber: 1, reps: '', weightKg: '' }])
  }

  function updateSet(i, field, value) {
    setSets(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  }

  function removeSet(i) {
    setSets(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSave() {
    setSaving(true); setErr(null)
    try {
      const cleanSets = sets
        .filter(s => s.exercise.trim())
        .map(s => ({ ...s, reps: Number(s.reps) || null, weightKg: Number(s.weightKg) || null }))
      await logWorkout(type, completed, notes, cleanSets)
      onSave()
    } catch (e) { setErr(e.message) }
    setSaving(false)
  }

  return (
    <div>
      <p style={s.label}>Type</p>
      <div style={s.typeRow}>
        {TYPES.map(t => (
          <button key={t.id} style={{ ...s.typeBtn, background: type === t.id ? '#4f9cf9' : '#2a2a3e' }} onClick={() => setType(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <label style={s.checkRow}>
        <input type="checkbox" checked={completed} onChange={e => setCompleted(e.target.checked)} style={{ accentColor: '#4caf82' }} />
        <span>Completed</span>
      </label>

      <textarea
        placeholder="Notes (optional)"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        style={s.textarea}
        rows={2}
      />

      <button style={s.setsToggle} onClick={() => setShowSets(v => !v)}>
        {showSets ? '▾ Hide sets' : '▸ Add sets / reps'}
      </button>

      {showSets && (
        <div style={s.setsSection}>
          {sets.map((set, i) => (
            <div key={i} style={s.setRow}>
              <input
                placeholder="Exercise"
                value={set.exercise}
                onChange={e => updateSet(i, 'exercise', e.target.value)}
                style={{ ...s.setInput, flex: 3 }}
                list={`exercises-${i}`}
              />
              <datalist id={`exercises-${i}`}>
                {suggestedExercises.map(e => <option key={e} value={e} />)}
              </datalist>
              <input
                type="number"
                placeholder="Reps"
                value={set.reps}
                onChange={e => updateSet(i, 'reps', e.target.value)}
                style={{ ...s.setInput, flex: 1 }}
                min="0"
              />
              <input
                type="number"
                placeholder="kg"
                value={set.weightKg}
                onChange={e => updateSet(i, 'weightKg', e.target.value)}
                style={{ ...s.setInput, flex: 1 }}
                min="0"
                step="0.5"
              />
              <button style={s.removeBtn} onClick={() => removeSet(i)}>✕</button>
            </div>
          ))}
          <button style={s.addSetBtn} onClick={() => addSet()}>+ Add set</button>
          {suggestedExercises.length > 0 && (
            <div style={s.quickAdd}>
              {suggestedExercises.map(e => (
                <button key={e} style={s.quickBtn} onClick={() => addSet(e)}>{e}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {err && <p style={s.err}>{err}</p>}
      <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Log Workout'}
      </button>
    </div>
  )
}

const s = {
  label: { margin: '0 0 10px', color: '#aaa', fontSize: 14 },
  typeRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 },
  typeBtn: { padding: '10px 14px', border: 'none', borderRadius: 8, color: '#eee', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  checkRow: { display: 'flex', alignItems: 'center', gap: 10, color: '#ccc', fontSize: 15, marginBottom: 16, cursor: 'pointer' },
  textarea: { width: '100%', background: '#0d0d1a', border: '1px solid #2a2a3e', borderRadius: 8, color: '#eee', padding: '10px 12px', fontSize: 15, resize: 'none', marginBottom: 12 },
  setsToggle: { background: 'none', border: 'none', color: '#4f9cf9', fontSize: 14, cursor: 'pointer', padding: '0 0 16px', display: 'block' },
  setsSection: { background: '#0d0d1a', borderRadius: 10, padding: 12, marginBottom: 16 },
  setRow: { display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' },
  setInput: { background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 6, color: '#eee', padding: '8px', fontSize: 13, minWidth: 0 },
  removeBtn: { background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 14, padding: '4px', flexShrink: 0 },
  addSetBtn: { background: '#2a2a3e', border: 'none', borderRadius: 8, color: '#4f9cf9', padding: '8px 16px', fontSize: 13, cursor: 'pointer', marginBottom: 10 },
  quickAdd: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  quickBtn: { background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 6, color: '#aaa', padding: '5px 10px', fontSize: 12, cursor: 'pointer' },
  saveBtn: { width: '100%', padding: '14px', background: '#4f9cf9', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer' },
  err: { color: '#e06c75', fontSize: 13, margin: '0 0 12px' },
}
