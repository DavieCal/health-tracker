/* global process */
// Data pull for a coaching check-in (used by the /checkin Claude Code command).
//
//   npm run checkin                     last 14 days + 4-week beer trend
//   npm run checkin -- --days=28
//   npm run checkin -- --save=file.json save a check-in record: { summary, focus: [..], changes: [..] }
//
// Env (.env): VITE_SUPABASE_URL, VITE_SUPABASE_KEY

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { torontoDate, weekStart, scheduleFor } from '../src/lib/dates.js'
import {
  planForDate, planLabel, resolveWeekPlan, dayStatus, isDryDay, totalPints, addDays, weekdayOf, daysBetween,
  PLAN_TEMPLATE_KEY, WEEKDAY_NAMES,
} from '../src/lib/beerPlan.js'

const args = process.argv.slice(2)
const arg = name => args.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3)
const DAYS = Number(arg('days') || 14)
const SAVE = arg('save')

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_KEY)
const today = torontoDate()

// Missing tables / columns read as empty so the report still runs.
async function q(label, query) {
  const { data, error } = await query
  if (error) { console.log(`(${label}: ${error.message})`); return [] }
  return data || []
}
const since = (table, from, cols = '*') =>
  q(table, supabase.from(table).select(cols).gte('toronto_date', from).order('created_at', { ascending: true }))

const avg = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
const fmt = (n, d = 1) => (n == null ? '–' : Number(n).toFixed(d))
const by = (rows, date) => rows.filter(r => r.toronto_date === date)
const torontoHour = iso => Number(new Date(iso).toLocaleString('en-CA', { hour: '2-digit', hour12: false, timeZone: 'America/Toronto' })) % 24
const hm = iso => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Toronto' })

async function save(file) {
  const rec = JSON.parse(readFileSync(file, 'utf8'))
  const { error } = await supabase.from('coach_checkins').insert({
    toronto_date: today, summary: rec.summary, focus: rec.focus || [], changes: rec.changes || [],
  })
  if (error) throw new Error(`coach_checkins: ${error.message}`)
  console.log(`Saved check-in for ${today}.`)
}

