import { useState, useEffect } from 'react'
import { getDayLogs, updateSleepLog, upsertDayBeers, updateCaffeineConsumedAt } from '../../lib/db'
import { isoToTimeInput, dateAndTimeToISO, nextDateStr } from '../../lib/dates'

export default function EditDaySheet({ date, onSave }) {
  const [dayData, setDayData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  const [bedtime, setBedtime] = useState('')
  const [wakeTime, setWakeTime] = useState('')
  const [totalPints, setTotalPints] = useState(0)
  const [lastBeerTime, setLastBeerTime] = useState('')
  const [cafEdits, setCafEdits] = useState([])

  useEffect(() => {
    async function load() {
      try {
        const d = await getDayLogs(date)
        setDayData(d)

        if (d.sleep) {
          setBedtime(isoToTimeInput(d.sleep.bedtime))
          setWakeTime(isoToTimeInput(d.sleep.wake_time))
        }

        const pts = d.beers.reduce((s, r) => s + r.pints, 0)
        setTotalPints(pts)
        const lastBeer = d.beers.find(r => r.is_last_of_night) || d.beers[d.beers.length - 1]
        if (lastBeer) {
          setLastBeerTime(
            lastBeer.consumed_at ? lastBeer.consumed_at.substring(0, 5) : isoToTimeInput(lastBeer.created_at)
          )
        }

        setCafEdits(d.caffeine.map(c => ({
          id: c.id,
          source: c.source,
          consumedAt: c.consumed_at ? c.consumed_at.substring(0, 5) : isoToTimeInput(c.created_at),
        })))
      } catch (e) {
        setErr(e.message)
      }
      setLoading(false)
    }
    load()
  }, [date])

  async function handleSave() {
    setSaving(true); setErr(null)
    try {
      const saves = []

      if (dayData?.sleep && bedtime) {
        const bedISO = dateAndTimeToISO(date, bedtime)
        const wakeDate = wakeTime && wakeTime < bedtime ? nextDateStr(date) : date
        const wakeISO = wakeTime ? dateAndTimeToISO(wakeDate, wakeTime) : null
        saves.push(updateSleepLog(dayData.sleep.id, bedISO, wakeISO))
      }

      saves.push(upsertDayBeers(date, totalPints, lastBeerTime || null))

      for (const c of cafEdits) {
        saves.push(updateCaffeineConsumedAt(c.id, c.consumedAt ? c.consumedAt + ':00' : null))
      }

      await Promise.all(saves)
      onSave()
    } catch (e) {
      setErr(e.message)
    }
    setSaving(false)
  }

  if (loading) return <p style={s.muted}>Loading…</p>

  return (
    <div>
      {/* ── Sleep ── */}
      {dayData?.sleep ? (
        <section style={s.section}>
          <p style={s.sectionLabel}>🌙 Sleep</p>
          <div style={s.row2}>
            <label style={s.field}>
              <span style={s.fieldLabel}>Bedtime</span>
              <input type="time" value={bedtime} onChange={e => setBedtime(e.target.value)} style={s.timeInput} />
            </label>
            <label style={s.field}>
              <span style={s.fieldLabel}>Wake</span>
              <input type="time" value={wakeTime} onChange={e => setWakeTime(e.target.value)} style={s.timeInput} />
            </label>
          </div>
        </section>
      ) : (
        <section style={s.section}>
          <p style={s.sectionLabel}>🌙 Sleep</p>
          <p style={s.muted}>No sleep logged for this day.</p>
        </section>
      )}

      {/* ── Beer ── */}
      <section style={s.section}>
        <p style={s.sectionLabel}>🍺 Beer</p>
        <div style={s.row2}>
          <label style={s.field}>
            <span style={s.fieldLabel}>Total pints</span>
            <input
              type="number"
              min="0"
              max="20"
              step="0.5"
              value={totalPints}
              onChange={e => setTotalPints(parseFloat(e.target.value) || 0)}
              style={s.numInput}
            />
          </label>
          {totalPints > 0 && (
            <label style={s.field}>
              <span style={s.fieldLabel}>Last beer</span>
              <input type="time" value={lastBeerTime} onChange={e => setLastBeerTime(e.target.value)} style={s.timeInput} />
            </label>
          )}
        </div>
      </section>

      {/* ── Coffee ── */}
      {cafEdits.length > 0 && (
        <section style={s.section}>
          <p style={s.sectionLabel}>☕ Coffee</p>
          {cafEdits.map((c, i) => (
            <div key={c.id} style={s.cafRow}>
              <span style={s.cafSource}>{c.source}</span>
              <input
                type="time"
                value={c.consumedAt}
                onChange={e => {
                  const next = [...cafEdits]
                  next[i] = { ...next[i], consumedAt: e.target.value }
                  setCafEdits(next)
                }}
                style={s.timeInputSmall}
              />
            </div>
          ))}
        </section>
      )}

      {err && <p style={s.err}>{err}</p>}
      <button style={s.btn} onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  )
}

const s = {
  muted: { color: '#666', fontSize: 14, margin: '0 0 8px' },
  section: { marginBottom: 24 },
  sectionLabel: { margin: '0 0 12px', fontWeight: 600, fontSize: 15 },
  row2: { display: 'flex', gap: 12 },
  field: { flex: 1, display: 'flex', flexDirection: 'column', gap: 6 },
  fieldLabel: { fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' },
  timeInput: {
    width: '100%', background: '#0d0d1a', border: '1px solid #2a2a3e',
    borderRadius: 8, color: '#eee', padding: '12px 10px', fontSize: 16,
    colorScheme: 'dark', boxSizing: 'border-box',
  },
  numInput: {
    width: '100%', background: '#0d0d1a', border: '1px solid #2a2a3e',
    borderRadius: 8, color: '#eee', padding: '12px 10px', fontSize: 16,
    boxSizing: 'border-box',
  },
  cafRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 },
  cafSource: { flex: 1, fontSize: 14, color: '#ccc', textTransform: 'capitalize' },
  timeInputSmall: {
    width: 120, background: '#0d0d1a', border: '1px solid #2a2a3e',
    borderRadius: 8, color: '#eee', padding: '10px 8px', fontSize: 15,
    colorScheme: 'dark', flexShrink: 0,
  },
  btn: {
    width: '100%', padding: 14, background: '#4f9cf9', border: 'none',
    borderRadius: 10, color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer',
    marginTop: 8,
  },
  err: { color: '#e06c75', fontSize: 13, margin: '0 0 12px' },
}
