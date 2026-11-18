import { useState } from 'react'
import { setIntention } from '../../lib/db'
import { PLAN_TYPES } from '../../lib/beerPlan'

const CAPS = [1, 2, 3, 4, 5, 6]

// Morning commitment for today, prefilled from the day's plan.
export default function IntentionForm({ plan, intention, onSave }) {
  const start = intention
    ? { type: intention.plan_type, cap: intention.cap, note: intention.note }
    : { type: plan?.type === 'vacation' ? 'open' : plan?.type, cap: plan?.cap, note: plan?.note }

  const [type, setType] = useState(start.type || 'dry')
  const [cap, setCap] = useState(start.cap ?? 2)
  const [note, setNote] = useState(start.note || '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  async function handleSave() {
    setSaving(true); setErr(null)
    try {
      await setIntention({ plan_type: type, cap, note })
      onSave()
    } catch (e) { setErr(e.message); setSaving(false) }
  }

  return (
    <div>
      <p style={s.label}>Today I'll…</p>
      <div style={s.typeRow}>
        {Object.entries(PLAN_TYPES).map(([id, t]) => (
          <button key={id} style={{ ...s.typeBtn, ...(type === id ? s.typeOn : {}) }} onClick={() => setType(id)}>
            <span style={{ fontSize: 18 }}>{t.emoji}</span>
            <span>{id === 'cap' ? 'Up to…' : t.short}</span>
          </button>
        ))}
      </div>

      {type === 'cap' && (
        <>
          <p style={s.label}>Max pints</p>
          <div style={s.capRow}>
            {CAPS.map(n => (
              <button key={n} style={{ ...s.capBtn, ...(cap === n ? s.typeOn : {}) }} onClick={() => setCap(n)}>{n}</button>
            ))}
          </div>
        </>
      )}

      <p style={s.label}>If-then plan</p>
      <textarea
        style={s.textarea}
        rows={2}
        placeholder="If I'm offered a beer, then I'll…"
        value={note}
        onChange={e => setNote(e.target.value)}
      />

      {err && <p style={s.err}>{err}</p>}
      <button style={{ ...s.btn, opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Commit'}
      </button>
    </div>
  )
}

const s = {
  label: { margin: '0 0 10px', color: '#aaa', fontSize: 14 },
  typeRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 18 },
  typeBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 4px', background: '#2a2a3e', border: '1px solid transparent', borderRadius: 10, color: '#aaa', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  typeOn: { background: '#1e3a4a', borderColor: '#4f9cf9', color: '#eee' },
  capRow: { display: 'flex', gap: 8, marginBottom: 18 },
  capBtn: { flex: 1, padding: '10px 0', background: '#2a2a3e', border: '1px solid transparent', borderRadius: 8, color: '#aaa', fontSize: 16, fontWeight: 700, cursor: 'pointer' },
  textarea: { width: '100%', background: '#0d0d1a', border: '1px solid #2a2a3e', borderRadius: 8, color: '#eee', padding: '10px 12px', fontSize: 14, resize: 'none', marginBottom: 16, boxSizing: 'border-box', fontFamily: 'inherit' },
  btn: { width: '100%', padding: 14, background: '#4caf82', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' },
  err: { color: '#e06c75', fontSize: 13, margin: '0 0 12px' },
}
