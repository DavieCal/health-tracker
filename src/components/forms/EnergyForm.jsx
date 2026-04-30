import { useState } from 'react'
import { logEnergy } from '../../lib/db'

const LABELS = ['', 'Crashed', 'Low', 'OK', 'Good', 'Great']

export default function EnergyForm({ onSave }) {
  const [score, setScore] = useState(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  async function handleSave() {
    if (!score) return
    setSaving(true); setErr(null)
    try {
      await logEnergy(score, notes || null)
      onSave()
    } catch (e) { setErr(e.message) }
    setSaving(false)
  }

  return (
    <div>
      <p style={s.label}>Afternoon energy</p>
      <div style={s.row}>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} style={{ ...s.btn, background: score === n ? scoreColor(n) : '#2a2a3e' }} onClick={() => setScore(n)}>
            {n}
          </button>
        ))}
      </div>
      {score && <p style={{ ...s.scoreLabel, color: scoreColor(score) }}>{LABELS[score]}</p>}
      <textarea
        placeholder="Notes (optional)"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        style={s.textarea}
        rows={2}
      />
      {err && <p style={s.err}>{err}</p>}
      <button style={{ ...s.saveBtn, opacity: score ? 1 : 0.4 }} onClick={handleSave} disabled={!score || saving}>
        {saving ? 'Saving…' : 'Log Energy'}
      </button>
    </div>
  )
}

function scoreColor(n) {
  return ['', '#e06c75', '#e5a550', '#e5c07b', '#4caf82', '#4f9cf9'][n]
}

const s = {
  label: { margin: '0 0 12px', color: '#aaa', fontSize: 14 },
  row: { display: 'flex', gap: 10, marginBottom: 8 },
  btn: { flex: 1, padding: '14px 0', border: 'none', borderRadius: 10, color: '#eee', fontSize: 18, fontWeight: 700, cursor: 'pointer' },
  scoreLabel: { fontSize: 14, fontWeight: 600, margin: '0 0 16px', textAlign: 'center' },
  textarea: { width: '100%', background: '#0d0d1a', border: '1px solid #2a2a3e', borderRadius: 8, color: '#eee', padding: '10px 12px', fontSize: 15, resize: 'none', marginBottom: 16 },
  saveBtn: { width: '100%', padding: '14px', background: '#4f9cf9', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer' },
  err: { color: '#e06c75', fontSize: 13, margin: '0 0 12px' },
}
