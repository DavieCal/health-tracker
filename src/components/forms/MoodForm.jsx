import { useState } from 'react'
import { logMood } from '../../lib/db'

const MOODS = [
  { score: 1, emoji: '😫', label: 'Rough' },
  { score: 2, emoji: '😞', label: 'Low' },
  { score: 3, emoji: '😐', label: 'Okay' },
  { score: 4, emoji: '😊', label: 'Good' },
  { score: 5, emoji: '😄', label: 'Great' },
]

export default function MoodForm({ onSave }) {
  const [score, setScore] = useState(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  async function handleSave() {
    if (!score) return
    setSaving(true); setErr(null)
    try {
      await logMood(score, notes || null)
      onSave()
    } catch (e) { setErr(e.message) }
    setSaving(false)
  }

  return (
    <div>
      <p style={s.label}>How are you feeling?</p>
      <div style={s.row}>
        {MOODS.map(m => (
          <button
            key={m.score}
            style={{ ...s.moodBtn, background: score === m.score ? '#4f9cf9' : '#2a2a3e' }}
            onClick={() => setScore(m.score)}
          >
            <span style={s.emoji}>{m.emoji}</span>
            <span style={s.moodLabel}>{m.label}</span>
          </button>
        ))}
      </div>
      <textarea
        placeholder="Notes (optional)"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        style={s.textarea}
        rows={2}
      />
      {err && <p style={s.err}>{err}</p>}
      <button style={{ ...s.btn, opacity: score ? 1 : 0.4 }} onClick={handleSave} disabled={!score || saving}>
        {saving ? 'Saving…' : 'Log Mood'}
      </button>
    </div>
  )
}

const s = {
  label: { margin: '0 0 12px', color: '#aaa', fontSize: 14 },
  row: { display: 'flex', gap: 8, marginBottom: 20 },
  moodBtn: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '12px 4px', border: 'none', borderRadius: 10, cursor: 'pointer' },
  emoji: { fontSize: 24 },
  moodLabel: { color: '#eee', fontSize: 11, fontWeight: 500 },
  textarea: { width: '100%', background: '#0d0d1a', border: '1px solid #2a2a3e', borderRadius: 8, color: '#eee', padding: '10px 12px', fontSize: 15, resize: 'none', marginBottom: 16 },
  btn: { width: '100%', padding: '14px', background: '#4f9cf9', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer' },
  err: { color: '#e06c75', fontSize: 13, margin: '0 0 12px' },
}
