import { planLabel, planLimit, dayStatus, totalPints, isDryDay, planForDate, addDays, PLAN_TYPES } from '../lib/beerPlan'

// Today's beer plan + morning commitment + weekly budget.
export default function BeerPlanCard({ plan, intention, todayLogs, weekLogs, weekPlan, periods, today, onCommit, onAdjust, onEditPlan }) {
  const active = intention
    ? { type: intention.plan_type, cap: intention.cap, note: intention.note }
    : plan
  const had = totalPints(todayLogs)
  const samples = totalPints(todayLogs.filter(r => r.kind === 'sample'))
  const status = dayStatus(active, todayLogs)
  const limit = planLimit(active)

  // Week so far (completed days only): planned dry days vs actually dry.
  const ws = weekPlan.week_start
  let plannedDry = 0, actualDry = 0
  for (let d = ws; d < today; d = addDays(d, 1)) {
    const p = planForDate(d, weekPlan, periods)
    if (p.type === 'dry' || p.type === 'sample') {
      plannedDry++
      if (isDryDay(weekLogs.filter(r => r.toronto_date === d))) actualDry++
    }
  }
  const weekTotal = totalPints(weekLogs)
  const overBudget = weekTotal > weekPlan.target_pints

  const statusColor = status === 'over' ? '#e06c75' : '#4caf82'

  return (
    <div style={s.card}>
      <div style={s.top}>
        <span style={s.title}>🍺 Today's beer plan</span>
        <button style={s.planBtn} onClick={onEditPlan}>⚙ Plan</button>
      </div>

      <div style={s.mainRow}>
        <span style={s.planEmoji}>{PLAN_TYPES[active.type]?.emoji}</span>
        <div style={s.mainInfo}>
          <span style={s.planText}>{planLabel(active)}</span>
          {active.note && <span style={s.note}>{active.note}</span>}
        </div>
      </div>

      <div style={s.statusRow}>
        <span style={{ ...s.had, color: had > 0 ? statusColor : '#888' }}>
          {had > 0
            ? `Had ${had} pt${samples > 0 ? ` (${samples} sample)` : ''}${limit != null ? ` / ${limit}` : ''}${status === 'ok' && isDryDay(todayLogs) ? ' · still dry' : ''}`
            : 'Nothing yet'}
        </span>
        {intention ? (
          <button style={s.committed} onClick={onAdjust}>✓ Committed</button>
        ) : (
          <div style={s.btnPair}>
            <button style={s.changeBtn} onClick={onAdjust}>Change</button>
            <button style={s.commitBtn} onClick={onCommit}>Commit</button>
          </div>
        )}
      </div>

      <div style={s.weekRow}>
        <span>
          Week: <b style={{ color: overBudget ? '#e06c75' : '#eee' }}>{weekTotal}</b> / {weekPlan.target_pints} pt
        </span>
        {plannedDry > 0 && (
          <span>Dry days: <b style={{ color: actualDry === plannedDry ? '#4caf82' : '#e5a550' }}>{actualDry}/{plannedDry}</b> so far</span>
        )}
      </div>
    </div>
  )
}

const s = {
  card: { background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 12, padding: '12px 14px', marginBottom: 20 },
  top: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 13, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  planBtn: { background: 'none', border: '1px solid #2a2a3e', borderRadius: 8, color: '#888', fontSize: 12, padding: '4px 10px', cursor: 'pointer' },
  mainRow: { display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  planEmoji: { fontSize: 22, lineHeight: '26px' },
  mainInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: 3 },
  planText: { fontSize: 16, fontWeight: 700, color: '#eee' },
  note: { fontSize: 13, color: '#aaa', fontStyle: 'italic', lineHeight: 1.4 },
  statusRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  had: { fontSize: 13, fontWeight: 600 },
  btnPair: { display: 'flex', gap: 6 },
  changeBtn: { background: '#2a2a3e', border: 'none', borderRadius: 8, color: '#ccc', padding: '7px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  commitBtn: { background: '#4caf82', border: 'none', borderRadius: 8, color: '#fff', padding: '7px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  committed: { background: 'none', border: 'none', color: '#4caf82', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: 0 },
  weekRow: { display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid #2a2a3e', fontSize: 12, color: '#888' },
}