async function report() {
  const from = addDays(today, -(DAYS - 1))
  const trendFrom = addDays(weekStart(new Date(today + 'T12:00:00')), -21)    // 4 weeks incl. this one
  const dataFrom = trendFrom < from ? trendFrom : from

  const [sleep, beer, caffeine, energy, vitamins, workouts, weight, mood, health, mobility, intentions,
    periods, goals, illness, checkins] = await Promise.all([
    since('sleep_logs', from),
    since('beer_logs', dataFrom),
    since('caffeine_logs', from),
    since('energy_logs', from),
    since('vitamin_logs', from),
    since('workouts', from),
    q('weight_logs', supabase.from('weight_logs').select('*').order('created_at', { ascending: true })),
    since('mood_logs', from),
    q('health_daily', supabase.from('health_daily').select('*').gte('toronto_date', from).order('toronto_date')),
    since('mobility_logs', from),
    since('beer_intentions', from),
    q('plan_periods', supabase.from('plan_periods').select('*')),
    q('beer_goals', supabase.from('beer_goals').select('*')),
    q('illness_episodes', supabase.from('illness_episodes').select('*').order('start_date', { ascending: false }).limit(3)),
    q('coach_checkins', supabase.from('coach_checkins').select('*').order('created_at', { ascending: false }).limit(2)),
  ])
  const planFor = date => planForDate(date, resolveWeekPlan(goals, weekStart(new Date(date + 'T12:00:00'))), periods)

  const out = []
  const line = s => out.push(s)

  line(`# Check-in data · ${today} (${WEEKDAY_NAMES[weekdayOf(today)]}) · last ${DAYS} days`)
  line('Today is still in progress — treat its numbers as partial.')
  const firstPlanDate = [...goals.filter(g => g.day_plan).map(g => g.created_at?.slice(0, 10)), ...intentions.map(i => i.toronto_date)]
    .filter(Boolean).sort()[0]
  line(firstPlanDate
    ? `Beer day-plans exist since ~${firstPlanDate}; earlier days/weeks show today's default plan for reference only — don't judge them as misses.`
    : 'No beer day-plan saved yet — plans shown are the built-in default.')

  // ── Previous check-in ──
  line('\n## Last check-in')
  if (!checkins.length) line('None yet — this is the first.')
  for (const c of checkins) {
    line(`- ${c.toronto_date}: ${c.summary}`)
    if (c.focus?.length) line(`  Focus: ${c.focus.join(' | ')}`)
    if (c.changes?.length) line(`  Changes made: ${c.changes.join(' | ')}`)
  }

  // ── Coach chat since the last check-in ──
  const chatFrom = checkins[0]?.created_at || `${from}T00:00:00Z`
  const chat = await q('coach_messages', supabase.from('coach_messages').select('role, content, created_at')
    .in('role', ['user', 'assistant']).gt('created_at', chatFrom).order('created_at', { ascending: true }))
  line(`\n## Coach chat since ${checkins[0] ? 'last check-in' : from} (Telegram bot)`)
  if (!chat.length) line('No messages.')
  else {
    line('Dave\'s messages in full; coach replies shortened. Follow up on anything he raised (pain, questions, struggles).')
    const clip = (s, n) => { const t = s.replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n)}…` : t }
    for (const m of chat) {
      const when = `${new Date(m.created_at).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' }).slice(5)} ${hm(m.created_at)}`
      line(m.role === 'user' ? `- ${when} **Dave:** ${clip(m.content, 600)}` : `  coach: ${clip(m.content, 250)}`)
    }
  }

  // ── Daily table ──
  line('\n## Daily')
  line('Sleep = night starting that day (hours/quality). Beer: plan → actual. Caff: total mg (first at). Energy: score@time.')
  line('| Date | Day | Sched | Beer plan | Beer | Sleep | Caff | Energy | Mood | Workout | Mob | Vits | Steps | RHR | HRV |')
  line('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|')
  const days = []
  for (let d = from; d <= today; d = addDays(d, 1)) {
    const plan = planFor(d)
    const intent = by(intentions, d)[0]
    const active = intent ? { type: intent.plan_type, cap: intent.cap } : plan
    const bl = by(beer, d)
    const st = dayStatus(active, bl)
    const sl = by(sleep, d).find(r => r.wake_time)
    const cf = by(caffeine, d)
    const en = by(energy, d)
    const w = by(workouts, d)
    const h = health.find(r => r.toronto_date === d)
    const pints = totalPints(bl)
    const dry = isDryDay(bl)
    days.push({ d, plan, pints, dry, sleep: sl, energy: en, health: h, status: st })
    line(`| ${d.slice(5)} | ${WEEKDAY_NAMES[weekdayOf(d)]} | ${scheduleFor(d, periods).type} | ${planLabel(plan)}${intent ? ' (committed)' : ''} | ${pints ? `${pints}pt${bl.some(r => r.kind === 'sample') ? ' incl sample' : ''}` : '0'}${st === 'over' ? ' ✗' : st === 'ok' ? ' ✓' : ''} | ${sl ? `${fmt(sl.hours_slept)}h${sl.quality ? ` q${sl.quality}` : ""} (bed ${hm(sl.bedtime)})` : '–'} | ${cf.length ? `${Math.round(cf.reduce((s, r) => s + Number(r.estimated_mg || 0), 0))}mg (${hm(cf[0].created_at)})` : '–'} | ${en.map(e => `${e.score}@${hm(e.created_at)}`).join(' ') || '–'} | ${by(mood, d).map(m => m.score).join(',') || '–'} | ${w.map(x => `${x.workout_type}${x.completed ? '' : ' (skipped)'}`).join(', ') || '–'} | ${by(mobility, d).map(m => `${m.mode} ${m.duration_min ?? '?'}m`).join(', ') || '–'} | ${[...new Set(by(vitamins, d).map(v => v.dose[0]))].join('') || '–'} | ${h?.steps ?? '–'} | ${h?.resting_heart_rate ?? '–'} | ${h?.hrv ?? '–'} |`)
  }
  line('Vits: m=morning a=afternoon e=evening s=soak.')

  // ── Beer by week ──
  line('\n## Beer by week (Mon–Sun)')
  for (let ws = trendFrom; ws <= today; ws = addDays(ws, 7)) {
    const wp = resolveWeekPlan(goals, ws)
    const end = addDays(ws, 6)
    const logs = beer.filter(r => r.toronto_date >= ws && r.toronto_date <= end)
    let planned = 0, hit = 0
    for (let d = ws; d <= end && d < today; d = addDays(d, 1)) {
      const p = planForDate(d, wp, periods)
      if (p.type === 'dry' || p.type === 'sample') { planned++; if (isDryDay(by(logs, d))) hit++ }
    }
    line(`- W/C ${ws}: ${totalPints(logs)} / ${wp.target_pints} pt budget · dry days ${hit}/${planned}${end >= today ? ' (week in progress)' : ''}`)
  }

  // ── Dry vs drinking comparison (completed days only) ──
  line('\n## After dry vs drinking days')
  line('Pairs each day with that night\'s sleep, next morning\'s resting HR/HRV and next day\'s energy.')
  const done = days.filter(x => x.d < today)
  const groups = { 'Dry days': done.filter(x => x.dry), 'Drinking days': done.filter(x => !x.dry), '3+ pt days': done.filter(x => x.pints >= 3) }
  line('| Group | n | Sleep h | Sleep q | Next RHR | Next HRV | Next-day energy |')
  line('|---|---|---|---|---|---|---|')
  for (const [name, g] of Object.entries(groups)) {
    const next = x => days.find(y => y.d === addDays(x.d, 1))
    const vals = (f) => g.map(f).filter(v => v != null && !Number.isNaN(v)).map(Number)
    line(`| ${name} | ${g.length} | ${fmt(avg(vals(x => x.sleep?.hours_slept)))} | ${fmt(avg(vals(x => x.sleep?.quality)))} | ${fmt(avg(vals(x => next(x)?.health?.resting_heart_rate)), 0)} | ${fmt(avg(vals(x => next(x)?.health?.hrv)))} | ${fmt(avg(vals(x => avg(next(x)?.energy.map(e => e.score) || []))))} |`)
  }
  line('Small samples — read as a direction, not proof.')

  // ── Energy & caffeine ──
  const afternoon = energy.filter(e => { const h = torontoHour(e.created_at); return h >= 12 && h < 18 })
  line('\n## Energy')
  line(`- All logs avg ${fmt(avg(energy.map(e => e.score)))} (n=${energy.length}); afternoon logs avg ${fmt(avg(afternoon.map(e => e.score)))} (n=${afternoon.length}); crashes (≤2): ${energy.filter(e => e.score <= 2).length}`)

  // ── Weight ──
  line('\n## Weight')
  if (!weight.length) line('No weigh-ins logged.')
  else {
    const recent = weight.slice(-8)
    line(recent.map(w => `${w.toronto_date}: ${w.weight_kg}kg`).join(' · '))
    const first = weight[0], last = weight[weight.length - 1]
    line(`Change since first log (${first.toronto_date}): ${fmt(last.weight_kg - first.weight_kg)} kg over ${daysBetween(first.toronto_date, last.toronto_date)} days`)
  }

  // ── Adherence ──
  const span = done.length || 1
  const scheduled = done.filter(x => scheduleFor(x.d, periods).type !== 'rest')
  line('\n## Adherence (completed days)')
  line(`- Workouts: ${workouts.filter(w => w.completed && w.toronto_date < today).length} done vs ${scheduled.length} scheduled`)
  line(`- Mobility: ${new Set(mobility.filter(m => m.toronto_date < today).map(m => m.toronto_date)).size}/${span} days`)
  for (const dose of ['morning', 'afternoon', 'evening']) {
    line(`- Vitamins ${dose}: ${new Set(vitamins.filter(v => v.dose === dose && v.toronto_date < today).map(v => v.toronto_date)).size}/${span} days`)
  }
  line(`- Beer intentions committed: ${new Set(intentions.map(i => i.toronto_date)).size}/${DAYS} days`)

  // ── Illness ──
  const active = illness.find(i => !i.end_date)
  line('\n## Illness')
  line(active ? `Currently sick since ${active.start_date.slice(0, 10)}: ${active.description || ''}` : `Not sick. Last episode: ${illness[0] ? `${illness[0].start_date.slice(0, 10)} (${illness[0].days_lasted ?? '?'} days)` : 'none logged'}`)

  // ── Coming up ──
  line('\n## Next 7 days')
  const ahead = Array.from({ length: 7 }, (_, i) => addDays(today, i + 1))
  line(ahead.map(d => `${WEEKDAY_NAMES[weekdayOf(d)]} ${d.slice(5)}: ${planLabel(planFor(d))}, ${scheduleFor(d, periods).type}`).join(' · '))
  const upcoming = periods.filter(p => (!p.end_date || p.end_date >= today)).sort((a, b) => a.start_date.localeCompare(b.start_date))
  if (upcoming.length) line(`Periods: ${upcoming.map(p => `${p.kind} ${p.start_date}–${p.end_date || 'open'} "${p.label || ''}"`).join('; ')}`)
  const tmpl = goals.find(g => g.week_start === PLAN_TEMPLATE_KEY)
  line(`Default plan: ${tmpl ? 'saved template' : 'built-in Plan B'} · budget ${resolveWeekPlan(goals, weekStart()).target_pints} pt`)

  console.log(out.join('\n'))
}

;(SAVE ? save(SAVE) : report()).catch(e => { console.error(e.message); process.exitCode = 1 })
