import { useState } from 'react'
import { logBeer } from '../../lib/db'

const PINTS = [0.5, 1, 1.5, 2]

// Work QA samples: ≤ ½ pt keeps the day dry (logged as 0.5); > ½ pt counts as drinking (logged as 1).
const SAMPLES = [
  { id: 'small', label: 'Sample ≤ ½ pt', pints: 0.5, hint: 'Still a dry day' },
  { id: 'large', label: 'Sample > ½ pt', pints: 1,   hint: 'Counts as drinking' },
]

export default function BeerForm({ onSave }) {
  const [pints, setPints] = useState(null)
  const [sample, setSample] = useState(null)
  const [lastOfNight, setLastOfNight] = useState(false)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  const ready = pints || sample

  function pickPints(n) { setPints(n); setSample(null) }
  function pickSample(id) { setSample(id); setPints(null) }

  async function handleSave() {
    if (!ready) return
    setSaving(true); setErr(null)
    try {
      if (sample) {
        const sm = SAMPLES.find(x => x.id === sample)
        await logBeer(sm.pints, false, notes || null, 'sample')
      } else {
        await logBeer(pints, lastOfNight, notes || null)
      }
      onSave()
    } catch (e) { setErr(e.message) }
    setSaving(false)
  }

  return (
    <div>
      <p style={s.label}>How many pints?</p>
      <div style={s.row}>
        {PINTS.map(n => (
          <button key={n} style={{ ...s.chip, background: pints === n ? '#e06c75' : '#2a2a3e' }} onClick={() => pickPints(n)}>
            {n}
          </button>
        ))}
      </div>

      <p style={s.label}>Work sampling</p>
      <div style={s.row}>
        {SAMPLES.map(sm => (
          <button
            key={sm.id}
            style={{ ...s.sampleChip, background: sample === sm.id ? (sm.id === 'small' ? '#2a5a3a' : '#7a4a20') : '#2a2a3e' }}
            onClick={() => pickSample(sm.id)}
          >
            <span style={s.sampleLabel}>🧪 {sm.label}</span>
            <span style={s.sampleHint}>{sm.hint}</span>
          </button>
        ))}
      </div>

      {!sample && (
        <label style={s.checkRow}>
          <input type="checkbox" checked={lastOfNight} onChange={e => setLastOfNight(e.target.checked)} style={{ accentColor: '#4f9cf9' }} />
          <span>Last of the night</span>
        </label>
      )}
      <textarea
        placeholder="Notes (optional)"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        style={s.textarea}
        rows={2}
      />
      {err && <p style={s.err}>{err}</p>}
      <button style={{ ...s.btn, opacity: ready ? 1 : 0.4 }} onClick={handleSave} disabled={!ready || saving}>
        {saving ? 'Saving…' : sample ? 'Log Sample' : 'Log Beer'}
      </button>
    </div>
  )
}

const s = {
  label: { margin: '0 0 12px', color: '#aaa', fontSize: 14 },
  row: { display: 'flex', gap: 10, marginBottom: 20 },
  chip: { flex: 1, padding: '14px 0', border: 'none', borderRadius: 10, color: '#eee', fontSize: 18, fontWeight: 700, cursor: 'pointer' },
  sampleChip: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '10px 4px', border: 'none', borderRadius: 10, color: '#eee', cursor: 'pointer' },
  sampleLabel: { fontSize: 14, fontWeight: 700 },
  sampleHint: { fontSize: 11, color: '#aaa' },
  checkRow: { display: 'flex', alignItems: 'center', gap: 10, color: '#ccc', fontSize: 15, marginBottom: 16, cursor: 'pointer' },
  textarea: { width: '100%', background: '#0d0d1a', border: '1px solid #2a2a3e', borderRadius: 8, color: '#eee', padding: '10px 12px', fontSize: 15, resize: 'none', marginBottom: 16, boxSizing: 'border-box', fontFamily: 'inherit' },
  btn: { width: '100%', padding: '14px', background: '#4f9cf9', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer' },
  err: { color: '#e06c75', fontSize: 13, margin: '0 0 12px' },
}
