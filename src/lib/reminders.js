// Push reminder definitions + due-time logic.
// Shared by the app (settings screen) and scripts/send-reminders.js (GitHub Actions cron).
// Pure functions only — no Supabase or browser APIs.

export const VAPID_PUBLIC_KEY = 'BPt38JUOU1UryUH0f1DIAEVH4Wvod9N8Wdlj1YuFCZ9ADIKPe02hiF_vDef1O9T7SwTLDFTnsk4SJgzMjThoFko'

export const REMINDER_SETTINGS_ID = 'default'

// A reminder can still fire this long after its time (the cron runs every 15 min and can lag).
export const REMINDER_WINDOW_MIN = 120

// `sheet` = which Today sheet opens when the notification is tapped.
// `weekendTime` = optional different time on Sat/Sun.
// Each reminder is skipped if the thing is already logged, and all are skipped on vacation days.
export const REMINDERS = [
  { id: 'mobility',       emoji: '🧘', label: 'Morning mobility',      hint: "If not done yet · includes today's workout", time: '06:00', weekendTime: '07:30', on: true,  sheet: 'mobility' },
  { id: 'beer_intention', emoji: '🍺', label: 'Beer intention',        hint: "Today's plan, if not committed yet",          time: '07:30', weekendTime: '09:00', on: true,  sheet: 'intention' },
  { id: 'vit_morning',    emoji: '💊', label: 'Morning vitamins',      hint: 'D3 · BioSteel · Probiotic, if not logged',     time: '10:00', on: true,  sheet: 'vitamin' },
  { id: 'vit_afternoon',  emoji: '⚡', label: 'Afternoon vits + energy', hint: 'Multi · Vit C · Zinc, plus energy check',    time: '14:00', on: true,  sheet: 'vitamin' },
  { id: 'vit_evening',    emoji: '🌙', label: 'Evening magnesium',     hint: 'If not logged (or soak night)',                time: '20:30', on: false, sheet: 'vitamin' },
  { id: 'weekly_plan',    emoji: '📅', label: 'Sunday week plan',      hint: "Next week's dry days — any swaps?",            time: '18:00', on: true,  sheet: 'beerplan', sundayOnly: true },
]

// Saved settings ({ [id]: { on, time, weekendTime } }) layered over the defaults.
export function mergeReminderSettings(saved) {
  return REMINDERS.map(r => ({ ...r, ...(saved?.[r.id] || {}) }))
}

// Compact form for saving: only the user-editable fields.
export function toReminderSettings(reminders) {
  return Object.fromEntries(reminders.map(r => [r.id, {
    on: r.on, time: r.time, ...(r.weekendTime ? { weekendTime: r.weekendTime } : {}),
  }]))
}

export function reminderTime(r, weekday) {
  return (weekday === 0 || weekday === 6) && r.weekendTime ? r.weekendTime : r.time
}

const toMin = hhmm => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }

// Due if switched on, it's the right day, and now is within the window after its time.
export function isDue(r, nowHHMM, weekday) {
  if (!r.on) return false
  if (r.sundayOnly && weekday !== 0) return false
  const diff = toMin(nowHHMM) - toMin(reminderTime(r, weekday))
  return diff >= 0 && diff < REMINDER_WINDOW_MIN
}
