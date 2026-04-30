import { useState } from 'react'
import { logCaffeine } from '../../lib/db'

const SOURCES = [
  { id: 'coffee',       label: 'Coffee',      mg: 95  },
  { id: 'espresso',     label: 'Espresso',    mg: 63  },
  { id: 'americano',    label: 'Americano',   mg: 120 },
  { id: 'latte',        label: 'Latte',       mg: 75  },
  { id: 'tea',          label: 'Tea',         mg: 47  },
  { id: 'matcha',       label: 'Matcha',      mg: 70  },
  { id: 'energy_drink', label: 'Energy',      mg: 80  },
  { id: 'custom_mg',    label: 'Custom mg',   mg: null },
]

export default function CaffeineForm({ onSave }) {
  const [source, setSource] = useState(null)
  const [amount, setAmount] = useState(1)
  const [customMg, setCustomMg] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  const src = SOURCES.find(s => s.id === source)
  const isCustom = source === 'custom_mg'
  const estimatedMg = isCustom ? Number(customMg) || 0 : (src?.mg || 0) * amount

  async function handleSave() {
    if (!source) return
    if (isCustom && !customMg) return
    setSaving(true); setErr(null)
    try {
      await logCaffeine(
        isCustom ? null : amount,
        isCustom ? 'mg' : 'cup',
        isCustom ? 'custom' : source,
        estimatedMg
      )
      onSave()
    } catch (e) { setErr(e.message) }
    setSaving(false)
  }

  return (
    <div>
      <p style={s.label}>Source</p>
      <div style={s.grid}>
        {SOURCES.map(src => (
          <button
            key={src.id}
            style={{ ...s.chip, background: source === src.id ? '#e5a550' : '#2a2a3e' }}
            onClick={() => setSource(src.id)}
          >
            {src.label}
          </button>
        ))}
      </div>

      {source && !isCustom && (
        <>
          <p style={s.label}>How many?</p>
          <div style={s.row}>
            {[1, 2, 3].map(n => (
              <button key={n} style={{ ...s.numBtn, background: amount === n ? '#4f9cf9' : '#2a2a3e' }} onClick={() => setAmount(n)}>
                {n}
              </button>
            ))}
          </div>
        </>
      )}

      {isCustom && (
        <input
          type="number"
          placeholder="mg"
          value={customMg}
          onChange={e => setCustomMg(e.target.value)}
          style={s.numInput}
          min="0"
        />
      )}

      {source && (
        <p style={s.estimate}>≈ {estimatedMg}mg caffeine</p>
      )}

      {err && <p style={s.err}>{err}</p>}
      <button style={{ ...s.btn, opacity: source ? 1 : 0.4 }} onClick={handleSave} disabled={!source || saving}>
        {saving ? 'Saving…' : 'Log Caffeine'}
      </button>
    </div>
  )
}

const s = {
  label: { margin: '0 0 10px', color: '#aaa', fontSize: 14 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 },
  chip: { padding: '10px 4px', border: 'none', borderRadius: 8, color: '#eee', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  row: { display: 'flex', gap: 10, marginBottom: 16 },
  numBtn: { flex: 1, padding: '14px 0', border: 'none', borderRadius: 10, color: '#eee', fontSize: 20, fontWeight: 700, cursor: 'pointer' },
  numInput: { width: '100%', background: '#0d0d1a', border: '1px solid #2a2a3e', borderRadius: 8, color: '#eee', padding: '12px', fontSize: 18, marginBottom: 12 },
  estimate: { color: '#e5a550', fontSize: 15, fontWeight: 600, margin: '0 0 20px' },
  btn: { width: '100%', padding: '14px', background: '#4f9cf9', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer' },
  err: { color: '#e06c75', fontSize: 13, margin: '0 0 12px' },
}
