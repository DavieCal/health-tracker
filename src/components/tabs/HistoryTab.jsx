import { useState, useEffect } from 'react'
import { getLast7DaysLogs } from '../../lib/db'
import { formatTime, formatHours, formatShortDate, timeStrToDisplay } from '../../lib/dates'
import Sheet from '../Sheet'
import EditDaySheet from '../forms/EditDaySheet'

export default function HistoryTab() {
  const [days, setDays] = useState([])
  const [loading, setLoading] = useState(true)
  const [editDate, setEditDate] = useState(null)

  async function load() {
    setLoading(true)
    try {
      setDays(await getLast7DaysLogs())
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div style={s.page}>
      <h2 style={s.heading}>Last 7 Days</h2>
      {loading
        ? <p style={s.muted}>Loading…</p>
        : days.map(day => (
            <DayCard key={day.date} day={day} onEdit={() => setEditDate(day.date)} />
          ))
      }
      <Sheet
        open={!!editDate}
        onClose={() => setEditDate(null)}
        title={editDate ? `Edit · ${formatShortDate(editDate)}` : ''}
      >
        {editDate && (
          <EditDaySheet
            date={editDate}
            onSave={() => { setEditDate(null); load() }}
          />
        )}
      </Sheet>
    </div>
  )
}

function DayCard({ day, onEdit }) {
  const { date, sleep, beers, caffeine } = day
  const totalPints = beers.reduce((s, r) => s + r.pints, 0)
  const lastBeer = beers.find(r => r.is_last_of_night) || beers[beers.length - 1]
  const dayLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-CA', {
    weekday: 'short', month: 'short', day: 'numeric',
  })

  return (
    <div style={s.card}>
      <div style={s.cardTop}>
        <span style={s.dateLabel}>{dayLabel}</span>
        <button style={s.editBtn} onClick={onEdit}>Edit ✏️</button>
      </div>
      <div style={s.grid}>
        <Cell icon="🌙" val={sleep?.bedtime ? formatTime(sleep.bedtime) : '—'} />
        <Cell icon="☀️" val={sleep?.wake_time ? formatTime(sleep.wake_time) : '—'} />
        <Cell icon="😴" val={sleep?.hours_slept ? formatHours(sleep.hours_slept) : '—'} />
        <Cell icon="🍺" val={totalPints > 0 ? `${totalPints} pt` : '—'} />
        <Cell icon="🕐" val={lastBeer?.consumed_at ? timeStrToDisplay(lastBeer.consumed_at) : '—'} />
        <Cell icon="☕" val={
          caffeine.length === 0 ? '—'
          : caffeine[0].consumed_at ? timeStrToDisplay(caffeine[0].consumed_at)
          : `${caffeine.length} logged`
        } />
      </div>
    </div>
  )
}

function Cell({ icon, val }) {
  return (
    <div style={s.cell}>
      <span style={s.cellIcon}>{icon}</span>
      <span style={s.cellVal}>{val}</span>
    </div>
  )
}

const s = {
  page: { padding: '16px 16px 32px' },
  heading: { margin: '0 0 16px', fontSize: 20, fontWeight: 700 },
  muted: { color: '#666', fontSize: 14 },
  card: {
    background: '#1a1a2e', borderRadius: 12, padding: '14px 16px',
    marginBottom: 12,
  },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dateLabel: { fontWeight: 600, fontSize: 15 },
  editBtn: {
    background: 'none', border: '1px solid #2a2a3e', borderRadius: 8,
    color: '#aaa', fontSize: 13, padding: '4px 10px', cursor: 'pointer',
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px 0' },
  cell: { display: 'flex', alignItems: 'center', gap: 6 },
  cellIcon: { fontSize: 14 },
  cellVal: { fontSize: 13, color: '#ccc' },
}
