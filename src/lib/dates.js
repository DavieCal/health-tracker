const TZ = 'America/Toronto'

export function torontoDate(date = new Date()) {
  return date.toLocaleDateString('en-CA', { timeZone: TZ })
}

export function weekStart(date = new Date()) {
  const dateStr = date.toLocaleDateString('en-CA', { timeZone: TZ })
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

export function prevWeekStarts(n) {
  const ws = weekStart()
  const result = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(ws + 'T00:00:00')
    d.setDate(d.getDate() - i * 7)
    result.push(d.toISOString().split('T')[0])
  }
  return result
}

export function nextWeekStr(weekStr) {
  const d = new Date(weekStr + 'T00:00:00')
  d.setDate(d.getDate() + 7)
  return d.toISOString().split('T')[0]
}

export function formatShortDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

export function formatTime(isoStr) {
  return new Date(isoStr).toLocaleTimeString('en-CA', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ,
  })
}

export function formatHours(h) {
  if (!h && h !== 0) return '–'
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`
}

export function nowTimeValue() {
  const d = new Date()
  const h = d.toLocaleString('en-CA', { hour: '2-digit', hour12: false, timeZone: TZ })
  const m = d.toLocaleString('en-CA', { minute: '2-digit', timeZone: TZ })
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`
}

export const WORKOUT_SCHEDULE = {
  0: { type: 'rest',      label: 'Rest Day',                emoji: '😴' },
  1: { type: 'bike',      label: 'Bike Ride',               emoji: '🚴' },
  2: { type: 'A',         label: 'Workout A (Push/Core)',   emoji: '💪' },
  3: { type: 'bike',      label: 'Bike Ride',               emoji: '🚴' },
  4: { type: 'B',         label: 'Workout B (Legs)',        emoji: '🏋️' },
  5: { type: 'bike',      label: 'Bike Ride',               emoji: '🚴' },
  6: { type: 'stability', label: 'Stability Training',      emoji: '🧘' },
}

export function todaySchedule() {
  const dateStr = torontoDate()
  const d = new Date(dateStr + 'T00:00:00')
  return WORKOUT_SCHEDULE[d.getDay()]
}

export function todayLabel() {
  return new Date().toLocaleDateString('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric', timeZone: TZ,
  })
}
