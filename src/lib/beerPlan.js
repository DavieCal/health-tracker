// Beer plan logic: weekly day plans, dry/vacation periods, sample rule.
// Pure functions only — Supabase access lives in db.js.

// Day plan types:
//   dry    — no beer
//   sample — work samples only (≤ ½ pint keeps the day dry)
//   cap    — up to `cap` pints
//   open   — no daily limit (still counts toward the weekly budget)
export const PLAN_TYPES = {
  dry:    { label: 'Dry',          short: 'Dry',     emoji: '🚫' },
  sample: { label: 'Samples only', short: 'Samples', emoji: '🧪' },
  cap:    { label: 'Up to',        short: 'Cap',     emoji: '🍺' },
  open:   { label: 'Open',         short: 'Open',    emoji: '🍻' },
}

export const SAMPLE_DRY_LIMIT = 0.5   // work samples up to this keep a day dry

// Plan B default, keyed by getDay() (0 = Sun).
export const DEFAULT_WEEK_PLAN = {
  target_pints: 14,
  day_plan: {
    0: { type: 'dry' },
    1: { type: 'dry' },
    2: { type: 'sample', note: 'Packaging: QA samples only (≤ ½ pt). Offered a pint → sparkling water.' },
    3: { type: 'cap', cap: 1, note: 'Owner meeting: 1 max, then switch to water.' },
    4: { type: 'dry' },
    5: { type: 'cap', cap: 5 },
    6: { type: 'cap', cap: 5 },
  },
}

// beer_goals row key for the default plan used by weeks without their own row.
export const PLAN_TEMPLATE_KEY = 'template'

// Pick the plan for week `ws` from beer_goals rows: week row → template row → DEFAULT_WEEK_PLAN.
export function resolveWeekPlan(rows, ws) {
  const week = rows.find(r => r.week_start === ws)
  const tmpl = rows.find(r => r.week_start === PLAN_TEMPLATE_KEY)
  if (week?.day_plan) return { ...week, source: 'week' }
  const base = tmpl?.day_plan ? tmpl : DEFAULT_WEEK_PLAN
  return {
    week_start: ws,
    target_pints: week?.target_pints ?? base.target_pints,
    day_plan: base.day_plan,
    source: tmpl?.day_plan ? 'template' : 'default',
  }
}

export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]   // Mon-first, matching weekStart()
export const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function weekdayOf(dateStr) {
  return new Date(dateStr + 'T12:00:00').getDay()
}

export function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

export function daysBetween(a, b) {
  return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000)
}

// Period covering a date (end_date null = open-ended).
export function periodOn(dateStr, periods, kind) {
  return (periods || []).find(p =>
    p.kind === kind && p.start_date <= dateStr && (!p.end_date || p.end_date >= dateStr)
  ) || null
}

// Effective plan for a date, after dry and vacation periods.
// Returns { type, cap, note, period }; type may also be 'vacation'.
export function planForDate(dateStr, weekPlan, periods) {
  const vacation = periodOn(dateStr, periods, 'vacation')
  if (vacation) return { type: 'vacation', cap: null, note: vacation.label || 'Vacation', period: vacation }

  const base = weekPlan?.day_plan?.[weekdayOf(dateStr)] || { type: 'open' }
  const dry = periodOn(dateStr, periods, 'dry')
  if (dry) {
    // Work samples are still allowed in a dry period — they keep the day dry.
    return base.type === 'sample'
      ? { ...base, period: dry }
      : { type: 'dry', cap: null, note: dry.label || 'Dry week', period: dry }
  }
  return { ...base, cap: base.cap ?? null, period: null }
}

// Max pints a plan allows that day (null = no daily limit).
export function planLimit(plan) {
  if (!plan) return null
  if (plan.type === 'dry') return 0
  if (plan.type === 'sample') return SAMPLE_DRY_LIMIT
  if (plan.type === 'cap') return plan.cap
  return null
}

export function planLabel(plan) {
  if (!plan) return '—'
  if (plan.type === 'vacation') return 'Vacation'
  if (plan.type === 'cap') return `Up to ${plan.cap} pt`
  if (plan.type === 'sample') return 'Samples only (≤ ½ pt)'
  return PLAN_TYPES[plan.type]?.label || plan.type
}

export function totalPints(logs) {
  return (logs || []).reduce((s, r) => s + Number(r.pints), 0)
}

// Sample rule: a day is dry if everything logged was a work sample totalling ≤ ½ pint.
export function isDryDay(logs) {
  const all = logs || []
  return all.every(r => r.kind === 'sample') && totalPints(all) <= SAMPLE_DRY_LIMIT
}

// Status of a day vs its plan: 'ok' | 'over' | 'none' (no plan to judge, e.g. vacation/open).
export function dayStatus(plan, logs) {
  if (!plan || plan.type === 'vacation' || plan.type === 'open') return 'none'
  if (plan.type === 'dry' || plan.type === 'sample') return isDryDay(logs) ? 'ok' : 'over'
  return totalPints(logs) <= plan.cap ? 'ok' : 'over'
}

// Names of planned dry days (for beer_goals.alcohol_free_days, read by the health-coach bot).
export function dryDayNames(dayPlan) {
  return WEEKDAY_ORDER.filter(d => ['dry', 'sample'].includes(dayPlan?.[d]?.type)).map(d => WEEKDAY_NAMES[d])
}

// Sum of daily limits across the week (null if any day is open).
export function weekCapTotal(dayPlan) {
  let sum = 0
  for (const d of WEEKDAY_ORDER) {
    const lim = planLimit(dayPlan?.[d] || { type: 'open' })
    if (lim == null) return null
    sum += lim
  }
  return sum
}
