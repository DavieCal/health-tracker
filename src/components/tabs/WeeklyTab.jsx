import { useState, useEffect } from 'react'
import { getWeeklySummary, getCurrentBeerGoal, setBeerGoal } from '../../lib/db'
import { formatHours, formatShortDate } from '../../lib/dates'

export default function WeeklyTab() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getWeeklySummary().then(s => { setSummary(s); setLoading(false) })
  }, [])

  if (loading || !summary) return <div style={s.loading}>Loading…</div>

  const { sleep, beer, energy, vitamins, workouts, weekStart } = summary
  const vitDoses = ['morning', 'afternoon', 'evening']

  return (
    <div style={s.container}>
      <h2 style={s.heading}>This Week</h2>
      <p style={s.weekLabel}>W/C {formatShortDate(weekStart)}</p>

      <Stat label="Workouts" emoji="🏋️">
        <big>{workouts.completed}</big> / {workouts.logs.length} logged
        <div style={s.barWrap}>
          <div style={{ ...s.bar, width: `${Math.min(100, (workouts.completed / Math.max(1, workouts.logs.length)) * 100)}%`, background: '#4f9cf9' }} />
        </div>
      </Stat>

      <Stat label="Sleep" emoji="💤">
        {sleep.logs.length > 0 ? (
          <>
            <big>{formatHours(sleep.avgHours)}</big> avg · <span style={{ color: '#4f9cf9' }}>{sleep.avgQuality?.toFixed(1)}/5</span> quality
            <div style={s.barWrap}>
              <div style={{ ...s.bar, width: `${(sleep.avgQuality / 5) * 100}%`, background: '#4caf82' }} />
            </div>
          </>
        ) : <span style={s.none}>No sleep logs this week</span>}
      </Stat>

      <Stat label="Beer" emoji="🍺">
        <big style={{ color: beer.total > beer.goal ? '#e06c75' : '#eee' }}>{beer.total}pt</big>
        {' '}/ {beer.goal}pt goal
        <div style={s.barWrap}>
          <div style={{ ...s.bar, width: `${Math.min(100, (beer.total / beer.goal) * 100)}%`, background: beer.total > beer.goal ? '#e06c75' : '#4caf82' }} />
        </div>
      </Stat>

      <Stat label="Energy" emoji="⚡">
        {energy.avg !== null ? (
          <>
            <big style={{ color: energyColor(energy.avg) }}>{energy.avg.toFixed(1)}/5</big>
            {energy.crashes > 0 && <span style={{ color: '#e06c75' }}> · {energy.crashes} crash{energy.crashes !== 1 ? 'es' : ''}</span>}
            <div style={s.barWrap}>
              <div style={{ ...s.bar, width: `${(energy.avg / 5) * 100}%`, background: energyColor(energy.avg) }} />
            </div>
          </>
        ) : <span style={s.none}>No energy logs this week</span>}
      </Stat>

      <Stat label="Vitamins" emoji="💊">
        {vitDoses.map(dose => {
          const count = vitamins.counts?.[dose] || 0
          const pct = vitamins.days > 0 ? Math.round((count / vitamins.days) * 100) : 0
          return (
            <div key={dose} style={s.vitRow}>
              <span style={s.vitDose}>{dose}</span>
              <div style={s.miniBarWrap}>
                <div style={{ ...s.miniBar, width: `${pct}%`, background: pct >= 80 ? '#4caf82' : pct >= 50 ? '#e5a550' : '#e06c75' }} />
              </div>
              <span style={s.vitPct}>{pct}%</span>
            </div>
          )
        })}
      </Stat>
    </div>
  )
}

function Stat({ label, emoji, children }) {
  return (
    <div style={st.card}>
      <div style={st.cardHeader}>
        <span style={st.cardEmoji}>{emoji}</span>
        <span style={st.cardLabel}>{label}</span>
      </div>
      <div style={st.cardBody}>{children}</div>
    </div>
  )
}

function energyColor(avg) {
  if (avg <= 2) return '#e06c75'
  if (avg <= 3) return '#e5a550'
  if (avg <= 4) return '#e5c07b'
  return '#4caf82'
}

const s = {
  container: { padding: '20px 16px 32px' },
  loading: { padding: 40, textAlign: 'center', color: '#666' },
  heading: { margin: '0 0 4px', fontSize: 22, fontWeight: 700 },
  weekLabel: { margin: '0 0 20px', fontSize: 13, color: '#666' },
  none: { color: '#555', fontSize: 14 },
  barWrap: { height: 6, background: '#2a2a3e', borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 3, transition: 'width 0.4s' },
  vitRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 },
  vitDose: { width: 80, fontSize: 13, color: '#aaa', textTransform: 'capitalize' },
  miniBarWrap: { flex: 1, height: 6, background: '#2a2a3e', borderRadius: 3, overflow: 'hidden' },
  miniBar: { height: '100%', borderRadius: 3 },
  vitPct: { width: 36, fontSize: 12, color: '#888', textAlign: 'right' },
}

const st = {
  card: { background: '#1a1a2e', borderRadius: 14, padding: 16, marginBottom: 12 },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  cardEmoji: { fontSize: 20 },
  cardLabel: { fontSize: 13, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardBody: { fontSize: 16, color: '#eee', lineHeight: 1.4 },
}
