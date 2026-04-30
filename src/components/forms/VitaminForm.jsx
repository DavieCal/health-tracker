import { useState } from 'react'
import { logVitamin } from '../../lib/db'

const DOSES = [
  { id: 'morning',   label: 'Morning',   desc: 'D3 · BioSteel · Probiotic' },
  { id: 'afternoon', label: 'Afternoon', desc: 'Multi · Vit C · Zinc' },
  { id: 'evening',   label: 'Evening',   desc: 'Magnesium (non-soak)' },
  { id: 'soak',      label: 'Soak Night', desc: 'Epsom salt soak tonight' },
]

export default function VitaminForm({ todayDoses = [], onSave }) {
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  function toggle(id) { setSelected(prev => prev === id ? null : id) }

  async function handleSave() {
    if (!selected) return
    setSaving(true); setErr(null)
    try {
      await logVitamin(selected)
      onSave()
    } catch (e) { setErr(e.message) }
    setSaving(false)
  }

  return (
    <div>
      <p style={s.label}>Which dose?</p>
      {DOSES.map(d => {
        const done = todayDoses.includes(d.id)
        const active = selected === d.id
        return (
          <button
            key={d.id}
            style={{
              ...s.doseBtn,
              background: active ? '#4f9cf9' : done ? '#1a2e1a' : '#2a2a3e',
              border: done ? '1px solid #4caf82' : '1px solid transparent',
              opacity: done ? 0.7 : 1,
            }}
            onClick={() => toggle(d.id)}
          >
            <span style={s.doseName}>{d.label} {done ? '✓' : ''}</span>
            <span style={s.doseDesc}>{d.desc}</span>
          </button>
        )
      })}
      {err && <p style={s.err}>{err}</p>}
      <button style={{ ...s.saveBtn, opacity: selected ? 1 : 0.4 }} onClick={handleSave} disabled={!selected || saving}>
        {saving ? 'Saving…' : 'Log Vitamins'}
      </button>
    </div>
  )
}

const s = {
  label: { margin: '0 0 12px', color: '#aaa', fontSize: 14 },
  doseBtn: { width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '12px 14px', border: 'none', borderRadius: 10, cursor: 'pointer', marginBottom: 8, gap: 3 },
  doseName: { color: '#eee', fontSize: 15, fontWeight: 600 },
  doseDesc: { color: '#888', fontSize: 12 },
  saveBtn: { width: '100%', padding: '14px', background: '#4f9cf9', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer', marginTop: 4 },
  err: { color: '#e06c75', fontSize: 13, margin: '0 0 12px' },
}
