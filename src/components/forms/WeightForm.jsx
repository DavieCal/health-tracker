import { useState } from 'react'
import { logWeight } from '../../lib/db'

const LB_PER_KG = 2.20462

const fmt = n => (Math.round(n * 10) / 10).toString()

export default function WeightForm({ onSave }) {
  const [lb, setLb] = useState('')
  const [kg, setKg] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  function changeLb(v) {
    setLb(v)
    const n = parseFloat(v)
    setKg(n > 0 ? fmt(n / LB_PER_KG) : '')
  }

  function changeKg(v) {
    setKg(v)
    const n = parseFloat(v)
    setLb(n > 0 ? fmt(n * LB_PER_KG) : '')
  }

  // Save from whichever box holds the exact entry: lb if typed, else kg.
  const kgValue = parseFloat(lb) > 0 ? parseFloat(lb) / LB_PER_KG : parseFloat(kg)
  const valid = kgValue >= 30 && kgValue <= 300

  async function handleSave() {
    if (!valid) return
    setSaving(true); setErr(null)
    try {
      await logWeight(Math.round(kgValue * 100) / 100, notes || null)
      onSave()
    } catch (e) { setErr(e.message) }
    setSaving(false)
  }

  return (
    <div>
      <div style={s.row}>
        <label style={s.field}>
          <span style={s.label}>Pounds (lb)</span>
          <input
            type="number" inputMode="decimal" value={lb} onChange={e => changeLb(e.target.value)}
            placeholder="165.0" style={s.input} step="0.1" autoFocus
          />
        </label>
        <label style={s.field}>
          <span style={s.label}>Kilograms (kg)</span>
          <input
            type="number" inputMode="decimal" value={kg} onChange={e => changeKg(e.target.value)}
            placeholder="75.0" style={s.input} step="0.1"
          />
        </label>
      </div>
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
  row: { display: 'flex', gap: 10, marginBottom: 16 },
  field: { flex: 1, minWidth: 0 },
  label: { display: 'block', margin: '0 0 8px', color: '#aaa', fontSize: 14 },
  input: { width: '100%', background: '#0d0d1a', border: '1px solid #2a2a3e', borderRadius: 8, color: '#eee', padding: '14px 8px', fontSize: 22, fontWeight: 700, textAlign: 'center' },
  textarea: { width: '100%', background: '#0d0d1a', border: '1px solid #2a2a3e', borderRadius: 8, color: '#eee', padding: '10px 12px', fontSize: 15, resize: 'none', marginBottom: 16 },
  btn: { width: '100%', padding: '14px', background: '#4f9cf9', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer' },
  err: { color: '#e06c75', fontSize: 13, margin: '0 0 12px' },
}
