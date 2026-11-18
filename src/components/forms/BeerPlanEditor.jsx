import { useState } from 'react'
import { saveWeekPlan, addPlanPeriod, deletePlanPeriod, updatePlanPeriod } from '../../lib/db'
import { torontoDate, formatShortDate } from '../../lib/dates'
import { PLAN_TYPES, WEEKDAY_ORDER, WEEKDAY_NAMES, weekCapTotal, periodOn, addDays } from '../../lib/beerPlan'

export default function BeerPlanEditor({ weekPlan, periods, onSaved }) {
  const today = torontoDate()
  const [target, setTarget] = useState(weekPlan.target_pints)
  const [days, setDays] = useState(() => structuredClone(weekPlan.day_plan))
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  const [pKind, setPKind] = useState('dry')
  const [pStart, setPStart] = useState('')
  const [pEnd, setPEnd] = useState('')
  const [pLabel, setPLabel] = useState('')

  const capTotal = weekCapTotal(days)
  const activeVacation = periodOn(today, periods, 'vacation')
  const visiblePeriods = periods.filter(p => !p.end_date || p.end_date >= today)

  function setDay(d, patch) {
    setDays(prev => ({ ...prev, [d]: { ...prev[d], ...patch } }))
  }

  async function run(fn) {
    setSaving(true); setErr(null)
    try { await fn(); onSaved() } catch (e) { setErr(e.message) }
    setSaving(false)
  }

  const savePlan = scope => run(() => saveWeekPlan({ target_pints: target, day_plan: days }, scope))

  const addPeriod = () => run(async () => {
    if (!pStart) throw new Error('Pick a start date')
    if (pEnd && pEnd < pStart) throw new Error('End date is before start date')
    await addPlanPeriod({ kind: pKind, start_date: pStart, end_date: pEnd || null, label: pLabel || null })
    setPStart(''); setPEnd(''); setPLabel('')
  })

  const startVacationNow = () => run(() => addPlanPeriod({ kind: 'vacation', start_date: today, label: 'Vacation' }))

  // Ending today means today is no longer vacation: started today → delete, else end yesterday.
  const endVacation = () => run(() =>
    activeVacation.start_date >= today
      ? deletePlanPeriod(activeVacation.id)
      : updatePlanPeriod(activeVacation.id, { end_date: addDays(today, -1) })
  )

  return (
    <div style={s.container}>
      {/* Vacation quick toggle */}
      <div style={s.vacBox}>
        <span style={s.vacText}>
          🏖️ {activeVacation
            ? `On vacation${activeVacation.end_date ? ` until ${formatShortDate(activeVacation.end_date)}` : ''}`
            : 'Vacation mode'}
        </span>
        <button style={s.vacBtn} onClick={activeVacation ? endVacation : startVacationNow} disabled={saving}>
          {activeVacation ? 'End now' : 'Start now'}
        </button>
      </div>

      {/* Weekly budget */}
      <p style={s.sectionLabel}>Weekly budget</p>
      <div style={s.stepRow}>
        <button style={s.stepBtn} onClick={() => setTarget(t => Math.max(0, t - 1))}>−</button>
        <span style={s.stepVal}>{target} pt</span>
        <button style={s.stepBtn} onClick={() => setTarget(t => t + 1)}>+</button>
      </div>
      <p style={s.hint}>
        {capTotal == null
          ? 'Some days are open — the weekly budget is your only limit.'
          : `Daily limits add up to ${capTotal} pt${capTotal < target ? ' — less than the budget, so the daily limits are what really count.' : capTotal > target ? ' — more than the budget.' : '.'}`}
      </p>

      {/* Day plan */}
      <p style={s.sectionLabel}>Days</p>
      {WEEKDAY_ORDER.map(d => {
        const day = days[d] || { type: 'open' }
        return (
          <div key={d} style={s.dayCard}>
            <div style={s.dayTop}>
              <span style={s.dayName}>{WEEKDAY_NAMES[d]}</span>
              <div style={s.typeRow}>
                {Object.entries(PLAN_TYPES).map(([id, t]) => (
                  <button
                    key={id}
                    style={{ ...s.typeBtn, ...(day.type === id ? s.typeOn : {}) }}
                    onClick={() => setDay(d, { type: id, cap: id === 'cap' ? (day.cap ?? 2) : undefined })}
                  >
                    {t.emoji} {t.short}
                  </button>
                ))}
              </div>
            </div>
            {day.type === 'cap' && (
              <div style={s.capRow}>
                <button style={s.capStep} onClick={() => setDay(d, { cap: Math.max(1, day.cap - 1) })}>−</button>
                <span style={s.capVal}>up to {day.cap} pt</span>
                <button style={s.capStep} onClick={() => setDay(d, { cap: day.cap + 1 })}>+</button>
              </div>
            )}
            <input
              style={s.noteInput}
              placeholder="If-then plan (optional)"
              value={day.note || ''}
              onChange={e => setDay(d, { note: e.target.value })}
            />
          </div>
        )
      })}

      <div style={s.saveRow}>
        <button style={{ ...s.saveBtn, background: '#2a2a3e' }} onClick={() => savePlan('week')} disabled={saving}>
          This week only
        </button>
        <button style={s.saveBtn} onClick={() => savePlan('default')} disabled={saving}>
          Save as default
        </button>
      </div>
      <p style={s.hint}>“This week only” for a dry-day swap. “Default” applies to this week and every future week.</p>

      {/* Periods */}
      <p style={{ ...s.sectionLabel, marginTop: 24 }}>Dry weeks & vacations</p>
      {visiblePeriods.length === 0 && <p style={s.hint}>None planned.</p>}
      {visiblePeriods.map(p => (
        <div key={p.id} style={s.periodRow}>
          <span style={s.periodText}>
            {p.kind === 'dry' ? '🌵' : '🏖️'} <b>{p.label || (p.kind === 'dry' ? 'Dry period' : 'Vacation')}</b>
            <span style={s.periodDates}> · {formatShortDate(p.start_date)} – {p.end_date ? formatShortDate(p.end_date) : 'open'}</span>
          </span>
          <button style={s.delBtn} onClick={() => run(() => deletePlanPeriod(p.id))} disabled={saving}>✕</button>
        </div>
      ))}

      <div style={s.addBox}>
        <div style={s.kindRow}>
          {[['dry', '🌵 Dry'], ['vacation', '🏖️ Vacation']].map(([k, l]) => (
            <button key={k} style={{ ...s.typeBtn, flex: 1, ...(pKind === k ? s.typeOn : {}) }} onClick={() => setPKind(k)}>{l}</button>
          ))}
        </div>
        <div style={s.dateRow}>
          <label style={s.dateLabel}>Start<input type="date" style={s.dateInput} value={pStart} onChange={e => setPStart(e.target.value)} /></label>
          <label style={s.dateLabel}>End<input type="date" style={s.dateInput} value={pEnd} onChange={e => setPEnd(e.target.value)} /></label>
        </div>
        <input style={s.noteInput} placeholder={pKind === 'dry' ? 'Label, e.g. December dry week' : 'Label, e.g. Florida'} value={pLabel} onChange={e => setPLabel(e.target.value)} />
        <button style={{ ...s.saveBtn, width: '100%', marginTop: 8 }} onClick={addPeriod} disabled={saving}>+ Add</button>
      </div>

      {err && <p style={s.err}>{err}</p>}
    </div>
  )
}

