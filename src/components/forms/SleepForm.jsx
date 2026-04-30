import { useState } from 'react'
import { logBedtime, logWake } from '../../lib/db'
import { nowTimeValue, formatTime, formatHours } from '../../lib/dates'

export default function SleepForm({ latestSleep, onSave }) {
  const hasOpenBedtime = latestSleep && !latestSleep.wake_time
  const [quality, setQuality] = useState(null)
  const [notes, setNotes] = useState('')
  const [bedtimeVal, setBedtimeVal] = useState(nowTimeValue)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  async function handleBedtime() {
    setSaving(true); setErr(null)
    try {
      const [h, m] = bedtimeVal.split(':').map(Number)
      const d = new Date()
      d.setHours(h, m, 0, 0)
      await logBedtime(d.toISOString())
      onSave()
    } catch (e) { setErr(e.message) }
    setSaving(false)
  }

  async function handleWake() {
    if (!quality) return
    setSaving(true); setErr(null)
    try {
      await logWake(quality, notes)
      onSave()
    } catch (e) { setErr(e.message) }
    setSaving(false)
  }

  if (hasOpenBedtime) {
    const bedAt = formatTime(latestSleep.bedtime)
    return (
      <div>
        <p style={s.info}>Bedtime logged at {bedAt}</p>
        <p style={s.label}>How'd you sleep?</p>
        <div style={s.scoreRow}>
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} style={{ ...s.scoreBtn, background: quality === n ? '#4f9cf9' : '#2a2a3e' }} onClick={() => setQuality(n)}>
              {n}
            </button>
          ))}
        </div>
        <div style={s.scoreHints}>
          <span>rough</span><span>solid</span>
        </div>
        <textarea
          placeholder="Notes (optional)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          style={s.textarea}
          rows={2}
        />
        {err && <p style={s.err}>{err}</p>}
        <button style={{ ...s.btn, opacity: quality ? 1 : 0.4 }} onClick={handleWake} disabled={!quality || saving}>
          {saving ? 'Saving…' : 'Log Wake'}
        </button>
      </div>
    )
  }

  return (
    <div>
      <p style={s.label}>Bedtime</p>
      <input type="time" value={bedtimeVal} onChange={e => setBedtimeVal(e.target.value)} style={s.timeInput} />
      {err && <p style={s.err}>{err}</p>}
      <button style={s.btn} onClick={handleBedtime} disabled={saving}>
        {saving ? 'Saving…' : 'Log Bedtime'}
      </button>
    </div>
  )
}

const s = {
  label: { margin: '0 0 10px', color: '#aaa', fontSize: 14 },
  info: { margin: '0 0 16px', color: '#4f9cf9', fontSize: 14 },
  scoreRow: { display: 'flex', gap: 10, marginBottom: 6 },
  scoreBtn: { flex: 1, padding: '14px 0', border: 'none', borderRadius: 10, color: '#eee', fontSize: 18, fontWeight: 700, cursor: 'pointer' },
  scoreHints: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#666', marginBottom: 16 },
  textarea: { width: '100%', background: '#0d0d1a', border: '1px solid #2a2a3e', borderRadius: 8, color: '#eee', padding: '10px 12px', fontSize: 15, resize: 'none', marginBottom: 16 },
  timeInput: { width: '100%', background: '#0d0d1a', border: '1px solid #2a2a3e', borderRadius: 8, color: '#eee', padding: '12px', fontSize: 18, marginBottom: 20, colorScheme: 'dark' },
  btn: { width: '100%', padding: '14px', background: '#4f9cf9', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer' },
  err: { color: '#e06c75', fontSize: 13, margin: '0 0 12px' },
}
