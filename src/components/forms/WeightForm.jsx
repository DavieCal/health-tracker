import { useState } from 'react'
import { logWeight } from '../../lib/db'

export default function WeightForm({ onSave }) {
  const [weight, setWeight] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  async function handleSave() {
    const kg = parseFloat(weight)
    if (!kg || kg < 30 || kg > 300) return
    setSaving(true); setErr(null)
    try {
      await logWeight(kg, notes || null)
      onSave()
    } catch (e) { setErr(e.message) }
    setSaving(false)
  }

  const valid = parseFloat(weight) > 0

  return (
    <div>
      <p style={s.label}>Weight (kg)</p>
      <input
        type="number"
        value={weight}
        onChange={e => setWeight(e.target.value)}
        placeholder="75.0"
        style={s.input}
        step="0.1"
        min="30"
        max="300"
        autoFocus
      />
      <textarea
        placeholder="Notes (optional)"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        style={s.textarea}
        rows={2}
      />
      {err && <p style={s.err}>{err}</p>}
      <button style={{ ...s.btn, opacity: valid ? 1 : 0.4 }} onClick={handleSave} disabled={!valid || saving}>
        {saving ? 'Saving…' : 'Log Weight'}
      </button>
    </div>
  )
}

const s = {
  label: { margin: '0 0 10px', color: '#aaa', fontSize: 14 },
  input: { width: '100%', background: '#0d0d1a', border: '1px solid #2a2a3e', borderRadius: 8, color: '#eee', padding: '14px', fontSize: 24, fontWeight: 700, marginBottom: 16, textAlign: 'center' },
  textarea: { width: '100%', background: '#0d0d1a', border: '1px solid #2a2a3e', borderRadius: 8, color: '#eee', padding: '10px 12px', fontSize: 15, resize: 'none', marginBottom: 16 },
  btn: { width: '100%', padding: '14px', background: '#4f9cf9', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer' },
  err: { color: '#e06c75', fontSize: 13, margin: '0 0 12px' },
}