const s = {
  container: { paddingBottom: 24 },
  vacBox: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0d0d1a', borderRadius: 10, padding: '10px 12px', marginBottom: 20 },
  vacText: { fontSize: 14, fontWeight: 600, color: '#ccc' },
  vacBtn: { background: '#2a2a3e', border: 'none', borderRadius: 8, color: '#eee', padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  sectionLabel: { margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  hint: { margin: '6px 0 16px', fontSize: 12, color: '#666', lineHeight: 1.4 },
  stepRow: { display: 'flex', alignItems: 'center', gap: 16 },
  stepBtn: { width: 40, height: 40, background: '#2a2a3e', border: 'none', borderRadius: 10, color: '#eee', fontSize: 20, cursor: 'pointer' },
  stepVal: { fontSize: 22, fontWeight: 700, minWidth: 70, textAlign: 'center' },
  dayCard: { background: '#0d0d1a', borderRadius: 10, padding: 10, marginBottom: 8 },
  dayTop: { display: 'flex', alignItems: 'center', gap: 8 },
  dayName: { width: 34, fontSize: 13, fontWeight: 700, color: '#ccc', flexShrink: 0 },
  typeRow: { display: 'flex', gap: 4, flex: 1, flexWrap: 'wrap' },
  typeBtn: { padding: '5px 8px', background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 14, color: '#777', fontSize: 11, fontWeight: 600, cursor: 'pointer' },
  typeOn: { background: '#1e3a4a', borderColor: '#4f9cf9', color: '#eee' },
  capRow: { display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0 0 42px' },
  capStep: { width: 28, height: 28, background: '#2a2a3e', border: 'none', borderRadius: 6, color: '#eee', fontSize: 16, cursor: 'pointer' },
  capVal: { fontSize: 13, fontWeight: 600, color: '#e5a550' },
  noteInput: { width: '100%', marginTop: 8, background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 6, color: '#ccc', fontSize: 13, padding: '6px 8px', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' },
  saveRow: { display: 'flex', gap: 8, marginTop: 8 },
  saveBtn: { flex: 1, padding: 12, background: '#4f9cf9', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  periodRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0d0d1a', borderRadius: 8, padding: '8px 12px', marginBottom: 6 },
  periodText: { fontSize: 13, color: '#ccc' },
  periodDates: { color: '#777' },
  delBtn: { background: 'none', border: 'none', color: '#666', fontSize: 15, cursor: 'pointer' },
  addBox: { background: '#0d0d1a', borderRadius: 10, padding: 10, marginTop: 8 },
  kindRow: { display: 'flex', gap: 6, marginBottom: 8 },
  dateRow: { display: 'flex', gap: 8 },
  dateLabel: { flex: 1, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: '#777' },
  dateInput: { background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 6, color: '#ccc', fontSize: 13, padding: '6px', colorScheme: 'dark', fontFamily: 'inherit' },
  err: { color: '#e06c75', fontSize: 13, margin: '12px 0 0' },
}
