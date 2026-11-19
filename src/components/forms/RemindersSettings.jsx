import { useState, useEffect } from 'react'
import { getReminderSettings, saveReminderSettings } from '../../lib/db'
import { pushSupported, refreshPushSubscription, enablePush, disablePush, showLocalTest } from '../../lib/push'

export default function RemindersSettings() {
  const [reminders, setReminders] = useState(null)
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [dirty, setDirty] = useState(false)
  const supported = pushSupported()

  useEffect(() => {
    let alive = true
    Promise.all([getReminderSettings(), refreshPushSubscription().catch(() => null)]).then(([r, sub]) => {
      if (!alive) return
      setReminders(r)
      setSubscribed(!!sub)
    })
    return () => { alive = false }
  }, [])

  async function run(fn, okMsg) {
    setBusy(true); setMsg(null)
    try { await fn(); if (okMsg) setMsg({ ok: true, text: okMsg }) } catch (e) { setMsg({ ok: false, text: e.message }) }
    setBusy(false)
  }

  const toggleDevice = () => run(async () => {
    if (subscribed) { await disablePush(); setSubscribed(false) } else { await enablePush(); setSubscribed(true); await showLocalTest() }
  }, subscribed ? 'Notifications off on this device.' : 'Notifications on — you should see a test notification.')

  function update(id, patch) {
    setReminders(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)))
    setDirty(true)
  }

  const save = () => run(async () => { await saveReminderSettings(reminders); setDirty(false) }, 'Saved.')

  if (!reminders) return <p style={s.hint}>Loading…</p>

  return (
    <div style={s.container}>
      <div style={s.deviceBox}>
        <div style={s.deviceInfo}>
          <span style={s.deviceTitle}>{subscribed ? '🔔 On for this device' : '🔕 Off for this device'}</span>
          <span style={s.hint}>
            {!supported ? 'This browser can’t receive push notifications.'
              : subscribed ? 'Reminders arrive even when the app is closed.'
              : 'Turn on to get reminders on this phone.'}
          </span>
        </div>
        {supported && (
          <button style={{ ...s.deviceBtn, background: subscribed ? '#2a2a3e' : '#4caf82' }} onClick={toggleDevice} disabled={busy}>
            {subscribed ? 'Turn off' : 'Turn on'}
          </button>
        )}
      </div>

      <p style={s.sectionLabel}>Reminders</p>
      {reminders.map(r => (
        <div key={r.id} style={{ ...s.row, opacity: r.on ? 1 : 0.55 }}>
          <div style={s.rowTop}>
            <span style={s.rowEmoji}>{r.emoji}</span>
            <div style={s.rowInfo}>
              <span style={s.rowLabel}>{r.label}</span>
              <span style={s.rowHint}>{r.hint}</span>
            </div>
            <button
              style={{ ...s.switch, background: r.on ? '#4caf82' : '#2a2a3e' }}
              onClick={() => update(r.id, { on: !r.on })}
              aria-label={`${r.label} ${r.on ? 'on' : 'off'}`}
            >
              <span style={{ ...s.knob, transform: r.on ? 'translateX(18px)' : 'none' }} />
            </button>
          </div>
          {r.on && (
            <div style={s.timeRow}>
              <label style={s.timeLabel}>
                {r.sundayOnly ? 'Sundays' : r.weekendTime ? 'Weekdays' : 'Daily'}
                <input type="time" style={s.timeInput} value={r.time} onChange={e => update(r.id, { time: e.target.value })} />
              </label>
              {r.weekendTime && (
                <label style={s.timeLabel}>
                  Sat & Sun
                  <input type="time" style={s.timeInput} value={r.weekendTime} onChange={e => update(r.id, { weekendTime: e.target.value })} />
                </label>
              )}
              {r.outDate !== undefined && (
                <label style={s.timeLabel}>
                  Runs out on
                  <input type="date" style={s.timeInput} value={r.outDate || ''} onChange={e => update(r.id, { outDate: e.target.value || null })} />
                </label>
              )}
            </div>
          )}
        </div>
      ))}

      <button style={{ ...s.saveBtn, opacity: dirty ? 1 : 0.5 }} onClick={save} disabled={busy || !dirty}>Save reminders</button>
      {msg && <p style={{ ...s.msg, color: msg.ok ? '#4caf82' : '#e06c75' }}>{msg.text}</p>}

      <p style={s.footnote}>
        Each reminder is skipped if it's already logged, and nothing is sent on vacation days.
        Reminders are checked every 15 minutes, so they can arrive up to ~20 min after the set time.
      </p>
    </div>
  )
}

const s = {
  container: { paddingBottom: 24 },
  deviceBox: { display: 'flex', alignItems: 'center', gap: 12, background: '#0d0d1a', borderRadius: 10, padding: '12px 14px', marginBottom: 20 },
  deviceInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: 3 },
  deviceTitle: { fontSize: 15, fontWeight: 700, color: '#eee' },
  deviceBtn: { border: 'none', borderRadius: 8, color: '#fff', padding: '8px 14px', fontSize: 14, fontWeight: 700, cursor: 'pointer', flexShrink: 0 },
  sectionLabel: { margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  hint: { fontSize: 12, color: '#777', lineHeight: 1.4 },
  row: { background: '#0d0d1a', borderRadius: 10, padding: '10px 12px', marginBottom: 8 },
  rowTop: { display: 'flex', alignItems: 'center', gap: 10 },
  rowEmoji: { fontSize: 20 },
  rowInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  rowLabel: { fontSize: 14, fontWeight: 600, color: '#eee' },
  rowHint: { fontSize: 11, color: '#777' },
  switch: { position: 'relative', width: 42, height: 24, border: 'none', borderRadius: 12, cursor: 'pointer', flexShrink: 0, padding: 0 },
  knob: { position: 'absolute', top: 3, left: 3, width: 18, height: 18, borderRadius: 9, background: '#fff', transition: 'transform 0.15s' },
  timeRow: { display: 'flex', gap: 10, marginTop: 10, paddingLeft: 30 },
  timeLabel: { flex: 1, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: '#777' },
  timeInput: { background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 6, color: '#ccc', fontSize: 14, padding: '6px 8px', colorScheme: 'dark', fontFamily: 'inherit' },
  saveBtn: { width: '100%', marginTop: 8, padding: 12, background: '#4f9cf9', border: 'none', borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' },
  msg: { fontSize: 13, margin: '10px 0 0' },
  footnote: { fontSize: 12, color: '#666', lineHeight: 1.5, marginTop: 16 },
}
