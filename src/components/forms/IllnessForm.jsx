import { useState } from 'react'
import { startIllness, endIllness } from '../../lib/db'
import { formatTime } from '../../lib/dates'

export default function IllnessForm({ activeIllness, onSave }) {
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  async function handleStart() {
    setSaving(true); setErr(null)
    try {
      await startIllness(desc)
      onSave()
    } catch (e) { setErr(e.message) }
    setSaving(false)
  }

  async function handleRecover() {
    setSaving(true); setErr(null)
    try {
      await endIllness()
      onSave()
    } catch (e) { setErr(e.message) }
    setSaving(false)
  }

  if (activeIllness) {
    const daysIn = Math.ceil((Date.now() - new Date(activeIllness.start_date)) / 86400000)
    return (
      <div>
        <div style={s.activeBox}>
          <span style={s.activeIcon}>🤒</span>
          <div>
            <p style={s.activeLine}>Currently sick — day {daysIn}</p>
            {activeIllness.description && <p style={s.activeDesc}>{activeIllness.description}</p>}
          </div>
        </div>
        {err && <p style={s.err}>{err}</p>}
        <button style={{ ...s.btn, background: '#4caf82' }} onClick={handleRecover} disabled={saving}>
          {saving ? 'Saving…' : 'Mark Recovered'}
        </button>
      </div>
    )
  }

  return (
    <div>
      <p style={s.label}>What's going on?</p>
      <textarea
        placeholder="e.g. Cold, sore throat, fever..."
        value={desc}
        onChange={e => setDesc(e.target.value)}
        style={s.textarea}
        rows={3}
        autoFocus
      />
      {err && <p style={s.err}>{err}</p>}
      <button style={s.btn} onClick={handleStart} disabled={saving}>
        {saving ? 'Saving…' : 'Log Illness'}
      </button>
    </div>
  )
}

const s = {
  label: { margin: '0 0 10px', color: '#aaa', fontSize: 14 },
  activeBox: { display: 'flex', gap: 14, alignItems: 'flex-start', background: '#2a1a1a', borderRadius: 10, padding: 16, marginBottom: 20 },
  activeIcon: { fontSize: 28 },
  activeLine: { margin: 0, fontWeight: 600, fontSize: 15, color: '#e06c75' },
  activeDesc: { margin: '4px 0 0', fontSize: 13, color: '#aaa' },
  textarea: { width: '100%', background: '#0d0d1a', border: '1px solid #2a2a3e', borderRadius: 8, color: '#eee', padding: '10px 12px', fontSize: 15, resize: 'none', marginBottom: 16 },
  btn: { width: '100%', padding: '14px', background: '#e06c75', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer' },
  err: { color: '#e06c75', fontSize: 13, margin: '0 0 12px' },
}
